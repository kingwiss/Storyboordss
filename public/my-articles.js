// Global variables
let currentUser = null;
let authToken = localStorage.getItem('authToken');
let userArticles = [];

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
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
    const articlesContainer = document.getElementById('articles-container');
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    
    // Articles data will be initialized in global scope
    
    // Floating button functionality is now handled by floating-tts-tracker.js
    const CURRENT_ARTICLE_KEY = 'currentArticleState';
    
    // Mobile menu functionality
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mainNavigation = document.querySelector('.main-navigation');
    
    if (mobileMenuToggle && mainNavigation) {
        mobileMenuToggle.addEventListener('click', function() {
            const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
            
            // Toggle menu visibility
            mainNavigation.classList.toggle('active');
            
            // Update ARIA attribute
            mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
            
            // Change icon
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.className = isExpanded ? 'fas fa-bars' : 'fas fa-times';
            }
        });
        
        // Close menu when clicking on navigation links
        const navLinks = mainNavigation.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                mainNavigation.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!mobileMenuToggle.contains(event.target) && !mainNavigation.contains(event.target)) {
                mainNavigation.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            }
        });
    }

    
    // Authentication functions - copied from main app
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
        console.log('=== DEBUG: Checking auth status, authToken:', authToken ? 'exists' : 'null');
        if (authToken) {
            try {
                console.log('=== DEBUG: Making request to /api/auth/me');
                const response = await fetch(getApiUrl('/api/auth/me'), {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    },
                    credentials: 'include'
                });
                
                console.log('=== DEBUG: Auth response status:', response.status);
                if (response.ok) {
                    const data = await response.json();
                    console.log('=== DEBUG: Auth successful, user:', data.user);
                    currentUser = data.user;
                    updateAuthUI();
                    loadUserArticles();
                } else {
                    console.log('=== DEBUG: Auth failed, removing token');
                    // Token is invalid, remove it
                    localStorage.removeItem('authToken');
                    authToken = null;
                    currentUser = null;
                    updateAuthUI();
                    showEmptyState();
                }
            } catch (error) {
                console.error('=== DEBUG: Auth check failed:', error);
                localStorage.removeItem('authToken');
                authToken = null;
                currentUser = null;
                updateAuthUI();
                showEmptyState();
            }
        } else {
            console.log('=== DEBUG: No auth token found, showing empty state');
            updateAuthUI();
            showEmptyState();
        }
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
    
    // Close modals when clicking outside - copied from main app
    if (loginModal || signupModal) {
        window.addEventListener('click', (event) => {
            if (loginModal && event.target === loginModal) closeModal(loginModal);
            if (signupModal && event.target === signupModal) closeModal(signupModal);
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
                    loadUserArticles();
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
    
    // My Articles specific functions
    async function loadUserArticles() {
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
        hideLoadingState();
        
        if (!userArticles || userArticles.length === 0) {
            showEmptyState();
            return;
        }
        
        hideEmptyState();
        
        articlesContainer.innerHTML = userArticles.map(article => {
            const createdDate = new Date(article.created_at).toLocaleDateString();
            const keyPoints = article.key_points || [];
            
            return `
                <div class="article-card" data-id="${article.id}">
                    <div class="article-header">
                        <h3 class="article-title">${escapeHtml(article.title)}</h3>
                        <div class="article-date">${createdDate}</div>
                    </div>
                    <div class="article-content">
                        <p class="article-summary">${escapeHtml(article.summary || 'No summary available')}</p>
                        ${keyPoints.length > 0 ? `
                            <div class="key-points">
                                <h4>Key Points:</h4>
                                <ul>
                                    ${keyPoints.slice(0, 3).map(point => `<li>${escapeHtml(point)}</li>`).join('')}
                                    ${keyPoints.length > 3 ? `<li class="more-points">+${keyPoints.length - 3} more points</li>` : ''}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                    <div class="article-actions">
                        <button class="btn btn-primary" onclick="viewArticle('${article.id}')">
                            📖 View Article
                        </button>
                        <button class="btn btn-secondary" onclick="window.open('${article.url}', '_blank')">
                            🔗 Original
                        </button>
                        <button class="btn btn-danger" onclick="deleteArticle('${article.id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Check if we need to auto-click the latest article after rendering
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
    
    window.deleteArticle = async function(articleId) {
        if (!confirm('Are you sure you want to delete this article?')) {
            return;
        }
        
        try {
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
    };
    
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
        speechRateSelect.value = preferences.speech_rate || 1.0;
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
    
    if (!token) {
        console.error('No token found');
        return;
    }

    const preferences = {
        theme: themeSelect ? themeSelect.value : 'light',
        speech_rate: speechRateSelect ? parseFloat(speechRateSelect.value) : 1.0,
        speech_voice: speechVoiceSelect ? speechVoiceSelect.value : 'default'
    };

    fetch(getApiUrl('/api/user/preferences'), {
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

// Show notification function (simplified version)
function showNotification(message, type) {
    console.log(`${type.toUpperCase()}: ${message}`);
    // You can implement a proper notification system here if needed
    alert(message);
}

// Apply theme function (simplified version)
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
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

// Initialize Return to Article button when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for other initialization to complete
    setTimeout(initializeReturnToArticleButton, 100);
});