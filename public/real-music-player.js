// Real Background Music Player
// Uses SoundCloud API for actual music playback

class RealMusicPlayer {
    constructor() {
        this.isPlaying = false;
        this.volume = 0.18; // Background volume (reduced by 12%)
        this.currentTrack = 0;
        this.audio = null;
        this.isInitialized = false;
        this.playlist = [];
        this.apiKey = '4cmgOaCLIaCPZljPUkzZnJB6qKWjoxEC1Rtxv5eJ';
        this.clientId = 'ZayJ3smf8gWQViyeuY7n';
        this.autoPlayOnLoad = true;
        
        this.initialize();
    }
    
    async initialize() {
        try {
            console.log('Initializing Freesound music player...');
            
            // Create audio element first
            this.audio = new Audio();
            this.audio.volume = this.volume;
            this.audio.loop = false;
            this.audio.crossOrigin = 'anonymous';
            
            // Add error handling for audio element
            this.audio.addEventListener('error', (e) => {
                console.error('Audio element error:', e);
                console.error('Audio error details:', {
                    error: this.audio.error,
                    networkState: this.audio.networkState,
                    readyState: this.audio.readyState,
                    src: this.audio.src
                });
            });
            
            this.audio.addEventListener('loadstart', () => {
                console.log('Audio loading started for:', this.audio.src);
            });
            
            this.audio.addEventListener('canplay', () => {
                console.log('Audio can start playing:', this.audio.src);
                if (this.autoPlayOnLoad && !this.isPlaying) {
                    this.start();
                }
            });
            
            // Auto-play next track when current ends
            this.audio.addEventListener('ended', () => {
                console.log('Track ended, playing next...');
                if (this.isPlaying) {
                    // Refresh playlist every 10 tracks for ongoing variety
                    if ((this.currentTrack + 1) % 10 === 0) {
                        this.refreshPlaylist();
                    } else {
                        this.playNextTrack();
                    }
                }
            });
            
            // Load playlist from Freesound API
            await this.loadPlaylist();
            
            if (this.playlist.length === 0) {
                console.error('No tracks loaded, cannot initialize player');
                return false;
            }
            
            // Auto-start music if enabled
            if (this.autoPlayOnLoad) {
                console.log('Auto-play enabled, starting music immediately...');
                // Start immediately without delay for better user experience
                this.start();
            }
            
            this.isInitialized = true;
            console.log('Freesound music player initialized successfully with', this.playlist.length, 'tracks');
            return true;
        } catch (error) {
            console.error('Failed to initialize Freesound music player:', error);
            return false;
        }
    }
    
    async loadPlaylist() {
        try {
            // Expanded search queries for much better variety
            const queries = [
                'ambient music', 'background music', 'instrumental music', 'chill music', 'relaxing music',
                'electronic ambient', 'atmospheric music', 'meditation music', 'peaceful music', 'calm music',
                'downtempo', 'chillout', 'lounge music', 'soft instrumental', 'nature sounds music',
                'piano ambient', 'guitar instrumental', 'synthesizer music', 'drone music', 'minimal music',
                'new age music', 'spa music', 'yoga music', 'focus music', 'study music',
                'cinematic ambient', 'space music', 'ethereal music', 'dreamy music', 'floating music'
            ];
            
            // Use multiple random queries to get more variety
            const numQueries = Math.min(3, queries.length);
            const selectedQueries = [];
            const usedIndices = new Set();
            
            for (let i = 0; i < numQueries; i++) {
                let randomIndex;
                do {
                    randomIndex = Math.floor(Math.random() * queries.length);
                } while (usedIndices.has(randomIndex));
                usedIndices.add(randomIndex);
                selectedQueries.push(queries[randomIndex]);
            }
            
            console.log(`Searching for multiple queries: ${selectedQueries.join(', ')}`);
            
            // Load tracks from multiple queries
            const allTracks = [];
            for (const query of selectedQueries) {
                const tracks = await this.loadTracksFromQuery(query);
                allTracks.push(...tracks);
            }
            
            // Shuffle the combined results for better variety
            this.playlist = this.shuffleArray(allTracks);
            
            console.log(`Successfully loaded ${this.playlist.length} background music tracks from ${selectedQueries.length} different searches`);
            
            if (this.playlist.length === 0) {
                console.error('No valid tracks found after filtering');
            }
        } catch (error) {
            console.error('Failed to load playlist from Freesound:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
        }
    }
    
    async loadTracksFromQuery(query) {
        try {
            // Randomize page and sort order for more variety
            const pages = [1, 2, 3]; // Get from first 3 pages
            const randomPage = pages[Math.floor(Math.random() * pages.length)];
            const sortOptions = ['rating_desc', 'downloads_desc', 'created_desc'];
            const randomSort = sortOptions[Math.floor(Math.random() * sortOptions.length)];
            
            // Include fields parameter to get preview URLs
            const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(query)}&filter=duration:[30 TO 300] license:"Creative Commons 0"&sort=${randomSort}&page=${randomPage}&page_size=15&fields=id,name,username,previews,duration,license&token=${this.apiKey}`;
            console.log(`API URL for "${query}":`, url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log(`Freesound API Response for "${query}":`, data);
            
            if (data.results && data.results.length > 0) {
                console.log(`Processing ${data.results.length} sounds from API for query "${query}"`);
                
                const tracks = data.results.map((sound, index) => {
                    console.log(`Processing sound ${index + 1}:`, {
                        id: sound.id,
                        name: sound.name,
                        hasPreviewsField: !!sound.previews,
                        previewsKeys: sound.previews ? Object.keys(sound.previews) : 'No previews field'
                    });
                    
                    // Check if previews field exists and is an object
                    if (!sound.previews || typeof sound.previews !== 'object') {
                        console.warn(`Sound ${sound.id} has no previews field or invalid previews:`, sound.previews);
                        return null;
                    }
                    
                    // Try different preview URL formats
                    let previewUrl = null;
                    const previewFormats = ['preview-hq-mp3', 'preview-lq-mp3', 'preview-hq-ogg', 'preview-lq-ogg'];
                    
                    for (const format of previewFormats) {
                        if (sound.previews[format]) {
                            previewUrl = sound.previews[format];
                            console.log(`Found preview URL for sound ${sound.id} in format ${format}:`, previewUrl);
                            break;
                        }
                    }
                    
                    if (!previewUrl) {
                        console.warn(`No valid preview URL found for sound ${sound.id}. Available formats:`, Object.keys(sound.previews));
                        return null;
                    }
                    
                    return {
                        id: sound.id,
                        name: sound.name,
                        username: sound.username,
                        preview_url: previewUrl,
                        duration: sound.duration,
                        license: sound.license
                    };
                }).filter(track => track !== null); // Remove tracks without preview URLs
                
                console.log(`Successfully loaded ${tracks.length} tracks for query "${query}"`);
                return tracks;
            } else {
                console.warn(`No tracks found from Freesound API response for query "${query}"`);
                return [];
            }
        } catch (error) {
            console.error(`Failed to load tracks for query "${query}":`, error);
            return [];
        }
    }
    
    // Utility function to shuffle array for better randomization
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    // Method to refresh playlist with new tracks for ongoing variety
    async refreshPlaylist() {
        console.log('Refreshing playlist for better variety...');
        const oldPlaylistLength = this.playlist.length;
        await this.loadPlaylist();
        console.log(`Playlist refreshed: ${oldPlaylistLength} -> ${this.playlist.length} tracks`);
        
        // Reset to first track of new playlist
        this.currentTrack = 0;
        if (this.isPlaying) {
            this.loadCurrentTrack();
            this.audio.play().catch(error => {
                console.error('Failed to play after playlist refresh:', error);
            });
        }
    }
    
    playNextTrack() {
        if (this.playlist.length === 0) return;
        
        this.currentTrack = (this.currentTrack + 1) % this.playlist.length;
        this.loadCurrentTrack();
        
        if (this.isPlaying) {
            this.audio.play().catch(error => {
                console.error('Failed to play next track:', error);
            });
        }
    }
    
    loadCurrentTrack() {
        if (this.playlist.length === 0) {
            console.error('Cannot load track: playlist is empty');
            this.handlePlaybackError('No tracks available');
            return;
        }
        
        if (!this.audio) {
            console.error('Cannot load track: audio element not initialized');
            this.handlePlaybackError('Audio system not ready');
            return;
        }
        
        if (this.currentTrack >= this.playlist.length) {
            console.error('Cannot load track: invalid track index', this.currentTrack);
            this.currentTrack = 0; // Reset to first track
        }
        
        const track = this.playlist[this.currentTrack];
        
        if (!track || !track.preview_url) {
            console.error('Cannot load track: invalid track or missing preview URL', track);
            this.skipToNextValidTrack();
            return;
        }
        
        console.log(`Loading track ${this.currentTrack + 1}/${this.playlist.length}: "${track.name}" by ${track.username}`);
        console.log('Preview URL:', track.preview_url);
        
        // Clear any existing error handlers
        this.audio.onerror = null;
        
        // Add error handling for this specific track
        const errorHandler = (e) => {
            console.error(`Failed to load track "${track.name}":`, e);
            this.audio.removeEventListener('error', errorHandler);
            this.skipToNextValidTrack();
        };
        
        const loadHandler = () => {
            console.log('Track loaded successfully:', track.name);
            this.audio.removeEventListener('loadeddata', loadHandler);
            this.audio.removeEventListener('error', errorHandler);
        };
        
        // Set up event listeners before changing src
        this.audio.addEventListener('loadeddata', loadHandler, { once: true });
        this.audio.addEventListener('error', errorHandler, { once: true });
        
        // Load the track
        try {
            this.audio.src = track.preview_url;
            this.audio.load(); // Explicitly load the audio
        } catch (error) {
            console.error('Error setting audio source:', error);
            this.skipToNextValidTrack();
        }
    }
    
    // Skip to next valid track when current track fails
    skipToNextValidTrack() {
        console.log('Skipping to next valid track...');
        const maxAttempts = this.playlist.length;
        let attempts = 0;
        
        const tryNextTrack = () => {
            if (attempts >= maxAttempts) {
                console.error('No valid tracks found in playlist, refreshing...');
                this.refreshPlaylist();
                return;
            }
            
            this.currentTrack = (this.currentTrack + 1) % this.playlist.length;
            attempts++;
            
            const track = this.playlist[this.currentTrack];
            if (track && track.preview_url) {
                this.loadCurrentTrack();
                if (this.isPlaying) {
                    this.audio.play().catch(() => tryNextTrack());
                }
            } else {
                tryNextTrack();
            }
        };
        
        tryNextTrack();
    }
    
    // Handle playback errors with user feedback
    handlePlaybackError(message) {
        console.error('Playback error:', message);
        this.showMusicStatus(`❌ ${message}`, true);
        
        // Try to recover by refreshing playlist
        setTimeout(() => {
            if (this.playlist.length === 0) {
                this.refreshPlaylist();
            }
        }, 2000);
    }
    
    switchTrack(index) {
        if (index >= 0 && index < this.playlist.length) {
            this.currentTrack = index;
            this.loadCurrentTrack();
            
            if (this.isPlaying) {
                this.audio.play().catch(error => {
                    console.error('Failed to play selected track:', error);
                });
            }
        }
    }
    
    async start() {
        if (this.isPlaying) {
            console.log('Background music is already playing');
            return;
        }
        
        try {
            // Initialize if not already done
            if (!this.isInitialized) {
                const initialized = await this.initialize();
                if (!initialized) {
                    console.error('Failed to initialize Freesound player');
                    return;
                }
            }
            
            if (this.playlist.length === 0) {
                console.warn('No tracks available to play');
                return;
            }
            
            this.isPlaying = true;
            
            // Load and start playing current track
            this.loadCurrentTrack();
            
            // Try to play with proper error handling
            try {
                await this.audio.play();
                console.log('✅ Background music started successfully');
                this.showMusicStatus('🎵 Background music is now playing');
            } catch (error) {
                if (error.name === 'NotAllowedError') {
                    console.log('⚠️ Autoplay blocked by browser. Setting up one-time interaction handler.');
                    this.showMusicStatus('🔇 Click anywhere to enable background music', true);
                    
                    const enableMusic = async () => {
                        try {
                            await this.audio.play();
                            console.log('✅ Music enabled after user interaction');
                            this.showMusicStatus('🎵 Background music enabled!');
                        } catch (playError) {
                            console.error('Failed to play after interaction:', playError);
                        }
                        // Remove the handler after first interaction
                        document.removeEventListener('click', enableMusic);
                    };
                    
                    document.addEventListener('click', enableMusic, { once: true });
                } else {
                    console.error('❌ Music playback error:', error.message);
                    this.showMusicStatus('❌ Music playback failed', true);
                    this.isPlaying = false;
                }
            }
            
        } catch (error) {
            console.error('Failed to start background music:', error);
            this.isPlaying = false;
        }
    }
    
    // Show music status to user
    showMusicStatus(message, isWarning = false, fadeOutWarning = false) {
        // Create or update status element
        let statusEl = document.getElementById('music-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'music-status';
            statusEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${isWarning ? '#fff3cd' : '#d4edda'};
                color: ${isWarning ? '#856404' : '#155724'};
                border: 1px solid ${isWarning ? '#ffeaa7' : '#c3e6cb'};
                padding: 10px 15px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 10000;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(statusEl);
        }
        
        statusEl.textContent = message;
        statusEl.style.background = isWarning ? '#fff3cd' : '#d4edda';
        statusEl.style.color = isWarning ? '#856404' : '#155724';
        statusEl.style.borderColor = isWarning ? '#ffeaa7' : '#c3e6cb';
        statusEl.style.opacity = '1'; // Ensure it's visible
        
        // Auto-hide after 5 seconds if not a warning or if fadeOutWarning is true
        if (!isWarning || fadeOutWarning) {
            setTimeout(() => {
                if (statusEl && statusEl.parentNode) {
                    statusEl.style.opacity = '0';
                    setTimeout(() => {
                        if (statusEl && statusEl.parentNode) {
                            statusEl.parentNode.removeChild(statusEl);
                        }
                    }, 300);
                }
            }, 5000);
        }
    }
    
    // Setup handler for user interaction to enable autoplay
    // Removed redundant setupUserInteractionHandler as it's now handled in start()
    
    stop() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
        }
        
        console.log('Background music stopped');
    }
    
    pause() {
        if (!this.isPlaying) return;
        
        try {
            if (this.audio) {
                this.audio.pause();
            }
            
            this.isPlaying = false;
            console.log('Background music paused');
        } catch (error) {
            console.error('Failed to pause music:', error);
        }
    }
    
    resume() {
        if (this.isPlaying) return;
        
        try {
            if (this.audio) {
                this.audio.play();
            }
            
            this.isPlaying = true;
            console.log('Background music resumed');
        } catch (error) {
            console.error('Failed to resume music:', error);
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.audio) {
            this.audio.volume = this.volume;
        }
        console.log(`Volume set to: ${Math.round(this.volume * 100)}%`);
    }
    
    // Get current status for debugging
    getStatus() {
        const currentTrack = this.playlist[this.currentTrack] || null;
        return {
            isPlaying: this.isPlaying,
            volume: this.volume,
            isInitialized: this.isInitialized,
            currentTrack: currentTrack,
            currentTrackIndex: this.currentTrack,
            totalTracks: this.playlist.length,
            currentTime: this.audio ? this.audio.currentTime : 0,
            duration: this.audio ? this.audio.duration : 0
        };
    }
    
    // Get current track info
    getCurrentTrackInfo() {
        return this.playlist[this.currentTrack] || null;
    }
    
    // Skip to next track
    nextTrack() {
        this.playNextTrack();
    }
    
    // Skip to previous track
    prevTrack() {
        if (this.playlist.length === 0) return;
        
        this.currentTrack = (this.currentTrack - 1 + this.playlist.length) % this.playlist.length;
        this.loadCurrentTrack();
        
        if (this.isPlaying) {
            this.audio.play().catch(error => {
                console.error('Failed to play previous track:', error);
            });
        }
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealMusicPlayer;
}