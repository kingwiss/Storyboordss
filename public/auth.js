// Robust Authentication Module
class RobustAuth {
    constructor() {
        this.authToken = localStorage.getItem('authToken');
        this.currentUser = null;
        this.baseURL = CONFIG.API_BASE_URL; // Use the configured API URL
        this.init();
    }

    init() {
        // Initialize authentication on page load
        if (this.authToken) {
            this.validateToken();
        } else {
            // Ensure UI is updated even if no token exists
            this.updateAuthUI();
        }
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Signup form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Logout buttons - both in header and nav
        const logoutBtns = document.querySelectorAll('.logout-btn, #logout-btn, #logout-nav-btn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', () => this.logout());
        });

        // Profile buttons - both in header and nav
        const profileBtns = document.querySelectorAll('#profile-btn, #profile-nav-btn');
        profileBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Handle profile button click - redirect to profile page or show profile modal
                console.log('Profile button clicked');
                // Implement profile functionality here
            });
        });
    }

    // Utility method for making API requests
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors',
        };

        // Add auth token if available
        if (this.authToken && !options.skipAuth) {
            defaultOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
        }

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };

        try {
            console.log(`Making request to: ${url}`, finalOptions);
            
            const response = await fetch(url, finalOptions);
            
            // Check if response is ok
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Network error' }));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`Response from ${endpoint}:`, data);
            
            return data;
        } catch (error) {
            console.error(`Request to ${endpoint} failed:`, error);
            
            // Handle different types of errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Unable to connect to server. Please check if the server is running on port 3001.');
            } else if (error.message.includes('CORS')) {
                throw new Error('CORS error: Server configuration issue. Please contact support.');
            } else {
                throw error;
            }
        }
    }

    // Direct login method for programmatic use
    async login(email, password) {
        // Clear previous errors
        this.clearErrors();
        
        // Validate input
        if (!email || !password) {
            this.showError('login-error', 'Please enter both email and password');
            return false;
        }

        if (!this.isValidEmail(email)) {
            this.showError('login-error', 'Please enter a valid email address');
            return false;
        }

        try {
            console.log('Attempting login for:', email);
            
            const data = await this.makeRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
                skipAuth: true
            });

            if (data.success && data.token) {
                // Store authentication data
                this.authToken = data.token;
                this.currentUser = data.user;
                localStorage.setItem('authToken', this.authToken);
                
                // Update UI
                this.updateAuthUI();
                
                this.showSuccess('Login successful!');
                console.log('Login successful for:', email);
                return true;
            } else {
                this.showError('login-error', data.error || 'Login failed');
                console.error('Login failed:', data.error);
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('login-error', error.message);
            return false;
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const email = formData.get('email') || document.getElementById('login-email')?.value;
        const password = formData.get('password') || document.getElementById('login-password')?.value;
        
        const success = await this.login(email, password);
        if (success) {
            this.closeModal('login-modal');
            form.reset();
        }
    }

    // Direct signup method for programmatic use
    async signup(username, email, password, confirmPassword = null) {
        // Clear previous errors
        this.clearErrors();
        
        // Validate input
        if (!username || !email || !password) {
            this.showError('signup-error', 'Please fill in all required fields');
            return false;
        }

        if (!this.isValidEmail(email)) {
            this.showError('signup-error', 'Please enter a valid email address');
            return false;
        }

        if (confirmPassword && password !== confirmPassword) {
            this.showError('signup-error', 'Passwords do not match');
            return false;
        }

        if (password.length < 6) {
            this.showError('signup-error', 'Password must be at least 6 characters long');
            return false;
        }

        if (username.length < 3) {
            this.showError('signup-error', 'Username must be at least 3 characters long');
            return false;
        }

        try {
            console.log('Attempting signup for:', username, email);
            
            const data = await this.makeRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password }),
                skipAuth: true
            });

            if (data.success && data.token) {
                // Store authentication data
                this.authToken = data.token;
                this.currentUser = data.user;
                localStorage.setItem('authToken', this.authToken);
                
                // Update UI
                this.updateAuthUI();
                
                this.showSuccess('Account created successfully!');
                console.log('Signup successful for:', username);
                return true;
            } else {
                // Provide clearer error messages
                let errorMessage = data.error || 'Registration failed';
                if (errorMessage.includes('already exists') || errorMessage.includes('already in use')) {
                    errorMessage = 'This email is already registered. Please use a different email address or try logging in.';
                }
                this.showError('signup-error', errorMessage);
                console.error('Signup failed:', data.error);
                return false;
            }
        } catch (error) {
            console.error('Signup error:', error);
            this.showError('signup-error', error.message);
            return false;
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        
        const form = event.target;
        const formData = new FormData(form);
        const username = formData.get('username') || document.getElementById('signup-username')?.value;
        const email = formData.get('email') || document.getElementById('signup-email')?.value;
        const password = formData.get('password') || document.getElementById('signup-password')?.value;
        const confirmPassword = formData.get('confirmPassword') || document.getElementById('signup-confirm-password')?.value;
        
        const success = await this.signup(username, email, password, confirmPassword);
        if (success) {
            this.closeModal('signup-modal');
            form.reset();
        }
    }

    async validateToken() {
        if (!this.authToken) return false;

        try {
            const data = await this.makeRequest('/api/auth/me');

            if (data.success && data.user) {
                this.currentUser = data.user;
                this.updateAuthUI();
                return true;
            }
        } catch (error) {
            console.error('Token validation error:', error);
            // Only clear token if it's an authentication error (401)
            if (error.message && error.message.includes('401')) {
                this.logout(false); // Silent logout
            }
        }

        return false;
    }

    async logout(showMessage = true) {
        try {
            // Call logout endpoint if available
            if (this.authToken) {
                await this.makeRequest('/api/auth/logout', {
                    method: 'POST'
                }).catch(() => {
                    // Ignore logout endpoint errors, still clear local data
                    console.log('Logout endpoint not available, clearing local data only');
                });
            }
        } catch (error) {
            console.log('Logout request failed, clearing local data anyway');
        }

        // Clear local data
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        this.updateAuthUI();
        
        if (showMessage) {
            this.showSuccess('Logged out successfully');
        }
    }

    updateAuthUI() {
        const loginBtn = document.getElementById('login-btn');
        const signupBtn = document.getElementById('signup-btn');
        const logoutBtn = document.getElementById('logout-btn');
        const logoutBtnExtra = document.getElementById('logout-btn-extra');
        const logoutNavBtn = document.getElementById('logout-nav-btn');
        const userInfo = document.getElementById('user-info');
        const authSection = document.getElementById('auth-section');
        const profileBtn = document.getElementById('profile-btn');
        const profileNavBtn = document.getElementById('profile-nav-btn');
        const usernameSpan = document.getElementById('username');
        const welcomeText = document.getElementById('welcome-text');

        // Get all elements with auth-logged-in and auth-logged-out classes
        const loggedInElements = document.querySelectorAll('.auth-logged-in');
        const loggedOutElements = document.querySelectorAll('.auth-logged-out');

        if (this.currentUser) {
            // User is logged in
            if (loginBtn) loginBtn.style.display = 'none';
            if (signupBtn) signupBtn.style.display = 'none';
            
            // Show auth section with user info
            if (authSection) authSection.style.display = 'block';
            if (userInfo) userInfo.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (logoutBtnExtra) logoutBtnExtra.style.display = 'inline-block';
            if (logoutNavBtn) logoutNavBtn.style.display = 'block';
            if (profileBtn) profileBtn.style.display = 'inline-block';
            if (profileNavBtn) profileNavBtn.style.display = 'block';
            
            // Update username display
            if (usernameSpan) usernameSpan.textContent = this.currentUser.username;
            if (welcomeText) welcomeText.style.display = 'inline-block';
            
            // Show all logged-in elements, hide all logged-out elements
            loggedInElements.forEach(el => {
                // Override the display style to ensure visibility
                if (el.id === 'profile-nav-btn' || el.id === 'logout-nav-btn') {
                    el.style.display = 'block';
                } else {
                    el.style.display = el.classList.contains('nav-link') ? 'block' : 'flex';
                }
            });
            loggedOutElements.forEach(el => el.style.display = 'none');
            
            // Dispatch event for other pages to know auth state changed
            document.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: {
                    isAuthenticated: true,
                    user: this.currentUser
                }
            }));
        } else {
            // User is not logged in
            if (loginBtn) loginBtn.style.display = 'block';
            if (signupBtn) signupBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (logoutNavBtn) logoutNavBtn.style.display = 'none';
            if (profileBtn) profileBtn.style.display = 'none';
            if (profileNavBtn) profileNavBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';
            if (authSection) authSection.style.display = 'none';
            
            // Hide all logged-in elements, show all logged-out elements
            loggedInElements.forEach(el => el.style.display = 'none');
            loggedOutElements.forEach(el => el.style.display = 'block');
            
            // Dispatch event for other pages to know auth state changed
            document.dispatchEvent(new CustomEvent('authStateChanged', {
                detail: {
                    isAuthenticated: false,
                    user: null
                }
            }));
        }
    }

    showError(elementId, message) {
        const errorElement = document.getElementById(elementId);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            errorElement.className = 'error-message';
            errorElement.style.color = '#dc3545';
            errorElement.style.marginTop = '10px';
            errorElement.style.padding = '8px';
            errorElement.style.backgroundColor = '#f8d7da';
            errorElement.style.border = '1px solid #f5c6cb';
            errorElement.style.borderRadius = '4px';
        }
        console.error('Auth Error:', message);
    }

    showSuccess(message) {
        // Try to find a success message element or create a temporary notification
        const successElement = document.getElementById('success-message');
        if (successElement) {
            successElement.textContent = message;
            successElement.style.display = 'block';
            successElement.className = 'success-message';
            successElement.style.color = '#155724';
            successElement.style.backgroundColor = '#d4edda';
            successElement.style.border = '1px solid #c3e6cb';
            successElement.style.borderRadius = '4px';
            successElement.style.padding = '8px';
            successElement.style.marginTop = '10px';
            setTimeout(() => {
                successElement.style.display = 'none';
            }, 3000);
        } else {
            // Create temporary notification
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.className = 'success-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                z-index: 10000;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 14px;
                max-width: 300px;
            `;
            document.body.appendChild(notification);
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 3000);
        }
        console.log('Auth Success:', message);
    }

    clearErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(element => {
            element.style.display = 'none';
            element.textContent = '';
        });
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
        
        // Also try to close using existing modal close functions
        if (typeof closeModal === 'function') {
            closeModal(modal);
        }
    }

    // Utility method to validate email format
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Public methods for external use
    isAuthenticated() {
        return !!this.authToken && !!this.currentUser;
    }

    getToken() {
        return this.authToken;
    }

    getUser() {
        return this.currentUser;
    }

    // Health check method
    async checkServerHealth() {
        try {
            const data = await this.makeRequest('/api/auth/health', {
                method: 'GET',
                skipAuth: true
            });
            return data.success;
        } catch (error) {
            console.error('Server health check failed:', error);
            return false;
        }
    }
}

// Make RobustAuth available globally immediately after class definition
window.RobustAuth = RobustAuth;

// Initialize authentication when DOM is loaded
let robustAuth;
document.addEventListener('DOMContentLoaded', () => {
    robustAuth = new RobustAuth();
    console.log('Robust Auth initialized');
    
    // Backward compatibility - expose as simpleAuth for existing code
    window.simpleAuth = robustAuth;
    
    // Perform server health check
    robustAuth.checkServerHealth().then(isHealthy => {
        if (!isHealthy) {
            console.warn('Server health check failed - authentication may not work properly');
        } else {
            console.log('Server is healthy and ready for authentication');
        }
    });
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RobustAuth;
}