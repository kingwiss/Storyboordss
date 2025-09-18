require('dotenv').config();
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate an image using Gemini API for text-to-image generation
 * @param {string} prompt - The text prompt for image generation
 * @returns {Promise<string>} - Base64 encoded image data
 */
async function generateImageWithGemini(prompt) {
    try {
        console.log('Generating image with Gemini:', prompt.substring(0, 100));
        
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Generate image using Gemini
        const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType: 'image/svg+xml', data: createPlaceholderSVG('Generating...') } }
        ]);
        
        const response = await result.response;
        const text = response.text();
        
        // Extract image URL from response if available
        // Note: This is a placeholder as Gemini doesn't directly generate images
        // In a real implementation, we would use the appropriate API method
        
        // For now, return a placeholder SVG
        return `data:image/svg+xml;base64,${Buffer.from(createImageSVG(prompt)).toString('base64')}`;
    } catch (error) {
        console.error('Error generating image with Gemini:', error.message);
        return null;
    }
}

/**
 * Generate an image using Hugging Face API
 * @param {string} prompt - The text prompt for image generation
 * @returns {Promise<string>} - Base64 encoded image data
 */
async function generateImageWithHuggingFace(prompt) {
    try {
        console.log('Generating image with Hugging Face:', prompt.substring(0, 100));
        
        const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
        if (!HUGGINGFACE_API_KEY) {
            throw new Error('HUGGINGFACE_API_KEY not configured');
        }
        
        // Use Stable Diffusion XL for high-quality images
        const response = await axios({
            method: 'post',
            url: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
            headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            data: { inputs: prompt },
            responseType: 'arraybuffer',
            timeout: 30000
        });
        
        if (response.data && response.data.byteLength > 1000) {
            console.log(`Successfully generated image with Hugging Face (${response.data.byteLength} bytes)`);
            return `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
        } else {
            throw new Error('Invalid response from Hugging Face API');
        }
    } catch (error) {
        console.error('Error generating image with Hugging Face:', error.message);
        return null;
    }
}

/**
 * Generate an image using Pollinations.ai as a fallback
 * @param {string} prompt - The text prompt for image generation
 * @returns {Promise<string>} - Base64 encoded image data
 */
async function generateImageWithPollinations(prompt, model = 'flux') {
    try {
        console.log(`Generating image with Pollinations.ai (${model}):`, prompt.substring(0, 100));
        
        // Clean and encode the prompt for URL
        const cleanedPrompt = prompt.replace(/[<>"']/g, '').trim();
        const encodedPrompt = encodeURIComponent(cleanedPrompt);
        
        // Add random seed to ensure different images each time
        const randomSeed = Math.floor(Math.random() * 1000000) + Date.now();
        
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=600&nologo=true&enhance=true&model=${model}&seed=${randomSeed}`;
        
        const response = await axios({
            method: 'get',
            url: imageUrl,
            responseType: 'arraybuffer',
            timeout: 25000,
            headers: {
                'User-Agent': 'AI-Article-Audiobook/1.0'
            }
        });
        
        if (response.data && response.data.byteLength > 1000) {
            console.log(`Successfully generated image with Pollinations.ai (${response.data.byteLength} bytes)`);
            return `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
        } else {
            throw new Error('Invalid response from Pollinations.ai');
        }
    } catch (error) {
        console.error(`Error generating image with Pollinations.ai (${model}):`, error.message);
        return null;
    }
}

/**
 * Generate an image using multiple services with fallbacks
 * @param {string} prompt - The text prompt for image generation
 * @returns {Promise<string>} - Base64 encoded image data or fallback SVG
 */
async function generateImage(prompt) {
    // Try Pollinations.ai with flux model first (user preference)
    console.log('Attempting image generation with Flux AI model...');
    const pollinationsFluxImage = await generateImageWithPollinations(prompt, 'flux');
    if (pollinationsFluxImage) {
        console.log('Successfully generated image with Flux AI model');
        return pollinationsFluxImage;
    }
    
    // Try Pollinations.ai with turbo model as backup
    console.log('Flux AI failed, trying Pollinations.ai turbo model...');
    const pollinationsTurboImage = await generateImageWithPollinations(prompt, 'turbo');
    if (pollinationsTurboImage) {
        console.log('Successfully generated image with Pollinations.ai turbo model');
        return pollinationsTurboImage;
    }
    
    // Try Hugging Face as last resort
    console.log('Pollinations.ai failed, trying Hugging Face as last resort...');
    const huggingFaceImage = await generateImageWithHuggingFace(prompt);
    if (huggingFaceImage) {
        console.log('Successfully generated image with Hugging Face');
        return huggingFaceImage;
    }
    
    // If all else fails, generate a placeholder SVG
    console.log('All image generation attempts failed, using SVG placeholder');
    return `data:image/svg+xml;base64,${Buffer.from(createImageSVG(prompt)).toString('base64')}`;
}

/**
 * Create a placeholder SVG image
 * @param {string} text - Text to display in the SVG
 * @returns {string} - SVG markup
 */
function createPlaceholderSVG(text) {
    return `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#4A90E2"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${text}</text>
    </svg>`;
}

/**
 * Create a more detailed SVG image based on the prompt
 * @param {string} prompt - The original image prompt
 * @returns {string} - SVG markup
 */
function createImageSVG(prompt) {
    // Extract a short version of the prompt for display
    const shortPrompt = prompt.length > 50 ? prompt.substring(0, 50) + '...' : prompt;
    
    return `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#2C3E50;stop-opacity:1" />
            </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" rx="15" ry="15"/>
        <rect x="50" y="50" width="700" height="500" fill="rgba(255,255,255,0.1)" rx="10" ry="10" stroke="#ffffff" stroke-width="2" stroke-opacity="0.3"/>
        <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="24" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">Image Generation Failed</text>
        <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="18" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">${shortPrompt}</text>
        <text x="50%" y="90%" font-family="Arial, sans-serif" font-size="14" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">Cerebray AI</text>
    </svg>`;
}

/**
 * Generate a placeholder SVG (wrapper function for server compatibility)
 * @param {string} prompt - The text prompt for the placeholder
 * @returns {string} - Base64 encoded SVG data URL
 */
function generatePlaceholderSVG(prompt) {
    return `data:image/svg+xml;base64,${Buffer.from(createImageSVG(prompt)).toString('base64')}`;
}

module.exports = {
    generateImage,
    generateImageWithHuggingFace,
    generateImageWithPollinations,
    generateImageWithGemini,
    generatePlaceholderSVG,
    createImageSVG,
    createPlaceholderSVG
};