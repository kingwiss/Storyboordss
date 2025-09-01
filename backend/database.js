const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
    }
});

// Initialize database tables
db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create user_audiobooks table for storing user's generated audiobooks
    db.run(`CREATE TABLE IF NOT EXISTS user_audiobooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        full_text TEXT NOT NULL,
        summary TEXT,
        key_points TEXT, -- JSON array of key points
        image_urls TEXT, -- JSON array of image URLs
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // Create user_preferences table
    db.run(`CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        speech_rate REAL DEFAULT 1.0,
        speech_voice TEXT DEFAULT 'default',
        theme TEXT DEFAULT 'light',
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // Create password_reset_tokens table
    db.run(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);
});

// Database helper functions
const dbHelpers = {
    // User operations
    createUser: (username, email, passwordHash) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
            stmt.run([username, email, passwordHash], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, username, email });
                }
            });
            stmt.finalize();
        });
    },

    getUserByEmail: (email) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    getUserById: (id) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT id, username, email, created_at FROM users WHERE id = ?', [id], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    // Audiobook operations
    saveUserAudiobook: (userId, title, url, fullText, summary, keyPoints, imageUrls) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT INTO user_audiobooks (user_id, title, url, full_text, summary, key_points, image_urls) VALUES (?, ?, ?, ?, ?, ?, ?)');
            const keyPointsJson = JSON.stringify(keyPoints || []);
            const imageUrlsJson = JSON.stringify(imageUrls || []);
            stmt.run([userId, title, url, fullText, summary, keyPointsJson, imageUrlsJson], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
            stmt.finalize();
        });
    },

    getUserAudiobooks: (userId) => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM user_audiobooks WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    // Parse JSON fields
                    const parsedRows = rows.map(row => ({
                        ...row,
                        key_points: JSON.parse(row.key_points || '[]'),
                        image_urls: JSON.parse(row.image_urls || '[]')
                    }));
                    resolve(parsedRows);
                }
            });
        });
    },

    getAudiobookById: (audiobookId, userId) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM user_audiobooks WHERE id = ? AND user_id = ?', [audiobookId, userId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    // Parse JSON fields
                    const parsedRow = {
                        ...row,
                        key_points: JSON.parse(row.key_points || '[]'),
                        image_urls: JSON.parse(row.image_urls || '[]')
                    };
                    resolve(parsedRow);
                } else {
                    resolve(null);
                }
            });
        });
    },

    deleteUserAudiobook: (audiobookId, userId) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('DELETE FROM user_audiobooks WHERE id = ? AND user_id = ?');
            stmt.run([audiobookId, userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ deleted: this.changes > 0 });
                }
            });
            stmt.finalize();
        });
    },

    // User preferences
    getUserPreferences: (userId) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM user_preferences WHERE user_id = ?', [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row || { speech_rate: 1.0, speech_voice: 'default', theme: 'light' });
                }
            });
        });
    },

    updateUserPreferences: (userId, preferences) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare(`INSERT OR REPLACE INTO user_preferences 
                (user_id, speech_rate, speech_voice, theme) VALUES (?, ?, ?, ?)`);
            stmt.run([userId, preferences.speech_rate, preferences.speech_voice, preferences.theme], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            });
            stmt.finalize();
        });
    },

    // Password reset token operations
    createPasswordResetToken: (userId, token, expiresAt) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)');
            stmt.run([userId, token, expiresAt], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
            stmt.finalize();
        });
    },

    getPasswordResetToken: (token) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM password_reset_tokens WHERE token = ? AND used = FALSE AND expires_at > datetime("now")', [token], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    markTokenAsUsed: (token) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('UPDATE password_reset_tokens SET used = TRUE WHERE token = ?');
            stmt.run([token], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            });
            stmt.finalize();
        });
    },

    updateUserPassword: (userId, passwordHash) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            stmt.run([passwordHash, userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            });
            stmt.finalize();
        });
    },

    cleanupExpiredTokens: () => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('DELETE FROM password_reset_tokens WHERE expires_at < datetime("now")');
            stmt.run(function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ deleted: this.changes });
                }
            });
            stmt.finalize();
        });
    }
};

module.exports = { db, dbHelpers };