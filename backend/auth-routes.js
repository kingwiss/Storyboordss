const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const { db } = require('./database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Utility function for consistent error responses
const sendError = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    error: message
  };
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }
  return res.status(statusCode).json(response);
};

// Utility function for success responses
const sendSuccess = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    ...data
  });
};

// Middleware for token authentication
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return sendError(res, 401, 'Access token required');
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return sendError(res, 403, 'Invalid or expired token');
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Token authentication error:', error);
    return sendError(res, 500, 'Authentication error');
  }
};

// Input validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 6;
};

const validateUsername = (username) => {
  return username && username.length >= 3 && username.length <= 50;
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Input validation
    if (!username || !email || !password) {
      return sendError(res, 400, 'Username, email, and password are required');
    }

    if (!validateUsername(username)) {
      return sendError(res, 400, 'Username must be between 3 and 50 characters');
    }

    if (!validateEmail(email)) {
      return sendError(res, 400, 'Please provide a valid email address');
    }

    if (!validatePassword(password)) {
      return sendError(res, 400, 'Password must be at least 6 characters long');
    }

    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM users WHERE email = ? OR username = ?',
        [email, username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (existingUser) {
      return sendError(res, 400, 'Username or email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const userId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: userId, 
        username: username,
        email: email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`User registered successfully: ${username} (${email})`);

    // Return success response
    return sendSuccess(res, {
      token,
      user: {
        id: userId,
        username,
        email
      }
    }, 201);

  } catch (error) {
    console.error('Registration error:', error);
    return sendError(res, 500, 'Registration failed. Please try again.');
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return sendError(res, 400, 'Email and password are required');
    }

    if (!validateEmail(email)) {
      return sendError(res, 400, 'Please provide a valid email address');
    }

    // Find user in database
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email, password_hash FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return sendError(res, 401, 'Invalid email or password');
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return sendError(res, 401, 'Invalid email or password');
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`User logged in successfully: ${user.username} (${user.email})`);

    // Return success response
    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return sendError(res, 500, 'Login failed. Please try again.');
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email FROM users WHERE id = ?',
        [req.user.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    return sendSuccess(res, {
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Get user info error:', error);
    return sendError(res, 500, 'Failed to get user information');
  }
});

// Logout endpoint (client-side token removal, but we can track it server-side if needed)
router.post('/logout', authenticateToken, (req, res) => {
  // In a more complex system, you might want to blacklist the token
  // For now, we'll just return success and let the client remove the token
  console.log(`User logged out: ${req.user.username}`);
  return sendSuccess(res, { message: 'Logged out successfully' });
});

// Health check for auth system
router.get('/health', (req, res) => {
  return sendSuccess(res, { 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Authentication Service'
  });
});

// Forgot Password endpoint
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Input validation
    if (!email) {
      return sendError(res, 400, 'Email is required');
    }

    if (!validateEmail(email)) {
      return sendError(res, 400, 'Please provide a valid email address');
    }

    // Find user in database
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, username, email FROM users WHERE email = ?',
        [email],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return sendSuccess(res, { 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [user.id, resetToken, expiresAt.toISOString()],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    // Send email using SendGrid with template
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password.html?token=${resetToken}`;
    
    const msg = {
      to: user.email,
      from: process.env.SENDGRID_FROM_EMAIL || 'fredwisseh@gmail.com',
      templateId: process.env.SENDGRID_TEMPLATE_ID,
      dynamicTemplateData: {
        username: user.username,
        reset_url: resetUrl,
        site_name: process.env.SITE_NAME || 'Cerebray'
      }
    };

    await sgMail.send(msg);

    console.log(`Password reset email sent to: ${user.email}`);
    console.log(`Message ID: ${msg.messageId || 'N/A'}`);
    console.log(`Reset URL: ${resetUrl}`);

    return sendSuccess(res, { 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return sendError(res, 500, 'Failed to process password reset request. Please try again.');
  }
});

// Reset Password endpoint
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    // Input validation
    if (!token || !password) {
      return sendError(res, 400, 'Token and new password are required');
    }

    if (!validatePassword(password)) {
      return sendError(res, 400, 'Password must be at least 6 characters long');
    }

    // Find valid reset token
    const resetToken = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime("now")',
        [token],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!resetToken) {
      return sendError(res, 400, 'Invalid or expired reset token');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Update user password
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [hashedPassword, resetToken.user_id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Mark token as used
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE password_reset_tokens SET used = 1 WHERE token = ?',
        [token],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log(`Password reset successful for user ID: ${resetToken.user_id}`);

    return sendSuccess(res, { 
      message: 'Password reset successful. You can now login with your new password.' 
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return sendError(res, 500, 'Failed to reset password. Please try again.');
  }
});

module.exports = router;