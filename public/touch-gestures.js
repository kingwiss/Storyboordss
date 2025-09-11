// Touch gestures and mobile interactions
class TouchGestureHandler {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 50;
        this.maxVerticalDistance = 100;
        
        this.init();
    }
    
    init() {
        // Add touch event listeners
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // Add pull-to-refresh functionality
        this.initPullToRefresh();
        
        // Add touch feedback for buttons
        this.initTouchFeedback();
        
        // Add swipe navigation for articles
        this.initSwipeNavigation();
    }
    
    handleTouchStart(event) {
        this.touchStartX = event.changedTouches[0].screenX;
        this.touchStartY = event.changedTouches[0].screenY;
    }
    
    handleTouchEnd(event) {
        this.touchEndX = event.changedTouches[0].screenX;
        this.touchEndY = event.changedTouches[0].screenY;
        
        this.handleSwipeGesture(event);
    }
    
    handleSwipeGesture(event) {
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Check if it's a horizontal swipe
        if (absDeltaX > this.minSwipeDistance && absDeltaY < this.maxVerticalDistance) {
            const target = event.target.closest('.article-card, .swipeable');
            
            if (target) {
                if (deltaX > 0) {
                    this.handleSwipeRight(target);
                } else {
                    this.handleSwipeLeft(target);
                }
            }
        }
    }
    
    handleSwipeRight(element) {
        // Swipe right - show actions or navigate back
        if (element.classList.contains('article-card')) {
            this.showArticleActions(element);
        }
    }
    
    handleSwipeLeft(element) {
        // Swipe left - hide actions or show quick actions
        if (element.classList.contains('article-card')) {
            this.showQuickActions(element);
        }
    }
    
    showArticleActions(articleCard) {
        // Add visual feedback for swipe
        articleCard.classList.add('swiped-right');
        
        // Show actions panel
        const actions = articleCard.querySelector('.article-actions');
        if (actions) {
            actions.style.transform = 'translateX(0)';
            actions.style.opacity = '1';
        }
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.hideArticleActions(articleCard);
        }, 3000);
    }
    
    showQuickActions(articleCard) {
        // Show quick action buttons
        articleCard.classList.add('swiped-left');
        
        // Create quick action overlay if it doesn't exist
        let quickActions = articleCard.querySelector('.quick-actions');
        if (!quickActions) {
            quickActions = this.createQuickActionsOverlay(articleCard);
        }
        
        quickActions.style.transform = 'translateX(0)';
        quickActions.style.opacity = '1';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            this.hideQuickActions(articleCard);
        }, 3000);
    }
    
    createQuickActionsOverlay(articleCard) {
        const overlay = document.createElement('div');
        overlay.className = 'quick-actions';
        overlay.innerHTML = `
            <button class="quick-action-btn view-btn" onclick="viewArticle('${articleCard.dataset.articleId}')">
                <i class="fas fa-eye"></i>
            </button>
            <button class="quick-action-btn audio-btn" onclick="generateAudio('${articleCard.dataset.articleId}')">
                <i class="fas fa-volume-up"></i>
            </button>
        `;
        
        articleCard.appendChild(overlay);
        return overlay;
    }
    
    hideArticleActions(articleCard) {
        articleCard.classList.remove('swiped-right');
        const actions = articleCard.querySelector('.article-actions');
        if (actions) {
            actions.style.transform = 'translateX(100%)';
            actions.style.opacity = '0';
        }
    }
    
    hideQuickActions(articleCard) {
        articleCard.classList.remove('swiped-left');
        const quickActions = articleCard.querySelector('.quick-actions');
        if (quickActions) {
            quickActions.style.transform = 'translateX(-100%)';
            quickActions.style.opacity = '0';
        }
    }
    
    initPullToRefresh() {
        let startY = 0;
        let currentY = 0;
        let pullDistance = 0;
        const threshold = 80;
        
        const pullToRefreshElement = document.createElement('div');
        pullToRefreshElement.className = 'pull-to-refresh';
        pullToRefreshElement.innerHTML = `
            <div class="pull-to-refresh-content">
                <i class="fas fa-arrow-down"></i>
                <span>Pull to refresh</span>
            </div>
        `;
        
        document.body.insertBefore(pullToRefreshElement, document.body.firstChild);
        
        document.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
            }
        }, { passive: true });
        
        document.addEventListener('touchmove', (e) => {
            if (window.scrollY === 0 && startY > 0) {
                currentY = e.touches[0].clientY;
                pullDistance = Math.max(0, currentY - startY);
                
                if (pullDistance > 0) {
                    e.preventDefault();
                    pullToRefreshElement.style.transform = `translateY(${Math.min(pullDistance, threshold)}px)`;
                    pullToRefreshElement.style.opacity = Math.min(pullDistance / threshold, 1);
                    
                    if (pullDistance >= threshold) {
                        pullToRefreshElement.classList.add('ready');
                    } else {
                        pullToRefreshElement.classList.remove('ready');
                    }
                }
            }
        });
        
        document.addEventListener('touchend', () => {
            if (pullDistance >= threshold) {
                this.performRefresh();
            }
            
            // Reset pull to refresh
            pullToRefreshElement.style.transform = 'translateY(-100%)';
            pullToRefreshElement.style.opacity = '0';
            pullToRefreshElement.classList.remove('ready');
            startY = 0;
            pullDistance = 0;
        }, { passive: true });
    }
    
    performRefresh() {
        // Show loading state
        const refreshElement = document.querySelector('.pull-to-refresh');
        if (refreshElement) {
            refreshElement.innerHTML = `
                <div class="pull-to-refresh-content">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Refreshing...</span>
                </div>
            `;
        }
        
        // Refresh the page content
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
    initTouchFeedback() {
        // Add haptic feedback for supported devices
        const buttons = document.querySelectorAll('button, .btn, .nav-link');
        
        buttons.forEach(button => {
            button.addEventListener('touchstart', () => {
                // Add visual feedback
                button.classList.add('touch-active');
                
                // Add haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            }, { passive: true });
            
            button.addEventListener('touchend', () => {
                // Remove visual feedback
                setTimeout(() => {
                    button.classList.remove('touch-active');
                }, 150);
            }, { passive: true });
        });
    }
    
    initSwipeNavigation() {
        // Add swipe navigation for article view page
        if (document.body.classList.contains('article-view-page')) {
            let startX = 0;
            let startY = 0;
            let startTarget = null;
            
            document.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                startTarget = e.target;
            }, { passive: true });
            
            document.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const deltaX = endX - startX;
                const deltaY = endY - startY;
                
                // Check if the swipe started within the slideshow/carousel area
                const isInCarousel = startTarget && (
                    startTarget.closest('#image-carousel') ||
                    startTarget.closest('#image-carousel-container') ||
                    startTarget.closest('#carousel-track') ||
                    startTarget.closest('.carousel') ||
                    startTarget.closest('.slideshow')
                );
                
                // Check for horizontal swipe, but exclude carousel area
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 100 && !isInCarousel) {
                    if (deltaX > 0) {
                        // Swipe right - go back (only if not in carousel)
                        const backBtn = document.querySelector('.back-btn');
                        if (backBtn) {
                            backBtn.click();
                        }
                    }
                }
            }, { passive: true });
        }
    }
}

// Initialize touch gestures when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TouchGestureHandler();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TouchGestureHandler;
}