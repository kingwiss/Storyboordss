class ReturnToArticleButton {
    constructor() {
        this.isVisible = false;
        this.lastViewedArticleId = null;
        this.lastViewedArticleTitle = '';
        
        this.createFloatingButton();
        this.setupEventListeners();
        this.checkForLastViewedArticle();
    }
    
    createFloatingButton() {
        // Remove any existing button
        const existing = document.getElementById('return-to-article-btn');
        if (existing) {
            existing.remove();
        }
        
        // Create the floating return button
        this.button = document.createElement('div');
        this.button.id = 'return-to-article-btn';
        this.button.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 25px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            min-width: 200px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            display: none;
            transition: all 0.3s ease;
            cursor: pointer;
            user-select: none;
        `;
        
        // Create the button content
        this.button.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-arrow-left" style="font-size: 16px;"></i>
                <div>
                    <div style="font-weight: bold; font-size: 13px;">Return to Article</div>
                    <div id="article-title" style="font-size: 11px; opacity: 0.8; margin-top: 2px;">Last viewed article</div>
                </div>
            </div>
        `;
        
        // Add hover effects
        this.button.addEventListener('mouseenter', () => {
            this.button.style.transform = 'translateY(-2px)';
            this.button.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4)';
        });
        
        this.button.addEventListener('mouseleave', () => {
            this.button.style.transform = 'translateY(0)';
            this.button.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
        });
        
        document.body.appendChild(this.button);
    }
    
    setupEventListeners() {
        // Listen for article views to track last viewed article
        window.addEventListener('articleViewed', (event) => {
            console.log('ReturnToArticleButton: articleViewed event received:', event.detail);
            if (event.detail && event.detail.id && event.detail.title) {
                console.log('ReturnToArticleButton: Updating last viewed article:', event.detail.id, event.detail.title);
                this.updateLastViewedArticle(event.detail.id, event.detail.title);
            }
        });
        
        // Handle button click to navigate back to article
        this.button.addEventListener('click', () => {
            this.navigateToLastArticle();
        });
        
        // Show/hide button based on current page
        this.updateVisibility();
        
        // Listen for page navigation to update visibility
        window.addEventListener('popstate', () => {
            setTimeout(() => this.updateVisibility(), 100);
        });
    }
    
    updateLastViewedArticle(articleId, articleTitle) {
        this.lastViewedArticleId = articleId;
        this.lastViewedArticleTitle = articleTitle;
        
        // Save to localStorage
        const articleData = {
            id: articleId,
            title: articleTitle,
            timestamp: Date.now()
        };
        
        localStorage.setItem('lastViewedArticle', JSON.stringify(articleData));
        
        // Update button display
        this.updateButtonContent();
        this.updateVisibility();
    }
    
    checkForLastViewedArticle() {
        const savedArticle = localStorage.getItem('lastViewedArticle');
        if (savedArticle) {
            try {
                const articleData = JSON.parse(savedArticle);
                // Only use if within last 24 hours
                if (articleData.timestamp && (Date.now() - articleData.timestamp) < 86400000) {
                    this.lastViewedArticleId = articleData.id;
                    this.lastViewedArticleTitle = articleData.title;
                    this.updateButtonContent();
                }
            } catch (error) {
                console.warn('Error loading last viewed article:', error);
                localStorage.removeItem('lastViewedArticle');
            }
        }
        
        this.updateVisibility();
    }
    
    updateButtonContent() {
        const titleElement = this.button.querySelector('#article-title');
        if (titleElement && this.lastViewedArticleTitle) {
            // Truncate title if too long
            const maxLength = 30;
            const displayTitle = this.lastViewedArticleTitle.length > maxLength 
                ? this.lastViewedArticleTitle.substring(0, maxLength) + '...'
                : this.lastViewedArticleTitle;
            titleElement.textContent = displayTitle;
        }
    }
    
    updateVisibility() {
        const currentPath = window.location.pathname;
        const isOnArticlePage = currentPath.includes('article-view.html');
        const hasLastViewedArticle = this.lastViewedArticleId !== null;
        
        console.log('ReturnToArticleButton: updateVisibility check:', {
            currentPath,
            isOnArticlePage,
            hasLastViewedArticle,
            lastViewedArticleId: this.lastViewedArticleId,
            isVisible: this.isVisible
        });
        
        // Show button if:
        // 1. Not on article-view page
        // 2. Has a last viewed article
        const shouldShow = !isOnArticlePage && hasLastViewedArticle;
        
        console.log('ReturnToArticleButton: shouldShow =', shouldShow);
        
        if (shouldShow && !this.isVisible) {
            console.log('ReturnToArticleButton: Showing button');
            this.show();
        } else if (!shouldShow && this.isVisible) {
            console.log('ReturnToArticleButton: Hiding button');
            this.hide();
        }
    }
    
    show() {
        this.button.style.display = 'block';
        setTimeout(() => {
            this.button.style.opacity = '1';
            this.button.style.transform = 'translateY(0)';
        }, 10);
        this.isVisible = true;
    }
    
    hide() {
        this.button.style.opacity = '0';
        this.button.style.transform = 'translateY(20px)';
        setTimeout(() => {
            this.button.style.display = 'none';
        }, 300);
        this.isVisible = false;
    }
    
    navigateToLastArticle() {
        if (this.lastViewedArticleId) {
            // Navigate to the article view page with the last viewed article
            window.location.href = `article-view.html?id=${this.lastViewedArticleId}`;
        }
    }
    
    // Public method to manually update last viewed article
    setLastViewedArticle(articleId, articleTitle) {
        this.updateLastViewedArticle(articleId, articleTitle);
    }
}

// Initialize the return to article button (only if not on article-view page)
if (typeof window !== 'undefined' && !window.location.pathname.includes('article-view.html')) {
    console.log('ReturnToArticleButton: Initializing on page:', window.location.pathname);
    window.returnToArticleButton = new ReturnToArticleButton();
    console.log('ReturnToArticleButton: Initialized successfully');
} else {
    console.log('ReturnToArticleButton: Not initializing on article-view page:', window.location.pathname);
}

// For backward compatibility, create an alias
if (typeof window !== 'undefined') {
    window.floatingTTSTracker = window.returnToArticleButton;
}

// Header Navigation Button for Current TTS Article
class CurrentArticleNavButton {
    constructor() {
        this.currentTTSArticle = null;
        this.navButton = null;
        this.init();
    }
    
    init() {
        this.navButton = document.getElementById('current-article-nav');
        if (!this.navButton) {
            console.log('CurrentArticleNavButton: Navigation button not found');
            return;
        }
        
        // Set up click handler
        this.navButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.navigateToCurrentArticle();
        });
        
        // Listen for TTS events
        this.setupTTSListeners();
        
        // Check for existing TTS state
        this.checkExistingTTSState();
    }
    
    setupTTSListeners() {
        // Listen for TTS start events
        document.addEventListener('ttsStarted', (event) => {
            console.log('CurrentArticleNavButton: TTS started for article:', event.detail);
            this.setCurrentArticle(event.detail.id, event.detail.title);
        });
        
        // Listen for TTS stop events
        document.addEventListener('ttsStopped', () => {
            console.log('CurrentArticleNavButton: TTS stopped');
            // Don't hide immediately - keep the button for quick return
        });
        
        // Listen for article view events
        document.addEventListener('articleViewed', (event) => {
            console.log('CurrentArticleNavButton: Article viewed:', event.detail);
            // Only show if TTS is currently playing
            if (this.isTTSPlaying()) {
                this.setCurrentArticle(event.detail.id, event.detail.title);
            }
        });
    }
    
    checkExistingTTSState() {
        // Check if there's a current TTS session
        const currentArticleState = localStorage.getItem('currentArticleState');
        if (currentArticleState) {
            try {
                const state = JSON.parse(currentArticleState);
                if ((state.isPlaying || state.isPaused) && state.articleId && state.articleTitle) {
                    this.setCurrentArticle(state.articleId, state.articleTitle);
                }
            } catch (error) {
                console.error('CurrentArticleNavButton: Error parsing current article state:', error);
            }
        }
    }
    
    isTTSPlaying() {
        // Check if TTS is currently playing or paused (both should show the button)
        const currentArticleState = localStorage.getItem('currentArticleState');
        if (currentArticleState) {
            try {
                const state = JSON.parse(currentArticleState);
                return state.isPlaying === true || state.isPaused === true;
            } catch (error) {
                return false;
            }
        }
        return false;
    }
    
    setCurrentArticle(articleId, articleTitle) {
        this.currentTTSArticle = { id: articleId, title: articleTitle };
        
        // Don't show on article-view page if it's the same article
        if (window.location.pathname.includes('article-view.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            const currentPageArticleId = urlParams.get('id');
            if (currentPageArticleId === articleId) {
                this.hideButton();
                return;
            }
        }
        
        this.showButton(articleTitle);
    }
    
    showButton(articleTitle) {
        if (!this.navButton) return;
        
        // Update button text to show current article
        const span = this.navButton.querySelector('span');
        if (span) {
            span.textContent = `Playing: ${articleTitle.length > 20 ? articleTitle.substring(0, 20) + '...' : articleTitle}`;
        }
        
        this.navButton.style.display = 'flex';
        this.navButton.classList.add('current-article-active');
        
        console.log('CurrentArticleNavButton: Showing button for:', articleTitle);
    }
    
    hideButton() {
        if (!this.navButton) return;
        
        this.navButton.style.display = 'none';
        this.navButton.classList.remove('current-article-active');
        
        // Reset button text
        const span = this.navButton.querySelector('span');
        if (span) {
            span.textContent = 'Current Article';
        }
        
        console.log('CurrentArticleNavButton: Hiding button');
    }
    
    navigateToCurrentArticle() {
        if (this.currentTTSArticle && this.currentTTSArticle.id) {
            const articleUrl = `article-view.html?id=${encodeURIComponent(this.currentTTSArticle.id)}`;
            window.location.href = articleUrl;
        }
    }
}

// Initialize the current article navigation button
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.currentArticleNavButton = new CurrentArticleNavButton();
        console.log('CurrentArticleNavButton: Initialized');
    });
}