// Global variables
let userArticles = [];
let auth; // Use the shared RobustAuth instance

// DOM elements
let articlesContainer;
let emptyState;
let loadingState;

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the shared authentication system
    auth = new RobustAuth();
    
    // Authentication elements - using same IDs as main app
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const profileBtn = document.getElementById('profile-btn');
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
    
    // My Articles specific elements
    articlesContainer = document.getElementById('articles-container');
    emptyState = document.getElementById('empty-state');
    loadingState = document.getElementById('loading-state');
    
    // Initialize the articles page
    initializeArticlesPage();
    
    // Check for autoplay parameter on page load
    checkAutoplayAndClickLatest();
    
    // Authentication functions - use the shared RobustAuth instance
    function showError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }
    
    function hideError(element) {
        element.style.display = 'none';
    }
    
    // Use the auth instance's UI update method
    function updateAuthUI() {
        // This is now handled by the RobustAuth class
        // Just fetch articles if we're authenticated
        if (auth && auth.currentUser) {
            loadUserArticles();
        } else {
            // Show empty state if not logged in
            if (articlesContainer) articlesContainer.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'flex';
                emptyState.querySelector('p').textContent = 'Please log in to view your articles';
            }
        }
    }
    
    // Replace the checkAuthStatus function with a call to the shared auth instance
    function initializeArticlesPage() {
        // The auth instance will handle authentication status
        // We just need to set up the articles page based on auth status
        if (auth && auth.currentUser) {
            loadUserArticles();
        } else {
            // Show login prompt if not authenticated
            if (articlesContainer) articlesContainer.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'flex';
                emptyState.querySelector('p').textContent = 'Please log in to view your articles';
            }
        }
        
        // Set up event listener for auth changes
        document.addEventListener('authStateChanged', function(e) {
            if (e.detail.isAuthenticated) {
                loadUserArticles();
            } else {
                // Show login prompt
                if (articlesContainer) articlesContainer.style.display = 'none';
                if (emptyState) {
                    emptyState.style.display = 'flex';
                    emptyState.querySelector('p').textContent = 'Please log in to view your articles';
                }
            }
        });
    }
    
    // Modal functions - copied from main app
    function openModal(modal) {
        modal.style.display = 'block';
    }
    
    function closeModal(modal) {
        modal.style.display = 'none';
    }
    
    // Authentication event listeners - copied from main app
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
    
    // Profile modal elements
    const profileModal = document.getElementById('profile-modal');
    const closeProfileModal = document.getElementById('close-profile-modal');
    const profileNavBtn = document.getElementById('profile-nav-btn');
    
    // Add event listeners to both profile buttons
    const profileButtons = [profileBtn, profileNavBtn];
    profileButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                profileModal.style.display = 'block';
                populateProfileDataImmediately();
                // Load user preferences and populate voice selection
                loadUserPreferences();
                populateVoiceSelection();
                // Start theme preview mode
                if (window.themeManager) {
                    window.themeManager.startPreviewMode();
                }
            });
        }
    });
    
    // Close profile modal
    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', () => {
            // Cancel theme preview if in preview mode
            if (window.themeManager && window.themeManager.isInPreviewMode()) {
                window.themeManager.cancelPreview();
            }
            profileModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === profileModal) {
            // Cancel theme preview if in preview mode
            if (window.themeManager && window.themeManager.isInPreviewMode()) {
                window.themeManager.cancelPreview();
            }
            profileModal.style.display = 'none';
        }
    });
    
    // Profile tab switching functionality
    const profileNavTabs = document.querySelectorAll('.profile-nav-tab');
    const profileTabContents = document.querySelectorAll('.profile-tab-content');
    
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
                if (targetTab === 'preferences') {
                    loadUserPreferences();
                }
            }
        });
    });
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            sessionStorage.removeItem('profileSetupPrompted');
            authToken = null;
            currentUser = null;
            userArticles = [];
            updateAuthUI();
            showEmptyState();
        });
    }
    
    // Modal close events - copied from main app
    if (loginClose && loginModal) {
        loginClose.addEventListener('click', () => closeModal(loginModal));
    }
    if (signupClose && signupModal) {
        signupClose.addEventListener('click', () => closeModal(signupModal));
    }
    
    // Switch between login and signup - copied from main app
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

    // Close modals when clicking outside - copied from main app
    if (loginModal || signupModal || forgotPasswordModal || resetPasswordModal) {
        window.addEventListener('click', (event) => {
            if (loginModal && event.target === loginModal) closeModal(loginModal);
            if (signupModal && event.target === signupModal) closeModal(signupModal);
            if (forgotPasswordModal && event.target === forgotPasswordModal) closeModal(forgotPasswordModal);
            if (resetPasswordModal && event.target === resetPasswordModal) closeModal(resetPasswordModal);
        });
    }
    
    // Form submissions - copied from main app
    if (loginForm && loginError) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError(loginError);
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            try {
                const response = await fetch(getApiUrl('/api/login'), {
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
                    loadUserArticles();
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
    
    // Password validation functions
    function validatePassword(password) {
        const requirements = {
            length: password.length >= 8,
            capital: /[A-Z]/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };
        return requirements;
    }
    
    function updatePasswordRequirements(password) {
        const requirements = validatePassword(password);
        
        const lengthReq = document.getElementById('length-req');
        const capitalReq = document.getElementById('capital-req');
        const specialReq = document.getElementById('special-req');
        
        if (lengthReq) {
            lengthReq.className = requirements.length ? 'requirement valid' : 'requirement invalid';
        }
        if (capitalReq) {
            capitalReq.className = requirements.capital ? 'requirement valid' : 'requirement invalid';
        }
        if (specialReq) {
            specialReq.className = requirements.special ? 'requirement valid' : 'requirement invalid';
        }
        
        return requirements.length && requirements.capital && requirements.special;
    }
    
    function updatePasswordMatch(password, confirmPassword) {
        const passwordMatch = document.getElementById('password-match');
        if (passwordMatch && confirmPassword) {
            const isMatch = password === confirmPassword;
            passwordMatch.style.display = 'flex';
            passwordMatch.className = isMatch ? 'password-match valid' : 'password-match invalid';
            passwordMatch.querySelector('.req-text').textContent = isMatch ? 'Passwords match' : 'Passwords must match';
        }
    }
    
    // Password uniqueness check removed - passwords don't need to be unique
    
    // Add password validation event listeners
    const signupPassword = document.getElementById('signup-password');
    const signupConfirmPassword = document.getElementById('signup-confirm-password');
    
    if (signupPassword) {
        signupPassword.addEventListener('input', (e) => {
            const password = e.target.value;
            updatePasswordRequirements(password);
            
            if (signupConfirmPassword && signupConfirmPassword.value) {
                updatePasswordMatch(password, signupConfirmPassword.value);
            }
        });
    }
    
    if (signupConfirmPassword) {
        signupConfirmPassword.addEventListener('input', (e) => {
            const confirmPassword = e.target.value;
            const password = signupPassword ? signupPassword.value : '';
            updatePasswordMatch(password, confirmPassword);
        });
    }
    
    // Add the missing utility functions
    function showLoadingState() {
        if (loadingState) loadingState.style.display = 'flex';
        if (articlesContainer) articlesContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
    }
    
    function hideLoadingState() {
        if (loadingState) loadingState.style.display = 'none';
    }
    
    function showEmptyState() {
        if (articlesContainer) articlesContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
    }
    
    function hideEmptyState() {
        if (emptyState) emptyState.style.display = 'none';
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function checkAuthStatus() {
        return auth && auth.currentUser;
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
                const response = await fetch(getApiUrl('/api/register'), {
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
                    loadUserArticles();
                    
                    // Show profile setup modal for new users
                    showProfileSetupModal();
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
                    showError(forgotPasswordSuccess, 'Password reset link sent to your email!');
                    forgotPasswordForm.reset();
                    
                    // Close modal after showing success message
                    setTimeout(() => {
                        closeModal(forgotPasswordModal);
                        hideError(forgotPasswordSuccess);
                    }, 3000);
                } else {
                    showError(forgotPasswordError, data.message || 'Failed to send reset email');
                }
            } catch (error) {
                console.error('Password reset error:', error);
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
            
            const token = localStorage.getItem('resetToken');
            const password = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-new-password').value;
            
            if (!token) {
                showError(resetPasswordError, 'Reset session expired. Please try the forgot password process again.');
                return;
            }
            
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
                    localStorage.removeItem('resetToken'); // Clean up the token
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
    
    // My Articles specific functions
    async function loadUserArticles() {
        const authToken = auth.authToken;
        console.log('=== DEBUG: loadUserArticles called, authToken:', authToken ? 'exists' : 'null');
        if (!authToken) {
            console.log('=== DEBUG: No auth token, showing empty state');
            showEmptyState();
            return;
        }
        
        console.log('=== DEBUG: Showing loading state');
        showLoadingState();
        
        try {
            console.log('=== DEBUG: Making request to /api/user/audiobooks');
            const response = await fetch(getApiUrl('/api/user/audiobooks'), {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('=== DEBUG: Articles response status:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('=== DEBUG: Articles data received:', data);
                userArticles = data.audiobooks || [];
                console.log('=== DEBUG: User articles array:', userArticles.length, 'items');
                renderArticles();
            } else {
                console.error('=== DEBUG: Failed to load articles:', response.status);
                const errorText = await response.text();
                console.error('=== DEBUG: Error response:', errorText);
                showEmptyState();
            }
        } catch (error) {
            console.error('=== DEBUG: Error loading articles:', error);
            showEmptyState();
        }
    }
    
    function renderArticles() {
        console.log('=== DEBUG: renderArticles called, userArticles:', userArticles ? userArticles.length : 'null');
        
        if (!userArticles || userArticles.length === 0) {
            console.log('=== DEBUG: No articles to display, showing empty state');
            showEmptyState();
            return;
        }
        
        // Ensure DOM elements exist
        if (!articlesContainer) {
            articlesContainer = document.getElementById('articles-container');
        }
        if (!emptyState) {
            emptyState = document.getElementById('empty-state');
        }
        if (!loadingState) {
            loadingState = document.getElementById('loading-state');
        }
        
        if (!articlesContainer) {
            console.error('=== DEBUG: Articles container not found!');
            return;
        }
        
        // Hide loading and empty states
        hideLoadingState();
        hideEmptyState();
        
        // Clear container and show it
        articlesContainer.innerHTML = '';
        articlesContainer.style.display = 'grid';
        
        console.log('=== DEBUG: Rendering', userArticles.length, 'articles');
        
        // Render each article
        userArticles.forEach(article => {
            const articleCard = document.createElement('div');
            articleCard.className = 'article-card';
            articleCard.dataset.id = article.id;
            
            articleCard.innerHTML = `
                <div class="article-header">
                    <h3 class="article-title">${escapeHtml(article.title || 'Untitled Article')}</h3>
                </div>
                <div class="article-content">
                    <p class="article-summary">${escapeHtml(article.summary || 'No summary available')}</p>
                </div>
                <div class="card-actions">
                    <button class="btn-view" title="Read Article">
                        <i class="fas fa-eye"></i> Read
                    </button>
                    <button class="btn-delete" title="Delete Article">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            `;
            
            // Add event listeners
            const viewBtn = articleCard.querySelector('.btn-view');
            if (viewBtn) {
                viewBtn.addEventListener('click', () => viewArticle(article.id));
            }
            
            const deleteBtn = articleCard.querySelector('.btn-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => deleteArticle(article.id, article.title));
            }
            
            articlesContainer.appendChild(articleCard);
        });
        
        // Check if we should auto-click the latest article
        checkAndAutoClickLatest();
    }
    
    function showLoadingState() {
        if (loadingState) loadingState.style.display = 'block';
        if (articlesContainer) articlesContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
    }
    
    function hideLoadingState() {
        if (loadingState) loadingState.style.display = 'none';
        if (articlesContainer) articlesContainer.style.display = 'grid';
    }
    
    function showEmptyState() {
        if (emptyState) emptyState.style.display = 'block';
        if (articlesContainer) articlesContainer.style.display = 'none';
        if (loadingState) loadingState.style.display = 'none';
    }
    
    function hideEmptyState() {
        if (emptyState) emptyState.style.display = 'none';
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Auto-click functionality for latest article
    function checkAutoplayAndClickLatest() {
        const urlParams = new URLSearchParams(window.location.search);
        const autoplay = urlParams.get('autoplay');
        
        if (autoplay === 'true') {
            console.log('=== DEBUG: Autoplay detected, will auto-click latest article when loaded ===');
            // Set a flag to indicate we should auto-click when articles are loaded
            window.shouldAutoClickLatest = true;
        }
    }
    
    function checkAndAutoClickLatest() {
        if (window.shouldAutoClickLatest && userArticles && userArticles.length > 0) {
            console.log('=== DEBUG: Auto-clicking latest article ===');
            
            // Find the latest article (highest ID or most recent created_at)
            const latestArticle = userArticles.reduce((latest, current) => {
                const latestDate = new Date(latest.created_at);
                const currentDate = new Date(current.created_at);
                return currentDate > latestDate ? current : latest;
            });
            
            console.log('=== DEBUG: Latest article found:', latestArticle);
            
            // Clear the flag to prevent multiple auto-clicks
            window.shouldAutoClickLatest = false;
            
            // Remove autoplay parameter from URL to prevent re-triggering on refresh
            const url = new URL(window.location);
            url.searchParams.delete('autoplay');
            window.history.replaceState({}, document.title, url.pathname + url.search);
            
            // Auto-click the latest article with a small delay to ensure DOM is ready
            setTimeout(() => {
                console.log('=== DEBUG: Executing auto-click for article ID:', latestArticle.id);
                viewArticle(latestArticle.id.toString(), true); // Pass true for autoplay
            }, 500);
        }
    }
    
    // Global functions for article actions
    window.viewArticle = function(articleId, autoplay = false) {
        console.log('=== DEBUG: viewArticle called with ID:', articleId, 'autoplay:', autoplay);
        console.log('=== DEBUG: userArticles array:', userArticles);
        
        // Find the article data
        const article = userArticles.find(a => a.id === parseInt(articleId));
        
        if (article) {
            console.log('=== DEBUG: Found article for viewing:', article);
            console.log('=== DEBUG: Article full_text length:', article.full_text ? article.full_text.length : 'NO FULL_TEXT');
            
            const articleData = {
                id: article.id,
                title: article.title,
                content: article.full_text || '', // Map full_text to content
                full_text: article.full_text || '',
                summary: article.summary || '',
                keyPoints: article.key_points || [],
                key_points: article.key_points || [],
                imageUrls: article.image_urls || [],
                image_urls: article.image_urls || [],
                url: article.url || '',
                created_at: article.created_at,
                createdAt: article.created_at,
                timestamp: Date.now()
            };
            
            console.log('=== DEBUG: Prepared articleData for sessionStorage:', articleData);
            
            // Store complete article data for the article view page
            sessionStorage.setItem('viewArticleData', JSON.stringify(articleData));
            
            // Navigate to article view page with ID parameter and autoplay if needed
            const autoplayParam = autoplay ? '&autoplay=true' : '';
            window.location.href = `article-view.html?id=${articleId}${autoplayParam}`;
        } else {
            console.error('=== DEBUG: Article not found for ID:', articleId);
            console.error('=== DEBUG: Available article IDs:', userArticles.map(a => a.id));
            alert('Article not found');
        }
    };
    
    // Store the article ID to be deleted
    let articleToDelete = null;
    
    // Delete confirmation modal elements
    const deleteModal = document.getElementById('delete-confirmation-modal');
    const closeDeleteModal = document.getElementById('close-delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    // Set up delete modal event listeners
    if (deleteModal) {
        // Close button
        if (closeDeleteModal) {
            closeDeleteModal.addEventListener('click', () => {
                deleteModal.style.display = 'none';
                articleToDelete = null;
            });
        }
        
        // Cancel button
        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => {
                deleteModal.style.display = 'none';
                articleToDelete = null;
            });
        }
        
        // Confirm delete button
        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', async () => {
                if (articleToDelete) {
                    await performDeleteArticle(articleToDelete);
                    deleteModal.style.display = 'none';
                    articleToDelete = null;
                }
            });
        }
        
        // Close when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === deleteModal) {
                deleteModal.style.display = 'none';
                articleToDelete = null;
            }
        });
    }
    
    window.deleteArticle = function(articleId) {
        // Store the article ID and show the confirmation modal
        articleToDelete = articleId;
        if (deleteModal) {
            // Use flex display to center the modal vertically
            deleteModal.style.display = 'flex';
            deleteModal.style.alignItems = 'center';
            deleteModal.style.justifyContent = 'center';
        } else {
            // Fallback to browser confirm if modal not found
            if (confirm('Are you sure you want to delete this article?')) {
                performDeleteArticle(articleId);
            }
        }
    };
    
    // Function to perform the actual deletion
    async function performDeleteArticle(articleId) {
        try {
            const authToken = auth.authToken;
            const response = await fetch(getApiUrl(`/api/user/audiobooks/${articleId}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                // Remove from local array and re-render
                userArticles = userArticles.filter(article => article.id !== parseInt(articleId));
                renderArticles();
            } else {
                alert('Failed to delete article');
            }
        } catch (error) {
            console.error('Error deleting article:', error);
            alert('Error deleting article');
        }
    }
    
    // Initialize floating active article button functionality
    const activeArticleBtn = document.getElementById('active-article-btn');
    if (activeArticleBtn) {
        activeArticleBtn.addEventListener('click', () => {
            window.location.href = 'article-view.html';
        });
    }
    
    checkAuthStatus();
    
    // Floating button functionality is now handled by floating-tts-tracker.js
    
    // Initialize music UI state (persistent music manager handles the rest)
    setTimeout(() => {
        console.log('=== DEBUG: Initializing music UI on my-articles page ===');
        
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle && window.musicPlayer) {
            // Update button state based on current music status
            if (window.musicPlayer.isCurrentlyPlaying) {
                musicToggle.classList.add('active');
                console.log('=== DEBUG: Music already playing, button activated ===');
            } else {
                musicToggle.classList.remove('active');
                console.log('=== DEBUG: Music not playing, button deactivated ===');
            }
        }
    }, 500);
    
    // Music toggle functionality
    const musicToggle = document.getElementById('music-toggle');
    if (musicToggle) {
        musicToggle.addEventListener('click', async () => {
            if (window.musicPlayer) {
                try {
                    if (window.musicPlayer.isCurrentlyPlaying) {
                        window.musicPlayer.pause();
                        musicToggle.classList.remove('active');
                        console.log('=== DEBUG: Music paused via toggle button ===');
                    } else {
                        window.musicPlayer.resume();
                        musicToggle.classList.add('active');
                        console.log('=== DEBUG: Music resumed via toggle button ===');
                    }
                } catch (error) {
                    console.error('=== DEBUG: Failed to toggle music:', error);
                }
            }
        });
    }
    
    // Check for autoplay parameter and auto-click latest article
    checkAutoplayAndClickLatest();
    
    // Initialize preferences functionality
    initializePreferences();
    
// Close the DOMContentLoaded event listener properly
});

// Profile modal functions
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
        speechRateSelect.value = preferences.speech_rate || '1';
    }
    
    if (speechVoiceSelect) {
        speechVoiceSelect.value = preferences.speech_voice || 'default';
    }
}

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

    // Add event listeners
    currentPreviewUtterance.onstart = () => {
        button.classList.add('playing');
    };

    currentPreviewUtterance.onend = () => {
        button.classList.remove('playing');
        currentPreviewUtterance = null;
    };

    currentPreviewUtterance.onerror = () => {
        button.classList.remove('playing');
        currentPreviewUtterance = null;
    };

    // Speak the preview
    window.speechSynthesis.speak(currentPreviewUtterance);
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

// Save user preferences
function saveUserPreferences() {
    const token = localStorage.getItem('authToken');
    const themeSelect = document.getElementById('theme-select');
    const speechRateSelect = document.getElementById('speech-rate-select');
    const speechVoiceSelect = document.getElementById('speech-voice-select');
    
    console.log('Save preferences clicked');
    console.log('Token found:', !!token);
    console.log('Theme select:', themeSelect?.value);
    console.log('Speech rate select:', speechRateSelect?.value);
    console.log('Speech voice select:', speechVoiceSelect?.value);
    
    // Always save preferences locally first
    const preferences = {
        theme: themeSelect ? themeSelect.value : 'light',
        speech_rate: speechRateSelect ? parseFloat(speechRateSelect.value) : 1.0,
        speech_voice: speechVoiceSelect ? speechVoiceSelect.value : 'default'
    };

    console.log('Saving preferences:', preferences);

    // Apply theme immediately
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

    // If no token, show message about local-only save
    if (!token) {
        console.warn('No token found - saving preferences locally only');
        showNotification('Preferences saved locally (login to sync with server)', 'info');
        return;
    }

    // Try to save to server
    fetch(getApiUrl('/api/user/preferences'), {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            if (response.status === 401) {
                // Token is invalid/expired
                console.warn('Authentication failed - token may be expired');
                localStorage.removeItem('authToken');
                showNotification('Session expired - preferences saved locally', 'info');
                return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data === null) {
            // Already handled 401 above
            return;
        }
        
        console.log('Response data:', data);
        if (data.message) {
            showNotification('Preferences saved successfully!', 'success');
        } else if (data.error) {
            // Handle specific backend errors
            if (data.error.includes('token') || data.error.includes('Token')) {
                console.warn('Token error from backend');
                localStorage.removeItem('authToken');
                showNotification('Session expired - preferences saved locally', 'info');
            } else {
                console.error('Backend error:', data.error);
                showNotification('Server error - preferences saved locally', 'info');
            }
        }
    })
    .catch(error => {
        console.error('Error saving preferences:', error);
        // Network or other errors - preferences are still saved locally
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            showNotification('Network error - preferences saved locally', 'info');
        } else {
            showNotification('Error saving to server - preferences saved locally', 'info');
        }
    });
}

// Reset user preferences to default
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

// Show notification function with improved UI
function showNotification(message, type) {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification-toast');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification-toast';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(notification);
    }
    
    // Set color based on type
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#10b981';
            break;
        case 'error':
            notification.style.backgroundColor = '#ef4444';
            break;
        case 'info':
            notification.style.backgroundColor = '#3b82f6';
            break;
        default:
            notification.style.backgroundColor = '#6b7280';
    }
    
    // Set message and show
    notification.textContent = message;
    notification.style.transform = 'translateX(0)';
    
    // Hide after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
    }, 3000);
}

// Apply theme function with proper fallback
function applyTheme(theme) {
    try {
        // Use ThemeManager if available
        if (window.themeManager) {
            window.themeManager.setTheme(theme);
        } else {
            // Fallback to direct theme application
            document.documentElement.setAttribute('data-theme', theme);
            // Store in localStorage for consistency
            localStorage.setItem('theme', theme);
        }
        console.log(`Theme applied: ${theme}`);
    } catch (error) {
        console.error('Error applying theme:', error);
    }
}

// Return to Article Button Functionality
function initializeReturnToArticleButton() {
    const returnContainer = document.getElementById('return-to-article-container');
    const returnBtn = document.getElementById('return-to-article-btn');
    const articleTitleDisplay = document.getElementById('article-title-display');
    
    if (!returnContainer || !returnBtn || !articleTitleDisplay) {
        console.log('Return to Article button elements not found');
        return;
    }
    
    // Check for last viewed article in localStorage
    const lastViewedArticle = localStorage.getItem('lastViewedArticle');
    
    if (lastViewedArticle) {
        try {
            const articleData = JSON.parse(lastViewedArticle);
            const viewedTime = new Date(articleData.timestamp);
            const now = new Date();
            const hoursDiff = (now - viewedTime) / (1000 * 60 * 60);
            
            // Show button if article was viewed within last 24 hours
            if (hoursDiff < 24 && articleData.id && articleData.title) {
                articleTitleDisplay.textContent = articleData.title;
                returnContainer.style.display = 'block';
                
                // Add click handler
                returnBtn.addEventListener('click', function() {
                    const articleUrl = `article-view.html?id=${encodeURIComponent(articleData.id)}`;
                    window.location.href = articleUrl;
                });
                
                console.log('Return to Article button initialized for:', articleData.title);
            } else {
                console.log('Last viewed article is too old or missing data');
                returnContainer.style.display = 'none';
            }
        } catch (error) {
            console.error('Error parsing last viewed article:', error);
            returnContainer.style.display = 'none';
        }
    } else {
        console.log('No last viewed article found');
        returnContainer.style.display = 'none';
    }
}

// Profile Setup Modal Functions - Removed as security code feature is no longer needed

// Initialize Return to Article button when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other initialization to complete
    setTimeout(initializeReturnToArticleButton, 100);
    
    // Initialize ThemeManager if available
    if (window.themeManager) {
        window.themeManager.initializeThemeSelect();
    }
});