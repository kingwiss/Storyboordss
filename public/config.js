// Auto-detect environment and set API base URL
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3001';
    }
    
    // Production - GitHub Pages deployment (same server for frontend and backend)
    return window.location.origin;
};

// Backend deployment status - ALWAYS TRUE for unified server
const BACKEND_DEPLOYED = true;

// Helper functions
const getApiUrl = (endpoint) => {
    const baseUrl = getApiBaseUrl();
    return endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
};

const checkBackendHealth = async () => {
    try {
        const response = await fetch(getApiUrl('/api/auth/health'));
        return response.ok;
    } catch (error) {
        console.warn('Backend health check failed:', error);
        return false;
    }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, getApiUrl, isBackendAvailable, showBackendMessage };
} else {
    window.CONFIG = CONFIG;
    window.getApiUrl = getApiUrl;
    window.isBackendAvailable = isBackendAvailable;
    window.showBackendMessage = showBackendMessage;
}