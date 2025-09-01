# Railway Deployment Guide

This guide explains how to deploy the AI Article Audiobook application to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. GitHub repository with your code
3. Required API keys and environment variables

## Deployment Steps

### 1. Connect to Railway

1. Go to https://railway.app and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 2. Configure Environment Variables

In your Railway project dashboard, go to the Variables tab and add:

```
NODE_ENV=production
PORT=3001
JWT_SECRET=your-secure-jwt-secret-here
SESSION_SECRET=your-secure-session-secret-here
GEMINI_API_KEY=your-gemini-api-key-here
FRONTEND_URL=https://your-app-name.up.railway.app
RAILWAY_STATIC_URL=https://your-app-name.up.railway.app

# Email Configuration (choose one)
# For Brevo:
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=your-brevo-email
EMAIL_PASS=your-brevo-smtp-key
EMAIL_FROM=noreply@yourdomain.com

# For Outlook/Hotmail:
# EMAIL_HOST=smtp-mail.outlook.com
# EMAIL_PORT=587
# EMAIL_USER=your-outlook-email
# EMAIL_PASS=your-outlook-password
# EMAIL_FROM=your-outlook-email
```

### 3. Update Frontend URLs

After deployment, update the frontend configuration:

1. Note your Railway app URL (e.g., `https://your-app-name.up.railway.app`)
2. Update `FRONTEND_URL` and `RAILWAY_STATIC_URL` environment variables with this URL
3. Update `public/js/config.js` if it contains hardcoded API URLs

### 4. Database

The application uses SQLite which will be automatically created on Railway's persistent storage.

### 5. Deploy

Railway will automatically deploy when you push to your connected branch. Monitor the deployment in the Railway dashboard.

## Post-Deployment

1. Test all functionality:
   - User registration/login
   - Article processing
   - Audio generation
   - Email functionality

2. Monitor logs in Railway dashboard for any issues

## Troubleshooting

- **Build fails**: Check that all dependencies are in `package.json`
- **App crashes**: Check environment variables are set correctly
- **CORS errors**: Ensure `FRONTEND_URL` matches your Railway domain
- **Email not working**: Verify email configuration and credentials

## Local Development

To run locally:

1. Copy `backend/.env.example` to `backend/.env`
2. Fill in your local environment variables
3. Run `npm run dev` for development mode