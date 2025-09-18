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

// User Routes

// Get user profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  db.get(
    `SELECT u.id, u.username, u.email, u.created_at, 
     (SELECT COUNT(*) FROM user_audiobooks WHERE user_id = u.id) as article_count,
     (SELECT MAX(created_at) FROM user_audiobooks WHERE user_id = u.id) as last_activity
     FROM users u WHERE u.id = ?`,
    [req.user.userId],
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
    [req.user.userId],
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
      req.user.userId,
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