require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// CORS options
const corsOptions = {
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Connect to SQLite database
const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'your-gemini-key');

// Initialize SendGrid
const sendgridApiKey = process.env.SENDGRID_API_KEY || 'your-sendgrid-key';
const sendgridTemplateId = process.env.SENDGRID_TEMPLATE_ID || 'your-template-id';

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Create users table if not exists
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        security_code TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_audiobooks table if not exists
    db.run(`
      CREATE TABLE IF NOT EXISTS user_audiobooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        full_text TEXT,
        summary TEXT,
        key_points TEXT,
        image_urls TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Create user_preferences table if not exists
    db.run(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id INTEGER PRIMARY KEY,
        theme TEXT,
        speech_rate TEXT,
        speech_voice TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Create password_reset_tokens table if not exists
    db.run(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
  });
}

// Helper function to generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// Auth Routes - Use the new auth-routes module
const authRoutes = require('./auth-routes');
app.use('/api/auth', authRoutes);

// Article Routes - Use the new article-routes module
const articleRoutes = require('./article-routes');
app.use('/api', articleRoutes);
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to register user' });
          }

          const userId = this.lastID;

          // Create default preferences
          db.run(
            'INSERT INTO user_preferences (user_id, theme, speech_rate, speech_voice) VALUES (?, ?, ?, ?)',
            [userId, 'light', '1', ''],
            (err) => {
              if (err) {
                console.error('Error creating user preferences:', err);
              }
            }
          );

          // Get the created user
          db.get(
            'SELECT id, username, email, created_at FROM users WHERE id = ?',
            [userId],
            (err, newUser) => {
              if (err) {
                return res.status(500).json({ error: 'Failed to retrieve user' });
              }

              // Generate token
              const token = generateToken(newUser);

              res.status(201).json({
                message: 'User registered successfully',
                token,
                user: {
                  id: newUser.id,
                  username: newUser.username,
                  email: newUser.email,
                  hasSecurityCode: false,
                  created_at: newUser.created_at
                }
              });
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Compare password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate token
      const token = generateToken(user);

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          hasSecurityCode: !!user.security_code,
          created_at: user.created_at
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, username, email, security_code, created_at FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          hasSecurityCode: !!user.security_code,
          created_at: user.created_at
        }
      });
    }
  );
});

// Save security code
app.post('/api/auth/security-code', authenticateToken, async (req, res) => {
  const { securityCode } = req.body;

  if (!securityCode || securityCode.length !== 6 || !/^\d{6}$/.test(securityCode)) {
    return res.status(400).json({ error: 'Invalid security code format' });
  }

  try {
    // Hash security code
    const salt = await bcrypt.genSalt(10);
    const hashedCode = await bcrypt.hash(securityCode, salt);

    db.run(
      'UPDATE users SET security_code = ? WHERE id = ?',
      [hashedCode, req.user.id],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to save security code' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Security code saved successfully' });
      }
    );
  } catch (error) {
    console.error('Security code error:', error);
    res.status(500).json({ error: 'Server error while saving security code' });
  }
});

// Verify security code
app.post('/api/auth/verify-security-code', async (req, res) => {
  const { email, securityCode } = req.body;

  if (!email || !securityCode) {
    return res.status(400).json({ error: 'Email and security code are required' });
  }

  try {
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Don't reveal if user exists or not
      if (!user || !user.security_code) {
        return res.status(401).json({ message: 'Invalid email or security code' });
      }

      // Compare security code
      const validCode = await bcrypt.compare(securityCode, user.security_code);
      if (!validCode) {
        return res.status(401).json({ message: 'Invalid email or security code' });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      // Save token to database
      db.run(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, resetToken, expiresAt.toISOString()],
        (err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to create reset token' });
          }

          res.json({
            message: 'Security code verified successfully',
            resetToken
          });
        }
      );
    });
  } catch (error) {
    console.error('Security code verification error:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token and password are required' });
  }

  try {
    // Check if token exists and is valid
    db.get(
      `SELECT * FROM password_reset_tokens 
       WHERE token = ? AND expires_at > datetime('now') AND used = 0`,
      [token],
      async (err, tokenRecord) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!tokenRecord) {
          return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update user password
        db.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, tokenRecord.user_id],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to update password' });
            }

            // Mark token as used
            db.run(
              'UPDATE password_reset_tokens SET used = 1 WHERE id = ?',
              [tokenRecord.id],
              (err) => {
                if (err) {
                  console.error('Error marking token as used:', err);
                }
              }
            );

            res.json({ message: 'Password reset successful' });
          }
        );
      }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Server error during password reset' });
  }
});

// Check password uniqueness
app.post('/api/auth/check-password', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  // This is a simplified check - in a real app, you'd check against password database
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome'];
  const isCommon = commonPasswords.includes(password.toLowerCase());

  res.json({ unique: !isCommon });
});
>>>>>>> 0cc69f4663dec85dc8cf029b3bd538971e11de8e

// User Routes

// Get user profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  db.get(
    `SELECT u.id, u.username, u.email, u.created_at, 
     (SELECT COUNT(*) FROM user_audiobooks WHERE user_id = u.id) as article_count,
     (SELECT MAX(created_at) FROM user_audiobooks WHERE user_id = u.id) as last_activity
     FROM users u WHERE u.id = ?`,
<<<<<<< HEAD
    [req.user.userId],
=======
    [req.user.id],
>>>>>>> 0cc69f4663dec85dc8cf029b3bd538971e11de8e
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        article_count: user.article_count,
        last_activity: user.last_activity
      });
    }
  );
});

// Get user preferences
app.get('/api/user/preferences', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM user_preferences WHERE user_id = ?',
<<<<<<< HEAD
    [req.user.userId],
=======
    [req.user.id],
>>>>>>> 0cc69f4663dec85dc8cf029b3bd538971e11de8e
    (err, preferences) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ preferences: preferences || {} });
    }
  );
});

// Update user preferences
app.post('/api/user/preferences', authenticateToken, (req, res) => {
  const { theme, speech_rate, speech_voice } = req.body;

  db.run(
    `INSERT INTO user_preferences (user_id, theme, speech_rate, speech_voice) 
     VALUES (?, ?, ?, ?) 
     ON CONFLICT(user_id) DO UPDATE SET 
     theme = COALESCE(?, theme),
     speech_rate = COALESCE(?, speech_rate),
     speech_voice = COALESCE(?, speech_voice)`,
    [
<<<<<<< HEAD
      req.user.userId,
=======
      req.user.id,
>>>>>>> 0cc69f4663dec85dc8cf029b3bd538971e11de8e
      theme,
      speech_rate,
      speech_voice,
      theme,
      speech_rate,
      speech_voice
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update preferences' });
      }

      res.json({ message: 'Preferences updated successfully' });
    }
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`);
  console.log(`SendGrid configured for Cerebray`);
});