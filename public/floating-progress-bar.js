// Floating TTS Progress Bar Component
// This component provides a persistent progress bar that appears on all pages when TTS is active

class FloatingProgressBar {
    constructor() {
        this.container = null;
        this.progressBar = null;
        this.playPauseBtn = null;
        this.titleText = null;
        this.timeDisplay = null;
        this.isVisible = false;
        this.currentProgress = 0;
        this.isPlaying = false;
        this.articleTitle = '';
        
        // Storage keys
        this.STORAGE_KEY = 'tts_floating_progress';
        this.ARTICLE_KEY = 'currentArticle';
        
        this.init();
        this.bindEvents();
        this.checkTTSState();
    }
    
    init() {
        // Create the floating progress bar HTML
        this.container = document.createElement('div');
        this.container.id = 'floating-progress-bar';
        this.container.className = 'floating-progress-bar hidden';
        
        this.container.innerHTML = `
            <div class="floating-progress-content">
                <div class="floating-progress-info">
                    <div class="floating-progress-title">Reading Article...</div>
                    <div class="floating-progress-time">0:00 / 0:00</div>
                </div>
                <div class="floating-progress-controls">
                    <div class="floating-progress-track">
                        <div class="floating-progress-fill"></div>
                    </div>
                    <button class="floating-play-pause-btn" title="Play/Pause">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Get references to elements
        this.progressBar = this.container.querySelector('.floating-progress-fill');
        this.playPauseBtn = this.container.querySelector('.floating-play-pause-btn');
        this.titleText = this.container.querySelector('.floating-progress-title');
        this.timeDisplay = this.container.querySelector('.floating-progress-time');
        this.progressTrack = this.container.querySelector('.floating-progress-track');
        
        // Append to body
        document.body.appendChild(this.container);
    }
    
    bindEvents() {
        // Play/Pause button click
        this.playPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlayPause();
        });
        
        // Progress bar click for seeking
        this.progressTrack.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = this.progressTrack.getBoundingClientRect();
            const clickPosition = (e.clientX - rect.left) / rect.width;
            this.seekToPosition(clickPosition);
        });
        
        // Container click to navigate to article view
        this.container.addEventListener('click', () => {
            this.navigateToArticle();
        });
        
        // Listen for storage changes to sync across tabs
        window.addEventListener('storage', (e) => {
            if (e.key === this.STORAGE_KEY) {
                this.syncFromStorage();
            }
        });
        
        // Check TTS state periodically
        setInterval(() => {
            this.checkTTSState();
        }, 1000);
    }
    
    checkTTSState() {
        // Only show floating progress bar on article-view page
        if (!window.location.pathname.includes('article-view.html')) {
            this.hide();
            return;
        }
        
        // Check if TTS is active from localStorage or speechSynthesis
        const savedState = localStorage.getItem(this.ARTICLE_KEY);
        const isTTSActive = speechSynthesis.speaking || speechSynthesis.pending;
        
        // Always show if TTS is currently active, regardless of saved state
        if (isTTSActive) {
            // Get title from saved state if available, otherwise use default
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    this.articleTitle = state.title || 'Article';
                } catch (e) {
                    this.articleTitle = 'Article';
                }
            } else {
                this.articleTitle = 'Article';
            }
            this.updateTitle(this.articleTitle);
            this.show();
            this.updateFromTTSState();
            return;
        }
        
        // If TTS is not active, check saved state for previous progress
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                const now = Date.now();
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours
                
                // Check if state is not too old and has content and progress
                if (state.timestamp && (now - state.timestamp) < maxAge && state.fullText && state.currentWordIndex > 0) {
                    this.articleTitle = state.title || 'Article';
                    this.updateTitle(this.articleTitle);
                    this.show();
                    this.updateFromTTSState();
                } else {
                    this.hide();
                }
            } catch (e) {
                console.warn('Error parsing saved article state:', e);
                this.hide();
            }
        } else {
            this.hide();
        }
    }
    
    updateFromTTSState() {
        // Get current TTS state from the main script
        if (typeof window.getCurrentTTSState === 'function') {
            const state = window.getCurrentTTSState();
            this.updateProgress(state.progress || 0);
            this.updatePlayState(state.isPlaying || false);
            this.updateTime(state.currentTime || 0, state.totalTime || 0);
        } else {
            // Fallback: try to get state from localStorage
            const savedState = localStorage.getItem(this.ARTICLE_KEY);
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    const progress = state.totalWords > 0 ? (state.currentWordIndex / state.totalWords) * 100 : 0;
                    this.updateProgress(progress);
                    this.updatePlayState(speechSynthesis.speaking);
                } catch (e) {
                    console.warn('Error getting TTS state:', e);
                }
            }
        }
    }
    
    show() {
        if (!this.isVisible) {
            this.container.classList.remove('hidden');
            this.container.classList.add('visible');
            this.isVisible = true;
        }
    }
    
    hide() {
        if (this.isVisible) {
            this.container.classList.remove('visible');
            this.container.classList.add('hidden');
            this.isVisible = false;
        }
    }
    
    updateProgress(percentage) {
        this.currentProgress = Math.max(0, Math.min(100, percentage));
        this.progressBar.style.width = `${this.currentProgress}%`;
    }
    
    updatePlayState(playing) {
        this.isPlaying = playing;
        const icon = this.playPauseBtn.querySelector('i');
        if (playing) {
            icon.className = 'fas fa-pause';
            this.playPauseBtn.title = 'Pause';
        } else {
            icon.className = 'fas fa-play';
            this.playPauseBtn.title = 'Play';
        }
    }
    
    updateTitle(title) {
        this.articleTitle = title;
        this.titleText.textContent = title.length > 30 ? title.substring(0, 30) + '...' : title;
    }
    
    updateTime(currentSeconds, totalSeconds) {
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };
        
        this.timeDisplay.textContent = `${formatTime(currentSeconds)} / ${formatTime(totalSeconds)}`;
    }
    
    togglePlayPause() {
        // Try to call the main TTS play/pause function
        if (typeof window.toggleMainTTS === 'function') {
            window.toggleMainTTS();
        } else {
            // Fallback: try to find and click the main play/pause button
            const mainPlayBtn = document.getElementById('play-pause-btn');
            if (mainPlayBtn) {
                mainPlayBtn.click();
            } else {
                // If we're not on the main page, navigate there first
                this.navigateToArticle();
            }
        }
    }
    
    seekToPosition(position) {
        // Try to call the main TTS seek function
        if (typeof window.seekMainTTS === 'function') {
            window.seekMainTTS(position);
        } else {
            // Store the seek position and navigate to article
            localStorage.setItem('tts_seek_position', position.toString());
            this.navigateToArticle();
        }
    }
    
    navigateToArticle() {
        // Navigate to article-view.html to resume the article
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'article-view.html' && currentPage !== 'index.html') {
            window.location.href = 'article-view.html';
        } else if (currentPage !== 'index.html') {
            window.location.href = 'index.html';
        }
    }
    
    syncFromStorage() {
        // Sync state from localStorage (for cross-tab communication)
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (data) {
            try {
                const state = JSON.parse(data);
                this.updateProgress(state.progress || 0);
                this.updatePlayState(state.isPlaying || false);
                this.updateTime(state.currentTime || 0, state.totalTime || 0);
                if (state.title) {
                    this.updateTitle(state.title);
                }
            } catch (e) {
                console.warn('Error syncing from storage:', e);
            }
        }
    }
    
    // Public method to update the floating bar from external scripts
    updateState(state) {
        if (state.progress !== undefined) {
            this.updateProgress(state.progress);
        }
        if (state.isPlaying !== undefined) {
            this.updatePlayState(state.isPlaying);
        }
        if (state.currentTime !== undefined && state.totalTime !== undefined) {
            this.updateTime(state.currentTime, state.totalTime);
        }
        if (state.title) {
            this.updateTitle(state.title);
        }
        
        // Save to localStorage for cross-tab sync
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
            progress: this.currentProgress,
            isPlaying: this.isPlaying,
            currentTime: state.currentTime || 0,
            totalTime: state.totalTime || 0,
            title: this.articleTitle,
            timestamp: Date.now()
        }));
        
        // Show the bar if we have meaningful progress or TTS is active
        if (this.currentProgress > 0 || this.isPlaying || speechSynthesis.speaking) {
            this.show();
        } else if (!speechSynthesis.speaking && !this.isPlaying && this.currentProgress === 0) {
            // Hide if TTS is not active and no progress
            this.hide();
        }
    }
}

// Initialize the floating progress bar when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.floatingProgressBar = new FloatingProgressBar();
    });
} else {
    window.floatingProgressBar = new FloatingProgressBar();
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FloatingProgressBar;
}