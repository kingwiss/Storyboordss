document.addEventListener('DOMContentLoaded', function() {
    let authToken = localStorage.getItem('authToken');
    let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    let currentArticle = null;
    
    // Voice selection variables
    let availableVoices = [];
    let selectedVoice = null;

    // DOM elements
    const loadingState = document.getElementById('loading-state');
    const articleNotFound = document.getElementById('article-not-found');
    const articleContent = document.getElementById('article-content');
    const navUser = document.getElementById('nav-user');

    // Article elements
    const articleTitle = document.getElementById('article-title');
    const articleDate = document.getElementById('article-date');
    const originalLink = document.getElementById('original-link');
    const articleFullText = document.getElementById('article-full-text');
    const articleSummary = document.getElementById('article-summary');
    const imageGallery = document.getElementById('image-gallery');
    const keyPointsList = document.getElementById('key-points-list');
    const articleImagesSection = document.getElementById('article-images-section');
    const keyPointsSection = document.getElementById('key-points-section');

    // Modal elements
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');

    // Mobile menu functionality
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', function() {
            const isExpanded = mobileMenuToggle.getAttribute('aria-expanded') === 'true';
            
            // Toggle menu visibility
            navLinks.classList.toggle('active');
            
            // Update ARIA attribute
            mobileMenuToggle.setAttribute('aria-expanded', !isExpanded);
            
            // Change icon
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.className = isExpanded ? 'fas fa-bars' : 'fas fa-times';
            }
        });
        
        // Close menu when clicking on navigation links
        const navLinkElements = navLinks.querySelectorAll('.nav-link');
        navLinkElements.forEach(link => {
            link.addEventListener('click', function() {
                navLinks.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!mobileMenuToggle.contains(event.target) && !navLinks.contains(event.target)) {
                navLinks.classList.remove('active');
                mobileMenuToggle.setAttribute('aria-expanded', 'false');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-bars';
                }
            }
        });
    }

    // Initialize the page
    initializePage();

    async function initializePage() {
        // Check auth status first, then update UI
        const isAuthenticated = await checkAuthStatus();
        updateAuthUI();
        
        // Load user preferences if authenticated
        if (isAuthenticated) {
            await loadUserPreferences();
        }
        
        // Only load article after authentication check is complete
        loadArticleFromURL();
    }

    async function checkAuthStatus() {
        if (!authToken) {
            currentUser = null;
            localStorage.removeItem('currentUser');
            updateAuthUI();
            return false;
        }

        try {
            const response = await fetch(getApiUrl('/api/user/profile'), {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                currentUser = userData;
                localStorage.setItem('currentUser', JSON.stringify(userData));
                updateAuthUI();
                return true;
            } else if (response.status === 401) {
                // Token is expired or invalid
                console.warn('Token expired or invalid, clearing authentication');
                authToken = null;
                currentUser = null;
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                updateAuthUI();
                return false;
            } else {
                // Other error, but keep token for retry
                console.error('Auth check failed with status:', response.status);
                updateAuthUI();
                return false;
            }
        } catch (error) {
            console.error('Network error checking auth status:', error);
            // On network error, assume user is still authenticated if token exists
            // This helps with offline scenarios or temporary network issues
            if (authToken && currentUser) {
                // Use cached user data during network issues
                updateAuthUI();
                return true;
            } else if (authToken) {
                // Set a placeholder user to show logout button during network issues
                currentUser = { username: 'User' };
                updateAuthUI();
                return true;
            }
            return false;
        }
    }

    // Helper function for HTML escaping
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function updateAuthUI() {
        if (!navUser) {
            console.error('nav-user element not found');
            return;
        }
        
        // Hide login/signup buttons on article page when user is logged in
        if (currentUser && authToken) {
            navUser.innerHTML = ``; // Remove login/signup buttons completely
            
            // Hide login/signup modals if they exist
            if (loginModal) loginModal.style.display = 'none';
            if (signupModal) signupModal.style.display = 'none';
        } else {
            navUser.innerHTML = `
                <div class="nav-auth">
                    <button class="btn btn-secondary" onclick="openModal('login-modal')">
                        <i class="fas fa-sign-in-alt"></i>
                        Login
                    </button>
                    <button class="btn btn-primary" onclick="openModal('signup-modal')">
                        <i class="fas fa-user-plus"></i>
                        Sign Up
                    </button>
                </div>
            `;
        }
    }

    async function loadArticleFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        let articleId = urlParams.get('id');
        const autoplay = urlParams.get('autoplay') === 'true';
        
        // If autoplay is requested, load the latest article
        if (autoplay && !articleId) {
            if (authToken) {
                await loadLatestArticle(true);
                return;
            } else {
                showLoginRequired();
                return;
            }
        }
        
        // If no ID in URL, try to get from localStorage (for refresh scenarios)
        if (!articleId) {
            articleId = localStorage.getItem('currentArticleId');
        }
        
        if (articleId) {
            // First try to load from sessionStorage for faster loading
            const storedData = sessionStorage.getItem('viewArticleData');
            if (storedData) {
                try {
                    const articleData = JSON.parse(storedData);
                    // Verify this is the correct article
                    if (articleData.id === articleId) {
                        displayArticle(articleData, autoplay);
                        // Still fetch fresh data in background if authenticated
                        if (authToken) {
                            loadArticleFromAPI(articleId, autoplay);
                        }
                        return;
                    }
                } catch (error) {
                    console.error('Error parsing stored article data:', error);
                }
            }
            
            // Load from API if no valid cached data
            if (authToken) {
                await loadArticleFromAPI(articleId, autoplay);
            } else {
                showLoginRequired();
            }
        } else {
            showArticleNotFound();
        }
    }

    async function loadLatestArticle(autoplay = false) {
        try {
            const response = await fetch(getApiUrl('/api/user/audiobooks/latest'), {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                const articleData = data.article;
                // Store article data for refresh scenarios
                sessionStorage.setItem('viewArticleData', JSON.stringify(articleData));
                localStorage.setItem('currentArticleId', articleData.id);
                displayArticle(articleData, autoplay);
            } else if (response.status === 401) {
                // Token expired or invalid
                console.warn('Authentication failed, clearing token');
                authToken = null;
                localStorage.removeItem('authToken');
                updateAuthUI();
                showLoginRequired();
            } else if (response.status === 404) {
                console.log('No articles found');
                showArticleNotFound();
            } else {
                console.error('Failed to load latest article:', response.status);
                showArticleNotFound();
            }
        } catch (error) {
            console.error('Error loading latest article:', error);
            showArticleNotFound();
        }
    }

    async function loadArticleFromAPI(articleId, autoplay = false) {
        // Store article ID for potential retry after login
        localStorage.setItem('currentArticleId', articleId);
        
        try {
            const response = await fetch(getApiUrl(`/api/user/audiobooks/${articleId}`), {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const articleData = await response.json();
                // Store article data for refresh scenarios
                sessionStorage.setItem('viewArticleData', JSON.stringify(articleData));
                displayArticle(articleData, autoplay);
            } else if (response.status === 401) {
                // Token expired or invalid
                console.warn('Authentication failed, clearing token');
                authToken = null;
                localStorage.removeItem('authToken');
                updateAuthUI();
                showLoginRequired();
            } else {
                console.error('Failed to load article from API:', response.status);
                showArticleNotFound();
            }
        } catch (error) {
            console.error('Error loading article:', error);
            showArticleNotFound();
        }
    }

    function displayArticle(article, autoplay = false) {
        currentArticle = article;
        
        // Hide loading and show content
        loadingState.style.display = 'none';
        articleNotFound.style.display = 'none';
        articleContent.style.display = 'block';
        
        // Dispatch event to notify Return to Article button
        window.dispatchEvent(new CustomEvent('articleViewed', {
            detail: {
                id: article.id,
                title: article.title || 'Untitled Article',
                url: window.location.href
            }
        }));

        // Populate article content
        articleTitle.textContent = article.title || 'Untitled Article';
        
        if (article.created_at || article.createdAt) {
            const date = new Date(article.created_at || article.createdAt);
            articleDate.textContent = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        if (article.url) {
            originalLink.href = article.url;
            originalLink.style.display = 'flex';
        } else {
            originalLink.style.display = 'none';
        }

        // Display full text
        const fullText = article.full_text || article.content || 'No content available';
        articleFullText.innerHTML = formatArticleText(fullText);
        
        // Initialize text-to-speech with article content
        if (fullText && fullText !== 'No content available') {
            initializeTextToSpeech(fullText);
            
            // Auto-start TTS if autoplay is requested
            if (autoplay) {
                setTimeout(() => {
                    try {
                        console.log('Auto-starting TTS for newly generated article');
                        const playButton = document.getElementById('play-btn');
                        if (playButton && !playButton.disabled) {
                            playButton.click();
                        }
                    } catch (error) {
                        console.warn('Error auto-starting TTS:', error);
                    }
                }, 1500); // Delay to ensure TTS is fully initialized
            }
        }

        // Display summary
        const summary = article.summary || 'No summary available';
        articleSummary.innerHTML = `<p>${escapeHtml(summary)}</p>`;

        // Display images
        const imageUrls = article.image_urls || article.imageUrls || [];
        if (imageUrls.length > 0) {
            imageGallery.innerHTML = imageUrls.map(url => 
                `<img src="${escapeHtml(url)}" alt="Article image" class="article-image">`
            ).join('');
            articleImagesSection.style.display = 'block';
        } else {
            articleImagesSection.style.display = 'none';
        }

        // Display key points
        const keyPoints = article.key_points || article.keyPoints || [];
        if (keyPoints.length > 0) {
            keyPointsList.innerHTML = keyPoints.map(point => 
                `<li>${escapeHtml(point)}</li>`
            ).join('');
            keyPointsSection.style.display = 'block';
        } else {
            keyPointsSection.style.display = 'none';
        }
    }

    function formatArticleText(text) {
        // Split text into paragraphs and format
        const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
        return paragraphs.map(paragraph => 
            `<p>${escapeHtml(paragraph.trim())}</p>`
        ).join('');
    }

    function showArticleNotFound() {
        loadingState.style.display = 'none';
        articleContent.style.display = 'none';
        
        // Update the not found message with more helpful text
        const notFoundMessage = articleNotFound.querySelector('p');
        if (notFoundMessage) {
            notFoundMessage.textContent = 'The requested article could not be loaded. This might be due to a network issue or the article may no longer be available.';
        }
        
        // Add retry button to the not found section
        const existingButton = articleNotFound.querySelector('.btn');
        if (existingButton && !articleNotFound.querySelector('.retry-btn')) {
            const retryButton = document.createElement('button');
            retryButton.className = 'btn btn-primary retry-btn';
            retryButton.style.marginRight = '10px';
            retryButton.textContent = 'Retry';
            retryButton.onclick = retryLoadArticle;
            existingButton.parentNode.insertBefore(retryButton, existingButton);
            existingButton.className = 'btn btn-secondary';
        }
        
        articleNotFound.style.display = 'flex';
    }

    function showLoginRequired() {
        loadingState.style.display = 'none';
        articleContent.style.display = 'none';
        
        // Update the not found message to indicate login is required
        const notFoundMessage = articleNotFound.querySelector('p');
        if (notFoundMessage) {
            notFoundMessage.textContent = 'Please log in to view this article.';
        }
        
        // Add retry button to the not found section
        const existingButton = articleNotFound.querySelector('.btn');
        if (existingButton && !articleNotFound.querySelector('.retry-btn')) {
            const retryButton = document.createElement('button');
            retryButton.className = 'btn btn-secondary retry-btn';
            retryButton.style.marginLeft = '10px';
            retryButton.textContent = 'Retry';
            retryButton.onclick = retryLoadArticle;
            existingButton.parentNode.insertBefore(retryButton, existingButton.nextSibling);
        }
        
        articleNotFound.style.display = 'flex';
        
        // Auto-open login modal after a short delay
        setTimeout(() => {
            openModal('login-modal');
        }, 1000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Text-to-Speech functionality
    let ttsState = {
    autoScrollEnabled: false,
        isPlaying: false,
        isPaused: false,
        currentUtterance: null,
        currentWordIndex: 0,
        totalWords: 0,
        wordElements: [],
        fullArticleText: '',
        isProcessingClick: false,
        clickDebounceTimeout: null
    };

    function handleReturnToArticle() {
        const ttsState = JSON.parse(localStorage.getItem('ttsState') || 'null');
        if (ttsState && ttsState.articleId) {
            window.location.href = `/article-view.html?id=${ttsState.articleId}&position=${ttsState.position}&state=${ttsState.progress}`;
        } else {
            window.location.href = '/article-view.html';
        }
    }

    function initializeTextToSpeech(articleText) {
        // Create persistent audio controls
        const existingControls = document.getElementById('floating-audio-controls');
        if (!existingControls) {
            if (!window.location.pathname.includes('article-view.html')) {
            const controls = document.createElement('div');
            controls.id = 'floating-audio-controls';
            controls.innerHTML = `
                <button class="audio-float-btn" onclick="handleReturnToArticle()">
                    <i class="fas fa-headphones"></i>
                    Resume Article
                </button>
            `;
            document.body.appendChild(controls);
        }
        }

        // Save playback state before window closes or navigation
        window.savePlaybackState = () => {
            // Save state if TTS is playing, paused, or has been active recently
            if (ttsState.isPlaying || speechSynthesis.speaking || (ttsState.currentWordIndex > 0 && ttsState.fullArticleText)) {
                // Determine if TTS is currently paused
                const isPaused = !ttsState.isPlaying && !speechSynthesis.speaking && ttsState.currentWordIndex > 0;
                
                // Save to old ttsState for backward compatibility
                localStorage.setItem('ttsState', JSON.stringify({
                    articleId: currentArticle.id,
                    isPlaying: ttsState.isPlaying,
                    isPaused: isPaused,
                    wordIndex: ttsState.currentWordIndex,
                    totalWords: ttsState.totalWords,
                    fullText: ttsState.fullArticleText,
                    timestamp: Date.now()
                }));
                
                // Sync with floating TTS tracker when leaving page
                if (window.floatingTTSTracker) {
                    window.floatingTTSTracker.updateArticleState(
                        currentArticle.id,
                        currentArticle.title,
                        ttsState.fullArticleText
                    );
                    window.floatingTTSTracker.updateTTSState(
                        ttsState.isPlaying,
                        isPaused,
                        ttsState.currentWordIndex,
                        ttsState.totalWords
                    );
                }
            }
        };
        
        window.addEventListener('beforeunload', window.savePlaybackState);
        window.addEventListener('pagehide', window.savePlaybackState);
        
        // Variables for state restoration
        let shouldAutoResume = false;
        let restoredWordIndex = 0;
        
        // Check for existing TTS state and restore if needed
        // Priority: currentArticleState > persistent audio manager state > old ttsState
        
        // First check currentArticleState (used by header navigation button)
        const currentArticleState = localStorage.getItem('currentArticleState');
        if (currentArticleState) {
            try {
                const state = JSON.parse(currentArticleState);
                // Only restore if it's the same article and within 10 minutes
                if (state.articleId === currentArticle.id && 
                    state.timestamp && 
                    (Date.now() - state.timestamp) < 600000) {
                    
                    console.log('Restoring from currentArticleState:', state);
                    restoredWordIndex = state.currentWordIndex || 0;
                    shouldAutoResume = state.isPlaying || state.isPaused;
                }
            } catch (error) {
                console.error('Error restoring currentArticleState:', error);
                localStorage.removeItem('currentArticleState');
            }
        } else if (window.persistentAudio && window.persistentAudio.articleId === currentArticle.id) {
            console.log('Restoring from persistent audio manager:', {
                articleId: window.persistentAudio.articleId,
                wordIndex: window.persistentAudio.currentWordIndex,
                isPlaying: window.persistentAudio.isPlaying
            });
            restoredWordIndex = window.persistentAudio.currentWordIndex || 0;
            shouldAutoResume = window.persistentAudio.isPlaying;
        } else {
            // Fallback to old ttsState system
            const savedState = localStorage.getItem('ttsState');
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    // Only restore if it's the same article and within 5 minutes
                    if (state.articleId === currentArticle.id && 
                        state.timestamp && 
                        (Date.now() - state.timestamp) < 300000) {
                        
                        console.log('Restoring from old TTS state:', state);
                        restoredWordIndex = state.wordIndex || 0;
                        shouldAutoResume = state.isPlaying;
                    }
                } catch (error) {
                    console.error('Error restoring TTS state:', error);
                    localStorage.removeItem('ttsState');
                }
            }
        }
        
        // Apply restored state
        ttsState.currentWordIndex = restoredWordIndex;
        
        // Auto-resume if needed
        if (shouldAutoResume) {
            setTimeout(() => {
                console.log('Auto-resuming TTS playback from word index:', restoredWordIndex);
                handlePlayPause({ preventDefault: () => {}, stopPropagation: () => {} });
            }, 1500);
        }

        ttsState.fullArticleText = articleText;
        
        // Get audio control elements
        const playPauseBtn = document.getElementById('play-pause-btn');
        const stopBtn = document.getElementById('stop-btn');
        const progressBar = document.getElementById('progress-bar');
        const timeDisplay = document.getElementById('time-display');
        const speedControl = document.getElementById('speed-control');
        const voiceControl = document.getElementById('voice-control');
        const audioControlsSection = document.getElementById('audio-controls-section');
        
        if (!playPauseBtn || !stopBtn || !progressBar || !timeDisplay || !speedControl) {
            console.warn('Audio control elements not found');
            return;
        }
        
        // Show audio controls
        audioControlsSection.style.display = 'block';
        
        // Prepare text for word highlighting
        const articleTextElement = document.getElementById('article-full-text');
        if (articleTextElement && articleText) {
            const words = articleText.split(/\s+/);
            ttsState.totalWords = words.length;
            
            // Wrap words in spans for highlighting
            const wrappedText = words.map((word, index) => 
                `<span class="word" data-index="${index}">${escapeHtml(word)}</span>`
            ).join(' ');
            articleTextElement.innerHTML = wrappedText;
            
            ttsState.wordElements = articleTextElement.querySelectorAll('.word');
        }
        
        // Event listeners
        playPauseBtn.addEventListener('click', handlePlayPause);
        stopBtn.addEventListener('click', handleStop);
        speedControl.addEventListener('change', handleSpeedChange);
        progressBar.addEventListener('click', handleProgressClick);
        
        // Voice control event listener
        if (voiceControl) {
            voiceControl.addEventListener('change', (e) => {
                handleVoiceChange(e);
                // If currently playing, restart with new voice
                if (ttsState.isPlaying) {
                    speechSynthesis.cancel();
                    setTimeout(() => speakText(ttsState.fullArticleText, ttsState.currentWordIndex), 100);
                }
            });
        }
        
        // Removed floating TTS tracker control event listeners since buttons are removed
        // The tracker now only serves as a navigation button
        
        // Reset controls but preserve restored word index
        const preservedWordIndex = ttsState.currentWordIndex;
        resetAudioControls();
        if (shouldAutoResume || restoredWordIndex > 0) {
            ttsState.currentWordIndex = preservedWordIndex;
        }
        
        // Only auto-start TTS if no restoration is happening
        if (!shouldAutoResume) {
            setTimeout(() => {
                console.log('Auto-starting TTS for article view...');
                handlePlayPause({ preventDefault: () => {}, stopPropagation: () => {} });
            }, 1000);
        }
        
        // TTS is now working properly, test button removed
 
         // Add auto-scroll toggle button
         let autoScrollBtn = document.getElementById('auto-scroll-toggle-btn');
         if (!autoScrollBtn) {
             autoScrollBtn = document.createElement('button');
             autoScrollBtn.id = 'auto-scroll-toggle-btn';
             autoScrollBtn.className = 'auto-scroll-toggle'; // Add a class for styling
             autoScrollBtn.innerHTML = '<i class="fas fa-arrows-alt-v"></i>'; // Icon for scrolling
             autoScrollBtn.title = 'Toggle Auto-Scroll';
             autoScrollBtn.addEventListener('click', toggleAutoScroll);
             document.body.appendChild(autoScrollBtn);
         }
         updateAutoScrollButtonUI(); // Set initial UI state
         
         // Setup scroll detection for scroll-to-current button
        setupScrollDetection();
    }

    function toggleAutoScroll() {
        ttsState.autoScrollEnabled = !ttsState.autoScrollEnabled;
        updateAutoScrollButtonUI();
        console.log('Auto-scroll toggled:', ttsState.autoScrollEnabled);
    }

    function updateAutoScrollButtonUI() {
        const autoScrollBtn = document.getElementById('auto-scroll-toggle-btn');
        if (autoScrollBtn) {
            if (ttsState.autoScrollEnabled) {
                autoScrollBtn.classList.add('active');
                autoScrollBtn.title = 'Auto-Scroll: ON';
            } else {
                autoScrollBtn.classList.remove('active');
                autoScrollBtn.title = 'Auto-Scroll: OFF';
            }
        }
    }
    
    // Voice selection functions
    function loadVoices() {
        availableVoices = speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
            populateVoiceSelect();
        }
    }
    
    function populateVoiceSelect() {
        const voiceControl = document.getElementById('voice-control');
        if (!voiceControl) return;
        
        // Filter for high-quality English voices
        const englishVoices = availableVoices.filter(voice => 
            voice.lang.startsWith('en') && 
            (voice.name.includes('Premium') || 
             voice.name.includes('Enhanced') || 
             voice.name.includes('Neural') || 
             voice.name.includes('Google') || 
             voice.name.includes('Microsoft') ||
             voice.localService === false)
        );
        
        // Sort voices by quality indicators
        englishVoices.sort((a, b) => {
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
        
        // Clear existing options
        voiceControl.innerHTML = '<option value="">Default Voice</option>';
        
        // Add voice options
        englishVoices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${voice.name} (${voice.lang})`;
            voiceControl.appendChild(option);
        });
        
        // Check for saved voice preference
        const preferredVoiceName = localStorage.getItem('preferredVoice');
        let voiceFound = false;
        
        if (preferredVoiceName) {
            // Try to find and select the preferred voice
            const preferredVoiceIndex = englishVoices.findIndex(voice => voice.name === preferredVoiceName);
            if (preferredVoiceIndex !== -1) {
                selectedVoice = englishVoices[preferredVoiceIndex];
                voiceControl.value = preferredVoiceIndex.toString();
                voiceFound = true;
            }
        }
        
        // Set default selection to first high-quality voice if no preference found
        if (!voiceFound && englishVoices.length > 0 && !selectedVoice) {
            selectedVoice = englishVoices[0];
            voiceControl.value = '0';
        }
    }
    
    function handleVoiceChange(event) {
        const selectedIndex = event.target.value;
        if (selectedIndex === '') {
            selectedVoice = null;
        } else {
            const englishVoices = availableVoices.filter(voice => 
                voice.lang.startsWith('en') && 
                (voice.name.includes('Premium') || 
                 voice.name.includes('Enhanced') || 
                 voice.name.includes('Neural') || 
                 voice.name.includes('Google') || 
                 voice.name.includes('Microsoft') ||
                 voice.localService === false)
            );
            selectedVoice = englishVoices[parseInt(selectedIndex)];
        }
        
        // Save voice preference to localStorage and server
        saveVoicePreference();
    }

    // Load user preferences from server
    async function loadUserPreferences() {
        try {
            const response = await fetch(getApiUrl('/api/user/preferences'), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                
                // Apply theme preference
                if (data.theme) {
                    document.body.setAttribute('data-theme', data.theme);
                }
                
                // Store voice preference for later use
                if (data.speech_voice) {
                    localStorage.setItem('preferredVoice', data.speech_voice);
                }
            }
        } catch (error) {
            console.error('Error loading user preferences:', error);
        }
    }

    // Save voice preference
    async function saveVoicePreference() {
        if (!authToken || !selectedVoice) return;
        
        try {
            const voiceName = selectedVoice.name;
            localStorage.setItem('preferredVoice', voiceName);
            
            await fetch(getApiUrl('/api/user/preferences'), {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    speech_voice: voiceName
                })
            });
        } catch (error) {
            console.error('Error saving voice preference:', error);
        }
    }
    
    function resetAudioControls() {
        ttsState.isPlaying = false;
        ttsState.isPaused = false;
        ttsState.currentWordIndex = 0;
        ttsState.isProcessingClick = false;
        
        const playPauseBtn = document.getElementById('play-pause-btn');
        const progressBar = document.getElementById('progress-bar');
        const timeDisplay = document.getElementById('time-display');
        
        if (playPauseBtn) {
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Play</span>';
            playPauseBtn.disabled = false;
        }
        if (progressBar) progressBar.value = 0;
        if (timeDisplay) timeDisplay.textContent = '0:00 / 0:00';
        
        if (ttsState.currentUtterance) {
            speechSynthesis.cancel();
            ttsState.currentUtterance = null;
        }
        if (ttsState.clickDebounceTimeout) {
            clearTimeout(ttsState.clickDebounceTimeout);
            ttsState.clickDebounceTimeout = null;
        }
        clearWordHighlights();
        // Keep scroll button visible at all times
        ensureScrollButtonVisible();
    }
    
    function handlePlayPause(e) {
        console.log('handlePlayPause called, current state:', {
            isPlaying: ttsState.isPlaying,
            isPaused: ttsState.isPaused,
            speaking: speechSynthesis.speaking
        });
        
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (ttsState.isProcessingClick) {
            console.log('Already processing click, returning');
            return;
        }
        
        if (!ttsState.fullArticleText) {
            console.log('No article text available:', ttsState.fullArticleText);
            alert('No article text available for playback.');
            return;
        }
        
        console.log('Article text available, length:', ttsState.fullArticleText.length);
        
        ttsState.isProcessingClick = true;
        const playPauseBtn = document.getElementById('play-pause-btn');
        
        if (ttsState.isPlaying && !ttsState.isPaused) {
            // Pause
            console.log('Pausing TTS');
            if (playPauseBtn) {
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Play</span>';
                playPauseBtn.disabled = true;
            }
            
            speechSynthesis.pause();
            ttsState.isPlaying = false;
            ttsState.isPaused = true;
            
            setTimeout(() => {
                if (playPauseBtn) {
                    playPauseBtn.disabled = false;
                }
                ttsState.isProcessingClick = false;
                
                // Sync with persistent audio manager when pausing
                if (window.persistentAudio) {
                    window.persistentAudio.syncWithArticleView(
                        currentArticle.id,
                        false,
                        ttsState.currentWordIndex,
                        ttsState.totalWords,
                        ttsState.fullArticleText
                    );
                }
                
                // Save state immediately when pausing for cross-page tracking
                if (window.savePlaybackState) {
                    window.savePlaybackState();
                }
                
                // Keep scroll button visible at all times
                ensureScrollButtonVisible();
                
                // Update current article state when paused
                localStorage.setItem('currentArticleState', JSON.stringify({
                    articleId: currentArticle.id,
                    articleTitle: currentArticle.title,
                    isPlaying: false,
                    isPaused: true,
                    currentWordIndex: ttsState.currentWordIndex,
                    totalWords: ttsState.totalWords,
                    timestamp: Date.now()
                }));
                
                // Notify floating TTS tracker that TTS paused
                window.dispatchEvent(new CustomEvent('ttsPaused'));
            }, 100);
        } else if (ttsState.isPaused) {
            // Resume
            console.log('Resuming TTS');
            if (playPauseBtn) {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
                playPauseBtn.disabled = true;
            }
            
            setTimeout(() => {
                speechSynthesis.resume();
                ttsState.isPlaying = true;
                ttsState.isPaused = false;
                if (playPauseBtn) {
                    playPauseBtn.disabled = false;
                }
                ttsState.isProcessingClick = false;
                
                console.log('TTS resumed, new state:', {
                    isPlaying: ttsState.isPlaying,
                    isPaused: ttsState.isPaused
                });
                
                // Update current article state when resumed
                localStorage.setItem('currentArticleState', JSON.stringify({
                    articleId: currentArticle.id,
                    articleTitle: currentArticle.title,
                    isPlaying: true,
                    currentWordIndex: ttsState.currentWordIndex,
                    totalWords: ttsState.totalWords,
                    timestamp: Date.now()
                }));
                
                // Show scroll button when TTS resumes
                showScrollButton();
                
                // Notify floating TTS tracker that TTS resumed
                window.dispatchEvent(new CustomEvent('ttsResumed'));
            }, 50);
        } else {
            // Start new playback
            console.log('Starting new TTS playback');
            if (playPauseBtn) {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
                playPauseBtn.disabled = true;
            }
            
            setTimeout(() => {
                ttsState.isPaused = false;
                speakText(ttsState.fullArticleText, ttsState.currentWordIndex);
                if (playPauseBtn) {
                    playPauseBtn.disabled = false;
                }
                ttsState.isProcessingClick = false;
                
                console.log('New TTS playback started');
                
                // Show scroll button when TTS starts
                showScrollButton();
                
                // Notify floating TTS tracker that TTS resumed
                window.dispatchEvent(new CustomEvent('ttsResumed'));
            }, 50);
        }
    }
    
    function handleStop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Force stop all speech synthesis
        speechSynthesis.cancel();
        
        // Additional safety check - if speech is still speaking, cancel again
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        
        // Reset all TTS state
        ttsState.isPlaying = false;
        ttsState.isPaused = false;
        ttsState.currentUtterance = null;
        
        resetAudioControls();
        
        // Restore background music volume when TTS is stopped manually
        if (window.ambientPlayer && window.ambientPlayer.isPlaying) {
            window.ambientPlayer.setVolume(0.1); // Restore normal low volume
        }
        
        // Sync with persistent audio manager
        if (window.persistentAudio) {
            window.persistentAudio.syncWithArticleView(
                currentArticle.id,
                false,
                0,
                ttsState.totalWords,
                ttsState.fullArticleText
            );
        }
        
        // Clear current article state when TTS is stopped manually
        localStorage.removeItem('currentArticleState');
        
        // Notify floating TTS tracker that TTS stopped
        window.dispatchEvent(new CustomEvent('ttsStopped'));
    }
    
    function handleSpeedChange() {
        if (ttsState.currentUtterance) {
            const wasPlaying = ttsState.isPlaying;
            speechSynthesis.cancel();
            if (wasPlaying) {
                setTimeout(() => speakText(ttsState.fullArticleText, ttsState.currentWordIndex), 100);
            }
        }
    }
    
    function handleProgressClick(e) {
        const progressBar = document.getElementById('progress-bar');
        const rect = progressBar.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        ttsState.currentWordIndex = Math.floor(clickPosition * ttsState.totalWords);
        
        if (ttsState.isPlaying) {
            speechSynthesis.cancel();
            setTimeout(() => speakText(ttsState.fullArticleText, ttsState.currentWordIndex), 100);
        } else {
            highlightWord(ttsState.currentWordIndex);
        }
        updateProgress();
    }
    
    function speakText(text, startWordIndex = 0) {
        console.log('speakText called with:', { text: text ? text.substring(0, 100) + '...' : 'null', startWordIndex, wordElementsLength: ttsState.wordElements.length });
        
        if (!text || ttsState.wordElements.length === 0) {
            console.warn('Cannot speak: missing text or word elements');
            return;
        }
        
        // Check if speechSynthesis is available
        if (!window.speechSynthesis) {
            console.error('Speech synthesis not supported in this browser');
            alert('Text-to-speech is not supported in your browser. Please try using Chrome, Firefox, or Edge.');
            return;
        }
        
        // Ensure startWordIndex is within bounds
        const words = text.split(/\s+/);
        ttsState.currentWordIndex = Math.max(0, Math.min(startWordIndex, words.length - 1));
        const wordsToSpeak = words.slice(ttsState.currentWordIndex).join(' ');
        
        console.log('Creating utterance for:', wordsToSpeak.substring(0, 100) + '...', 'starting from word', ttsState.currentWordIndex);
        ttsState.currentUtterance = new SpeechSynthesisUtterance(wordsToSpeak);
        const speedControl = document.getElementById('speed-control');
        ttsState.currentUtterance.rate = speedControl ? parseFloat(speedControl.value) : 1;
        ttsState.currentUtterance.pitch = 1;
        ttsState.currentUtterance.volume = 1;
        
        // Highlight the starting word
        highlightWord(ttsState.currentWordIndex);
        updateProgress();
        
        // Set selected voice if available
        if (selectedVoice) {
            ttsState.currentUtterance.voice = selectedVoice;
        }
        
        // Boundary events for word tracking
        ttsState.currentUtterance.onboundary = (event) => {
            if (event.name === 'word' && ttsState.isPlaying) {
                const wordIndex = startWordIndex + getWordIndexFromCharIndex(event.charIndex, wordsToSpeak);
                const highlightIndex = wordIndex + 1;
                
                // Store the actual word position (not the highlight position)
                ttsState.currentWordIndex = wordIndex;
                
                // Highlight the next word for visual feedback
                if (highlightIndex < ttsState.totalWords) {
                    highlightWord(highlightIndex);
                    updateProgress();
                    
                    // Sync with persistent audio manager using actual position
                    if (window.persistentAudio) {
                        window.persistentAudio.syncWithArticleView(
                            currentArticle.id,
                            ttsState.isPlaying,
                            ttsState.currentWordIndex,
                            ttsState.totalWords,
                            ttsState.fullArticleText
                        );
                    }
                    
                    // Sync with floating TTS tracker
                    if (window.floatingTTSTracker) {
                        window.floatingTTSTracker.updateTTSState(ttsState.isPlaying, false, ttsState.currentWordIndex, ttsState.totalWords);
                    }
                    
                    // Dispatch progress update event for cross-page tracking
                    window.dispatchEvent(new CustomEvent('ttsProgressUpdate', {
                        detail: {
                            currentWordIndex: ttsState.currentWordIndex,
                            totalWords: ttsState.totalWords,
                            isPlaying: ttsState.isPlaying,
                            isPaused: false
                        }
                    }));
                }
            }
        };
        
        ttsState.currentUtterance.onstart = () => {
            ttsState.isPlaying = true;
            if (startWordIndex < ttsState.totalWords) {
                highlightWord(startWordIndex);
            }
            showScrollButton();
            // Lower background music volume when TTS starts
            if (window.ambientPlayer && window.ambientPlayer.isPlaying) {
                window.ambientPlayer.setVolume(0.02); // Very low volume during speech
            }
            
            // Sync with persistent audio manager
            if (window.persistentAudio) {
                window.persistentAudio.syncWithArticleView(
                    currentArticle.id,
                    ttsState.isPlaying,
                    ttsState.currentWordIndex,
                    ttsState.totalWords,
                    ttsState.fullArticleText
                );
            }
            
            // Save current article state for header navigation button
            localStorage.setItem('currentArticleState', JSON.stringify({
                articleId: currentArticle.id,
                articleTitle: currentArticle.title,
                isPlaying: true,
                currentWordIndex: ttsState.currentWordIndex,
                totalWords: ttsState.totalWords,
                timestamp: Date.now()
            }));
            
            // Notify floating TTS tracker that TTS started
            window.dispatchEvent(new CustomEvent('ttsStarted', {
                detail: {
                    id: currentArticle.id,
                    title: currentArticle.title
                }
            }));
        };
        
        ttsState.currentUtterance.onend = () => {
            ttsState.isPlaying = false;
            const playPauseBtn = document.getElementById('play-pause-btn');
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Play</span>';
            ttsState.currentWordIndex = ttsState.totalWords;
            const progressBar = document.getElementById('progress-bar');
            if (progressBar) progressBar.value = 100;
            clearWordHighlights();
            // Keep scroll button visible at all times
            ensureScrollButtonVisible();
            // Restore background music volume when TTS ends
            if (window.ambientPlayer && window.ambientPlayer.isPlaying) {
                window.ambientPlayer.setVolume(0.1); // Restore normal low volume
            }
            
            // Sync with persistent audio manager
            if (window.persistentAudio) {
                window.persistentAudio.syncWithArticleView(
                    currentArticle.id,
                    ttsState.isPlaying,
                    ttsState.currentWordIndex,
                    ttsState.totalWords,
                    ttsState.fullArticleText
                );
            }
            
            // Clear current article state when TTS ends
            localStorage.removeItem('currentArticleState');
            
            // Notify floating TTS tracker that TTS stopped (finished)
            window.dispatchEvent(new CustomEvent('ttsStopped'));
        };
        
        ttsState.currentUtterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            ttsState.isPlaying = false;
            const playPauseBtn = document.getElementById('play-pause-btn');
            if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Play</span>';
            // Keep scroll button visible at all times
            ensureScrollButtonVisible();
            // Restore background music volume on TTS error
            if (window.ambientPlayer && window.ambientPlayer.isPlaying) {
                window.ambientPlayer.setVolume(0.1); // Restore normal low volume
            }
        };
        
        console.log('About to call speechSynthesis.speak()');
        console.log('speechSynthesis.speaking:', speechSynthesis.speaking);
        console.log('speechSynthesis.pending:', speechSynthesis.pending);
        
        // Some browsers require user interaction before allowing speech
        // Cancel any existing speech first
        speechSynthesis.cancel();
        
        // Small delay to ensure cancellation is processed
        setTimeout(() => {
            console.log('Calling speechSynthesis.speak() after delay');
            speechSynthesis.speak(ttsState.currentUtterance);
        }, 100);
        
        console.log('speechSynthesis.speak() called');
        console.log('speechSynthesis.speaking after call:', speechSynthesis.speaking);
        console.log('speechSynthesis.pending after call:', speechSynthesis.pending);
    }
    
    function getWordIndexFromCharIndex(charIndex, text) {
        const textUpToChar = text.substring(0, charIndex);
        const words = textUpToChar.trim().split(/\s+/);
        return words.length - 1;
    }
    
    function highlightWord(index) {
        clearWordHighlights();
        if (index >= 0 && index < ttsState.wordElements.length) {
            ttsState.wordElements[index].classList.add('highlight');
            // Scroll to highlighted word
            if (ttsState.autoScrollEnabled) {
                ttsState.wordElements[index].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }
    }
    
    function clearWordHighlights() {
        ttsState.wordElements.forEach(element => {
            element.classList.remove('highlight');
        });
    }
    
    function updateProgress() {
        const progressBar = document.getElementById('progress-bar');
        if (progressBar && ttsState.totalWords > 0) {
            const progress = (ttsState.currentWordIndex / ttsState.totalWords) * 100;
            progressBar.value = progress;
        }
    }
    
    function showScrollButton() {
        let scrollBtn = document.getElementById('scroll-to-current-btn');
        if (!scrollBtn) {
            scrollBtn = document.createElement('button');
            scrollBtn.id = 'scroll-to-current-btn';
            scrollBtn.className = 'scroll-to-current-btn';
            scrollBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
            scrollBtn.title = 'Scroll to current word';
            scrollBtn.addEventListener('click', scrollToCurrentWord);
            document.body.appendChild(scrollBtn);
        }
        scrollBtn.style.display = 'block';
        scrollBtn.classList.add('show');
    }
    
    function ensureScrollButtonVisible() {
        let scrollBtn = document.getElementById('scroll-to-current-btn');
        if (!scrollBtn) {
            scrollBtn = document.createElement('button');
            scrollBtn.id = 'scroll-to-current-btn';
            scrollBtn.className = 'scroll-to-current-btn show';
            scrollBtn.innerHTML = '<i class="fas fa-crosshairs"></i>';
            scrollBtn.title = 'Scroll to current word';
            scrollBtn.addEventListener('click', scrollToCurrentWord);
            document.body.appendChild(scrollBtn);
        }
        scrollBtn.style.display = 'block';
        scrollBtn.classList.add('show');
    }
    
    function hideScrollButton() {
        const scrollBtn = document.getElementById('scroll-to-current-btn');
        if (scrollBtn) {
            scrollBtn.style.display = 'none';
        }
    }
    
    function scrollToCurrentWord() {
        // If TTS is playing, scroll to current word
        if (ttsState.currentWordIndex >= 0 && ttsState.currentWordIndex < ttsState.wordElements.length) {
            ttsState.wordElements[ttsState.currentWordIndex].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            return;
        }
        
        // If TTS isn't playing but we have word elements, scroll to the beginning
        if (ttsState.wordElements && ttsState.wordElements.length > 0) {
            ttsState.wordElements[0].scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            return;
        }
        
        // Fallback: scroll to article content
        const articleContent = document.getElementById('article-full-text');
        if (articleContent) {
            articleContent.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
    
    // Add scroll detection to show/hide scroll button
    function setupScrollDetection() {
        let scrollTimeout;
        
        window.addEventListener('scroll', function() {
            // Only show button if TTS is playing and we have highlighted words
            if (!ttsState.isPlaying || ttsState.currentWordIndex < 0 || ttsState.currentWordIndex >= ttsState.wordElements.length) {
                return;
            }
            
            const currentWord = ttsState.wordElements[ttsState.currentWordIndex];
            if (!currentWord) {
                return;
            }
            
            const wordRect = currentWord.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            
            // Check if current word is out of viewport (not visible)
            const isWordVisible = wordRect.top >= 0 && wordRect.bottom <= viewportHeight;
            
            if (!isWordVisible) {
                showScrollButton();
            } else {
                // Keep button visible
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    ensureScrollButtonVisible();
                }, 2000); // Ensure button remains visible
            }
        });
    }

    // Retry function for error scenarios
    window.retryLoadArticle = function() {
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('id') || localStorage.getItem('currentArticleId');
        
        if (articleId) {
            // Show loading state
            loadingState.style.display = 'flex';
            articleContent.style.display = 'none';
            articleNotFound.style.display = 'none';
            
            // Clear any cached data to force fresh load
            sessionStorage.removeItem('viewArticleData');
            
            // Retry loading
            if (authToken) {
                loadArticleFromAPI(articleId);
            } else {
                // Check auth status first, then load
                checkAuthStatus().then(isAuthenticated => {
                    if (isAuthenticated) {
                        loadArticleFromAPI(articleId);
                    } else {
                        showLoginRequired();
                    }
                });
            }
        } else {
            showArticleNotFound();
        }
    };

    // Global functions
    window.goBackToArticles = function() {
        // Stop any playing audio before navigating
        if (ttsState.isPlaying) {
            speechSynthesis.cancel();
            resetAudioControls();
        }
        window.location.href = 'my-articles.html';
    };

    window.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
        }
    };

    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    };

    window.logout = function() {
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentArticleId');
        sessionStorage.removeItem('viewArticleData');
        updateAuthUI();
        window.location.href = 'index.html';
    };

    // Modal event handlers
    function showError(errorElement, message) {
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    function hideError(errorElement) {
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    // Login form handler
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
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    updateAuthUI();
                    closeModal('login-modal');
                    loginForm.reset();
                    
                    // Reload article if we have an ID in URL or stored
                    const urlParams = new URLSearchParams(window.location.search);
                    const articleId = urlParams.get('id') || localStorage.getItem('currentArticleId');
                    if (articleId) {
                        loadArticleFromAPI(articleId);
                    }
                } else {
                    showError(loginError, data.error || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                showError(loginError, `Network error: ${error.message}`);
            }
        });
    }

    // Signup form handler
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
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    updateAuthUI();
                    closeModal('signup-modal');
                    signupForm.reset();
                    
                    // Reload article if we have an ID in URL or stored
                    const urlParams = new URLSearchParams(window.location.search);
                    const articleId = urlParams.get('id') || localStorage.getItem('currentArticleId');
                    if (articleId) {
                        loadArticleFromAPI(articleId);
                    }
                } else {
                    showError(signupError, data.error || 'Registration failed');
                }
            } catch (error) {
                console.error('Signup error:', error);
                showError(signupError, `Network error: ${error.message}`);
            }
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
    
    // Initialize voice selection
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    
    // Initialize music UI state and auto-start music if not playing
    setTimeout(async () => {
        console.log('=== DEBUG: article-view.js: Initializing music UI ===');

        const musicToggleBtn = document.getElementById('music-toggle-btn');
        if (!musicToggleBtn) {
            console.log('=== DEBUG: article-view.js: Music toggle button not found ===');
            return;
        }

        if (!window.musicPlayer) {
            console.log('=== DEBUG: article-view.js: window.musicPlayer not found ===');
            return;
        }

        // Get current state from the actual music player
        const currentState = window.musicPlayer && window.musicPlayer.getStatus ? 
            window.musicPlayer.getStatus() : { isPlaying: false };
        const isPlaying = currentState.isPlaying;
        console.log('=== DEBUG: article-view.js: Music player status:', { isPlaying, currentState });

        if (isPlaying) {
            musicToggleBtn.classList.add('active');
            console.log('=== DEBUG: article-view.js: Music is already playing. ===');
        } else {
            console.log('=== DEBUG: article-view.js: Music not playing, attempting to start. ===');
            try {
                await window.musicPlayer.start();
                // After attempting to start, check the status again.
                const newState = window.musicPlayer.getStatus();
                if (newState.isPlaying) {
                    musicToggleBtn.classList.add('active');
                    console.log('=== DEBUG: article-view.js: Music started successfully. ===');
                } else {
                    console.log('=== DEBUG: article-view.js: Music did not start. It might be blocked by the browser. ===');
                }
            } catch (error) {
                console.error('=== DEBUG: article-view.js: Error starting music player:', error);
            }
        }
    }, 1200); // Use a slightly longer delay
    
    // Initialize music toggle button with proper debouncing and state management
    const musicToggleBtn = document.getElementById('music-toggle-btn');
    if (musicToggleBtn) {
        let isToggling = false; // Prevent multiple rapid clicks
        
        musicToggleBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Prevent multiple rapid clicks
            if (isToggling) {
                console.log('=== DEBUG: Music toggle already in progress, ignoring click ===');
                return;
            }
            
            isToggling = true;
            
            try {
                // Disable button during operation
                musicToggleBtn.disabled = true;
                musicToggleBtn.style.opacity = '0.6';
                
                // Get current state from the actual music player
                const currentState = window.musicPlayer && window.musicPlayer.getStatus ? 
                    window.musicPlayer.getStatus() : { isPlaying: false };
                const isCurrentlyPlaying = currentState.isPlaying;
                
                console.log('=== DEBUG: Current music state:', { isCurrentlyPlaying, currentState });
                
                if (isCurrentlyPlaying) {
                    console.log('=== DEBUG: Pausing music via toggle button ===');
                    window.musicPlayer.pause();
                    musicToggleBtn.classList.remove('active');
                    console.log('=== DEBUG: Music paused successfully ===');
                } else {
                    console.log('=== DEBUG: Resuming music via toggle button ===');
                    window.musicPlayer.resume();
                    musicToggleBtn.classList.add('active');
                    console.log('=== DEBUG: Music resumed successfully ===');
                }
            } catch (error) {
                console.error('=== DEBUG: Failed to toggle music:', error);
                // Update button state based on actual player state
                const actualState = window.musicPlayer && window.musicPlayer.getStatus ? 
                    window.musicPlayer.getStatus() : { isPlaying: false };
                if (actualState.isPlaying) {
                    musicToggleBtn.classList.add('active');
                } else {
                    musicToggleBtn.classList.remove('active');
                }
            } finally {
                // Re-enable button after operation
                setTimeout(() => {
                    musicToggleBtn.disabled = false;
                    musicToggleBtn.style.opacity = '1';
                    isToggling = false;
                }, 300);
            }
        });
    }
    
    // Scroll-to-current button functionality
    function initializeScrollToCurrentButton() {
        const scrollBtn = document.getElementById('scroll-to-current-btn');
        if (!scrollBtn) return;
        
        scrollBtn.addEventListener('click', function() {
            scrollToCurrentWord();
        });
    }
    
    function scrollToCurrentWord() {
        // If TTS is playing and we have a current word, scroll to it
        if (ttsState.isPlaying && ttsState.currentWordIndex >= 0 && ttsState.currentWordIndex < ttsState.wordElements.length) {
            const currentWord = ttsState.wordElements[ttsState.currentWordIndex];
            if (currentWord) {
                currentWord.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
                return;
            }
        }
        
        // If TTS is not playing but we have word elements, scroll to the beginning
        if (ttsState.wordElements && ttsState.wordElements.length > 0) {
            ttsState.wordElements[0].scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });
            return;
        }
        
        // Fallback: scroll to article content
        const articleContent = document.querySelector('.article-content, #article-content, .content');
        if (articleContent) {
            articleContent.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest'
            });
        }
    }
    
    function showScrollButton() {
        const scrollBtn = document.getElementById('scroll-to-current-btn');
        if (scrollBtn) {
            scrollBtn.classList.add('show');
        }
    }
    
    function ensureScrollButtonVisible() {
        let scrollBtn = document.getElementById('scroll-to-current-btn');
        if (!scrollBtn) {
            // Create the button if it doesn't exist
            scrollBtn = document.createElement('button');
            scrollBtn.id = 'scroll-to-current-btn';
            scrollBtn.className = 'scroll-to-current-btn';
            scrollBtn.innerHTML = '📍';
            scrollBtn.title = 'Scroll to current word';
            document.body.appendChild(scrollBtn);
            
            // Add event listener
            scrollBtn.addEventListener('click', function() {
                scrollToCurrentWord();
            });
        }
        scrollBtn.classList.add('show');
    }
    
    function hideScrollButton() {
        const scrollBtn = document.getElementById('scroll-to-current-btn');
        if (scrollBtn) {
            scrollBtn.classList.remove('show');
        }
    }
    
    // Initialize scroll-to-current button
    initializeScrollToCurrentButton();
    
    // Ensure scroll button is always visible
    ensureScrollButtonVisible();
});