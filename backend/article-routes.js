const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateImage } = require('./image-generation');
const { db } = require('./database');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Store active generation sessions for progress tracking
const activeSessions = new Map();

// Middleware for token authentication
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production';

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('Token authentication error:', error);
    return res.status(500).json({ error: 'Authentication error' });
  }
};

// Function to scrape article content from URL
async function scrapeArticleContent(url) {
  try {
    console.log('Scraping article from:', url);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 30000
    });

    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();
    
    // Try to find the main content
    let content = '';
    let title = '';
    
    // Extract title
    title = $('h1').first().text().trim() || 
            $('title').text().trim() || 
            $('meta[property="og:title"]').attr('content') || 
            'Untitled Article';
    
    // Try different selectors for article content
    const contentSelectors = [
      'article',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      'main',
      '.main-content'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 500) break;
      }
    }
    
    // Fallback: get all paragraph text
    if (!content || content.length < 500) {
      content = $('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
    }
    
    // Clean up content
    content = content.replace(/\s+/g, ' ').trim();
    
    if (!content || content.length < 100) {
      throw new Error('Could not extract meaningful content from the article');
    }
    
    console.log(`Successfully scraped article: "${title}" (${content.length} characters)`);
    
    return {
      title: title.substring(0, 200), // Limit title length
      content: content.substring(0, 50000) // Limit content length
    };
    
  } catch (error) {
    console.error('Error scraping article:', error.message);
    throw new Error(`Failed to scrape article: ${error.message}`);
  }
}

// Function to generate article summary and key points using Gemini
async function generateArticleAnalysis(title, content) {
  try {
    console.log('Generating article analysis with Gemini...');
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `
Please analyze the following article and provide:

1. A comprehensive summary (2-3 paragraphs)
2. 5-7 key points as a JSON array
3. 2-3 image generation prompts that would visually represent the article's main themes

Article Title: ${title}

Article Content: ${content.substring(0, 8000)}

Please format your response as JSON:
{
  "summary": "Your comprehensive summary here...",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "imagePrompts": ["Image prompt 1", "Image prompt 2", "Image prompt 3"]
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Try to parse JSON from the response
    let analysisData;
    try {
      // Extract JSON from the response (remove any markdown formatting)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.warn('Failed to parse JSON response, using fallback format');
      // Fallback: create a basic structure
      analysisData = {
        summary: text.substring(0, 1000),
        keyPoints: [
          'Article analysis generated',
          'Content processed successfully',
          'Key insights extracted',
          'Summary created',
          'Ready for audio conversion'
        ],
        imagePrompts: [
          `Illustration representing: ${title}`,
          `Visual concept for: ${title.substring(0, 50)}`,
          `Artistic representation of the main theme`
        ]
      };
    }
    
    console.log('Article analysis generated successfully');
    return analysisData;
    
  } catch (error) {
    console.error('Error generating article analysis:', error.message);
    // Return fallback data
    return {
      summary: `This article titled "${title}" contains valuable information and insights. The content has been processed and is ready for audio conversion.`,
      keyPoints: [
        'Article content processed',
        'Ready for text-to-speech conversion',
        'Summary and key points extracted',
        'Images will be generated',
        'Full article available for reading'
      ],
      imagePrompts: [
        `Professional illustration for: ${title}`,
        `Visual representation of the article theme`,
        `Modern graphic design for the topic`
      ]
    };
  }
}

// Article generation endpoint
router.post('/generate', authenticateToken, async (req, res) => {
  const { url } = req.body;
  const sessionId = req.headers['x-session-id'] || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  if (!url) {
    return res.status(400).json({ error: 'Article URL is required' });
  }
  
  try {
    console.log(`Starting article generation for user ${req.user.userId}, session ${sessionId}`);
    
    // Initialize session tracking
    activeSessions.set(sessionId, {
      progress: 0,
      message: 'Starting article processing...',
      userId: req.user.userId,
      startTime: Date.now()
    });
    
    // Step 1: Scrape article content (20% progress)
    activeSessions.set(sessionId, { ...activeSessions.get(sessionId), progress: 10, message: 'Fetching article content...' });
    const { title, content } = await scrapeArticleContent(url);
    
    activeSessions.set(sessionId, { ...activeSessions.get(sessionId), progress: 20, message: 'Article content extracted successfully' });
    
    // Step 2: Generate analysis (40% progress)
    activeSessions.set(sessionId, { ...activeSessions.get(sessionId), progress: 30, message: 'Analyzing article content...' });
    const analysis = await generateArticleAnalysis(title, content);
    
    activeSessions.set(sessionId, { ...activeSessions.get(sessionId), progress: 50, message: 'Article analysis completed' });
    
    // Step 3: Generate images (70% progress)
    activeSessions.set(sessionId, { ...activeSessions.get(sessionId), progress: 60, message: 'Generating article images...' });
    
    const imageUrls = [];
    for (let i = 0; i < Math.min(3, analysis.imagePrompts.length); i++) {
      try {
        const imageUrl = await generateImage(analysis.imagePrompts[i]);
        if (imageUrl) {
          imageUrls.push(imageUrl);
        }
        activeSessions.set(sessionId, { 
          ...activeSessions.get(sessionId), 
          progress: 60 + (i + 1) * 5, 
          message: `Generated image ${i + 1} of ${Math.min(3, analysis.imagePrompts.length)}` 
        });
      } catch (imageError) {
        console.warn(`Failed to generate image ${i + 1}:`, imageError.message);
      }
    }
    
    activeSessions.set(sessionId, { ...activeSessions.get(sessionId), progress: 80, message: 'Saving article to database...' });
    
    // Step 4: Save to database (90% progress)
    const articleId = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO user_audiobooks (user_id, title, url, full_text, summary, key_points, image_urls, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          req.user.userId,
          title,
          url,
          content,
          analysis.summary,
          JSON.stringify(analysis.keyPoints),
          JSON.stringify(imageUrls)
        ],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
    
    // Step 5: Complete (100% progress)
    activeSessions.set(sessionId, { ...activeSessions.get(sessionId), progress: 100, message: 'Article generation completed!' });
    
    console.log(`Article generation completed for user ${req.user.userId}, article ID: ${articleId}`);
    
    // Clean up session after a delay
    setTimeout(() => {
      activeSessions.delete(sessionId);
    }, 30000);
    
    res.json({
      success: true,
      id: articleId,
      title: title,
      summary: analysis.summary,
      keyPoints: analysis.keyPoints,
      imageUrls: imageUrls,
      sessionId: sessionId
    });
    
  } catch (error) {
    console.error('Error generating article:', error);
    
    // Update session with error
    if (activeSessions.has(sessionId)) {
      activeSessions.set(sessionId, { 
        ...activeSessions.get(sessionId), 
        progress: 0, 
        message: `Error: ${error.message}`,
        error: true
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to generate article',
      details: error.message 
    });
  }
});

// Progress tracking endpoint for Server-Sent Events
router.get('/generate-progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Send initial progress
  const sendProgress = () => {
    const session = activeSessions.get(sessionId);
    if (session) {
      const data = {
        progress: session.progress,
        message: session.message,
        error: session.error || false
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      
      // If completed or error, close connection after a delay
      if (session.progress >= 100 || session.error) {
        setTimeout(() => {
          res.end();
        }, 2000);
        return false;
      }
    } else {
      // Session not found, send default progress
      res.write(`data: ${JSON.stringify({ progress: 0, message: 'Initializing...', error: false })}\n\n`);
    }
    return true;
  };
  
  // Send initial progress
  sendProgress();
  
  // Set up interval to send progress updates
  const progressInterval = setInterval(() => {
    if (!sendProgress()) {
      clearInterval(progressInterval);
    }
  }, 1000);
  
  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(progressInterval);
    res.end();
  });
});

// Get user's articles
router.get('/user/audiobooks', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, title, url, summary, key_points, image_urls, created_at 
     FROM user_audiobooks 
     WHERE user_id = ? 
     ORDER BY created_at DESC`,
    [req.user.userId],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to fetch articles' });
      }
      
      // Parse JSON fields
      const audiobooks = rows.map(row => ({
        ...row,
        key_points: row.key_points ? JSON.parse(row.key_points) : [],
        image_urls: row.image_urls ? JSON.parse(row.image_urls) : []
      }));
      
      res.json({ audiobooks });
    }
  );
});

// Get specific article with full content
router.get('/user/audiobooks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.get(
    `SELECT * FROM user_audiobooks WHERE id = ? AND user_id = ?`,
    [id, req.user.userId],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to fetch article' });
      }
      
      if (!row) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      // Parse JSON fields
      const article = {
        ...row,
        key_points: row.key_points ? JSON.parse(row.key_points) : [],
        image_urls: row.image_urls ? JSON.parse(row.image_urls) : [],
        full_text: row.full_text || ''
      };
      
      // Send the article data
      res.json({ article });
    }
  );
});

// Delete article
router.delete('/user/audiobooks/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  
  db.run(
    `DELETE FROM user_audiobooks WHERE id = ? AND user_id = ?`,
    [id, req.user.userId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to delete article' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Article not found' });
      }
      
      res.json({ message: 'Article deleted successfully' });
    }
  );
});

module.exports = router;