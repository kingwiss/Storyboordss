# Backend Deployment with GitHub Actions

This guide explains how to deploy your backend using GitHub Actions to various cloud platforms.

## Prerequisites

1. A GitHub repository with your code
2. A cloud hosting account (Railway, Heroku, or DigitalOcean)
3. Backend code in the `backend/` directory

## Step 1: Choose Your Hosting Platform

### Option A: Railway (Recommended)

1. **Create Railway Account**:
   - Go to [railway.app](https://railway.app)
   - Sign up with your GitHub account

2. **Create New Project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Select the `backend` folder as the root directory

3. **Get Railway Credentials**:
   - Go to your Railway project settings
   - Copy your `Railway Token` and `Service ID`

### Option B: Heroku

1. **Create Heroku Account**:
   - Go to [heroku.com](https://heroku.com)
   - Create an account

2. **Create New App**:
   - Click "New" → "Create new app"
   - Choose a unique app name
   - Select your region

3. **Get Heroku Credentials**:
   - Go to Account Settings → API Key
   - Copy your API key

### Option C: DigitalOcean App Platform

1. **Create DigitalOcean Account**:
   - Go to [digitalocean.com](https://digitalocean.com)
   - Create an account

2. **Create App**:
   - Go to Apps → Create App
   - Connect your GitHub repository
   - Configure the backend service

## Step 2: Configure GitHub Repository Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

### For Railway Deployment:
```
RAILWAY_TOKEN=your_railway_token_here
RAILWAY_SERVICE_ID=your_service_id_here
```

### For Heroku Deployment:
```
HEROKU_API_KEY=your_heroku_api_key_here
HEROKU_APP_NAME=your_app_name_here
HEROKU_EMAIL=your_heroku_email_here
```

### For DigitalOcean Deployment:
```
DO_TOKEN=your_digitalocean_token_here
DO_APP_NAME=your_app_name_here
```

### Required Environment Variables (for all platforms):
```
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret_key
EMAIL_HOST=your_smtp_host
EMAIL_PORT=your_smtp_port
EMAIL_USER=your_email_username
EMAIL_PASS=your_email_password
EMAIL_FROM=your_from_email_address
```

## Step 3: Configure Your Hosting Platform

### Railway Configuration:
1. In your Railway project, go to Variables
2. Add all the environment variables listed above
3. Railway will automatically detect your Node.js app

### Heroku Configuration:
1. In your Heroku app dashboard, go to Settings → Config Vars
2. Add all the environment variables listed above
3. Make sure your `backend/package.json` has a `start` script

### DigitalOcean Configuration:
1. In your DO App settings, go to Environment Variables
2. Add all the environment variables listed above
3. Configure the build and run commands if needed

## Step 4: Update GitHub Actions Workflow

The workflow file `.github/workflows/backend-deploy.yml` is already created. To use a different platform:

1. **For Railway**: No changes needed (default)
2. **For Heroku**: Uncomment the Heroku section and comment out Railway
3. **For DigitalOcean**: Uncomment the DigitalOcean section and comment out Railway

## Step 5: Deploy

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add backend deployment workflow"
   git push origin main
   ```

2. **Monitor Deployment**:
   - Go to your GitHub repository → Actions
   - Watch the deployment process
   - Check for any errors in the logs

3. **Get Your Backend URL**:
   - **Railway**: `https://your-service-name.railway.app`
   - **Heroku**: `https://your-app-name.herokuapp.com`
   - **DigitalOcean**: `https://your-app-name.ondigitalocean.app`

## Step 6: Update Frontend Configuration

Once your backend is deployed:

1. **Update `public/config.js`**:
   ```javascript
   const API_BASE_URL = isDevelopment() 
     ? 'http://localhost:3001'
     : 'https://your-actual-backend-url.com'; // Replace with your deployed URL
   
   const BACKEND_DEPLOYED = true; // Change to true
   ```

2. **Commit and push the changes**:
   ```bash
   git add public/config.js
   git commit -m "Update backend URL for production"
   git push origin main
   ```

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check that all dependencies are in `backend/package.json`
   - Ensure Node.js version compatibility
   - Verify environment variables are set correctly

2. **Database Connection Issues**:
   - Make sure `DATABASE_URL` is correctly formatted
   - Check if your hosting platform provides a database
   - Consider using Railway's built-in PostgreSQL

3. **CORS Errors**:
   - Update your backend CORS configuration
   - Add your GitHub Pages URL to allowed origins

4. **Environment Variables Not Working**:
   - Double-check secret names in GitHub
   - Ensure secrets are available to the workflow
   - Verify the hosting platform received the variables

## Security Notes

- Never commit secrets to your repository
- Use strong, unique values for `JWT_SECRET`
- Regularly rotate your API keys and tokens
- Use environment-specific configurations

## Next Steps

After successful deployment:
1. Test all authentication endpoints
2. Verify database connectivity
3. Test email functionality
4. Monitor application logs
5. Set up monitoring and alerts

For more detailed platform-specific instructions, refer to:
- [Railway Documentation](https://docs.railway.app)
- [Heroku Documentation](https://devcenter.heroku.com)
- [DigitalOcean App Platform Documentation](https://docs.digitalocean.com/products/app-platform)