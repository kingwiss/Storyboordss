# Quick Railway Deployment Guide

## 🚀 Deploy Your Backend in 5 Minutes

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Click "Login" and sign in with GitHub
3. Authorize Railway to access your repositories

### Step 2: Deploy from GitHub
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository: `kingwiss/Storyboordss`
4. Railway will automatically detect your backend

### Step 3: Configure Environment Variables
In your Railway project dashboard, go to Variables tab and add:

```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
FRONTEND_URL=https://fredwesselink.github.io
RAILWAY_STATIC_URL=https://fredwesselink.github.io
PORT=3000
```

### Step 4: Get Your Deployment URL
1. After deployment completes, Railway will provide a URL like:
   `https://your-app-name.up.railway.app`
2. Copy this URL

### Step 5: Update Frontend Configuration
1. Open `public/config.js` in your repository
2. Replace the Railway URL with your actual deployment URL:
   ```javascript
   API_BASE_URL: window.location.hostname === 'localhost' 
       ? 'http://localhost:3001'
       : 'https://YOUR-ACTUAL-RAILWAY-URL.up.railway.app',
   ```
3. Commit and push the changes

### Step 6: Test Your Authentication
1. Go to your GitHub Pages site
2. Try signing up with a test account
3. Verify login/logout functionality works

## 🔧 Troubleshooting

### If signup still fails:
1. Check Railway logs for errors
2. Verify all environment variables are set
3. Ensure CORS is configured for your GitHub Pages domain
4. Check that the database is properly initialized

### Common Issues:
- **CORS Error**: Make sure `FRONTEND_URL` matches your GitHub Pages URL exactly
- **Database Error**: Railway automatically provides a database, no additional setup needed
- **JWT Error**: Ensure `JWT_SECRET` is set and is a long random string

## 📝 Notes
- Railway provides free tier with 500 hours/month
- Your backend will sleep after 30 minutes of inactivity
- First request after sleep may take 10-15 seconds to wake up
- Database persists even when app sleeps

## 🎯 Expected Result
After following these steps:
- ✅ Backend deployed and running on Railway
- ✅ Frontend connects to deployed backend
- ✅ User registration and login work on GitHub Pages
- ✅ Authentication persists across sessions