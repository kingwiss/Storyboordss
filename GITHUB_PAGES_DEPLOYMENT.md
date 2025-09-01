# GitHub Pages Deployment Guide

## Frontend Deployment

The frontend application has been successfully configured for GitHub Pages deployment.

### Deployment Configuration

- **GitHub Actions Workflow**: `.github/workflows/static.yml`
- **Deployment Branch**: `main`
- **Source Directory**: `public/`
- **GitHub Pages URL**: `https://[username].github.io/[repository-name]/`

### API Configuration

The frontend includes environment-aware API configuration:

- **Development**: Uses `http://localhost:3001` for local backend
- **Production**: Configured to use `https://your-backend-url.railway.app` (placeholder)
- **Configuration File**: `public/config.js`

### Files Updated for GitHub Pages

1. **GitHub Actions Workflow** (`.github/workflows/static.yml`)
   - Updated to deploy from `main` branch
   - Configured to upload only `public/` directory

2. **API Configuration** (`public/config.js`)
   - Environment detection
   - Dynamic API URL configuration
   - Helper functions for API calls

3. **HTML Files Updated**:
   - `public/index.html`
   - `public/article-view.html`
   - `public/my-articles.html`
   - `public/reset-password.html`

4. **JavaScript Files Updated**:
   - `public/script.js`
   - `public/my-articles.js`
   - `public/article-view.js`
   - `public/reset-password.html` (inline script)

## Backend Hosting Requirements

### Current Backend Features

- **Node.js/Express Server**: `backend/server.js`
- **Database**: SQLite with user authentication
- **Email Service**: SMTP configuration for password reset
- **API Endpoints**: User management, articles, audiobooks, preferences

### Recommended Hosting Platforms

1. **Railway** (Recommended)
   - Easy deployment from GitHub
   - Built-in database support
   - Environment variable management
   - Custom domain support

2. **Heroku**
   - Git-based deployment
   - Add-ons for databases
   - Environment configuration

3. **DigitalOcean App Platform**
   - Container-based deployment
   - Managed databases
   - Auto-scaling

### Backend Deployment Steps

1. **Choose a hosting platform** (Railway recommended)
2. **Set up environment variables**:
   - `JWT_SECRET`
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
   - Database connection strings (if using external DB)

3. **Update frontend configuration**:
   - Replace `https://your-backend-url.railway.app` in `public/config.js`
   - Use your actual backend deployment URL

4. **Configure CORS**:
   - Update backend to allow requests from GitHub Pages domain
   - Add your GitHub Pages URL to CORS origins

### Environment Variables Required

```env
JWT_SECRET=your-jwt-secret-key
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
PORT=3001
```

## Testing the Deployment

1. **Local Testing**: Frontend is available at `http://localhost:3000/`
2. **GitHub Pages**: Will be available at your GitHub Pages URL after deployment
3. **Backend Connection**: Update `config.js` with actual backend URL for production testing

## Next Steps

1. Deploy backend to chosen hosting platform
2. Update `public/config.js` with actual backend URL
3. Commit and push changes to trigger GitHub Pages deployment
4. Test full application functionality on GitHub Pages

## Troubleshooting

- **API Calls Failing**: Check that backend URL in `config.js` is correct
- **CORS Errors**: Ensure backend allows requests from GitHub Pages domain
- **Authentication Issues**: Verify JWT secret and session handling
- **Email Features**: Confirm SMTP configuration in backend environment