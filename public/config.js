// Configuration for different environments
const CONFIG = {
    // API Base URL - change this for production deployment
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3002'
        : 'https://storyboordss-production.up.railway.app', // Railway deployment URL
    
    // Environment detection
    IS_DEVELOPMENT: window.location.hostname === 'localhost',
    IS_PRODUCTION: window.location.hostname !== 'localhost',
    
    // Backend deployment status - temporarily set to true for testing
    BACKEND_DEPLOYED: true // Set to true after backend deployment
};

// Helper function to get full API URL
function getApiUrl(endpoint = '') {
    // Allow local development, but require deployment for production
    if (!CONFIG.BACKEND_DEPLOYED && CONFIG.IS_PRODUCTION) {
        throw new Error('Backend deployment required. Please see BACKEND_DEPLOYMENT_GITHUB.md for instructions.');
    }
    return `${CONFIG.API_BASE_URL}${endpoint}`;
}

// Helper function to check if backend is available
function isBackendAvailable() {
    // Backend is available in development or when deployed in production
    return CONFIG.IS_DEVELOPMENT || CONFIG.BACKEND_DEPLOYED;
}

// Helper function to show backend deployment message
function showBackendMessage() {
    return 'Backend deployment required. Please see GITHUB_PAGES_DEPLOYMENT.md for instructions.';
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getApiUrl, isBackendAvailable, showBackendMessage };
} else {
    window.CONFIG = CONFIG;
    window.getApiUrl = getApiUrl;
    window.isBackendAvailable = isBackendAvailable;
    window.showBackendMessage = showBackendMessage;
}