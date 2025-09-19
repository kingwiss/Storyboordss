const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration - allow all origins for GitHub Pages
app.use(cors({
    origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'https://*.github.io', 'https://*.github.com'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Database setup
const db = new sqlite3.Database(':memory:'); // Use in-memory for simplicity

// Initialize database tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES users (id)
    )`);

    // Create default admin user for testing
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, email, password) VALUES (?, ?, ?)`, 
        ['admin', 'admin@example.com', defaultPassword]);
});

// JWT Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Utility functions
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

function sendResponse(res, success, data, message) {
    res.json({ success, data, message });
}

function sendError(res, message, status = 400) {
    res.status(status).json({ error: message });
}

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return sendError(res, 'Username, email, and password are required');
        }

        if (username.length < 3) {
            return sendError(res, 'Username must be at least 3 characters');
        }

        if (password.length < 6) {
            return sendError(res, 'Password must be at least 6 characters');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return sendError(res, 'Invalid email format');
        }

        // Check if user exists
        db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return sendError(res, 'Database error');
            }

            if (row) {
                return sendError(res, 'Username or email already exists');
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user
            db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
                [username, email, hashedPassword], function(err) {
                if (err) {
                    console.error('Registration error:', err);
                    return sendError(res, 'Registration failed');
                }

                const userId = this.lastID;
                const user = { id: userId, username, email };
                const token = generateToken(user);

                sendResponse(res, true, { token, user }, 'Registration successful');
            });
        });

    } catch (error) {
        console.error('Registration error:', error);
        sendError(res, 'Registration failed');
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return sendError(res, 'Email and password are required');
        }

        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return sendError(res, 'Database error');
            }

            if (!user) {
                return sendError(res, 'Invalid email or password');
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return sendError(res, 'Invalid email or password');
            }

            const token = generateToken(user);
            const userData = { id: user.id, username: user.username, email: user.email };

            sendResponse(res, true, { token, user: userData }, 'Login successful');
        });

    } catch (error) {
        console.error('Login error:', error);
        sendError(res, 'Login failed');
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    sendResponse(res, true, req.user, 'User data retrieved');
});

app.post('/api/auth/logout', (req, res) => {
    sendResponse(res, true, null, 'Logout successful');
});

app.get('/api/auth/health', (req, res) => {
    sendResponse(res, true, { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'authentication'
    }, 'Service is healthy');
});

// Article Routes
app.get('/api/articles', (req, res) => {
    db.all(`SELECT a.*, u.username as author_name 
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
            ORDER BY a.created_at DESC`, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return sendError(res, 'Failed to fetch articles');
        }
        sendResponse(res, true, rows, 'Articles retrieved');
    });
});

app.post('/api/articles', authenticateToken, (req, res) => {
    const { title, content } = req.body;

    if (!title || !content) {
        return sendError(res, 'Title and content are required');
    }

    db.run('INSERT INTO articles (title, content, author_id) VALUES (?, ?, ?)',
        [title, content, req.user.id], function(err) {
        if (err) {
            console.error('Database error:', err);
            return sendError(res, 'Failed to create article');
        }

        sendResponse(res, true, { id: this.lastID }, 'Article created successfully');
    });
});

app.get('/api/articles/:id', (req, res) => {
    const { id } = req.params;

    db.get(`SELECT a.*, u.username as author_name 
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
            WHERE a.id = ?`, [id], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return sendError(res, 'Failed to fetch article');
        }

        if (!row) {
            return sendError(res, 'Article not found', 404);
        }

        sendResponse(res, true, row, 'Article retrieved');
    });
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve main index.html for all other routes (SPA support)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    sendError(res, 'Internal server error', 500);
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 API Documentation: http://localhost:${PORT}/api/`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`🔑 Test login - Email: admin@example.com, Password: admin123`);
});

module.exports = app;