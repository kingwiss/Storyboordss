// Persistent Audio Playback Manager
// This script manages TTS playback across page navigation

class PersistentAudioManager {
    constructor() {
        this.isInitialized = false;
        this.currentUtterance = null;
        this.isPlaying = false;
        this.currentWordIndex = 0;
        this.totalWords = 0;
        this.fullText = '';
        this.articleId = null;
        this.floatingControls = null;
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        // Check for existing TTS state
        this.restoreState();
        
        // Create floating controls if audio is playing
        if (this.isPlaying && !window.location.pathname.includes('article-view.html')) {
            this.createFloatingControls();
        }
        
        // Save state before navigation
        window.addEventListener('beforeunload', () => this.saveState());
        window.addEventListener('pagehide', () => this.saveState());
        
        this.isInitialized = true;
    }
    
    restoreState() {
        const savedState = localStorage.getItem('persistentTtsState');
        if (!savedState) return;
        
        try {
            const state = JSON.parse(savedState);
            
            // Only restore if within 10 minutes and was playing
            if (state.timestamp && 
                (Date.now() - state.timestamp) < 600000 && 
                state.isPlaying) {
                
                this.articleId = state.articleId;
                this.isPlaying = state.isPlaying;
                this.currentWordIndex = state.wordIndex || 0;
                this.totalWords = state.totalWords || 0;
                this.fullText = state.fullText || '';
                
                console.log('Restored persistent TTS state:', state);
                
                // If not on article page, continue playing in background
                if (!window.location.pathname.includes('article-view.html') && this.fullText) {
                    this.continuePlayback();
                } else if (window.location.pathname.includes('article-view.html')) {
                    // On article page, stop background playback and let article view handle it
                    if (speechSynthesis.speaking) {
                        speechSynthesis.cancel();
                    }
                    this.removeFloatingControls();
                    console.log('Stopped background playback - article view will handle TTS');
                }
            }
        } catch (error) {
            console.error('Error restoring persistent TTS state:', error);
            localStorage.removeItem('persistentTtsState');
        }
    }
    
    saveState() {
        if (this.isPlaying || (speechSynthesis && speechSynthesis.speaking)) {
            const state = {
                articleId: this.articleId,
                isPlaying: this.isPlaying,
                wordIndex: this.currentWordIndex,
                totalWords: this.totalWords,
                fullText: this.fullText,
                timestamp: Date.now()
            };
            
            localStorage.setItem('persistentTtsState', JSON.stringify(state));
            console.log('Saved persistent TTS state:', state);
        }
    }
    
    continuePlayback() {
        if (!this.fullText || !speechSynthesis) return;
        
        const words = this.fullText.split(/\s+/);
        const wordsToSpeak = words.slice(this.currentWordIndex).join(' ');
        
        if (wordsToSpeak.trim()) {
            this.currentUtterance = new SpeechSynthesisUtterance(wordsToSpeak);
            this.currentUtterance.rate = 1;
            this.currentUtterance.pitch = 1;
            this.currentUtterance.volume = 0.8; // Slightly lower volume for background
            
            this.currentUtterance.onend = () => {
                this.isPlaying = false;
                this.removeFloatingControls();
                localStorage.removeItem('persistentTtsState');
            };
            
            this.currentUtterance.onerror = () => {
                this.isPlaying = false;
                this.removeFloatingControls();
            };
            
            speechSynthesis.speak(this.currentUtterance);
            console.log('Continuing TTS playback in background');
        }
    }
    
    createFloatingControls() {
        if (this.floatingControls || window.location.pathname.includes('article-view.html')) {
            return;
        }
        
        this.floatingControls = document.createElement('div');
        this.floatingControls.id = 'persistent-audio-controls';
        this.floatingControls.innerHTML = `
            <div class="persistent-audio-bar">
                <button class="audio-control-btn pause-btn" onclick="window.persistentAudio.pause()">
                    <i class="fas fa-pause"></i>
                </button>
                <button class="audio-control-btn return-btn" onclick="window.persistentAudio.returnToArticle()">
                    <i class="fas fa-headphones"></i>
                    <span>Return to Article</span>
                </button>
                <button class="audio-control-btn close-btn" onclick="window.persistentAudio.stop()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            #persistent-audio-controls {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 10000;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 25px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                padding: 10px 15px;
                animation: slideIn 0.3s ease-out;
            }
            
            .persistent-audio-bar {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .audio-control-btn {
                background: rgba(255,255,255,0.2);
                border: none;
                border-radius: 20px;
                color: white;
                padding: 8px 12px;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 5px;
                font-size: 14px;
            }
            
            .audio-control-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: translateY(-1px);
            }
            
            .return-btn {
                background: rgba(255,255,255,0.9);
                color: #333;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(this.floatingControls);
    }
    
    removeFloatingControls() {
        if (this.floatingControls) {
            this.floatingControls.remove();
            this.floatingControls = null;
        }
    }
    
    pause() {
        if (speechSynthesis && speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        this.isPlaying = false;
        this.removeFloatingControls();
        localStorage.removeItem('persistentTtsState');
        localStorage.removeItem('ttsState'); // Also clear the old ttsState
    }
    
    stop() {
        this.pause();
        this.currentWordIndex = 0;
    }
    
    returnToArticle() {
        if (this.articleId) {
            // Save current state before navigating back
            this.saveState();
            window.location.href = `/article-view.html?id=${this.articleId}`;
        }
    }
    
    // Method to be called from article-view.js to sync state
    syncWithArticleView(articleId, isPlaying, wordIndex, totalWords, fullText) {
        this.articleId = articleId;
        this.isPlaying = isPlaying;
        this.currentWordIndex = wordIndex;
        this.totalWords = totalWords;
        this.fullText = fullText;
        
        if (isPlaying) {
            this.saveState();
        }
    }
}

// Initialize persistent audio manager
if (typeof window !== 'undefined') {
    window.persistentAudio = new PersistentAudioManager();
}