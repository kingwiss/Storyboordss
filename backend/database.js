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
    // Create users table with tier management
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
        subscription_start DATETIME,
        subscription_end DATETIME,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token TEXT,
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

    // Create usage_tracking table for monitoring article generation limits
    db.run(`CREATE TABLE IF NOT EXISTS usage_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action_type TEXT NOT NULL CHECK (action_type IN ('article_generation', 'tts_usage')),
        week_start DATE NOT NULL,
        usage_count INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, action_type, week_start)
    )`);

    // Create subscription_history table for tracking premium subscriptions
    db.run(`CREATE TABLE IF NOT EXISTS subscription_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        tier TEXT NOT NULL CHECK (tier IN ('free', 'premium')),
        start_date DATETIME NOT NULL,
        end_date DATETIME,
        payment_method TEXT,
        transaction_id TEXT,
        amount DECIMAL(10,2),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // Create email_verification_tokens table
    db.run(`CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`);

    // Add indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_users_tier ON users(tier)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_week ON usage_tracking(user_id, week_start)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_subscription_history_user ON subscription_history(user_id)`);
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
    },

    // User tier and subscription management
    updateUserTier: (userId, tier, subscriptionStart = null, subscriptionEnd = null) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('UPDATE users SET tier = ?, subscription_start = ?, subscription_end = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            stmt.run([tier, subscriptionStart, subscriptionEnd, userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            });
            stmt.finalize();
        });
    },

    getUserTierInfo: (userId) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT id, username, email, tier, subscription_start, subscription_end, email_verified FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    // Usage tracking functions
    getWeekStart: (date = new Date()) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        const weekStart = new Date(d.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart.toISOString().split('T')[0];
    },

    trackUsage: (userId, actionType) => {
        return new Promise((resolve, reject) => {
            const weekStart = dbHelpers.getWeekStart();
            const stmt = db.prepare(`
                INSERT INTO usage_tracking (user_id, action_type, week_start, usage_count)
                VALUES (?, ?, ?, 1)
                ON CONFLICT(user_id, action_type, week_start)
                DO UPDATE SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
            `);
            stmt.run([userId, actionType, weekStart], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, weekStart });
                }
            });
            stmt.finalize();
        });
    },

    getUserUsage: (userId, actionType, weekStart = null) => {
        return new Promise((resolve, reject) => {
            const currentWeekStart = weekStart || dbHelpers.getWeekStart();
            db.get('SELECT usage_count FROM usage_tracking WHERE user_id = ? AND action_type = ? AND week_start = ?', 
                [userId, actionType, currentWeekStart], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? row.usage_count : 0);
                }
            });
        });
    },

    // Email verification functions
    createEmailVerificationToken: (userId, token, expiresAt) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)');
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

    getEmailVerificationToken: (token) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM email_verification_tokens WHERE token = ? AND used = FALSE AND expires_at > datetime("now")', [token], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    markEmailVerificationTokenAsUsed: (token) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('UPDATE email_verification_tokens SET used = TRUE WHERE token = ?');
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

    markEmailAsVerified: (userId) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('UPDATE users SET email_verified = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
            stmt.run([userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true });
                }
            });
            stmt.finalize();
        });
    },

    // Subscription history functions
    addSubscriptionHistory: (userId, tier, startDate, endDate, paymentMethod, transactionId, amount) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('INSERT INTO subscription_history (user_id, tier, start_date, end_date, payment_method, transaction_id, amount) VALUES (?, ?, ?, ?, ?, ?, ?)');
            stmt.run([userId, tier, startDate, endDate, paymentMethod, transactionId, amount], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID });
                }
            });
            stmt.finalize();
        });
    },

    getUserSubscriptionHistory: (userId) => {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM subscription_history WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    },

    // Get active subscription for user
    getActiveSubscription: (userId) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM subscription_history WHERE user_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1', [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    // Check if user has active premium subscription
     hasActivePremiumSubscription: (userId) => {
         return new Promise((resolve, reject) => {
             db.get('SELECT * FROM users WHERE id = ? AND tier = "premium" AND subscription_end > datetime("now")', [userId], (err, row) => {
                 if (err) {
                     reject(err);
                 } else {
                     resolve(!!row);
                 }
             });
         });
     },

    // User profile management functions
    getUserByUsername: (username) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    checkPasswordExists: (password) => {
        return new Promise((resolve, reject) => {
            const bcrypt = require('bcrypt');
            db.all('SELECT password_hash FROM users', [], async (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    try {
                        for (const row of rows) {
                            const match = await bcrypt.compare(password, row.password_hash);
                            if (match) {
                                resolve(true);
                                return;
                            }
                        }
                        resolve(false);
                    } catch (compareErr) {
                        reject(compareErr);
                    }
                }
            });
        });
    },

    updateUserProfile: (userId, updates) => {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];
            
            if (updates.username) {
                fields.push('username = ?');
                values.push(updates.username);
            }
            
            if (updates.email) {
                fields.push('email = ?');
                values.push(updates.email);
            }
            
            if (fields.length === 0) {
                resolve({ success: true });
                return;
            }
            
            fields.push('updated_at = CURRENT_TIMESTAMP');
            values.push(userId);
            const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
            
            const stmt = db.prepare(query);
            stmt.run(values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
            stmt.finalize();
        });
    },

    deleteUserAccount: (userId) => {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run('DELETE FROM usage_tracking WHERE user_id = ?', [userId]);
                db.run('DELETE FROM user_audiobooks WHERE user_id = ?', [userId]);
                db.run('DELETE FROM user_preferences WHERE user_id = ?', [userId]);
                db.run('DELETE FROM subscription_history WHERE user_id = ?', [userId]);
                db.run('DELETE FROM email_verification_tokens WHERE user_id = ?', [userId]);
                db.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [userId]);
                db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve({ success: true, deleted: this.changes > 0 });
                    }
                });
            });
        });
    },

    updateUserPassword: (userId, passwordHash) => {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            const stmt = db.prepare(query);
            stmt.run([passwordHash, userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
            stmt.finalize();
        });
    },

    getUserById: (userId) => {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
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

    getEmailVerificationToken: (token) => {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM email_verification_tokens WHERE token = ? AND expires_at > datetime("now") AND used = 0';
            db.get(query, [token], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    },

    markEmailAsVerified: (userId, verified = true) => {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET email_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
            const stmt = db.prepare(query);
            stmt.run([verified ? 1 : 0, userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
            stmt.finalize();
        });
    },

    markEmailVerificationTokenAsUsed: (token) => {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE email_verification_tokens SET used = 1 WHERE token = ?';
            const stmt = db.prepare(query);
            stmt.run([token], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
            stmt.finalize();
        });
    },

    getUserSubscriptionHistory: (userId) => {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM subscription_history WHERE user_id = ? ORDER BY created_at DESC';
            db.all(query, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    },

    getWeekStart: (date = new Date()) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    },
 
     // Clean up expired email verification tokens
    cleanupExpiredEmailTokens: () => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('DELETE FROM email_verification_tokens WHERE expires_at < datetime("now")');
            stmt.run(function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ deleted: this.changes });
                }
            });
            stmt.finalize();
        });
    },

    // Update subscription status
    updateSubscriptionStatus: (userId, status) => {
        return new Promise((resolve, reject) => {
            const stmt = db.prepare('UPDATE subscription_history SET status = ? WHERE user_id = ? AND status = "active"');
            stmt.run([status, userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
            stmt.finalize();
        });
    }
};

module.exports = { db, dbHelpers };