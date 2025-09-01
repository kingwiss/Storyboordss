// Configuration for different environments
const CONFIG = {
    // API Base URL - change this for production deployment
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001'
        : 'https://your-backend-url.railway.app', // Replace with your actual backend URL
    
    // Environment detection
    IS_DEVELOPMENT: window.location.hostname === 'localhost',
    IS_PRODUCTION: window.location.hostname !== 'localhost'
};

// Helper function to get full API URL
function getApiUrl(endpoint) {
    return `${CONFIG.API_BASE_URL}${endpoint}`;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getApiUrl };
} else {
    window.CONFIG = CONFIG;
    window.getApiUrl = getApiUrl;
}