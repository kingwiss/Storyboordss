# AI Image Generation Configuration

## Overview
This document outlines the configuration for the AI image generation pipeline used in the Storyboordss application.

## Components

### 1. Gemini AI
- **Purpose**: Generates contextual prompts based on article content
- **Environment Variable**: `GEMINI_API_KEY`
- **API Key**: `AIzaSyAg2zoZs9ptl4wRgr4FrEEwD0npsEO7ezs`

### 2. Pollinations.ai
- **Primary Model**: `flux`
- **Secondary Model**: `turbo`
- **Resolution**: 800x600
- **Enhancement**: Enabled
- **Retry Attempts**: 4

### 3. Fallback System
- **Service**: Picsum Photos
- **Trigger**: When Pollinations.ai is unavailable or fails

## Configuration Steps

1. **Railway Dashboard**:
   - Add `GEMINI_API_KEY` environment variable
   - Deploy changes
   - Wait 1-2 minutes for deployment completion

2. **Verification**:
   - Check Railway logs for successful API calls
   - Verify images are generated from Pollinations.ai
   - Confirm no demo images are displayed

## Troubleshooting

- If demo images appear, verify `GEMINI_API_KEY` is properly set in Railway
- Check Railway logs for API errors
- Verify frontend is correctly calling the backend API