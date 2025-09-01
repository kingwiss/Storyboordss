// Configuration for different environments
const CONFIG = {
    // API Base URL - change this for production deployment
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001'
        : null, // Backend not deployed yet - will show appropriate message
    
    // Environment detection
    IS_DEVELOPMENT: window.location.hostname === 'localhost',
    IS_PRODUCTION: window.location.hostname !== 'localhost',
    
    // Backend deployment status
    BACKEND_DEPLOYED: window.location.hostname === 'localhost'
};

// Helper function to get full API URL
function getApiUrl(endpoint) {
    if (!CONFIG.BACKEND_DEPLOYED) {
        throw new Error('Backend not deployed yet. Please deploy the backend first and update the API_BASE_URL in config.js');
    }
    return `${CONFIG.API_BASE_URL}${endpoint}`;
}

// Helper function to check if backend is available
function isBackendAvailable() {
    return CONFIG.BACKEND_DEPLOYED;
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