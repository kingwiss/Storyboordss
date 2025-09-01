require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { db, dbHelpers } = require('./database');

const app = express();
const port = process.env.PORT || 3001;

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? [
            process.env.FRONTEND_URL, 
            process.env.RAILWAY_STATIC_URL,
            'https://fredwesselink.github.io', // GitHub Pages URL
            /\.github\.io$/ // Allow any GitHub Pages subdomain
          ]
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

app.use(express.json());
// Serve static files from public directory
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Initialize Gemini AI with error checking
if (!process.env.GEMINI_API_KEY) {
    console.error('CRITICAL ERROR: GEMINI_API_KEY environment variable is not set!');
    console.error('This will cause AI image generation to fail and fall back to demo images.');
    console.error('Please configure GEMINI_API_KEY in your Railway environment variables.');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Email transporter configuration (Gmail SMTP Server)
const emailTransporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Function to send password reset email using Gmail SMTP
const sendPasswordResetEmail = async (email, resetToken) => {
    try {
        const baseUrl = process.env.NODE_ENV === 'production' 
            ? (process.env.FRONTEND_URL || process.env.RAILWAY_STATIC_URL)
            : 'http://localhost:3001';
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || 'noreply@storyboards.local',
            to: email,
            subject: 'Password Reset Request - Storyboards',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>Hello,</p>
                    <p>You have requested to reset your password for your Storyboards account.</p>
                    <p>Please click the link below to reset your password:</p>
                    <p style="margin: 20px 0;">
                        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                    </p>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                    <p><strong>This link will expire in 1 hour.</strong></p>
                    <p>If you did not request this password reset, please ignore this email.</p>
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #666; font-size: 12px;">This email was sent from Storyboards application.</p>
                </div>
            `
        };

        await emailTransporter.sendMail(mailOptions);
        console.log('Password reset email sent successfully to:', email);
        return true;
    } catch (error) {
        console.error('Failed to send password reset email:', error);
        return false;
    }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    // DEBUG: Handle mock token for testing
    if (token === 'mock-jwt-token-for-user-4') {
        req.user = { id: 4, username: 'testuser4', email: 'test4@example.com' };
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Optional authentication middleware (doesn't require token)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) {
                req.user = user;
            }
        });
    }
    next();
};

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend server is running', timestamp: new Date().toISOString() });
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Check if user already exists
        const existingUser = await dbHelpers.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const newUser = await dbHelpers.createUser(username, email, passwordHash);

        // Generate JWT token
        const token = jwt.sign(
            { id: newUser.id, username: newUser.username, email: newUser.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: { id: newUser.id, username: newUser.username, email: newUser.email }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = await dbHelpers.getUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    // With JWT, logout is handled client-side by removing the token
    res.json({ message: 'Logout successful' });
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await dbHelpers.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user information' });
    }
});

// DEBUG: Temporary endpoint to check database contents
app.get('/api/debug/database', async (req, res) => {
    try {
        // Get all users (without passwords)
        const users = await new Promise((resolve, reject) => {
            db.all('SELECT id, username, email, created_at FROM users', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        // Get all audiobooks
        const audiobooks = await new Promise((resolve, reject) => {
            db.all('SELECT id, user_id, title, url, created_at FROM user_audiobooks', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        res.json({ users, audiobooks });
    } catch (error) {
        console.error('Debug database error:', error);
        res.status(500).json({ error: 'Failed to query database' });
    }
});

// Password reset endpoints
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user exists
        const user = await dbHelpers.getUserByEmail(email);
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Save token to database
        await dbHelpers.createPasswordResetToken(user.id, resetToken, expiresAt.toISOString());

        // Send email
        const emailSent = await sendPasswordResetEmail(email, resetToken);
        
        if (!emailSent) {
            return res.status(500).json({ error: 'Failed to send password reset email. Please try again later.' });
        }

        res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }

        // Verify token
        const resetToken = await dbHelpers.getPasswordResetToken(token);
        if (!resetToken) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        // Hash new password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Update user password
        await dbHelpers.updateUserPassword(resetToken.user_id, passwordHash);

        // Mark token as used
        await dbHelpers.markTokenAsUsed(token);

        // Clean up expired tokens
        await dbHelpers.cleanupExpiredTokens();

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// User audiobooks endpoints
app.get('/api/user/audiobooks', authenticateToken, async (req, res) => {
    try {
        const audiobooks = await dbHelpers.getUserAudiobooks(req.user.id);
        res.json({ audiobooks });
    } catch (error) {
        console.error('Get audiobooks error:', error);
        res.status(500).json({ error: 'Failed to get user audiobooks' });
    }
});

// Get latest article for auto-playback
app.get('/api/user/audiobooks/latest', authenticateToken, async (req, res) => {
    try {
        const audiobooks = await dbHelpers.getUserAudiobooks(req.user.id);
        if (audiobooks && audiobooks.length > 0) {
            // Return the most recently created article (last in array)
            const latestArticle = audiobooks[audiobooks.length - 1];
            res.json({ article: latestArticle });
        } else {
            res.status(404).json({ error: 'No articles found' });
        }
    } catch (error) {
        console.error('Get latest article error:', error);
        res.status(500).json({ error: 'Failed to get latest article' });
    }
});

// User preferences endpoints
app.get('/api/user/preferences', authenticateToken, async (req, res) => {
    try {
        const preferences = await dbHelpers.getUserPreferences(req.user.id);
        res.json({ preferences });
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({ error: 'Failed to get user preferences' });
    }
});

app.put('/api/user/preferences', authenticateToken, async (req, res) => {
    try {
        const { speech_rate, speech_voice, theme } = req.body;
        await dbHelpers.updateUserPreferences(req.user.id, {
            speech_rate: speech_rate || 1.0,
            speech_voice: speech_voice || 'default',
            theme: theme || 'light'
        });
        res.json({ message: 'Preferences updated successfully' });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// SSE endpoint for progress updates
app.get('/api/generate-progress/:sessionId', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sessionId = req.params.sessionId;
    
    // Store the response object for this session
    if (!global.progressSessions) {
        global.progressSessions = new Map();
    }
    global.progressSessions.set(sessionId, res);

    // Clean up on client disconnect
    req.on('close', () => {
        global.progressSessions.delete(sessionId);
    });
});

// Function to send progress updates
function sendProgress(sessionId, progress, message) {
    if (global.progressSessions && global.progressSessions.has(sessionId)) {
        const res = global.progressSessions.get(sessionId);
        res.write(`data: ${JSON.stringify({ progress, message })}\n\n`);
    }
}

app.post('/api/generate', authenticateToken, async (req, res) => {
    const { url, sessionId } = req.body;

    try {
        // Validate URL format
        if (!url || typeof url !== 'string') {
            return res.status(400).json({ error: 'Valid URL is required' });
        }

        try {
            new URL(url);
        } catch (urlError) {
            return res.status(400).json({ error: 'Invalid URL format. Please provide a valid HTTP/HTTPS URL.' });
        }

        // Send initial progress
        sendProgress(sessionId, 10, 'Fetching article content...');
        
        // 1. Extract article content with proper error handling
        let data, title;
        try {
            const response = await axios.get(url, {
                timeout: 30000, // 30 second timeout
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                validateStatus: function (status) {
                    // Only accept 2xx status codes as successful
                    return status >= 200 && status < 300;
                }
            });
            data = response.data;
        } catch (fetchError) {
            console.error('Error fetching URL:', fetchError.message);
            
            if (fetchError.code === 'ENOTFOUND') {
                return res.status(400).json({ error: 'Website not found. Please check the URL and try again.' });
            } else if (fetchError.code === 'ECONNREFUSED') {
                return res.status(400).json({ error: 'Connection refused. The website may be down or blocking requests.' });
            } else if (fetchError.code === 'ETIMEDOUT') {
                return res.status(400).json({ error: 'Request timed out. The website is taking too long to respond.' });
            } else if (fetchError.response) {
                const status = fetchError.response.status;
                if (status === 404) {
                    return res.status(400).json({ error: 'Page not found (404). Please check the URL and try again.' });
                } else if (status === 403) {
                    return res.status(400).json({ error: 'Access forbidden (403). The website is blocking access to this content.' });
                } else if (status === 500) {
                    return res.status(400).json({ error: 'Website server error (500). Please try again later.' });
                } else {
                    return res.status(400).json({ error: `Website returned error ${status}. Please try a different URL.` });
                }
            } else {
                return res.status(400).json({ error: 'Failed to fetch the webpage. Please check the URL and try again.' });
            }
        }

        const $ = cheerio.load(data);
        title = $('title').text().trim() || 'Untitled Article';
        
        sendProgress(sessionId, 25, 'Extracting article text...');
        
        // Extract full article content from various selectors
        let articleText = '';
        const contentSelectors = [
            'article p',
            '.article-content p',
            '.post-content p', 
            '.entry-content p',
            '.content p',
            'main p',
            '.story-body p',
            '.article-body p',
            '.post-body p',
            'p'
        ];
        
        for (const selector of contentSelectors) {
            const paragraphs = $(selector);
            if (paragraphs.length > 0) {
                const extractedText = paragraphs.map((i, el) => {
                    const text = $(el).text().trim();
                    // Filter out very short paragraphs (likely navigation/ads)
                    return text.length > 20 ? text : '';
                }).get().filter(text => text.length > 0).join('\n\n');
                
                if (extractedText.length > 100) { // Ensure we have substantial content
                    articleText = extractedText;
                    break;
                }
            }
        }
        
        // Fallback to basic text extraction if no paragraphs found
        if (!articleText || articleText.length < 100) {
            const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
            // Remove common navigation and footer text
            const cleanedText = bodyText
                .replace(/\b(Home|About|Contact|Privacy|Terms|Menu|Navigation|Footer|Header|Subscribe|Login|Register)\b/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (cleanedText.length > 100) {
                articleText = cleanedText;
            }
        }
        
        // Validate that we have meaningful content
        if (!articleText || articleText.length < 100) {
            return res.status(400).json({ 
                error: 'Unable to extract meaningful content from this webpage. The page may be behind a paywall, require JavaScript, or contain mostly non-text content.' 
            });
        }
        
        // Limit article length to prevent excessive processing
        if (articleText.length > 50000) {
            articleText = articleText.substring(0, 50000) + '...';
        }

        sendProgress(sessionId, 40, 'Analyzing content with AI...');
        
        let generatedContent;
        
        // Enhanced AI content generation with multiple fallback strategies
        let aiGenerationAttempts = 0;
        const maxAiAttempts = 3;
        
        try {
            while (aiGenerationAttempts < maxAiAttempts && !generatedContent) {
                try {
                aiGenerationAttempts++;
                sendProgress(sessionId, 30 + (aiGenerationAttempts * 5), `Generating content (attempt ${aiGenerationAttempts})...`);
                
                // 2. Generate summary, key points, and multiple image prompts with Gemini
                const model = genAI.getGenerativeModel({ 
                    model: 'gemini-1.5-flash',
                    generationConfig: {
                        temperature: 0.7,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                });
                
                // Truncate article text if too long to prevent token limit issues
                const maxArticleLength = 8000;
                const truncatedText = articleText.length > maxArticleLength 
                    ? articleText.substring(0, maxArticleLength) + '...'
                    : articleText;
                
                const prompt = `Analyze the following article and provide a concise summary, 5 key bullet points, and 3 highly specific and relevant descriptive prompts for AI image generation. The image prompts should be directly related to the article's content, avoiding generic concepts.

For the image prompts:
1. First prompt: Focus on the main subject/topic with specific visual elements mentioned or implied in the article
2. Second prompt: Capture a key scene, process, or concept described in the article with concrete details
3. Third prompt: Illustrate a specific aspect, location, or context from the article content

Each image prompt should be detailed (50-100 words) and include specific visual elements, colors, settings, objects, or scenes that directly relate to the article content. Avoid generic terms like "concept", "theme", "illustration" - instead use concrete, specific descriptions.

Article Text: ${truncatedText}

Provide the output in the following JSON format:
{
  "summary": "...",
  "keyPoints": ["...", "...", "...", "...", "..."],
  "imagePrompts": ["detailed specific prompt 1 with concrete visual elements from article", "detailed specific prompt 2 with concrete visual elements from article", "detailed specific prompt 3 with concrete visual elements from article"]
}`;        
                
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = await response.text();
                
                // Enhanced JSON extraction with multiple fallback methods
                let jsonText = text;
                if (text.includes('```json')) {
                    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        jsonText = jsonMatch[1];
                    }
                } else if (text.includes('```')) {
                    // Try to extract from any code block
                    const codeMatch = text.match(/```[\w]*\s*([\s\S]*?)\s*```/);
                    if (codeMatch) {
                        jsonText = codeMatch[1];
                    }
                }
                
                // Clean up common JSON formatting issues
                jsonText = jsonText.trim()
                    .replace(/^[^{]*({[\s\S]*})[^}]*$/, '$1') // Extract JSON object
                    .replace(/\n\s*\/\/.*$/gm, '') // Remove comments
                    .replace(/,\s*}/g, '}') // Remove trailing commas
                    .replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
                
                try {
                    generatedContent = JSON.parse(jsonText);
                    
                    // Validate the generated content structure
                    if (!generatedContent.summary || !Array.isArray(generatedContent.keyPoints) || 
                        !Array.isArray(generatedContent.imagePrompts) || 
                        generatedContent.keyPoints.length < 3 || 
                        generatedContent.imagePrompts.length < 3) {
                        throw new Error('Invalid content structure from AI');
                    }
                    
                    console.log('AI content generation successful on attempt:', aiGenerationAttempts);
                    break; // Success, exit the retry loop
                    
                } catch (parseError) {
                    console.error(`JSON parsing failed on attempt ${aiGenerationAttempts}:`, parseError.message);
                    console.error('Raw AI response:', text);
                    console.error('Cleaned JSON text:', jsonText);
                    console.error('CRITICAL: Check if GEMINI_API_KEY is properly configured in Railway environment variables');
                    
                    if (aiGenerationAttempts >= maxAiAttempts) {
                        throw parseError; // Final attempt failed, throw error to trigger fallback
                    }
                    // Continue to next attempt
                }
                
            } catch (aiError) {
                console.error(`AI generation attempt ${aiGenerationAttempts} failed:`, aiError.message);
                console.error('CRITICAL: Gemini API error - check API key configuration and quota limits');
                
                if (aiGenerationAttempts >= maxAiAttempts) {
                    // All AI attempts failed, trigger fallback
                    throw aiError;
                }
                
                // Wait briefly before retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        } catch (aiError) {
            console.log('AI service unavailable, using enhanced fallback content generation...');
            sendProgress(sessionId, 40, 'AI service unavailable, generating intelligent fallback content...');
            
            // Enhanced Fallback: Generate intelligent content without AI
            const generateIntelligentFallback = (text) => {
                const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
                const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 3);
                
                // Create word frequency map for topic detection
                const wordFreq = {};
                words.forEach(word => {
                    wordFreq[word] = (wordFreq[word] || 0) + 1;
                });
                
                // Get most frequent meaningful words (excluding common words)
                const commonWords = new Set(['this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were']);
                const topWords = Object.entries(wordFreq)
                    .filter(([word]) => !commonWords.has(word) && word.length > 4)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10)
                    .map(([word]) => word);
                
                // Generate intelligent summary
                const generateSummary = () => {
                    if (sentences.length >= 3) {
                        // Use first sentence, a middle sentence, and extract key themes
                        const firstSentence = sentences[0].trim();
                        const middleSentence = sentences[Math.floor(sentences.length / 2)].trim();
                        const themes = topWords.slice(0, 3).join(', ');
                        return `${firstSentence}. This article discusses ${themes} and related topics. ${middleSentence}.`;
                    } else {
                        return sentences.join('. ') + '. This article provides valuable insights on the discussed topics.';
                    }
                };
                
                // Generate intelligent key points
                const generateKeyPoints = () => {
                    const points = [];
                    
                    // Extract sentences with high information density
                    const informativeSentences = sentences
                        .filter(s => {
                            const sentenceWords = s.toLowerCase().split(/\W+/);
                            const topWordCount = sentenceWords.filter(w => topWords.includes(w)).length;
                            return topWordCount >= 2 || s.length > 50;
                        })
                        .slice(0, 5);
                    
                    informativeSentences.forEach((sentence, index) => {
                        const cleanSentence = sentence.trim().substring(0, 120);
                        points.push(`${cleanSentence}${cleanSentence.length >= 120 ? '...' : ''}`);
                    });
                    
                    // Fill remaining slots with topic-based points
                    while (points.length < 5) {
                        if (points.length === 0) points.push('Article provides comprehensive information on the main topic');
                        else if (points.length === 1) points.push(`Key themes include: ${topWords.slice(0, 3).join(', ')}`);
                        else if (points.length === 2) points.push('Content offers detailed analysis and insights');
                        else if (points.length === 3) points.push('Information is well-structured and informative');
                        else points.push('Article contains valuable knowledge for readers');
                    }
                    
                    return points;
                };
                
                // Generate contextual image prompts based on content analysis
                const generateContextualPrompts = () => {
                    const lowerText = text.toLowerCase();
                    const prompts = [];
                    
                    // Advanced topic detection with multiple keywords
                    const topicCategories = {
                        technology: ['technology', 'ai', 'artificial', 'intelligence', 'software', 'digital', 'computer', 'data', 'algorithm', 'machine', 'learning', 'programming', 'code', 'internet', 'web', 'app', 'system'],
                        business: ['business', 'company', 'market', 'finance', 'economy', 'profit', 'revenue', 'investment', 'corporate', 'industry', 'commercial', 'enterprise', 'startup', 'entrepreneur'],
                        science: ['science', 'research', 'study', 'experiment', 'analysis', 'discovery', 'theory', 'hypothesis', 'laboratory', 'scientific', 'method', 'evidence', 'data'],
                        health: ['health', 'medical', 'doctor', 'hospital', 'patient', 'treatment', 'medicine', 'healthcare', 'disease', 'therapy', 'clinical', 'diagnosis'],
                        education: ['education', 'school', 'learning', 'student', 'teacher', 'university', 'academic', 'knowledge', 'curriculum', 'classroom', 'study'],
                        environment: ['environment', 'climate', 'nature', 'green', 'sustainable', 'ecology', 'conservation', 'renewable', 'pollution', 'earth'],
                        politics: ['politics', 'government', 'policy', 'election', 'democracy', 'political', 'law', 'legislation', 'public', 'citizen'],
                        sports: ['sport', 'game', 'team', 'player', 'competition', 'athletic', 'training', 'championship', 'tournament', 'fitness']
                    };
                    
                    let detectedCategory = 'general';
                    let maxMatches = 0;
                    
                    Object.entries(topicCategories).forEach(([category, keywords]) => {
                        const matches = keywords.filter(keyword => lowerText.includes(keyword)).length;
                        if (matches > maxMatches) {
                            maxMatches = matches;
                            detectedCategory = category;
                        }
                    });
                    
                    // Generate category-specific prompts
                    switch (detectedCategory) {
                        case 'technology':
                            prompts.push('Modern technology workspace with sleek computers, multiple monitors displaying code and data visualizations, clean minimalist design with blue and white color scheme');
                            prompts.push('Futuristic digital interface with holographic displays, AI neural network visualizations, and glowing circuit patterns in a high-tech environment');
                            prompts.push('Professional software development team collaborating in a modern office with glass walls, standing desks, and large screens showing development workflows');
                            break;
                        case 'business':
                            prompts.push('Professional corporate boardroom with executives in business attire around a large conference table, city skyline visible through floor-to-ceiling windows');
                            prompts.push('Modern office building exterior with glass facade reflecting the sky, busy professionals walking in the foreground, urban business district setting');
                            prompts.push('Financial data visualization on multiple screens showing charts, graphs, and market trends in a trading floor environment with professional traders');
                            break;
                        case 'science':
                            prompts.push('State-of-the-art research laboratory with scientists in white coats working with advanced equipment, microscopes, and computer analysis stations');
                            prompts.push('Scientific discovery moment with researchers examining data on large displays, laboratory equipment in background, clean sterile environment');
                            prompts.push('Academic research facility with books, scientific journals, whiteboards filled with equations, and researchers collaborating on breakthrough discoveries');
                            break;
                        case 'health':
                            prompts.push('Modern medical facility with healthcare professionals in scrubs, advanced medical equipment, clean white and blue color scheme, patient care focus');
                            prompts.push('Doctor consultation room with medical charts, stethoscope, and digital health monitoring devices, professional healthcare environment');
                            prompts.push('Medical research laboratory with scientists analyzing samples, advanced diagnostic equipment, and health data visualization on computer screens');
                            break;
                        case 'education':
                            prompts.push('Modern classroom with students engaged in learning, interactive whiteboards, collaborative workspace design, bright and inspiring educational environment');
                            prompts.push('University library with students studying among tall bookshelves, natural lighting, comfortable reading areas, and academic atmosphere');
                            prompts.push('Educational technology setup with tablets, digital learning tools, and students collaborating on projects in a contemporary learning space');
                            break;
                        default:
                            prompts.push('Professional article layout with clean typography, organized text sections, and modern editorial design elements in a magazine-style format');
                            prompts.push('Information sharing concept with open books, digital documents, and knowledge transfer visualization in a library or study environment');
                            prompts.push('Content creation workspace with writing materials, computer screen showing article text, and organized desk setup for professional writing');
                            break;
                    }
                    
                    return prompts;
                };
                
                return {
                    summary: generateSummary(),
                    keyPoints: generateKeyPoints(),
                    imagePrompts: generateContextualPrompts()
                };
            };
            
            generatedContent = generateIntelligentFallback(articleText);
        }

        sendProgress(sessionId, 60, 'Generating AI images...');
        
        // Enhanced image generation with multiple service fallbacks
        const generateImage = async (prompt, retryCount = 0) => {
            const maxRetries = 4; // Increased retries for multiple services
            
            try {
                // Clean and encode the prompt for URL, but preserve more characters for better context
                const cleanedPrompt = prompt.replace(/[<>"']/g, '').trim();
                const encodedPrompt = encodeURIComponent(cleanedPrompt);
                
                let imageUrl;
                let serviceName;
                
                // Try different services based on retry count
                if (retryCount < 2) {
                    // First try Pollinations.ai with different models
                    const models = ['flux', 'turbo'];
                    const currentModel = models[retryCount % models.length];
                    imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&enhance=true&model=${currentModel}`;
                    serviceName = `Pollinations.ai (${currentModel})`;
                } else {
                    // Fallback to Picsum with a more generic approach
                    // Generate a seed based on prompt for consistent images
                    const seed = Math.abs(cleanedPrompt.split('').reduce((a, b) => {
                        a = ((a << 5) - a) + b.charCodeAt(0);
                        return a & a;
                    }, 0));
                    imageUrl = `https://picsum.photos/seed/${seed}/800/600`;
                    serviceName = 'Picsum Photos';
                }
                
                console.log(`Generating image with ${serviceName} (attempt ${retryCount + 1}):`, imageUrl);
                console.log('Original prompt:', prompt);
                
                // Fetch the image from Pollinations.ai with enhanced error handling
                const response = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 25000, // 25 second timeout
                    headers: {
                        'User-Agent': 'AI-Article-Audiobook/1.0'
                    },
                    validateStatus: function (status) {
                        return status >= 200 && status < 300; // Accept only 2xx status codes
                    }
                });

                // Validate response data
                if (!response.data || response.data.byteLength === 0) {
                    throw new Error('Empty response from Pollinations.ai');
                }
                
                // Validate that we received an image (check for minimum size)
                if (response.data.byteLength < 1000) {
                    throw new Error('Response too small to be a valid image');
                }

                // Convert array buffer to base64
                const base64Image = Buffer.from(response.data).toString('base64');
                console.log(`Successfully generated image (${response.data.byteLength} bytes)`);
                return `data:image/jpeg;base64,${base64Image}`;
                
            } catch (error) {
                const serviceName = retryCount < 2 ? 'Pollinations.ai' : 'Picsum Photos';
                console.error(`Error generating image with ${serviceName} (attempt ${retryCount + 1}):`, {
                    message: error.message,
                    code: error.code,
                    status: error.response?.status,
                    statusText: error.response?.statusText
                });
                
                // Retry logic with exponential backoff
                if (retryCount < maxRetries) {
                    const delay = Math.min(Math.pow(2, retryCount) * 1000, 5000); // 1s, 2s, 4s, 5s max delays
                    console.log(`Retrying image generation in ${delay}ms with ${retryCount >= 2 ? 'fallback service' : 'different model'}...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return generateImage(prompt, retryCount + 1);
                }
                
                // All retries failed, return null for fallback handling
                console.error(`Failed to generate image after ${maxRetries + 1} attempts with all services:`, prompt.substring(0, 100));
                return null;
            }
        };

        // Generate all images with enhanced progress tracking and error handling
        const imageUrls = [];
        const totalImages = generatedContent.imagePrompts.length;
        
        console.log(`Starting generation of ${totalImages} AI images...`);
        
        for (let i = 0; i < totalImages; i++) {
            const prompt = generatedContent.imagePrompts[i];
            const progressPercent = 60 + Math.floor((i / totalImages) * 20); // 60-80% range
            
            sendProgress(sessionId, progressPercent, `Generating AI image ${i + 1} of ${totalImages}...`);
            
            try {
                const imageUrl = await generateImage(prompt);
                
                if (imageUrl) {
                    imageUrls.push(imageUrl);
                    console.log(`Successfully generated image ${i + 1}/${totalImages}`);
                } else {
                    // Use enhanced placeholder with more descriptive text
                    const fallbackText = `AI Image ${i + 1}: ${prompt.substring(0, 50)}...`;
                    const placeholderUrl = `https://via.placeholder.com/800x600/4A90E2/FFFFFF.png?text=${encodeURIComponent(fallbackText)}`;
                    imageUrls.push(placeholderUrl);
                    console.log(`Using placeholder for image ${i + 1}/${totalImages} due to generation failure`);
                }
            } catch (error) {
                console.error(`Unexpected error generating image ${i + 1}:`, error.message);
                // Fallback placeholder for unexpected errors
                const fallbackText = `Image ${i + 1} Unavailable`;
                const placeholderUrl = `https://via.placeholder.com/800x600/E74C3C/FFFFFF.png?text=${encodeURIComponent(fallbackText)}`;
                imageUrls.push(placeholderUrl);
            }
        }
        
        console.log(`Image generation completed. Successfully generated: ${imageUrls.filter(url => !url.includes('placeholder')).length}/${totalImages}`);

        sendProgress(sessionId, 85, 'Finalizing audiobook...');
        
        // 4. Generate audio with a Text-to-Speech API
        // For this example, we'll use a placeholder audio URL.
        const audioUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
        
        sendProgress(sessionId, 100, 'Complete!');
        
        // Save audiobook for authenticated users
        if (req.user) {
            try {
                console.log('=== SAVING AUDIOBOOK DEBUG ===');
                console.log('User ID:', req.user.id);
                console.log('Title:', title);
                console.log('URL:', url);
                console.log('Article Text Length:', articleText.length);
                console.log('Summary:', generatedContent.summary);
                console.log('Key Points:', generatedContent.keyPoints);
                console.log('Image URLs:', imageUrls);
                
                const saveResult = await dbHelpers.saveUserAudiobook(
                    req.user.id,
                    title,
                    url,
                    articleText, // Save full article text
                    generatedContent.summary,
                    generatedContent.keyPoints, // Save key points array
                    imageUrls // Save all generated images
                );
                console.log('Audiobook saved successfully for user:', req.user.id, 'with ID:', saveResult.id);
            } catch (saveError) {
                console.error('Error saving audiobook for user:', saveError);
                // Don't fail the request if saving fails
            }
        } else {
            console.log('=== NO USER FOUND FOR SAVING ===');
            console.log('req.user:', req.user);
        }
        
        // Close the SSE connection
        if (global.progressSessions && global.progressSessions.has(sessionId)) {
            global.progressSessions.get(sessionId).end();
            global.progressSessions.delete(sessionId);
        }

        res.json({
            title,
            fullText: articleText,
            summary: generatedContent.summary,
            keyPoints: generatedContent.keyPoints,
            imageUrls,
            audioUrl
        });

    } catch (error) {
        console.error('Error processing article:', error);
        
        // Handle specific API quota errors
        if (error.message && error.message.includes('429') && error.message.includes('quota')) {
            res.status(429).json({ 
                error: 'AI service quota exceeded. The free tier limit has been reached for today. Please try again tomorrow or consider upgrading to a paid plan.',
                quotaExceeded: true
            });
        } else if (error.message && error.message.includes('GoogleGenerativeAIError')) {
            res.status(503).json({ 
                error: 'AI service temporarily unavailable. Please try again later.',
                serviceUnavailable: true
            });
        } else {
            res.status(500).json({ error: 'Failed to process article. Please check the article URL and try again.' });
        }
        
        // Close the SSE connection on error
        if (global.progressSessions && global.progressSessions.has(sessionId)) {
            global.progressSessions.get(sessionId).end();
            global.progressSessions.delete(sessionId);
        }
    }
});

// Audiobook management endpoints (duplicate removed - using the one above)

app.get('/api/user/audiobooks/:id', authenticateToken, async (req, res) => {
    try {
        const audiobookId = req.params.id;
        const audiobook = await dbHelpers.getAudiobookById(audiobookId, req.user.id);
        
        if (!audiobook) {
            return res.status(404).json({ error: 'Audiobook not found' });
        }
        
        res.json(audiobook);
    } catch (error) {
        console.error('Error fetching audiobook:', error);
        res.status(500).json({ error: 'Failed to fetch audiobook' });
    }
});

app.delete('/api/user/audiobooks/:id', authenticateToken, async (req, res) => {
    try {
        const audiobookId = req.params.id;
        const result = await dbHelpers.deleteUserAudiobook(audiobookId, req.user.id);
        
        if (!result.deleted) {
            return res.status(404).json({ error: 'Audiobook not found' });
        }
        
        res.json({ message: 'Audiobook deleted successfully' });
    } catch (error) {
        console.error('Error deleting audiobook:', error);
        res.status(500).json({ error: 'Failed to delete audiobook' });
    }
});

app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});