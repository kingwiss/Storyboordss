// Persistent Background Music Manager
// Maintains continuous background music across page navigation using shared storage

class PersistentMusicManager {
    constructor() {
        this.storageKey = 'persistentMusicData';
        this.stateKey = 'persistentMusicState';
        this.isInitialized = false;
        this.musicPlayer = null;
        this.checkInterval = null;
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        console.log('=== DEBUG: Initializing Persistent Music Manager ===');
        
        // Always initialize a new player to ensure music can start
        console.log('=== DEBUG: Initializing new player with autoplay enabled ===');
        this.initializeNewPlayer();
        
        // Check if music should be playing based on shared state
        const existingState = this.getSharedState();
        const userPreviouslyToggled = existingState && existingState.userToggled === true;
        const shouldBePlaying = !existingState || (existingState.isPlaying !== false && !userPreviouslyToggled);
        
        if (shouldBePlaying) {
            console.log('=== DEBUG: Auto-starting music on page load ===');
            // Start music automatically after a short delay to ensure DOM is ready
            setTimeout(async () => {
                try {
                    await this.start();
                    console.log('=== DEBUG: Music auto-started successfully ===');
                } catch (error) {
                    console.log('=== DEBUG: Auto-start failed, will retry on user interaction:', error.message);
                }
            }, 500);
        } else if (userPreviouslyToggled) {
            console.log('=== DEBUG: Music auto-start skipped - user previously turned off music ===');
        }
        
        // Set up state monitoring
        this.startStateMonitoring();
        
        // Save state before navigation and periodically
        window.addEventListener('beforeunload', () => this.saveState());
        window.addEventListener('pagehide', () => this.saveState());
        
        // Also save state periodically to keep it fresh
        setInterval(() => {
            if (this.musicPlayer && this.musicPlayer.isPlaying) {
                this.saveState();
            }
        }, 5000); // Save every 5 seconds when playing
        
        this.isInitialized = true;
    }
    
    initializeNewPlayer() {
        this.musicPlayer = new RealMusicPlayer();
        // Keep auto-play enabled for better user experience
        this.musicPlayer.autoPlayOnLoad = true;
        
        // Override the player's state management
        this.overridePlayerMethods();
    }
    
    syncWithExistingMusic() {
        // Create a sync player that can take over audio playback if needed
        const state = this.getSharedState();
        
        this.musicPlayer = {
            isPlaying: state.isPlaying || false,
            volume: state.volume || 0.18,
            currentTrack: state.currentTrack || 0,
            playlist: [],
            audio: null,
            isInitialized: true,
            realPlayer: null,
            
            // Initialize real player on demand
            ensureRealPlayer: async function() {
                if (!this.realPlayer) {
                    this.realPlayer = new RealMusicPlayer();
                    this.realPlayer.autoPlayOnLoad = true;
                    await this.realPlayer.initialize();
                    this.playlist = this.realPlayer.playlist;
                    this.audio = this.realPlayer.audio;
                }
                return this.realPlayer;
            },
            
            start: async () => {
                console.log('=== DEBUG: Sync player start() called ===');
                const currentState = this.getSharedState();
                if (!currentState.isPlaying) {
                    // Always ensure we have a real player for starting music
                    try {
                        await this.musicPlayer.ensureRealPlayer();
                        if (this.musicPlayer.realPlayer) {
                            console.log('=== DEBUG: Starting real player from sync ===');
                            await this.musicPlayer.realPlayer.start();
                            this.setSharedState({ ...currentState, isPlaying: true, lastUpdate: Date.now() });
                            console.log('=== DEBUG: Music started successfully via sync ===');
                        } else {
                            console.log('=== DEBUG: Real player not available in sync ===');
                        }
                    } catch (error) {
                        console.log('=== DEBUG: Could not start real player from sync:', error.message);
                        // Still update state to indicate attempt was made
                        this.setSharedState({ ...currentState, isPlaying: true, lastUpdate: Date.now() });
                    }
                } else {
                    console.log('=== DEBUG: Music already playing according to sync state ===');
                }
            },
            
            stop: () => {
                const currentState = this.getSharedState();
                if (this.musicPlayer.realPlayer) {
                    this.musicPlayer.realPlayer.pause();
                }
                this.setSharedState({ ...currentState, isPlaying: false, lastUpdate: Date.now() });
                console.log('=== DEBUG: Stopped music via sync ===');
            },
            
            pause: () => {
                const currentState = this.getSharedState();
                if (this.musicPlayer.realPlayer) {
                    this.musicPlayer.realPlayer.pause();
                }
                this.setSharedState({ ...currentState, isPlaying: false, lastUpdate: Date.now() });
            },
            
            resume: () => {
                const currentState = this.getSharedState();
                if (this.musicPlayer.realPlayer) {
                    this.musicPlayer.realPlayer.resume();
                }
                this.setSharedState({ ...currentState, isPlaying: true, lastUpdate: Date.now() });
            },
            
            setVolume: (vol) => {
                const currentState = this.getSharedState();
                if (this.musicPlayer.realPlayer) {
                    this.musicPlayer.realPlayer.setVolume(vol);
                }
                this.setSharedState({ ...currentState, volume: vol, lastUpdate: Date.now() });
            },
            
            nextTrack: () => {
                const currentState = this.getSharedState();
                if (this.musicPlayer.realPlayer) {
                    this.musicPlayer.realPlayer.nextTrack();
                }
                this.setSharedState({ ...currentState, currentTrack: (currentState.currentTrack || 0) + 1, lastUpdate: Date.now() });
            },
            
            prevTrack: () => {
                const currentState = this.getSharedState();
                if (this.musicPlayer.realPlayer) {
                    this.musicPlayer.realPlayer.prevTrack();
                }
                this.setSharedState({ ...currentState, currentTrack: Math.max(0, (currentState.currentTrack || 0) - 1), lastUpdate: Date.now() });
            },
            
            getStatus: () => {
                const currentState = this.getSharedState();
                return {
                    isPlaying: currentState.isPlaying || false,
                    currentTrack: currentState.currentTrack || 0,
                    volume: currentState.volume || 0.18
                };
            }
        };
    }
    
    overridePlayerMethods() {
        const originalStart = this.musicPlayer.start.bind(this.musicPlayer);
        const originalStop = this.musicPlayer.stop.bind(this.musicPlayer);
        const originalPause = this.musicPlayer.pause.bind(this.musicPlayer);
        const originalResume = this.musicPlayer.resume.bind(this.musicPlayer);
        
        this.musicPlayer.start = async () => {
            const result = await originalStart();
            this.updateSharedState({ isPlaying: true });
            return result;
        };
        
        this.musicPlayer.stop = () => {
            const result = originalStop();
            this.updateSharedState({ isPlaying: false });
            return result;
        };
        
        this.musicPlayer.pause = () => {
            const result = originalPause();
            this.updateSharedState({ isPlaying: false });
            return result;
        };
        
        this.musicPlayer.resume = () => {
            const result = originalResume();
            this.updateSharedState({ isPlaying: true });
            return result;
        };
    }
    
    startStateMonitoring() {
        // Check for state changes every 2 seconds
        this.checkInterval = setInterval(() => {
            const state = this.getSharedState();
            if (state && this.isRecentState(state)) {
                // Update local UI based on shared state
                this.syncUIWithState(state);
            }
            
            // Keep state fresh by updating timestamp if music is playing
            if (this.musicPlayer && this.musicPlayer.isPlaying) {
                this.updateSharedState({ lastUpdate: Date.now() });
            }
        }, 2000);
    }
    
    syncUIWithState(state) {
        // Update music toggle buttons across the page
        const toggleButtons = [
            document.getElementById('music-toggle'),
            document.getElementById('music-toggle-btn')
        ];
        
        toggleButtons.forEach(button => {
            if (button) {
                if (state.isPlaying) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        });
    }
    
    getSharedState() {
        try {
            const state = localStorage.getItem(this.stateKey);
            return state ? JSON.parse(state) : null;
        } catch (error) {
            console.error('Failed to get shared state:', error);
            return null;
        }
    }
    
    setSharedState(state) {
        try {
            state.lastUpdate = Date.now();
            localStorage.setItem(this.stateKey, JSON.stringify(state));
        } catch (error) {
            console.error('Failed to set shared state:', error);
        }
    }
    
    updateSharedState(updates) {
        const currentState = this.getSharedState() || {};
        const newState = { ...currentState, ...updates, lastUpdate: Date.now() };
        this.setSharedState(newState);
    }
    
    isRecentState(state) {
        if (!state || !state.lastUpdate) return false;
        const timeDiff = Date.now() - state.lastUpdate;
        return timeDiff < 120000; // 2 minutes - allow more time for page navigation and tab switching
    }
    
    saveState() {
        if (!this.musicPlayer) return;
        
        const state = {
            isPlaying: this.musicPlayer.isPlaying || false,
            currentTrack: this.musicPlayer.currentTrack || 0,
            volume: this.musicPlayer.volume || 0.18,
            currentTime: this.musicPlayer.audio ? this.musicPlayer.audio.currentTime : 0,
            lastUpdate: Date.now(),
            userToggled: false // Track if user manually stopped music
        };
        
        this.setSharedState(state);
        console.log('=== DEBUG: Music state saved ===', state);
    }
    
    // Public API methods
    async start() {
        if (!this.musicPlayer) {
            console.error('Music player not initialized');
            return;
        }
        
        try {
            await this.musicPlayer.start();
            // Reset userToggled flag when music is manually started
            this.updateSharedState({ isPlaying: true, userToggled: false });
            console.log('=== DEBUG: Persistent music started ===');
        } catch (error) {
            console.error('Failed to start persistent music:', error);
        }
    }
    
    stop() {
        if (!this.musicPlayer) return;
        this.musicPlayer.pause();
        // Mark that user manually paused the music
        this.updateSharedState({ isPlaying: false, userToggled: true });
        console.log('=== DEBUG: Music paused by user ===');
    }
    
    pause() {
        if (!this.musicPlayer) return;
        this.musicPlayer.pause();
    }
    
    resume() {
        if (!this.musicPlayer) return;
        this.musicPlayer.resume();
    }
    
    setVolume(volume) {
        if (!this.musicPlayer) return;
        this.musicPlayer.setVolume(volume);
    }
    
    nextTrack() {
        if (!this.musicPlayer) return;
        this.musicPlayer.nextTrack();
    }
    
    prevTrack() {
        if (!this.musicPlayer) return;
        this.musicPlayer.prevTrack();
    }
    
    getStatus() {
        if (!this.musicPlayer) {
            return { isPlaying: false, isInitialized: false };
        }
        return this.musicPlayer.getStatus();
    }
    
    get isCurrentlyPlaying() {
        const state = this.getSharedState();
        return state && state.isPlaying && this.isRecentState(state);
    }
    
    get isPlaying() {
        return this.isCurrentlyPlaying;
    }
    

    
    cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

// Initialize persistent music manager
if (typeof window !== 'undefined') {
    // Clean up any existing instance
    if (window.persistentMusic && window.persistentMusic.cleanup) {
        window.persistentMusic.cleanup();
    }
    
    // Create new instance
    window.persistentMusic = new PersistentMusicManager();
    window.musicPlayer = window.persistentMusic;
    
    console.log('=== DEBUG: Persistent music manager attached to window ===');
}