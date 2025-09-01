document.addEventListener('DOMContentLoaded', () => {
    // Authentication elements
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    // Profile button reference removed - will be rebuilt from scratch
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const loginClose = document.getElementById('login-close');
    const signupClose = document.getElementById('signup-close');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const switchToSignup = document.getElementById('switch-to-signup');
    const switchToLogin = document.getElementById('switch-to-login');
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const usernameSpan = document.getElementById('username');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    
    // Main app elements
    const articleUrlInput = document.getElementById('article-url');
    const generateBtn = document.getElementById('generate-btn');
    const loadingContainer = document.getElementById('loading-container');
    const loadingText = document.getElementById('loading-text');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressPercentage = document.getElementById('progress-percentage');
    // Removed audiobook container elements - articles now navigate to dedicated view page
    const scrollToCurrentBtn = document.getElementById('scroll-to-current');
    
    // Authentication state
    let currentUser = null;
    let authToken = localStorage.getItem('authToken');
    
    // Mobile menu functionality
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const headerNav = document.querySelector('header nav');
    
    if (mobileMenuToggle && headerNav) {
        mobileMenuToggle.addEventListener('click', () => {
            headerNav.classList.toggle('mobile-menu-open');
            
            // Update aria-expanded for accessibility
            const isOpen = headerNav.classList.contains('mobile-menu-open');
            mobileMenuToggle.setAttribute('aria-expanded', isOpen);
            
            // Change icon based on state
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.className = isOpen ? 'fas fa-times' : 'fas fa-bars';
            }
        });
        
        // Close mobile menu when clicking on nav links
        const navLinks = headerNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                headerNav.classList.remove('mobile-menu-open');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            });
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!headerNav.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                headerNav.classList.remove('mobile-menu-open');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            }
        });
    }
    
    // Authentication functions
    function showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }
    
    function hideError(element) {
        element.style.display = 'none';
    }
    
    function updateAuthUI() {
        if (currentUser) {
            if (authButtons) authButtons.style.display = 'none';
            if (userInfo) userInfo.style.display = 'flex';
            if (usernameSpan) usernameSpan.textContent = currentUser.username;
        } else {
            if (authButtons) authButtons.style.display = 'flex';
            if (userInfo) userInfo.style.display = 'none';
        }
    }
    
    async function checkAuthStatus() {
        if (authToken && isBackendAvailable()) {
            try {
                const response = await fetch(getApiUrl('/api/auth/me'), {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    },
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    currentUser = data.user;
                    updateAuthUI();
                } else {
                    // Token is invalid, remove it
                    localStorage.removeItem('authToken');
                    authToken = null;
                    currentUser = null;
                    updateAuthUI();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('authToken');
                authToken = null;
                currentUser = null;
                updateAuthUI();
            }
        } else {
            updateAuthUI();
        }
    }
    
    // Modal functions
    function openModal(modal) {
        modal.style.display = 'block';
    }
    
    function closeModal(modal) {
        modal.style.display = 'none';
    }
    
    // Authentication event listeners (with null checks)
    if (loginBtn && loginModal && loginError) {
        loginBtn.addEventListener('click', () => {
            hideError(loginError);
            openModal(loginModal);
        });
    }
    
    if (signupBtn && signupModal && signupError) {
        signupBtn.addEventListener('click', () => {
            hideError(signupError);
            openModal(signupModal);
        });
    }
    
    // Profile functionality removed - will be rebuilt from scratch
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            authToken = null;
            currentUser = null;
            updateAuthUI();
        });
    }
    
    // Modal close events (with null checks)
    if (loginClose && loginModal) {
        loginClose.addEventListener('click', () => closeModal(loginModal));
    }
    if (signupClose && signupModal) {
        signupClose.addEventListener('click', () => closeModal(signupModal));
    }
    
    // Switch between login and signup (with null checks)
    if (switchToSignup && loginModal && signupModal && signupError) {
        switchToSignup.addEventListener('click', () => {
            closeModal(loginModal);
            hideError(signupError);
            openModal(signupModal);
        });
    }
    
    if (switchToLogin && signupModal && loginModal && loginError) {
        switchToLogin.addEventListener('click', () => {
            closeModal(signupModal);
            hideError(loginError);
            openModal(loginModal);
        });
    }
    
    // Forgot Password functionality
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const forgotPasswordClose = document.getElementById('forgot-password-close');
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const forgotPasswordError = document.getElementById('forgot-password-error');
    const forgotPasswordSuccess = document.getElementById('forgot-password-success');
    const backToLoginBtn = document.getElementById('back-to-login');
    
    const resetPasswordModal = document.getElementById('reset-password-modal');
    const resetPasswordClose = document.getElementById('reset-password-close');
    const resetPasswordForm = document.getElementById('reset-password-form');
    const resetPasswordError = document.getElementById('reset-password-error');
    const resetPasswordSuccess = document.getElementById('reset-password-success');

    // Open forgot password modal
    if (forgotPasswordBtn && forgotPasswordModal) {
        forgotPasswordBtn.addEventListener('click', () => {
            closeModal(loginModal);
            openModal(forgotPasswordModal);
        });
    }

    // Close forgot password modal
    if (forgotPasswordClose && forgotPasswordModal) {
        forgotPasswordClose.addEventListener('click', () => closeModal(forgotPasswordModal));
    }

    // Back to login from forgot password
    if (backToLoginBtn && forgotPasswordModal && loginModal) {
        backToLoginBtn.addEventListener('click', () => {
            closeModal(forgotPasswordModal);
            openModal(loginModal);
        });
    }

    // Close reset password modal
    if (resetPasswordClose && resetPasswordModal) {
        resetPasswordClose.addEventListener('click', () => closeModal(resetPasswordModal));
    }

    // Close modals when clicking outside (with null checks)
    if (loginModal || signupModal || forgotPasswordModal || resetPasswordModal) {
        window.addEventListener('click', (event) => {
            if (loginModal && event.target === loginModal) closeModal(loginModal);
            if (signupModal && event.target === signupModal) closeModal(signupModal);
            if (forgotPasswordModal && event.target === forgotPasswordModal) closeModal(forgotPasswordModal);
            if (resetPasswordModal && event.target === resetPasswordModal) closeModal(resetPasswordModal);
        });
    }
    
    // Form submissions (with null checks)
    if (loginForm && loginError) {
        loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(loginError);
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            if (!isBackendAvailable()) {
                showError(loginError, showBackendMessage());
                return;
            }
            
            const response = await fetch(getApiUrl('/api/auth/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('authToken', authToken);
                updateAuthUI();
                closeModal(loginModal);
                loginForm.reset();
            } else {
                showError(loginError, data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Login error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            showError(loginError, `Network error: ${error.message}. Please check console for details.`);
        }
        });
    }
    
    if (signupForm && signupError) {
        signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(signupError);
        
        const username = document.getElementById('signup-username').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        
        if (password !== confirmPassword) {
            showError(signupError, 'Passwords do not match');
            return;
        }
        
        try {
            if (!isBackendAvailable()) {
                showError(signupError, showBackendMessage());
                return;
            }
            
            const response = await fetch(getApiUrl('/api/auth/register'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, email, password })
             });
            
            const data = await response.json();
            
            if (response.ok) {
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('authToken', authToken);
                updateAuthUI();
                closeModal(signupModal);
                signupForm.reset();
            } else {
                showError(signupError, data.error || 'Registration failed');
            }
        } catch (error) {
            console.error('Signup error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            showError(signupError, `Network error: ${error.message}. Please check console for details.`);
        }
        });
    }

    // Forgot Password form submission
    if (forgotPasswordForm && forgotPasswordError && forgotPasswordSuccess) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError(forgotPasswordError);
            hideError(forgotPasswordSuccess);
            
            const email = document.getElementById('forgot-email').value;
            
            try {
                const response = await fetch(getApiUrl('/api/auth/forgot-password'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showError(forgotPasswordSuccess, 'Password reset email sent! Check your inbox for instructions.');
                    forgotPasswordForm.reset();
                } else {
                    showError(forgotPasswordError, data.error || 'Failed to send reset email');
                }
            } catch (error) {
                console.error('Forgot password error:', error);
                showError(forgotPasswordError, 'Network error. Please try again.');
            }
        });
    }

    // Reset Password form submission
    if (resetPasswordForm && resetPasswordError && resetPasswordSuccess) {
        resetPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError(resetPasswordError);
            hideError(resetPasswordSuccess);
            
            const token = document.getElementById('reset-token').value;
            const password = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-new-password').value;
            
            if (password !== confirmPassword) {
                showError(resetPasswordError, 'Passwords do not match');
                return;
            }
            
            try {
                const response = await fetch(getApiUrl('/api/auth/reset-password'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    showError(resetPasswordSuccess, 'Password reset successful! You can now login with your new password.');
                    resetPasswordForm.reset();
                    setTimeout(() => {
                        closeModal(resetPasswordModal);
                        openModal(loginModal);
                    }, 2000);
                } else {
                    showError(resetPasswordError, data.error || 'Failed to reset password');
                }
            } catch (error) {
                console.error('Reset password error:', error);
                showError(resetPasswordError, 'Network error. Please try again.');
            }
        });
    }
    
    // Profile Modal Functions
function initializeProfileModal() {
    const profileBtn = document.getElementById('profile-btn');
    const profileModal = document.getElementById('profile-modal');
    const closeProfileModal = document.getElementById('close-profile-modal');
    const profileNavTabs = document.querySelectorAll('.profile-nav-tab');
    const profileTabContents = document.querySelectorAll('.profile-tab-content');

    // Open profile modal
    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            profileModal.style.display = 'block';
            populateProfileDataImmediately();
            // Load user preferences and populate voice selection
            loadUserPreferences();
            populateVoiceSelection();
        });
    }

    // Close profile modal
    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', () => {
            profileModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === profileModal) {
            profileModal.style.display = 'none';
        }
    });

    // Tab switching functionality
    profileNavTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            profileNavTabs.forEach(t => t.classList.remove('active'));
            profileTabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
                
                // Load specific tab data
                if (targetTab === 'my-articles') {
                    loadUserArticles();
                } else if (targetTab === 'preferences') {
                    loadUserPreferences();
                }
            }
        });
    });

    // Initialize preferences functionality
    initializePreferences();
}

// Populate profile data immediately without loading states
function populateProfileDataImmediately() {
    console.log('populateProfileDataImmediately called');
    console.log('currentUser:', currentUser);
    console.log('authToken:', localStorage.getItem('authToken'));
    
    if (!currentUser) {
        console.error('No user data available');
        // Set fallback values
        updateProfileDisplay({
            username: 'Guest User',
            email: 'Not available',
            createdAt: new Date().toISOString(),
            articleCount: 0,
            lastActivity: null
        });
        return;
    }

    console.log('Displaying user data:', currentUser);
    // Immediately display user data
    const userWithDefaults = {
        username: currentUser.username || 'User',
        email: currentUser.email || 'Not available',
        createdAt: currentUser.created_at || new Date().toISOString(),
        articleCount: 0, // Will be updated asynchronously
        lastActivity: null // Will be updated asynchronously
    };
    
    updateProfileDisplay(userWithDefaults);
    
    // Asynchronously load statistics in the background
    loadProfileStatistics();
}

// Load profile statistics in background (non-blocking)
function loadProfileStatistics() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    fetch(getApiUrl('/api/user/audiobooks'), {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.audiobooks) {
            const articleCount = data.audiobooks.length;
            const lastActivity = data.audiobooks.length > 0 ? data.audiobooks[0].created_at : null;
            
            // Update only the statistics fields
            const totalArticlesElement = document.getElementById('profile-total-articles');
            const lastActivityElement = document.getElementById('profile-last-activity');
            
            if (totalArticlesElement) {
                totalArticlesElement.textContent = articleCount.toString();
            }
            if (lastActivityElement) {
                lastActivityElement.textContent = lastActivity ? new Date(lastActivity).toLocaleDateString() : 'No activity yet';
            }
        }
    })
    .catch(error => {
        console.error('Error loading statistics:', error);
        // Statistics will remain at default values
    });
}

// Update profile display with user data
function updateProfileDisplay(user) {
    const elements = {
        'profile-username': user.username || 'N/A',
        'profile-email': user.email || 'N/A',
        'profile-member-since': user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A',
        'profile-total-articles': user.articleCount || '0',
        'profile-last-activity': user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'N/A'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}

// Enhanced My Articles Tab Management
class MyArticlesManager {
    constructor() {
        this.articles = [];
        this.filteredArticles = [];
        this.currentView = 'grid';
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.isLoading = false;
        
        this.initializeElements();
        this.setupEventListeners();
    }
    
    initializeElements() {
        this.elements = {
            articlesList: document.getElementById('articles-list'),
            articlesLoading: document.getElementById('articles-loading'),
            articlesEmpty: document.getElementById('articles-empty'),
            articlesError: document.getElementById('articles-error'),
            searchInput: document.getElementById('articles-search'),
            clearSearchBtn: document.getElementById('clear-search'),
            filterSelect: document.getElementById('articles-filter'),
            viewSelect: document.getElementById('articles-view'),
            totalCount: document.getElementById('total-articles-count'),
            recentCount: document.getElementById('recent-articles-count'),
            wordsCount: document.getElementById('total-words-count'),
            createFirstBtn: document.getElementById('create-first-article'),
            retryBtn: document.getElementById('retry-load-articles'),
            errorMessage: document.getElementById('articles-error-message')
        };
    }
    
    setupEventListeners() {
        // Search functionality
        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.updateClearButton();
                this.filterAndDisplayArticles();
            });
        }
        
        // Clear search
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.addEventListener('click', () => {
                this.elements.searchInput.value = '';
                this.searchTerm = '';
                this.updateClearButton();
                this.filterAndDisplayArticles();
            });
        }
        
        // Filter and view controls
        if (this.elements.filterSelect) {
            this.elements.filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.filterAndDisplayArticles();
            });
        }
        
        if (this.elements.viewSelect) {
            this.elements.viewSelect.addEventListener('change', (e) => {
                this.currentView = e.target.value;
                this.updateViewLayout();
            });
        }
        
        // Action buttons
        if (this.elements.createFirstBtn) {
            this.elements.createFirstBtn.addEventListener('click', () => {
                this.closeProfileModal();
                this.focusOnUrlInput();
            });
        }
        
        if (this.elements.retryBtn) {
            this.elements.retryBtn.addEventListener('click', () => {
                this.loadArticles();
            });
        }
    }
    
    updateClearButton() {
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.style.display = this.searchTerm ? 'block' : 'none';
        }
    }
    
    closeProfileModal() {
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) {
            profileModal.style.display = 'none';
        }
    }
    
    focusOnUrlInput() {
        const urlInput = document.getElementById('article-url');
        if (urlInput) {
            urlInput.focus();
            urlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    showState(state) {
        // Hide all states first
        Object.values(this.elements).forEach(el => {
            if (el && el.style) {
                el.style.display = 'none';
            }
        });
        
        // Show the requested state
        if (this.elements[state]) {
            this.elements[state].style.display = 'flex';
        }
        
        // Always show the articles list container for grid/list content
        if (state === 'articlesList' && this.elements.articlesList) {
            this.elements.articlesList.style.display = 'grid';
        }
    }
    
    async loadArticles() {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            this.showError('Authentication required. Please log in to view your articles.');
            return;
        }
        
        this.isLoading = true;
        this.showState('articlesLoading');
        
        try {
            const response = await fetch(getApiUrl('/api/user/audiobooks'), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (response.ok && data.audiobooks) {
                this.articles = data.audiobooks.map(audiobook => ({
                    id: audiobook.id,
                    title: audiobook.title || 'Untitled Article',
                    content: audiobook.full_text || '',
                    createdAt: audiobook.created_at,
                    summary: audiobook.summary || '',
                    keyPoints: audiobook.key_points || [],
                    imageUrls: audiobook.image_urls || [],
                    url: audiobook.url || '',
                    wordCount: audiobook.full_text ? audiobook.full_text.split(' ').length : 0
                }));
                
                this.updateStatistics();
                this.filterAndDisplayArticles();
            } else {
                this.showError(data.error || 'Failed to load articles');
            }
        } catch (error) {
            console.error('Error loading articles:', error);
            this.showError('Network error. Please check your connection and try again.');
        } finally {
            this.isLoading = false;
        }
    }
    
    updateStatistics() {
        const totalArticles = this.articles.length;
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const recentArticles = this.articles.filter(article => 
            new Date(article.createdAt) > oneWeekAgo
        ).length;
        
        const totalWords = this.articles.reduce((sum, article) => sum + article.wordCount, 0);
        
        if (this.elements.totalCount) {
            this.elements.totalCount.textContent = totalArticles.toString();
        }
        if (this.elements.recentCount) {
            this.elements.recentCount.textContent = recentArticles.toString();
        }
        if (this.elements.wordsCount) {
            this.elements.wordsCount.textContent = this.formatNumber(totalWords);
        }
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    filterAndDisplayArticles() {
        let filtered = [...this.articles];
        
        // Apply search filter
        if (this.searchTerm) {
            filtered = filtered.filter(article => 
                article.title.toLowerCase().includes(this.searchTerm) ||
                article.content.toLowerCase().includes(this.searchTerm) ||
                article.summary.toLowerCase().includes(this.searchTerm)
            );
        }
        
        // Apply sort filter
        switch (this.currentFilter) {
            case 'recent':
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'longest':
                filtered.sort((a, b) => b.wordCount - a.wordCount);
                break;
            case 'shortest':
                filtered.sort((a, b) => a.wordCount - b.wordCount);
                break;
            default:
                // Keep original order
                break;
        }
        
        this.filteredArticles = filtered;
        this.displayArticles();
    }
    
    displayArticles() {
        if (this.filteredArticles.length === 0) {
            if (this.articles.length === 0) {
                this.showState('articlesEmpty');
            } else {
                // Show "no results" message for search/filter
                this.showNoResults();
            }
            return;
        }
        
        this.showState('articlesList');
        this.updateViewLayout();
        
        const articlesHTML = this.filteredArticles.map(article => 
            this.createArticleCard(article)
        ).join('');
        
        if (this.elements.articlesList) {
            this.elements.articlesList.innerHTML = articlesHTML;
            this.attachArticleEventListeners();
        }
    }
    
    createArticleCard(article) {
        const formattedDate = new Date(article.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const wordCount = this.formatNumber(article.wordCount);
        const preview = article.content ? 
            article.content.substring(0, 150).replace(/\n/g, ' ') + '...' : 
            (article.summary ? article.summary.substring(0, 150) + '...' : 'No preview available');
        
        return `
            <div class="article-card" data-article-id="${article.id}">
                <h4 class="article-title">${this.escapeHtml(article.title)}</h4>
                <div class="article-meta">
                    <span class="article-date">
                        <i class="fas fa-calendar"></i>
                        ${formattedDate}
                    </span>
                    <span class="article-length">${wordCount} words</span>
                </div>
                <p class="article-preview">${this.escapeHtml(preview)}</p>
                <div class="article-actions">
                    <button class="article-action-btn" data-action="read" data-article-id="${article.id}">
                        <i class="fas fa-book-open"></i>
                        Read
                    </button>
                    <button class="article-action-btn" data-action="listen" data-article-id="${article.id}">
                        <i class="fas fa-headphones"></i>
                        Listen
                    </button>
                </div>
            </div>
        `;
    }
    
    attachArticleEventListeners() {
        const articleCards = this.elements.articlesList.querySelectorAll('.article-card');
        const actionButtons = this.elements.articlesList.querySelectorAll('.article-action-btn');
        
        // Card click events
        articleCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on action buttons
                if (!e.target.closest('.article-action-btn')) {
                    const articleId = card.getAttribute('data-article-id');
                    if (articleId) {
                        this.openArticle(articleId);
                    }
                }
            });
        });
        
        // Action button events
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = button.getAttribute('data-action');
                const articleId = button.getAttribute('data-article-id');
                
                if (action === 'read' || action === 'listen') {
                    this.openArticle(articleId);
                }
            });
        });
    }
    
    updateViewLayout() {
        if (!this.elements.articlesList) return;
        
        if (this.currentView === 'list') {
            this.elements.articlesList.className = 'articles-list';
        } else {
            this.elements.articlesList.className = 'articles-grid';
        }
    }
    
    showNoResults() {
        if (this.elements.articlesList) {
            this.elements.articlesList.innerHTML = `
                <div class="articles-empty">
                    <div class="empty-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <h4>No Articles Found</h4>
                    <p>No articles match your current search or filter criteria.</p>
                    <button class="btn-secondary" onclick="myArticlesManager.clearFilters()">
                        <i class="fas fa-times"></i>
                        Clear Filters
                    </button>
                </div>
            `;
            this.elements.articlesList.style.display = 'flex';
        }
    }
    
    clearFilters() {
        this.searchTerm = '';
        this.currentFilter = 'all';
        
        if (this.elements.searchInput) {
            this.elements.searchInput.value = '';
        }
        if (this.elements.filterSelect) {
            this.elements.filterSelect.value = 'all';
        }
        
        this.updateClearButton();
        this.filterAndDisplayArticles();
    }
    
    showError(message) {
        this.showState('articlesError');
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
    }
    
    async openArticle(articleId) {
        // Use the new regenerateArticle function for article regeneration
        regenerateArticle(articleId);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global instance
let myArticlesManager;

// Load user articles for My Articles tab
function loadUserArticles() {
    if (!myArticlesManager) {
        myArticlesManager = new MyArticlesManager();
    }
    myArticlesManager.loadArticles();
}

// Display user articles in the grid






// Load article data into the audiobook viewer
function loadArticleIntoViewer(audiobook) {
    console.log('=== DEBUGGING: loadArticleIntoViewer called ===');
    console.log('audiobook data:', audiobook);
    
    // audiobookTitle removed - articles now navigate to dedicated view page
    
    // fullArticleText removed - articles now navigate to dedicated view page
    
    // articleText removed - articles now navigate to dedicated view page
    
    // summaryText removed - articles now navigate to dedicated view page
    
    // keyPointsList removed - articles now navigate to dedicated view page
    
    // AI images gallery removed - articles now navigate to dedicated view page
    
    // Store current audiobook data globally for audio playback
    window.currentAudiobook = audiobook;
    
    // Audio controls removed - articles now navigate to dedicated view page
    
    showNotification(`Loaded article: ${audiobook.title}`, 'success');
}

// Initialize preferences functionality
function initializePreferences() {
    const saveBtn = document.getElementById('save-preferences');
    const resetBtn = document.getElementById('reset-preferences');
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveUserPreferences);
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', resetUserPreferences);
    }

    // Initialize voice selection when voices are ready
    if (window.speechSynthesis) {
        // Try to populate immediately if voices are already loaded
        if (window.speechSynthesis.getVoices().length > 0) {
            populateVoiceSelection();
        }
        // Also listen for voices changed event
        window.speechSynthesis.addEventListener('voiceschanged', populateVoiceSelection);
    }
}

// Load user preferences
function loadUserPreferences() {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        console.error('No token found');
        return;
    }

    fetch(getApiUrl('/api/user/preferences'), {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.preferences) {
            updatePreferencesDisplay(data.preferences);
        } else {
            console.error('Failed to load preferences:', data.error);
            // Load default preferences
            updatePreferencesDisplay({});
        }
    })
    .catch(error => {
        console.error('Error loading preferences:', error);
        // Load default preferences
        updatePreferencesDisplay({});
    });
}

// Update preferences display
function updatePreferencesDisplay(preferences) {
    const themeSelect = document.getElementById('theme-select');
    const speechRateSelect = document.getElementById('speech-rate-select');
    const speechVoiceSelect = document.getElementById('speech-voice-select');
    
    if (themeSelect) {
        themeSelect.value = preferences.theme || 'light';
    }
    
    if (speechRateSelect) {
        speechRateSelect.value = preferences.speech_rate || 1.0;
    }
    
    if (speechVoiceSelect) {
        speechVoiceSelect.value = preferences.speech_voice || 'default';
    }
}

// Save user preferences
function saveUserPreferences() {
    const token = localStorage.getItem('authToken');
    const themeSelect = document.getElementById('theme-select');
    const speechRateSelect = document.getElementById('speech-rate-select');
    const speechVoiceSelect = document.getElementById('speech-voice-select');
    
    if (!token) {
        console.error('No token found');
        return;
    }

    const preferences = {
        theme: themeSelect ? themeSelect.value : 'light',
        speech_rate: speechRateSelect ? parseFloat(speechRateSelect.value) : 1.0,
        speech_voice: speechVoiceSelect ? speechVoiceSelect.value : 'default'
    };

    fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showNotification('Preferences saved successfully!', 'success');
            // Apply theme if changed using ThemeManager
            if (window.themeManager) {
                window.themeManager.setTheme(preferences.theme);
            } else {
                applyTheme(preferences.theme);
            }
            // Store preferences in localStorage for immediate use
            localStorage.setItem('userPreferences', JSON.stringify(preferences));
            // Store voice preference separately for article-view.js
            if (preferences.speech_voice && preferences.speech_voice !== 'default') {
                localStorage.setItem('preferredVoice', preferences.speech_voice);
            } else {
                localStorage.removeItem('preferredVoice');
            }
        } else {
            console.error('Failed to save preferences:', data.error);
            showNotification('Failed to save preferences', 'error');
        }
    })
    .catch(error => {
        console.error('Error saving preferences:', error);
        showNotification('Error saving preferences', 'error');
    });
}

// Load user preferences from server
function loadUserPreferences() {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    fetch('/api/user/preferences', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.preferences) {
            const prefs = data.preferences;
            // Store in localStorage for immediate access
            localStorage.setItem('userPreferences', JSON.stringify(prefs));
            
            // Apply preferences to UI
            const themeSelect = document.getElementById('theme-select');
            const speechRateSelect = document.getElementById('speech-rate-select');
            const speechVoiceSelect = document.getElementById('speech-voice-select');
            
            if (themeSelect && prefs.theme) {
                themeSelect.value = prefs.theme;
                if (window.themeManager) {
                    window.themeManager.setTheme(prefs.theme);
                } else {
                    applyTheme(prefs.theme);
                }
            }
            if (speechRateSelect && prefs.speech_rate) {
                speechRateSelect.value = prefs.speech_rate;
            }
            if (speechVoiceSelect && prefs.speech_voice) {
                // Ensure voices are populated first
                populateVoiceSelection();
                speechVoiceSelect.value = prefs.speech_voice;
                // Store voice preference for article-view.js
                if (prefs.speech_voice !== 'default') {
                    localStorage.setItem('preferredVoice', prefs.speech_voice);
                }
            }
        }
    })
    .catch(error => {
        console.error('Error loading preferences:', error);
    });
}

// Populate voice selection with available voices
function populateVoiceSelection() {
    const speechVoiceSelect = document.getElementById('speech-voice-select');
    const voiceOptionsList = document.getElementById('voice-options-list');
    if (!speechVoiceSelect || !voiceOptionsList) return;

    // Clear existing options
    speechVoiceSelect.innerHTML = '<option value="default">Default Voice</option>';
    voiceOptionsList.innerHTML = '';

    if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        
        // Filter for English voices and sort by quality
        const englishVoices = voices.filter(voice => 
            voice.lang.startsWith('en')
        ).sort((a, b) => {
            // Prioritize high-quality voices
            const aScore = (a.name.includes('Premium') ? 3 : 0) + 
                          (a.name.includes('Enhanced') ? 2 : 0) + 
                          (a.name.includes('Neural') ? 2 : 0) + 
                          (a.localService === false ? 1 : 0);
            const bScore = (b.name.includes('Premium') ? 3 : 0) + 
                          (b.name.includes('Enhanced') ? 2 : 0) + 
                          (b.name.includes('Neural') ? 2 : 0) + 
                          (b.localService === false ? 1 : 0);
            return bScore - aScore;
        });

        // Add default voice option to the list
        const defaultOption = createVoiceOption('default', 'Default Voice', 'System default', null);
        voiceOptionsList.appendChild(defaultOption);

        // Add voice options to both select and list
        englishVoices.forEach((voice, index) => {
            // Add to hidden select for form submission
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            speechVoiceSelect.appendChild(option);

            // Add to visual list with preview button
            const voiceOption = createVoiceOption(voice.name, voice.name, voice.lang, voice);
            voiceOptionsList.appendChild(voiceOption);
        });
        
        // Set selected voice based on user preferences
        const userPreferences = JSON.parse(localStorage.getItem('userPreferences') || '{}');
        const selectedVoice = userPreferences.speech_voice || 'default';
        speechVoiceSelect.value = selectedVoice;
        updateSelectedVoiceOption(selectedVoice);
    }
}

// Create a voice option element with preview button
function createVoiceOption(value, name, details, voice) {
    const voiceOption = document.createElement('div');
    voiceOption.className = 'voice-option';
    voiceOption.dataset.value = value;

    const voiceInfo = document.createElement('div');
    voiceInfo.className = 'voice-option-info';

    const voiceName = document.createElement('div');
    voiceName.className = 'voice-option-name';
    voiceName.textContent = name;

    const voiceDetails = document.createElement('div');
    voiceDetails.className = 'voice-option-details';
    voiceDetails.textContent = details;

    voiceInfo.appendChild(voiceName);
    voiceInfo.appendChild(voiceDetails);

    const previewBtn = document.createElement('button');
    previewBtn.className = 'voice-preview-btn';
    previewBtn.innerHTML = '<i class="fas fa-microphone"></i>';
    previewBtn.title = 'Preview voice';
    previewBtn.type = 'button';

    // Add click handlers
    voiceOption.addEventListener('click', (e) => {
        if (e.target === previewBtn || e.target.closest('.voice-preview-btn')) {
            return; // Don't select when clicking preview button
        }
        selectVoiceOption(value);
    });

    previewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        previewVoice(voice, previewBtn);
    });

    voiceOption.appendChild(voiceInfo);
    voiceOption.appendChild(previewBtn);

    return voiceOption;
}

// Update selected voice option visual state
function updateSelectedVoiceOption(selectedValue) {
    const voiceOptions = document.querySelectorAll('.voice-option');
    voiceOptions.forEach(option => {
        if (option.dataset.value === selectedValue) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

// Select a voice option
function selectVoiceOption(value) {
    const speechVoiceSelect = document.getElementById('speech-voice-select');
    if (speechVoiceSelect) {
        speechVoiceSelect.value = value;
        updateSelectedVoiceOption(value);
    }
}

// Preview voice functionality
let currentPreviewUtterance = null;

function previewVoice(voice, button) {
    // Stop any currently playing preview
    if (currentPreviewUtterance) {
        window.speechSynthesis.cancel();
        // Remove playing class from all buttons
        document.querySelectorAll('.voice-preview-btn.playing').forEach(btn => {
            btn.classList.remove('playing');
        });
    }

    // If this is the default voice or no voice provided
    if (!voice) {
        const sampleText = "Hello! This is a preview of the default voice.";
        currentPreviewUtterance = new SpeechSynthesisUtterance(sampleText);
    } else {
        const sampleText = `Hello! This is a preview of ${voice.name}.`;
        currentPreviewUtterance = new SpeechSynthesisUtterance(sampleText);
        currentPreviewUtterance.voice = voice;
    }

    // Set preview properties
    currentPreviewUtterance.rate = 1.0;
    currentPreviewUtterance.pitch = 1.0;
    currentPreviewUtterance.volume = 0.8;

    // Add visual feedback
    button.classList.add('playing');

    // Handle speech events
    currentPreviewUtterance.onend = () => {
        button.classList.remove('playing');
        currentPreviewUtterance = null;
    };

    currentPreviewUtterance.onerror = () => {
        button.classList.remove('playing');
        currentPreviewUtterance = null;
    };

    // Start speaking
    window.speechSynthesis.speak(currentPreviewUtterance);
}

// Apply theme function - now uses ThemeManager
function applyTheme(theme) {
    if (window.themeManager) {
        window.themeManager.applyTheme(theme);
    }
}

// Reset user preferences
function resetUserPreferences() {
    const themeSelect = document.getElementById('theme-select');
    const speechRateSelect = document.getElementById('speech-rate-select');
    const speechVoiceSelect = document.getElementById('speech-voice-select');
    
    if (themeSelect) themeSelect.value = 'light';
    if (speechRateSelect) speechRateSelect.value = '1';
    if (speechVoiceSelect) speechVoiceSelect.value = 'default';
    
    // Apply default theme using ThemeManager
    if (window.themeManager) {
        window.themeManager.setTheme('light');
    } else {
        applyTheme('light');
    }
    
    showNotification('Preferences reset to default', 'info');
}



// Show profile error
function showProfileError(message) {
    const elements = {
        'profile-username': 'Error',
        'profile-email': 'Error',
        'profile-member-since': 'Error',
        'profile-total-articles': 'Error',
        'profile-last-activity': 'Error'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });
}



// Utility function to escape HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}
    
    // Profile display and preferences functions removed - will be rebuilt from scratch
    
    // Initialize authentication status (this also tests backend connection)
    checkAuthStatus();
    
    // Debug function to check auth state
    window.debugAuth = function() {
        console.log('=== AUTH DEBUG ===');
        console.log('authToken:', authToken);
        console.log('currentUser:', currentUser);
        console.log('localStorage authToken:', localStorage.getItem('authToken'));
        console.log('==================');
    };
    
    // Debug function for authentication testing
    window.debugAuth = function() {
        console.log('=== AUTH DEBUG ===');
        console.log('authToken:', authToken);
        console.log('currentUser:', currentUser);
        console.log('localStorage authToken:', localStorage.getItem('authToken'));
        console.log('Profile button visible:', document.getElementById('user-info')?.style.display !== 'none');
        console.log('==================');
    };
    
    // Initialize profile modal
    initializeProfileModal();
    
    // Theme initialization is now handled by ThemeManager in theme-utils.js
    // Initialize theme select if it exists
    if (window.themeManager) {
        window.themeManager.initializeThemeSelect();
    }

    let currentEventSource = null;
    // TTS variables removed - articles now navigate to dedicated view page
    
    // Persistent state management
    const CURRENT_ARTICLE_KEY = 'currentArticleState';
    const TTS_STATE_KEY = 'ttsState';
    
    // Save current article state to localStorage
    function saveArticleState(articleData) {
        try {
            console.log('=== DEBUGGING: Saving article state ===');
            console.log('Input articleData:', articleData);
            
            const state = {
                ...articleData,
                timestamp: Date.now(),
                isPlaying: isPlaying,
                currentWordIndex: currentWordIndex,
                currentPosition: currentPosition
            };
            
            console.log('State to save:', state);
            localStorage.setItem(CURRENT_ARTICLE_KEY, JSON.stringify(state));
            
            // Verify it was saved
            const saved = localStorage.getItem(CURRENT_ARTICLE_KEY);
            console.log('Verification - saved state:', saved);
            console.log('Article state saved successfully');
        } catch (error) {
            console.error('Failed to save article state:', error);
        }
    }
    
    // Restore article state from localStorage
    function restoreArticleState() {
        try {
            console.log('=== DEBUGGING: Starting restoreArticleState ===');
            const savedState = localStorage.getItem(CURRENT_ARTICLE_KEY);
            console.log('Saved state from localStorage:', savedState);
            
            if (!savedState) {
                console.log('No saved state found');
                return;
            }
            
            const state = JSON.parse(savedState);
            console.log('Parsed state:', state);
            
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            const age = now - state.timestamp;
            console.log('State age (ms):', age, 'Max age:', maxAge);
            
            // Check if state is not too old
            if (age > maxAge) {
                console.log('State is too old, removing');
                localStorage.removeItem(CURRENT_ARTICLE_KEY);
                return;
            }
            
            // Check if TTS is currently playing (from another tab/page)
            const isTTSActive = speechSynthesis.speaking || speechSynthesis.pending;
            console.log('TTS Active:', isTTSActive, 'Speaking:', speechSynthesis.speaking, 'Pending:', speechSynthesis.pending);
            console.log('Has fullText:', !!state.fullText);
            
            // ALWAYS restore if we have saved state, regardless of TTS status
            if (state.fullText) {
                console.log('Restoring article state - TTS Active:', isTTSActive);
                
                // Restore article content
                loadArticleIntoViewer({
                    title: state.title,
                    fullText: state.fullText,
                    summary: state.summary,
                    keyPoints: state.keyPoints,
                    imageUrls: state.imageUrls
                });
                
                // audiobookContainer removed - articles now navigate to dedicated view page
                
                // Update floating progress bar
                setTimeout(() => {
                    updateFloatingProgressBar();
                }, 500);
                
                // Update play button state based on TTS status
                if (playPauseBtn) {
                    if (isTTSActive) {
                        playPauseBtn.textContent = '⏸ Pause';
                        playPauseBtn.classList.add('playing');
                        isPlaying = true;
                    } else {
                        playPauseBtn.textContent = '▶ Play';
                        playPauseBtn.classList.remove('playing');
                        isPlaying = false;
                    }
                    console.log('Updated play button:', playPauseBtn.textContent);
                } else {
                    console.log('playPauseBtn not found');
                }
                
                // Global state removed - articles now navigate to dedicated view page
                console.log('Article state restored successfully');
            } else {
                console.log('No fullText in saved state');
            }
        } catch (error) {
            console.error('Failed to restore article state:', error);
            localStorage.removeItem(CURRENT_ARTICLE_KEY);
        }
        console.log('=== DEBUGGING: End restoreArticleState ===');
    }
    
    // Clear article state
    function clearArticleState() {
        localStorage.removeItem(CURRENT_ARTICLE_KEY);
        localStorage.removeItem(TTS_STATE_KEY);
    }
    
    // Floating button functionality is now handled by floating-tts-tracker.js
    
    // Voice selection variables
    let availableVoices = [];
    let selectedVoice = null;
    
    // Function to generate unique session ID
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // TTS voice functions removed - not needed on home page
    
    // TTS-related functions removed - not needed on home page
    
    // Function to update progress bar
    function updateProgressBar(progress, message) {
        progressBarFill.style.width = progress + '%';
        progressPercentage.textContent = progress + '%';
        loadingText.textContent = message;
    }
    
    // Function to reset progress bar
    function resetProgressBar() {
        progressBarFill.style.width = '0%';
        progressPercentage.textContent = '0%';
        loadingText.textContent = 'Generating your audiobook...';
    }

    generateBtn.addEventListener('click', async () => {
        const url = articleUrlInput.value;
        if (!url) {
            alert('Please enter an article URL.');
            return;
        }

        // Check if user is logged in before generating audiobook
        if (!currentUser) {
            hideError(loginError);
            openModal(loginModal);
            return;
        }

        // Generate unique session ID for this request
        const sessionId = generateSessionId();
        
        // Reset and show progress bar
        resetProgressBar();
        loadingContainer.style.display = 'block';
        // audiobookContainer removed - articles now navigate to dedicated view page
        
        // Close any existing EventSource connection
        if (currentEventSource) {
            currentEventSource.close();
        }
        
        // Set up Server-Sent Events for progress updates
        currentEventSource = new EventSource(getApiUrl(`/api/generate-progress/${sessionId}`));
        
        currentEventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            updateProgressBar(data.progress, data.message);
        };
        
        currentEventSource.onerror = function(event) {
            console.error('SSE connection error:', event);
            currentEventSource.close();
            currentEventSource = null;
        };

        try {
            const response = await fetch(getApiUrl('/api/generate'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ url, sessionId })
            });

            const data = await response.json();
            
            // Check if the response indicates an error
            if (!response.ok) {
                // Close SSE connection on error
                if (currentEventSource) {
                    currentEventSource.close();
                    currentEventSource = null;
                }
                
                loadingContainer.style.display = 'none';
                
                // Handle specific error types
                if (response.status === 429 && data.quotaExceeded) {
                    alert('⚠️ AI Service Quota Exceeded\n\n' + data.error + '\n\nThe free tier allows 50 requests per day. Please try again tomorrow.');
                } else if (response.status === 503 && data.serviceUnavailable) {
                    alert('🔧 Service Temporarily Unavailable\n\n' + data.error);
                } else {
                    alert('❌ Error: ' + (data.error || 'Failed to process article'));
                }
                return;
            }

            // Article display removed - articles now navigate to dedicated view page
            try {
                
                // Summary and key points removed - articles now navigate to dedicated view page

                // AI images gallery removed - articles now navigate to dedicated view page

                // Reset audio controls
                resetAudioControls();

                // Close SSE connection
                if (currentEventSource) {
                    currentEventSource.close();
                    currentEventSource = null;
                }
                
                loadingContainer.style.display = 'none';
                // audiobookContainer removed - articles now navigate to dedicated view page
                
                // Save article state to localStorage
                saveArticleState({
                    title: data.title,
                    fullText: data.fullText,
                    summary: data.summary,
                    keyPoints: data.keyPoints,
                    imageUrls: data.imageUrls,
                    url: articleUrl
                });
                
                // Close SSE connection
                if (currentEventSource) {
                    currentEventSource.close();
                    currentEventSource = null;
                }
                
                // Hide loading container
                loadingContainer.style.display = 'none';
                
                // Redirect to My Articles page to auto-select and play the newly generated article
                console.log('Redirecting to My Articles page for the newly generated article');
                window.location.href = 'my-articles.html?autoplay=true';
                
            } catch (uiError) {
                console.warn('Non-critical UI error during article generation:', uiError);
                // Still redirect even if some processing fails
                loadingContainer.style.display = 'none';
                window.location.href = 'my-articles.html?autoplay=true';
            }

        } catch (error) {
            console.error('Error generating audiobook:', error);
            
            // Close SSE connection on error
            if (currentEventSource) {
                currentEventSource.close();
                currentEventSource = null;
            }
            
            loadingContainer.style.display = 'none';
            
            // Only show alert for actual fetch/network errors, not processing errors
            if (error.message && error.message.includes('Failed to fetch')) {
                alert('Network error: Unable to connect to the server. Please check your internet connection and try again.');
            } else if (error instanceof TypeError && error.message.includes('fetch')) {
                alert('Network error: Unable to connect to the server. Please check your internet connection and try again.');
            }
            // Remove the generic "Failed to generate audiobook" alert as it's triggered by non-critical errors
            // Errors are still logged to console for debugging
        }
    });

    // Text-to-Speech Functions
    function resetAudioControls() {
        isPlaying = false;
        currentPosition = 0;
        currentWordIndex = 0;
        isProcessingClick = false;
        playPauseBtn.innerHTML = '▶ Play';
        playPauseBtn.disabled = false;
        progressBar.value = 0;
        timeDisplay.textContent = '0:00 / 0:00';
        if (currentUtterance) {
            speechSynthesis.cancel();
            currentUtterance = null;
        }
        if (clickDebounceTimeout) {
            clearTimeout(clickDebounceTimeout);
            clickDebounceTimeout = null;
        }
        clearWordHighlights();
        hideScrollButton();
    }

    // displayArticleWithWordHighlighting function removed - articles now navigate to dedicated view page
    
    // clearWordHighlights function removed - articles now navigate to dedicated view page
    
    // highlightWord function removed - articles now navigate to dedicated view page
    
    // scrollToCurrentWord function removed - articles now navigate to dedicated view page
    
    // showScrollButton and hideScrollButton functions removed - articles now navigate to dedicated view page
    function hideScrollButton() {
        scrollToCurrentBtn.classList.add('hidden');
        setTimeout(() => {
            scrollToCurrentBtn.style.display = 'none';
        }, 300); // Wait for transition to complete
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    function updateProgress() {
        if (isPlaying && currentUtterance) {
            const wordsPerMinute = 150; // Average reading speed
            const wordsPerSecond = wordsPerMinute / 60;
            const estimatedDuration = totalWords / wordsPerSecond;
            const currentTime = currentPosition / wordsPerSecond;
            
            progressBar.value = (currentPosition / totalWords) * 100;
            timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(estimatedDuration)}`;
            
            // Update floating progress bar
            updateFloatingProgressBar();
        }
    }
    
    // Function to update the floating progress bar
    function updateFloatingProgressBar() {
        if (window.floatingProgressBar && totalWords > 0) {
            const wordsPerMinute = 150;
            const wordsPerSecond = wordsPerMinute / 60;
            const estimatedDuration = totalWords / wordsPerSecond;
            const currentTime = currentPosition / wordsPerSecond;
            const progress = (currentPosition / totalWords) * 100;
            
            const savedState = localStorage.getItem(CURRENT_ARTICLE_KEY);
            let title = 'Article';
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    title = state.title || 'Article';
                } catch (e) {
                    console.warn('Error parsing saved state for title:', e);
                }
            }
            
            window.floatingProgressBar.updateState({
                progress: progress,
                isPlaying: isPlaying,
                currentTime: currentTime,
                totalTime: estimatedDuration,
                title: title
            });
        }
    }

    // TTS-related code removed - articles now navigate to dedicated view page

    // TTS event listeners removed - articles now navigate to dedicated view page
    
    // Floating scroll button event listener
    if (scrollToCurrentBtn) {
        scrollToCurrentBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            scrollToCurrentWord();
        });
    }
    
    // Only check for article data if we're on a page that should display articles
    // Check for article data to restore previously generated articles
    checkForArticleData();
    
    // Ensure home page starts with clean state
    ensureCleanHomePageState();
    
    // Initialize the app when DOM is loaded
    checkAuthStatus();
    initializeProfileModal();
    // TTS voice loading removed - not needed on home page
    
    // TTS-related event listeners removed - not needed on home page
    

    
    // Floating active article button functionality
    const activeArticleBtn = document.getElementById('active-article-btn');
    if (activeArticleBtn) {
        activeArticleBtn.addEventListener('click', () => {
            window.location.href = 'article-view.html';
        });
    }
    
    // Global functions for floating progress bar integration
    window.getCurrentTTSState = function() {
        const wordsPerMinute = 150;
        const wordsPerSecond = wordsPerMinute / 60;
        const estimatedDuration = totalWords / wordsPerSecond;
        const currentTime = currentPosition / wordsPerSecond;
        const progress = totalWords > 0 ? (currentPosition / totalWords) * 100 : 0;
        
        return {
            isPlaying: isPlaying,
            progress: progress,
            currentTime: currentTime,
            totalTime: estimatedDuration,
            currentWordIndex: currentWordIndex,
            totalWords: totalWords
        };
    };
    
    window.toggleMainTTS = function() {
        if (playPauseBtn) {
            playPauseBtn.click();
        }
    };
    
    window.seekMainTTS = function(position) {
        if (totalWords > 0) {
            const newWordIndex = Math.floor(position * totalWords);
            currentWordIndex = newWordIndex;
            currentPosition = newWordIndex;
            
            if (isPlaying) {
                speechSynthesis.cancel();
                setTimeout(() => speakText(fullArticleText, currentWordIndex), 100);
            } else {
                highlightWord(currentWordIndex);
            }
            updateProgress();
        }
    };
    
    // Floating button is now handled by floating-tts-tracker.js
    
    // Article state restoration removed - not needed on home page
    
    // Save state when navigating away from the page
    window.addEventListener('beforeunload', () => {
        const savedState = localStorage.getItem(CURRENT_ARTICLE_KEY);
        if (savedState && (speechSynthesis.speaking || speechSynthesis.pending)) {
            const state = JSON.parse(savedState);
            state.isPlaying = isPlaying;
            state.currentWordIndex = currentWordIndex;
            state.currentPosition = currentPosition;
            state.timestamp = Date.now();
            localStorage.setItem(CURRENT_ARTICLE_KEY, JSON.stringify(state));
        }
    });
    // Initialize music UI state (persistent music manager handles the rest)
    setTimeout(() => {
        console.log('=== DEBUG: Initializing music UI on home page ===');
        
        const musicToggleBtn = document.getElementById('music-toggle-btn');
        if (musicToggleBtn && window.musicPlayer) {
            // Update button state based on current music status
            if (window.musicPlayer.isCurrentlyPlaying) {
                musicToggleBtn.classList.add('active');
                console.log('=== DEBUG: Music already playing, button activated ===');
            } else {
                musicToggleBtn.classList.remove('active');
                console.log('=== DEBUG: Music not playing, button deactivated ===');
            }
        }
    }, 500); // Small delay to ensure persistent music manager is initialized
    
    // Initialize music toggle button
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    if (musicToggleBtn) {
        // Update button state based on current music status
        if (window.musicPlayer && window.musicPlayer.isCurrentlyPlaying) {
            musicToggleBtn.classList.add('active');
        }
        
        musicToggleBtn.addEventListener('click', async () => {
            try {
                if (window.musicPlayer.isCurrentlyPlaying) {
                    window.musicPlayer.pause();
                    musicToggleBtn.classList.remove('active');
                    console.log('=== DEBUG: Music paused via toggle button ===');
                } else {
                    window.musicPlayer.resume();
                    musicToggleBtn.classList.add('active');
                    console.log('=== DEBUG: Music resumed via toggle button ===');
                }
            } catch (error) {
                console.error('=== DEBUG: Failed to toggle music:', error);
            }
        });
    }
    
    // Test function to add sample data for debugging
    window.testArticleLoading = function() {
        const testArticle = {
            id: 999,
            title: "Test Article for Debugging",
            content: "This is a test article content. It contains multiple sentences to test the word highlighting functionality. The article should display properly when loaded from the My Articles page. This is paragraph one.\n\nThis is paragraph two with more content to test the display functionality. The content should be properly formatted and displayed in the article viewer.",
            summary: "This is a test summary for debugging purposes.",
            keyPoints: ["Test point 1", "Test point 2", "Test point 3"],
            imageUrls: [],
            url: "https://example.com/test-article",
            createdAt: new Date().toISOString(),
            timestamp: Date.now()
        };
        
        console.log('Adding test article to sessionStorage:', testArticle);
        sessionStorage.setItem('viewArticleData', JSON.stringify(testArticle));
        
        // Trigger the check function
        checkForArticleData();
    };
    
    console.log('Test function added. Call testArticleLoading() in console to test.');
});

// Profile functionality removed - will be rebuilt from scratch

// Show notification
function showNotification(message, type = 'success') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        document.body.appendChild(notification);
    }
    
    // Set message and style based on type
    notification.textContent = message;
    notification.style.backgroundColor = type === 'error' ? '#dc3545' : '#28a745';
    
    // Show notification
    notification.style.transform = 'translateX(0)';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
    }, 3000);
}

// Profile initialization removed - will be rebuilt from scratch

// Profile modal functions removed - will be rebuilt from scratch

// Profile loading functions removed - will be rebuilt from scratch

// Profile display functions removed - will be rebuilt from scratch

// User audiobooks functions removed - will be rebuilt from scratch

// Audiobook display functions removed - will be rebuilt from scratch

// Audiobook state display functions removed - will be rebuilt from scratch

// Audiobook interaction functions removed - will be rebuilt from scratch

// Open audiobook viewer modal
function openAudiobookViewer(audiobook) {
    const viewerModal = document.getElementById('audiobook-viewer-modal');
    const viewerTitle = document.getElementById('viewer-audiobook-title');
    const viewerFullText = document.getElementById('viewer-full-text');
    const viewerImagesGrid = document.getElementById('viewer-images-grid');
    const viewerSummary = document.getElementById('viewer-summary');
    const viewerKeyPoints = document.getElementById('viewer-key-points');
    
    if (!viewerModal) return;
    
    // Set title
    if (viewerTitle) {
        viewerTitle.textContent = audiobook.title || 'Untitled Audiobook';
    }
    
    // Set full text
    if (viewerFullText && audiobook.full_text) {
        viewerFullText.innerHTML = audiobook.full_text;
    }
    
    // Set images
    if (viewerImagesGrid && audiobook.image_urls && audiobook.image_urls.length > 0) {
        const imagesHTML = audiobook.image_urls.map(image => 
            `<img src="${image}" alt="AI Generated Image" class="viewer-image">`
        ).join('');
        viewerImagesGrid.innerHTML = imagesHTML;
    } else if (viewerImagesGrid) {
        viewerImagesGrid.innerHTML = '<p>No images available</p>';
    }
    
    // Set summary
    if (viewerSummary && audiobook.summary) {
        viewerSummary.textContent = audiobook.summary;
    }
    
    // Set key points
    if (viewerKeyPoints && audiobook.key_points && audiobook.key_points.length > 0) {
        const keyPointsHTML = `<ul>${audiobook.key_points.map(point => `<li>${point}</li>`).join('')}</ul>`;
        viewerKeyPoints.innerHTML = keyPointsHTML;
    } else if (viewerKeyPoints) {
        viewerKeyPoints.innerHTML = '<p>No key points available</p>';
    }
    
    // Initialize viewer controls
    initializeAudiobookViewerControls(audiobook);
    
    // Show modal
    viewerModal.style.display = 'block';
    
    // Close modal functionality
    const viewerClose = document.getElementById('audiobook-viewer-close');
    if (viewerClose) {
        viewerClose.onclick = () => {
            viewerModal.style.display = 'none';
            stopViewerAudio();
        };
    }
    
    // Close when clicking outside
    viewerModal.onclick = (e) => {
        if (e.target === viewerModal) {
            viewerModal.style.display = 'none';
            stopViewerAudio();
        }
    };
}

// Initialize audiobook viewer controls
let viewerTTS = {
    isPlaying: false,
    currentUtterance: null,
    currentWordIndex: 0,
    totalWords: 0,
    wordElements: []
};

function initializeAudiobookViewerControls(audiobook) {
    const playBtn = document.getElementById('viewer-play-btn');
    const stopBtn = document.getElementById('viewer-stop-btn');
    const progressSlider = document.getElementById('viewer-progress');
    const timeDisplay = document.getElementById('viewer-time-display');
    const speedControl = document.getElementById('viewer-speed-control');
    
    // Reset viewer TTS state
    viewerTTS.isPlaying = false;
    viewerTTS.currentUtterance = null;
    viewerTTS.currentWordIndex = 0;
    viewerTTS.totalWords = 0;
    viewerTTS.wordElements = [];
    
    // Prepare text for TTS
    const fullTextEl = document.getElementById('viewer-full-text');
    if (fullTextEl && audiobook.full_text) {
        const words = audiobook.full_text.split(/\s+/);
        viewerTTS.totalWords = words.length;
        
        // Wrap words in spans for highlighting
        const wrappedText = words.map((word, index) => 
            `<span class="word" data-index="${index}">${word}</span>`
        ).join(' ');
        fullTextEl.innerHTML = wrappedText;
        
        viewerTTS.wordElements = fullTextEl.querySelectorAll('.word');
    }
    
    // Play/Pause button
    if (playBtn) {
        playBtn.onclick = () => {
            if (viewerTTS.isPlaying) {
                pauseViewerAudio();
            } else {
                playViewerAudio(audiobook.fullText);
            }
        };
    }
    
    // Stop button
    if (stopBtn) {
        stopBtn.onclick = () => {
            stopViewerAudio();
        };
    }
    
    // Progress slider
    if (progressSlider) {
        progressSlider.onclick = (e) => {
            const rect = progressSlider.getBoundingClientRect();
            const clickPosition = (e.clientX - rect.left) / rect.width;
            viewerTTS.currentWordIndex = Math.floor(clickPosition * viewerTTS.totalWords);
            
            if (viewerTTS.isPlaying) {
                stopViewerAudio();
                setTimeout(() => playViewerAudio(audiobook.full_text, viewerTTS.currentWordIndex), 100);
            }
            updateViewerProgress();
        };
    }
    
    // Speed control
    if (speedControl) {
        speedControl.onchange = () => {
            if (viewerTTS.currentUtterance) {
                const wasPlaying = viewerTTS.isPlaying;
                stopViewerAudio();
                if (wasPlaying) {
                    setTimeout(() => playViewerAudio(audiobook.full_text, viewerTTS.currentWordIndex), 100);
                }
            }
        };
    }
}

// Play viewer audio
function playViewerAudio(text, startWordIndex = 0) {
    if (!text) return;
    
    const playBtn = document.getElementById('viewer-play-btn');
    const speedControl = document.getElementById('viewer-speed-control');
    
    viewerTTS.currentWordIndex = startWordIndex;
    const words = text.split(/\s+/);
    const wordsToSpeak = words.slice(startWordIndex).join(' ');
    
    viewerTTS.currentUtterance = new SpeechSynthesisUtterance(wordsToSpeak);
    viewerTTS.currentUtterance.rate = speedControl ? parseFloat(speedControl.value) : 1;
    viewerTTS.currentUtterance.pitch = 1;
    viewerTTS.currentUtterance.volume = 1;
    
    viewerTTS.currentUtterance.onstart = () => {
        viewerTTS.isPlaying = true;
        if (playBtn) playBtn.innerHTML = '⏸ Pause';
        highlightViewerWord(startWordIndex);
    };
    
    viewerTTS.currentUtterance.onend = () => {
        viewerTTS.isPlaying = false;
        if (playBtn) playBtn.innerHTML = '▶ Play';
        clearViewerHighlights();
        viewerTTS.currentWordIndex = viewerTTS.totalWords;
        updateViewerProgress();
    };
    
    viewerTTS.currentUtterance.onerror = () => {
        viewerTTS.isPlaying = false;
        if (playBtn) playBtn.innerHTML = '▶ Play';
    };
    
    speechSynthesis.speak(viewerTTS.currentUtterance);
}

// Pause viewer audio
function pauseViewerAudio() {
    speechSynthesis.cancel();
    viewerTTS.isPlaying = false;
    const playBtn = document.getElementById('viewer-play-btn');
    if (playBtn) playBtn.innerHTML = '▶ Play';
}

// Stop viewer audio
function stopViewerAudio() {
    speechSynthesis.cancel();
    viewerTTS.isPlaying = false;
    viewerTTS.currentWordIndex = 0;
    const playBtn = document.getElementById('viewer-play-btn');
    const progressSlider = document.getElementById('viewer-progress');
    
    if (playBtn) playBtn.innerHTML = '▶ Play';
    if (progressSlider) progressSlider.value = 0;
    
    clearViewerHighlights();
    updateViewerProgress();
}

// Highlight viewer word
function highlightViewerWord(index) {
    clearViewerHighlights();
    if (viewerTTS.wordElements[index]) {
        viewerTTS.wordElements[index].classList.add('highlight');
    }
}

// Clear viewer highlights
function clearViewerHighlights() {
    viewerTTS.wordElements.forEach(el => el.classList.remove('highlight'));
}

// Update viewer progress
function updateViewerProgress() {
    const progressSlider = document.getElementById('viewer-progress');
    const timeDisplay = document.getElementById('viewer-time-display');
    
    if (progressSlider && viewerTTS.totalWords > 0) {
        const progress = (viewerTTS.currentWordIndex / viewerTTS.totalWords) * 100;
        progressSlider.value = progress;
    }
    
    if (timeDisplay) {
        const currentTime = Math.floor(viewerTTS.currentWordIndex / 3); // Rough estimate
        const totalTime = Math.floor(viewerTTS.totalWords / 3);
        timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(totalTime)}`;
    }
}

// Format time helper
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// User preferences functions removed - will be rebuilt from scratch

// My Articles Page Initialization
function initializeMyArticlesPage() {
    const isMyArticlesPage = window.location.pathname.includes('my-articles.html');
    if (!isMyArticlesPage) return;
    
    // Check authentication status
    const token = localStorage.getItem('authToken');
    const authRequired = document.querySelector('.auth-required');
    const articlesContainer = document.querySelector('.articles-container');
    
    if (!token) {
        // Show authentication required message
        if (authRequired) authRequired.style.display = 'block';
        if (articlesContainer) articlesContainer.style.display = 'none';
        
        // Setup auth modal event listeners
        setupAuthModalListeners();
    } else {
        // Hide auth required and show articles
        if (authRequired) authRequired.style.display = 'none';
        if (articlesContainer) articlesContainer.style.display = 'block';
        
        // Initialize My Articles Manager
        if (typeof MyArticlesManager !== 'undefined') {
            const manager = new MyArticlesManager();
            manager.init();
        }
    }
    
    // Update navigation active state
    updateNavigationActiveState();
}

// Setup authentication modal listeners for My Articles page
function setupAuthModalListeners() {
    const loginBtn = document.querySelector('.auth-actions .btn-primary');
    const signupBtn = document.querySelector('.auth-actions .btn-secondary');
    const loginModal = document.getElementById('loginModal');
    const signupModal = document.getElementById('signupModal');
    
    if (loginBtn && loginModal) {
        loginBtn.addEventListener('click', () => {
            loginModal.style.display = 'block';
        });
    }
    
    if (signupBtn && signupModal) {
        signupBtn.addEventListener('click', () => {
            signupModal.style.display = 'block';
        });
    }
}

// Update navigation active state
function updateNavigationActiveState() {
    const navLinks = document.querySelectorAll('.nav-link');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href && currentPath.includes(href)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Enhanced article regeneration function
function regenerateArticle(articleId) {
    // Get the article data
    fetch(getApiUrl(`/api/articles/${articleId}`), {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
    })
    .then(response => response.json())
    .then(article => {
        if (article.success && article.data) {
            // Navigate back to main page
            window.location.href = 'index.html';
            
            // Store article data for regeneration
            sessionStorage.setItem('regenerateArticle', JSON.stringify({
                title: article.data.title,
                content: article.data.content,
                timestamp: Date.now()
            }));
        } else {
            console.error('Failed to fetch article:', article.message);
            alert('Failed to load article for regeneration');
        }
    })
    .catch(error => {
        console.error('Error fetching article:', error);
        alert('Error loading article for regeneration');
    });
}

// Ensure home page starts with clean state
function ensureCleanHomePageState() {
    const audiobookContainer = document.getElementById('audiobook-container');
    const loadingContainer = document.getElementById('loading-container');
    const articleUrlInput = document.getElementById('article-url');
    
    // Hide any article content
    // audiobookContainer removed - articles now navigate to dedicated view page
    
    // Hide loading container
    if (loadingContainer) {
        loadingContainer.style.display = 'none';
    }
    
    // Clear article URL input
    if (articleUrlInput) {
        articleUrlInput.value = '';
    }
    
    // Clear any session storage that might cause articles to display
    sessionStorage.removeItem('viewArticleData');
    
    // Reset audio player
    resetAudioPlayer();
}

// Check for article data from My Articles page
function checkForArticleData() {
    // Articles now navigate to dedicated view page - no need to display on home page
    const articleData = sessionStorage.getItem('viewArticleData');
    if (articleData) {
        // Clean up any leftover session data
        sessionStorage.removeItem('viewArticleData');
        console.log('Cleaned up leftover article session data');
    }
}

// Function removed - articles now navigate to dedicated view page

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Reset audio player to initial state
function resetAudioPlayer() {
    // Get DOM elements fresh each time to ensure they exist
    const playPauseBtn = document.getElementById('play-pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    const progressBar = document.getElementById('progress-bar');
    const timeDisplay = document.getElementById('time-display');
    
    if (playPauseBtn) {
        playPauseBtn.innerHTML = '▶ Play';
        playPauseBtn.disabled = false;
    }
    
    if (stopBtn) {
        stopBtn.disabled = false;
    }
    
    if (progressBar) {
        progressBar.value = 0;
    }
    
    if (timeDisplay) {
        timeDisplay.textContent = '0:00 / 0:00';
    }
    
    // Reset global audio-related variables
    if (typeof currentUtterance !== 'undefined' && currentUtterance) {
        speechSynthesis.cancel();
        currentUtterance = null;
    }
    if (typeof isPlaying !== 'undefined') isPlaying = false;
    if (typeof currentWordIndex !== 'undefined') currentWordIndex = 0;
    if (typeof currentPosition !== 'undefined') currentPosition = 0;
    if (typeof isProcessingClick !== 'undefined') isProcessingClick = false;
    
    // Clear any existing highlights
    if (typeof wordElements !== 'undefined' && wordElements && wordElements.length > 0) {
        wordElements.forEach(el => {
            el.classList.remove('current', 'highlight', 'current-word');
        });
    }
    
    // Hide scroll button if it exists
    const scrollToCurrentBtn = document.getElementById('scroll-to-current');
    if (scrollToCurrentBtn) {
        scrollToCurrentBtn.style.display = 'none';
    }
}

// Initialize My Articles page functionality when on that page
if (window.location.pathname.includes('my-articles.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        initializeMyArticlesPage();
    });
}