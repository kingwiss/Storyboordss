# AI Article Audiobook

An intelligent web application that converts articles into interactive audiobooks with AI-generated images, summaries, and text-to-speech narration.

## Features

- **Article Processing**: Extract and display full article content from URLs
- **AI-Generated Images**: Create 2-3 contextual images per article using Stable Diffusion
- **Text-to-Speech**: Convert articles to audio with synchronized word highlighting
- **Interactive Controls**: Play/pause, speed control, and progress tracking
- **Smart Summaries**: AI-generated summaries and key points
- **Responsive Design**: Modern, ebook-style layout

## Setup Instructions

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
```

### 2. Configure API Keys

Create a `.env` file in the `backend` directory with the following keys:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
HUGGINGFACE_API_KEY=your_hugging_face_api_key_here
```

#### Getting API Keys:

**Google Gemini API Key:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

**Hugging Face API Key (for AI Image Generation):**
1. Visit [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Create a new token with "Inference API" permissions
3. Copy the token to your `.env` file

> **Note**: Without the Hugging Face API key, the application will use placeholder images instead of AI-generated ones.

### 3. Run the Application

```bash
# Start the backend server (from backend directory)
npm start

# Start the frontend server (from root directory)
npm run dev
```

### 4. Access the Application

Open your browser and navigate to `http://localhost:3000`

## Usage

1. Enter any article URL in the input field
2. Click "Generate Audiobook" to process the article
3. View the generated images, summary, and key points
4. Use the audio controls to listen to the article with synchronized highlighting

## API Rate Limits

- **Free Hugging Face Account**: ~300 requests per hour
- **Hugging Face Pro ($9/month)**: 1000+ requests per hour
- **Google Gemini**: Generous free tier available

## Troubleshooting

### Images Not Generating
- Ensure your Hugging Face API key is correctly set in the `.env` file
- Check that you have sufficient API quota remaining
- Verify the backend server is running without errors

### Audio Not Playing
- Check browser permissions for audio playback
- Ensure the backend server is accessible

### Article Not Loading
- Verify the URL is accessible and contains readable content
- Some websites may block automated content extraction

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express.js
- **AI Services**: Google Gemini (text), Hugging Face Stable Diffusion (images)
- **Audio**: Web Speech API (text-to-speech)