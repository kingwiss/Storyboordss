document.addEventListener('DOMContentLoaded', function() {
    let authToken = localStorage.getItem('authToken');
    let currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    let currentArticle = null;
    let loadingTimeout = null;
    
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
    
    // Carousel elements
    const imageCarouselContainer = document.getElementById('image-carousel-container');
    const carouselTrack = document.getElementById('carousel-track');
    const carouselPrevBtn = document.getElementById('carousel-prev');
    const carouselNextBtn = document.getElementById('carousel-next');
    const carouselIndicators = document.getElementById('carousel-indicators');
    
    // Carousel state
    let currentSlide = 0;
    let totalSlides = 0;

    // Modal elements
    const authModal = document.getElementById('auth-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginError = document.getElementById('login-error');
    const signupError = document.getElementById('signup-error');
    
    // Auth modal tabs
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const loginContainer = document.getElementById('login-form-container');
    const signupContainer = document.getElementById('signup-form-container');
    const authModalClose = document.getElementById('auth-close');



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
                
                // Security code setup removed - password reset is now implemented
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
        
        // Show user info when logged in, login/signup buttons when not
        if (currentUser && authToken) {
            navUser.innerHTML = `
                <div class="nav-user-info">
                    <span class="welcome-text">Welcome, ${escapeHtml(currentUser.username)}!</span>
                    <button class="btn btn-secondary" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i>
                        Logout
                    </button>
                </div>
            `;
            
            // Hide auth modal if it exists
            if (authModal) authModal.style.display = 'none';
        } else {
            navUser.innerHTML = `
                <div class="nav-auth">
                    <button class="btn btn-secondary" onclick="showAuthModal('login')">
                        <i class="fas fa-sign-in-alt"></i>
                        Login
                    </button>
                    <button class="btn btn-primary" onclick="showAuthModal('signup')">
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
        
        console.log('=== DEBUG: loadArticleFromURL called with ID:', articleId, 'autoplay:', autoplay);
        
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
            console.log('=== DEBUG: No ID in URL, using from localStorage:', articleId);
        }
        
        if (articleId) {
            // First try to load from sessionStorage for faster loading
            const storedData = sessionStorage.getItem('viewArticleData');
            console.log('=== DEBUG: Stored data from sessionStorage:', storedData ? 'exists' : 'not found');
            
            if (storedData) {
                try {
                    const articleData = JSON.parse(storedData);
                    console.log('=== DEBUG: Parsed article data:', articleData);
                    console.log('=== DEBUG: Article data structure:', JSON.stringify(articleData, null, 2));
                    console.log('=== DEBUG: Comparing IDs:', articleData.id, articleId);
                    
                    // Verify this is the correct article - convert both to strings for comparison
                    if (String(articleData.id) === String(articleId)) {
                        console.log('=== DEBUG: Using cached article data');
                        displayArticle(articleData, autoplay);
                        // Clear the sessionStorage AFTER displaying to prevent stale data on next navigation
                        setTimeout(() => {
                            sessionStorage.removeItem('viewArticleData');
                        }, 1000);
                        // Still fetch fresh data in background if authenticated
                        if (authToken) {
                            loadArticleFromAPI(articleId, autoplay);
                        }
                        return;
                    } else {
                        console.log('=== DEBUG: Cached article ID mismatch, loading from API');
                        // Clear mismatched data
                        sessionStorage.removeItem('viewArticleData');
                    }
                } catch (error) {
                    console.error('Error parsing stored article data:', error);
                    // Clear invalid data
                    sessionStorage.removeItem('viewArticleData');
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
            // Show loading state and hide error states
            loadingState.style.display = 'block';
            articleNotFound.style.display = 'none';
            articleContent.style.display = 'none';
            
            // Clear any existing timeout
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
            }
            
            // Set a safety timeout to prevent infinite loading
            loadingTimeout = setTimeout(() => {
                console.error('Article loading timed out after 10 seconds');
                loadingState.style.display = 'none';
                articleNotFound.style.display = 'block';
            }, 10000); // 10 second timeout
            
            const response = await fetch(getApiUrl('/api/user/audiobooks/latest'), {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // Always hide loading state when response is received
            loadingState.style.display = 'none';
            
            // Clear the safety timeout
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
                loadingTimeout = null;
            }

            if (response.ok) {
                const responseData = await response.json();
                console.log('Latest article response:', responseData);
                
                // Handle both direct article data and wrapped article data
                const articleData = responseData.article || responseData;
                
                if (!articleData || typeof articleData !== 'object') {
                    console.error('Invalid article data received:', responseData);
                    showArticleNotFound();
                    return;
                }
                
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
            // Always hide loading state on error
            loadingState.style.display = 'none';
            console.error('Error loading latest article:', error);
            showArticleNotFound();
        }
    }

    async function loadArticleFromAPI(articleId, autoplay = false) {
        // Store article ID for potential retry after login
        localStorage.setItem('currentArticleId', articleId);
        
        // Show loading state and hide error states
        loadingState.style.display = 'block';
        articleNotFound.style.display = 'none';
        articleContent.style.display = 'none';
        
        // Clear any existing timeout
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
        }
        
        // Set a safety timeout to prevent infinite loading
        loadingTimeout = setTimeout(() => {
            console.error('Article loading timed out after 10 seconds');
            loadingState.style.display = 'none';
            articleNotFound.style.display = 'block';
        }, 10000); // 10 second timeout
        
        try {
            console.log('Loading article from API:', articleId);
            const response = await fetch(getApiUrl(`/api/user/audiobooks/${articleId}`), {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            // Always hide loading state when response is received
            loadingState.style.display = 'none';
            
            // Clear the safety timeout
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
                loadingTimeout = null;
            }

            if (response.ok) {
                const responseData = await response.json();
                console.log('Article response received:', responseData);
                
                // Handle both direct article data and wrapped article data
                const articleData = responseData.article || responseData;
                
                // Ensure article data is properly structured
                if (!articleData || typeof articleData !== 'object') {
                    console.error('Invalid article data received');
                    showArticleNotFound();
                    return;
                }
                
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
            // Always hide loading state on error
            loadingState.style.display = 'none';
            console.error('Error loading article:', error);
            showArticleNotFound();
        }
    }

    function displayArticle(article, autoplay = false) {
        try {
            console.log('=== DISPLAY ARTICLE DEBUG ===');
            console.log('Article object:', article);
            console.log('Article keys:', Object.keys(article || {}));
            console.log('Title:', article?.title);
            console.log('Summary:', article?.summary);
            console.log('Full text length:', article?.full_text?.length || article?.content?.length || 0);
            console.log('Key points:', article?.key_points || article?.keyPoints);
            console.log('Image URLs:', article?.image_urls || article?.imageUrls);
            
            // Check if DOM elements exist
            console.log('DOM elements check:');
            console.log('articleTitle exists:', !!articleTitle);
            console.log('articleSummary exists:', !!articleSummary);
            console.log('articleFullText exists:', !!articleFullText);
            console.log('keyPointsList exists:', !!keyPointsList);
            console.log('keyPointsSection exists:', !!keyPointsSection);
            
            // Ensure article object exists
            if (!article || typeof article !== 'object') {
                console.error('Article object is invalid:', article);
                loadingState.style.display = 'none';
                articleNotFound.style.display = 'block';
                return;
            }
            
            // Normalize article data structure to handle different property naming conventions
            const normalizedArticle = {
                ...article,
                id: article.id,
                title: article.title || 'Untitled Article',
                full_text: article.full_text || article.content || '',
                summary: article.summary || '',
                key_points: article.key_points || article.keyPoints || [],
                image_urls: article.image_urls || article.imageUrls || [],
                url: article.url || '',
                created_at: article.created_at || article.createdAt
            };
            
            // Replace the article with normalized version
            article = normalizedArticle;
            
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
            console.log('Setting article title...');
            if (articleTitle) {
                articleTitle.textContent = article.title || 'Untitled Article';
                console.log('Title set successfully');
            } else {
                console.error('articleTitle element not found!');
            }
            
            if (article.created_at || article.createdAt) {
                const date = new Date(article.created_at || article.createdAt);
                if (articleDate) {
                    articleDate.textContent = date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
            }

            if (article.url) {
                if (originalLink) {
                    originalLink.href = article.url;
                    originalLink.style.display = 'flex';
                }
            } else {
                if (originalLink) {
                    originalLink.style.display = 'none';
                }
            }

            // Display full text
            console.log('Setting article full text...');
            const fullText = article.full_text || article.content || '';
            console.log('Full text to display:', fullText.substring(0, 100) + '...');
            
            if (articleFullText) {
                try {
                    if (!fullText || fullText.length === 0) {
                        articleFullText.innerHTML = '<p>No content available</p>';
                        console.log('Set "No content available" message');
                    } else {
                        articleFullText.innerHTML = formatArticleText(fullText);
                        console.log('Article text formatted and set successfully');
                    }
                } catch (error) {
                    console.error('Error formatting article text:', error);
                    articleFullText.innerHTML = '<p>Error displaying article content</p>';
                }
            } else {
                console.error('articleFullText element not found!');
            }
        
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
        console.log('Setting article summary...');
        const summary = article.summary || 'No summary available';
        if (articleSummary) {
            articleSummary.innerHTML = `<p>${escapeHtml(summary)}</p>`;
            console.log('Summary set successfully');
        } else {
            console.error('articleSummary element not found!');
        }

        // Display images in carousel
        const imageUrls = article.image_urls || article.imageUrls || [];
        console.log('Article data for images:', article);
        console.log('Image URLs from article:', imageUrls);
        
        // Ensure imageUrls is an array
        const imageUrlsArray = Array.isArray(imageUrls) ? imageUrls : 
                              (typeof imageUrls === 'string' ? [imageUrls] : []);
        
        // Validate image URLs
        const validImageUrls = imageUrlsArray.filter(url => {
            if (!url) {
                console.warn('Found null or undefined image URL');
                return false;
            }
            if (typeof url !== 'string') {
                console.warn('Found non-string image URL:', url);
                return false;
            }
            return true;
        });
        
        if (validImageUrls.length > 0) {
            displayImageCarousel(validImageUrls);
        } else {
            console.warn('No valid image URLs found in article data');
            imageCarouselContainer.style.display = 'none';
        }
        
        // Keep legacy gallery hidden
        articleImagesSection.style.display = 'none';

        // Display key points
        console.log('Setting key points...');
        const keyPoints = article.key_points || article.keyPoints || [];
        const keyPointsArray = Array.isArray(keyPoints) ? keyPoints : 
                              (typeof keyPoints === 'string' ? [keyPoints] : []);
                              
        console.log('Key points array:', keyPointsArray);
        
        if (keyPointsArray.length > 0) {
            if (keyPointsList && keyPointsSection) {
                keyPointsList.innerHTML = keyPointsArray.map(point => 
                    `<li>${escapeHtml(point)}</li>`
                ).join('');
                keyPointsSection.style.display = 'block';
                console.log('Key points set successfully, section shown');
            } else {
                console.error('keyPointsList or keyPointsSection element not found!');
            }
        } else {
            if (keyPointsSection) {
                keyPointsSection.style.display = 'none';
                console.log('No key points, section hidden');
            }
        }
        
        console.log('=== DISPLAY ARTICLE COMPLETE ===');
        
    } catch (error) {
        console.error('Error in displayArticle:', error);
        console.error('Stack trace:', error.stack);
        loadingState.style.display = 'none';
        articleNotFound.style.display = 'block';
    }
}

    function formatArticleText(text) {
        if (!text || text === 'No content available') {
            return '<p>No content available</p>';
        }
        
        // Handle case where text might be undefined or null
        text = text || '';
        
        // Ensure text is a string
        if (typeof text !== 'string') {
            try {
                text = text.toString();
            } catch (e) {
                console.error('Could not convert article text to string:', e);
                return '<p>Error displaying content</p>';
            }
        }
        
        // Split text into paragraphs and format
        const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
        return paragraphs.map(paragraph => 
            `<p>${escapeHtml(paragraph.trim())}</p>`
        ).join('');
    }
    
    // Helper function to check if an image URL is accessible
    function checkImageUrl(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }
    
    // Auto-slideshow variables
    let slideshowInterval = null;
    let isAutoSlideshowActive = false;
    const SLIDESHOW_INTERVAL = 4000; // 4 seconds between slides
    
    async function displayImageCarousel(imageUrls) {
        if (!imageUrls || imageUrls.length === 0) {
            imageCarouselContainer.style.display = 'none';
            console.warn('No image URLs provided for carousel');
            return;
        }
        
        console.log('Displaying image carousel with URLs:', imageUrls);
        totalSlides = imageUrls.length;
        currentSlide = 0;
        
        // Show loading indicator
        imageCarouselContainer.classList.add('loading');
        
        // Create carousel slides with improved error handling
        carouselTrack.innerHTML = imageUrls.map((url, index) => {
            // Check if URL is valid before creating the image element
            let imageUrl = url;
            try {
                // Test if URL is valid
                new URL(url);
            } catch (e) {
                console.error(`Invalid image URL format at index ${index}:`, url, e);
                imageUrl = 'https://via.placeholder.com/800x600/E74C3C/FFFFFF.png?text=Invalid+URL+Format';
            }
            
            return `<div class="carousel-slide">
                <img 
                    src="${imageUrl}" 
                    alt="Article image ${index + 1}" 
                    class="carousel-image" 
                    onerror="this.onerror=null; this.src='https://via.placeholder.com/800x600/E74C3C/FFFFFF.png?text=Image+Load+Error'; console.error('Image failed to load:', this.getAttribute('data-original-src')); document.getElementById('carousel-error').style.display = 'block';"
                    data-original-src="${imageUrl}"
                    onload="console.log('Image loaded successfully:', this.getAttribute('data-original-src')); this.classList.add('loaded');"
                >
            </div>`;
        }).join('');
        
        // Create indicators
        carouselIndicators.innerHTML = imageUrls.map((_, index) => 
            `<button class="carousel-indicator ${index === 0 ? 'active' : ''}" data-slide="${index}"></button>`
        ).join('');
        
        // Show carousel
        imageCarouselContainer.style.display = 'block';
        
        // Add event listeners
        setupCarouselControls();
        
        // Update carousel display
        updateCarouselPosition();
        
        // Start auto-slideshow if there are multiple images
        if (totalSlides > 1) {
            startAutoSlideshow();
        }
        
        // Remove loading indicator
        imageCarouselContainer.classList.remove('loading');
        
        // Add error message container if not already present
        if (!document.getElementById('carousel-error')) {
            const errorDiv = document.createElement('div');
            errorDiv.id = 'carousel-error';
            errorDiv.className = 'carousel-error';
            errorDiv.style.display = 'none';
            errorDiv.innerHTML = '<p>Some images failed to load. Please try refreshing the page.</p>';
            imageCarouselContainer.appendChild(errorDiv);
        }
    }
    
    function startAutoSlideshow() {
        if (isAutoSlideshowActive || totalSlides <= 1) return;
        
        console.log('Starting auto-slideshow with', totalSlides, 'images');
        isAutoSlideshowActive = true;
        
        slideshowInterval = setInterval(() => {
            // Move to next slide
            currentSlide = currentSlide < totalSlides - 1 ? currentSlide + 1 : 0;
            updateCarouselPosition();
        }, SLIDESHOW_INTERVAL);
    }
    
    function stopAutoSlideshow() {
        if (!isAutoSlideshowActive) return;
        
        console.log('Stopping auto-slideshow');
        isAutoSlideshowActive = false;
        
        if (slideshowInterval) {
            clearInterval(slideshowInterval);
            slideshowInterval = null;
        }
    }
    
    function restartAutoSlideshow() {
        stopAutoSlideshow();
        if (totalSlides > 1) {
            // Restart after a short delay
            setTimeout(() => {
                startAutoSlideshow();
            }, 2000); // 2 second delay before restarting
        }
    }
    
    function setupCarouselControls() {
        // Remove existing event listeners by cloning elements
        const newPrevBtn = carouselPrevBtn.cloneNode(true);
        const newNextBtn = carouselNextBtn.cloneNode(true);
        carouselPrevBtn.parentNode.replaceChild(newPrevBtn, carouselPrevBtn);
        carouselNextBtn.parentNode.replaceChild(newNextBtn, carouselNextBtn);
        
        // Update references
        const prevBtn = document.getElementById('carousel-prev');
        const nextBtn = document.getElementById('carousel-next');
        
        // Previous button
        prevBtn.addEventListener('click', () => {
            stopAutoSlideshow(); // Pause auto-slideshow on manual interaction
            currentSlide = currentSlide > 0 ? currentSlide - 1 : totalSlides - 1;
            updateCarouselPosition();
            restartAutoSlideshow(); // Restart after delay
        });
        
        // Next button
        nextBtn.addEventListener('click', () => {
            stopAutoSlideshow(); // Pause auto-slideshow on manual interaction
            currentSlide = currentSlide < totalSlides - 1 ? currentSlide + 1 : 0;
            updateCarouselPosition();
            restartAutoSlideshow(); // Restart after delay
        });
        
        // Indicator buttons
        const indicators = carouselIndicators.querySelectorAll('.carousel-indicator');
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                stopAutoSlideshow(); // Pause auto-slideshow on manual interaction
                currentSlide = index;
                updateCarouselPosition();
                restartAutoSlideshow(); // Restart after delay
            });
        });
        
        // Add touch swipe functionality
        setupCarouselTouchEvents();
        
        // Hide navigation buttons if only one image
        if (totalSlides <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
            carouselIndicators.style.display = 'none';
        } else {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
            carouselIndicators.style.display = 'flex';
        }
    }
    
    function updateCarouselPosition() {
        // Move carousel track - account for gap spacing
        // Each slide is calc(100% - 10px) wide with 10px gap
        const slideWidth = 100; // percentage
        const gapAdjustment = (10 / carouselTrack.offsetWidth) * 100; // convert 10px gap to percentage
        const translateX = -currentSlide * (slideWidth + gapAdjustment);
        carouselTrack.style.transform = `translateX(${translateX}%)`;
        
        // Update indicators
        const indicators = carouselIndicators.querySelectorAll('.carousel-indicator');
        indicators.forEach((indicator, index) => {
            indicator.classList.toggle('active', index === currentSlide);
        });
    }
    
    function setupCarouselTouchEvents() {
        let touchStartX = 0;
        let touchEndX = 0;
        let touchStartY = 0;
        let touchEndY = 0;
        let touchMoveX = 0;
        let touchStartTime = 0;
        let isDragging = false;
        let initialTransform = 0;
        
        // Enhanced sensitivity settings
        const minSwipeDistance = 30; // Reduced for better sensitivity
        const maxVerticalDistance = 150; // Increased tolerance for vertical movement
        const velocityThreshold = 0.3; // Minimum velocity for momentum swipe
        const dragThreshold = 10; // Minimum movement to start dragging
        
        // Try multiple selectors to ensure we get the carousel element
        const carousel = document.getElementById('image-carousel') || document.getElementById('image-carousel-container');
        const carouselTrack = document.getElementById('carousel-track');
        
        if (!carousel || !carouselTrack) {
            console.warn('Carousel elements not found for touch events');
            return;
        }
        
        console.log('Setting up enhanced touch events on carousel:', carousel.id);
        
        // Remove any existing touch event listeners
        carousel.removeEventListener('touchstart', handleTouchStart);
        carousel.removeEventListener('touchmove', handleTouchMove);
        carousel.removeEventListener('touchend', handleTouchEnd);
        carousel.removeEventListener('touchcancel', handleTouchEnd);
        
        // Touch start event handler
        function handleTouchStart(event) {
            touchStartX = event.changedTouches[0].clientX;
            touchStartY = event.changedTouches[0].clientY;
            touchMoveX = touchStartX;
            touchStartTime = Date.now();
            isDragging = false;
            
            // Get current transform value
            const transform = carouselTrack.style.transform;
            const match = transform.match(/translateX\(([^)]+)\)/);
            initialTransform = match ? parseFloat(match[1]) : 0;
            
            // Add visual feedback - slight scale down
            carousel.style.transition = 'transform 0.1s ease';
            carousel.style.transform = 'scale(0.98)';
        }
        
        // Touch move event handler for real-time dragging
        function handleTouchMove(event) {
            if (!touchStartX) return;
            
            touchMoveX = event.changedTouches[0].clientX;
            const deltaX = touchMoveX - touchStartX;
            const deltaY = event.changedTouches[0].clientY - touchStartY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);
            
            // Start dragging if movement exceeds threshold
            if (!isDragging && absDeltaX > dragThreshold) {
                isDragging = true;
                event.preventDefault();
            }
            
            // If dragging horizontally, prevent vertical scroll and show live preview
            if (isDragging && absDeltaX > absDeltaY) {
                event.preventDefault();
                
                // Calculate drag resistance (stronger at boundaries)
                let dragResistance = 1;
                if ((currentSlide === 0 && deltaX > 0) || (currentSlide === totalSlides - 1 && deltaX < 0)) {
                    dragResistance = 0.3; // Reduce movement at boundaries
                }
                
                // Apply real-time transform with drag resistance
                const dragOffset = deltaX * dragResistance * 0.5; // Reduce sensitivity for smoother feel
                const newTransform = initialTransform + (dragOffset / carouselTrack.offsetWidth) * 100;
                carouselTrack.style.transition = 'none';
                carouselTrack.style.transform = `translateX(${newTransform}%)`;
            }
        }
        
        // Touch end event handler
        function handleTouchEnd(event) {
            if (!touchStartX) return;
            
            touchEndX = event.changedTouches[0].clientX;
            const touchEndY = event.changedTouches[0].clientY;
            const touchEndTime = Date.now();
            
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            const absDeltaX = Math.abs(deltaX);
            const absDeltaY = Math.abs(deltaY);
            const touchDuration = touchEndTime - touchStartTime;
            const velocity = absDeltaX / touchDuration; // pixels per millisecond
            
            // Remove visual feedback
            carousel.style.transition = 'transform 0.2s ease';
            carousel.style.transform = 'scale(1)';
            
            // Reset transform transition for smooth animation
            carouselTrack.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            
            let shouldSwipe = false;
            
            // Check for swipe conditions
            if (isDragging && absDeltaY < maxVerticalDistance) {
                // High velocity swipe (momentum-based)
                if (velocity > velocityThreshold) {
                    shouldSwipe = true;
                }
                // Distance-based swipe
                else if (absDeltaX > minSwipeDistance) {
                    shouldSwipe = true;
                }
                // Drag-based swipe (moved more than 25% of container width)
                else if (absDeltaX > carouselTrack.offsetWidth * 0.25) {
                    shouldSwipe = true;
                }
            }
            
            if (shouldSwipe) {
                event.preventDefault();
                stopAutoSlideshow(); // Pause auto-slideshow on swipe interaction
                
                if (deltaX > 0) {
                    // Swipe right - go to previous slide
                    currentSlide = currentSlide > 0 ? currentSlide - 1 : totalSlides - 1;
                } else {
                    // Swipe left - go to next slide
                    currentSlide = currentSlide < totalSlides - 1 ? currentSlide + 1 : 0;
                }
                
                // Add haptic feedback if available
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
                
                restartAutoSlideshow(); // Restart after delay
            }
            
            // Always update position to ensure proper alignment
            updateCarouselPosition();
            
            // Reset touch variables
            touchStartX = 0;
            touchEndX = 0;
            touchStartY = 0;
            touchMoveX = 0;
            isDragging = false;
        }
        
        // Add touch event listeners with proper options
        carousel.addEventListener('touchstart', handleTouchStart, { passive: true });
        carousel.addEventListener('touchmove', handleTouchMove, { passive: false });
        carousel.addEventListener('touchend', handleTouchEnd, { passive: false });
        carousel.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        
        // Prevent context menu on long press for better UX
        carousel.addEventListener('contextmenu', function(event) {
            event.preventDefault();
        });
        
        // Add pointer events for better cross-device support
        if (window.PointerEvent) {
            carousel.style.touchAction = 'pan-y pinch-zoom';
        }
        
        // Pause auto-slideshow on hover (desktop)
        carousel.addEventListener('mouseenter', () => {
            if (isAutoSlideshowActive) {
                stopAutoSlideshow();
                carousel.setAttribute('data-paused-by-hover', 'true');
            }
        });
        
        // Resume auto-slideshow when mouse leaves (desktop)
        carousel.addEventListener('mouseleave', () => {
            if (carousel.getAttribute('data-paused-by-hover') === 'true') {
                carousel.removeAttribute('data-paused-by-hover');
                startAutoSlideshow();
            }
        });
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

        // Enhanced playback state saving with better persistence
        window.savePlaybackState = () => {
            // Save state if TTS is playing, paused, or has been active recently
            if (ttsState.isPlaying || speechSynthesis.speaking || (ttsState.currentWordIndex > 0 && ttsState.fullArticleText)) {
                // Determine if TTS is currently paused with more accurate detection
                const isPaused = !ttsState.isPlaying && !speechSynthesis.speaking && ttsState.currentWordIndex > 0;
                const actuallyPlaying = ttsState.isPlaying || speechSynthesis.speaking;
                
                // Ensure we save the exact current position (not ahead)
                let currentPosition = ttsState.currentWordIndex;
                
                // If TTS is currently speaking, the saved position should be the current word
                // If TTS is paused or stopped, save the exact position where it stopped
                console.log('Saving playback state - position:', currentPosition, 'playing:', actuallyPlaying, 'paused:', isPaused);
                
                // Enhanced state object with additional metadata
                const enhancedState = {
                    articleId: currentArticle.id,
                    articleTitle: currentArticle.title || 'Unknown Article',
                    isPlaying: actuallyPlaying,
                    isPaused: isPaused,
                    wordIndex: Math.max(0, currentPosition),
                    totalWords: ttsState.totalWords,
                    fullText: ttsState.fullArticleText,
                    timestamp: Date.now(),
                    sessionId: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    lastSaveReason: 'navigation',
                    speechRate: document.getElementById('speed-control')?.value || 1,
                    selectedVoice: selectedVoice?.name || null
                };
                
                // Save to multiple storage keys for redundancy
                localStorage.setItem('ttsState', JSON.stringify(enhancedState));
                localStorage.setItem('ttsStateBackup', JSON.stringify(enhancedState));
                
                // Also save to sessionStorage for same-session persistence
                sessionStorage.setItem('ttsStateSession', JSON.stringify(enhancedState));
                
                console.log('Enhanced TTS state saved:', enhancedState);
                
                // Sync with floating TTS tracker when leaving page
                if (window.floatingTTSTracker) {
                    window.floatingTTSTracker.updateArticleState(
                        currentArticle.id,
                        currentArticle.title,
                        ttsState.fullArticleText
                    );
                    window.floatingTTSTracker.updateTTSState(
                        actuallyPlaying,
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
        
        // Enhanced TTS state restoration with multiple fallback mechanisms
        // Priority: sessionStorage > currentArticleState > persistent audio manager > localStorage backups
        
        const restoreFromState = (state, source) => {
            if (!state || !state.articleId || state.articleId !== currentArticle.id) {
                return false;
            }
            
            const timeDiff = Date.now() - (state.timestamp || 0);
            const maxAge = source === 'session' ? 3600000 : 600000; // 1 hour for session, 10 min for others
            
            if (timeDiff > maxAge) {
                console.log(`TTS state from ${source} too old (${Math.round(timeDiff/60000)} minutes)`);
                return false;
            }
            
            console.log(`Restoring TTS state from ${source}:`, state);
            restoredWordIndex = Math.max(0, Math.min(state.wordIndex || state.currentWordIndex || 0, state.totalWords || 0));
            shouldAutoResume = state.isPlaying || state.isPaused;
            
            // Restore additional settings if available
            if (state.speechRate && document.getElementById('speed-control')) {
                document.getElementById('speed-control').value = state.speechRate;
            }
            
            return true;
        };
        
        // Try session storage first (most recent, same session)
        try {
            const sessionState = sessionStorage.getItem('ttsStateSession');
            if (sessionState && restoreFromState(JSON.parse(sessionState), 'session')) {
                console.log('Successfully restored from session storage');
            } else {
                // Try currentArticleState (header navigation)
                const currentArticleState = localStorage.getItem('currentArticleState');
                if (currentArticleState && restoreFromState(JSON.parse(currentArticleState), 'currentArticle')) {
                    console.log('Successfully restored from currentArticleState');
                } else if (window.persistentAudio && window.persistentAudio.articleId === currentArticle.id) {
                    // Try persistent audio manager
                    const persistentState = {
                        articleId: window.persistentAudio.articleId,
                        wordIndex: window.persistentAudio.currentWordIndex,
                        totalWords: window.persistentAudio.totalWords,
                        isPlaying: window.persistentAudio.isPlaying,
                        timestamp: Date.now() - 30000 // Assume recent
                    };
                    if (restoreFromState(persistentState, 'persistentAudio')) {
                        console.log('Successfully restored from persistent audio manager');
                    }
                } else {
                    // Try main localStorage backup
                    const savedState = localStorage.getItem('ttsState');
                    if (savedState && restoreFromState(JSON.parse(savedState), 'localStorage')) {
                        console.log('Successfully restored from localStorage');
                    } else {
                        // Try backup localStorage
                        const backupState = localStorage.getItem('ttsStateBackup');
                        if (backupState && restoreFromState(JSON.parse(backupState), 'backup')) {
                            console.log('Successfully restored from backup storage');
                        } else {
                            console.log('No valid TTS state found for restoration');
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error during TTS state restoration:', error);
            // Clean up corrupted states
            ['ttsStateSession', 'currentArticleState', 'ttsState', 'ttsStateBackup'].forEach(key => {
                try {
                    if (key === 'ttsStateSession') {
                        sessionStorage.removeItem(key);
                    } else {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    console.warn(`Failed to clean up ${key}:`, e);
                }
            });
        }
        
        // Apply restored state
        ttsState.currentWordIndex = restoredWordIndex;
        
        // Enhanced auto-resume with validation
        if (shouldAutoResume && restoredWordIndex >= 0) {
            // Validate that we have the necessary components
            if (ttsState.fullArticleText && ttsState.totalWords > 0) {
                setTimeout(() => {
                    console.log('Auto-resuming TTS playback from word index:', restoredWordIndex, 'of', ttsState.totalWords);
                    
                    // Ensure word index is within bounds
                    ttsState.currentWordIndex = Math.min(restoredWordIndex, ttsState.totalWords - 1);
                    
                    // Highlight the current position before starting
                    if (ttsState.wordElements && ttsState.wordElements.length > ttsState.currentWordIndex) {
                        highlightWord(ttsState.currentWordIndex);
                        updateProgress();
                    }
                    
                    // Start playback
                    handlePlayPause({ preventDefault: () => {}, stopPropagation: () => {} });
                }, 1500);
            } else {
                console.warn('Cannot auto-resume: missing article text or word count');
                shouldAutoResume = false;
            }
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
        
        // Enhanced auto-start logic with better conditions
        if (!shouldAutoResume) {
            // Check if user has a preference for auto-start
            const autoStartPreference = localStorage.getItem('ttsAutoStart');
            const shouldAutoStart = autoStartPreference !== 'false'; // Default to true unless explicitly disabled
            
            if (shouldAutoStart) {
                setTimeout(() => {
                    console.log('Auto-starting TTS for article view...');
                    handlePlayPause({ preventDefault: () => {}, stopPropagation: () => {} });
                }, 1000);
            } else {
                console.log('Auto-start disabled by user preference');
            }
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
                // Ensure we save the exact current position, not ahead
                console.log('Saving state on pause - current word index:', ttsState.currentWordIndex);
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
                // Check if we have a properly prepared utterance
                if (!ttsState.currentUtterance || !ttsState.currentUtterance.text) {
                    console.log('No valid utterance found for resume, creating new one');
                    // Create a new utterance if needed
                    prepareUtteranceForResume();
                    // Start speaking instead of resuming
                    speechSynthesis.speak(ttsState.currentUtterance);
                } else {
                    // Apply current speech rate before resuming
                    if (ttsState.speechRate) {
                        ttsState.currentUtterance.rate = ttsState.speechRate;
                    }
                    
                    // Resume the existing utterance
                    speechSynthesis.resume();
                }
                
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
            const wasPaused = ttsState.isPaused;
            
            // Update the rate in ttsState to maintain it between play/pause
            const speedControl = document.getElementById('speed-control');
            ttsState.speechRate = speedControl ? parseFloat(speedControl.value) : 1;
            
            // Cancel current utterance
            speechSynthesis.cancel();
            
            if (wasPlaying) {
                // If it was playing, restart with new speed
                setTimeout(() => speakText(ttsState.fullArticleText, ttsState.currentWordIndex), 100);
            } else if (wasPaused) {
                // If it was paused, prepare a new utterance but don't play it yet
                prepareUtteranceForResume();
                
                // Update UI to ensure play button is enabled and shows correct state
                const playPauseBtn = document.getElementById('play-pause-btn');
                if (playPauseBtn) {
                    playPauseBtn.innerHTML = '<i class="fas fa-play"></i><span>Play</span>';
                    playPauseBtn.disabled = false;
                }
            }
        }
    }
    
    function prepareUtteranceForResume() {
        // Create a new utterance with the text from current position
        const wordsToSpeak = ttsState.fullArticleText.split(/\s+/).slice(ttsState.currentWordIndex).join(' ');
        ttsState.currentUtterance = new SpeechSynthesisUtterance(wordsToSpeak);
        
        // Apply the current speech rate
        ttsState.currentUtterance.rate = ttsState.speechRate || 1;
        
        // Set up the word boundary event to track progress
        ttsState.currentUtterance.onboundary = handleWordBoundary;
        
        // Set up the end event
        ttsState.currentUtterance.onend = handleSpeechEnd;
        
        // Make sure we maintain paused state
        ttsState.isPlaying = false;
        ttsState.isPaused = true;
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
        
        // Enhanced boundary events for improved word tracking accuracy
        let lastSyncTime = 0;
        let lastSaveTime = 0;
        
        ttsState.currentUtterance.onboundary = (event) => {
            if (event.name === 'word' && ttsState.isPlaying) {
                const currentTime = Date.now();
                
                // More accurate word index calculation
                const relativeWordIndex = getWordIndexFromCharIndex(event.charIndex, wordsToSpeak);
                const calculatedWordIndex = startWordIndex + relativeWordIndex;
                
                // Enhanced validation to prevent position drift
                let wordIndex = calculatedWordIndex;
                
                // Only allow forward movement or small backward corrections (max 1 word)
                if (wordIndex < ttsState.currentWordIndex) {
                    const backwardDrift = ttsState.currentWordIndex - wordIndex;
                    if (backwardDrift <= 1) {
                        // Allow small backward correction
                        wordIndex = calculatedWordIndex;
                    } else {
                        // Prevent significant backward jumps
                        wordIndex = ttsState.currentWordIndex;
                    }
                }
                
                // Ensure word index is within valid bounds
                wordIndex = Math.max(0, Math.min(wordIndex, ttsState.totalWords - 1));
                
                const previousIndex = ttsState.currentWordIndex;
                
                // Store the actual word position
                ttsState.currentWordIndex = wordIndex;
                
                // Highlight the current word being spoken (not the next one)
                const highlightIndex = wordIndex;
                
                // Only update UI if there's a meaningful change
                if (Math.abs(wordIndex - previousIndex) >= 1) {
                    // Highlight the current word being spoken for accurate visual feedback
                    highlightWord(highlightIndex);
                    updateProgress();
                    
                    // Log significant position changes for debugging
                    if (Math.abs(wordIndex - previousIndex) > 2) {
                        console.log(`TTS position change: ${previousIndex} -> ${wordIndex} (char: ${event.charIndex})`);
                    }
                }
                
                // Throttled sync with persistent audio manager (max once per second)
                if (window.persistentAudio && (currentTime - lastSyncTime) > 1000) {
                    window.persistentAudio.syncWithArticleView(
                        currentArticle.id,
                        ttsState.isPlaying,
                        ttsState.currentWordIndex,
                        ttsState.totalWords,
                        ttsState.fullArticleText
                    );
                    lastSyncTime = currentTime;
                }
                
                // Sync with floating TTS tracker (less frequent)
                if (window.floatingTTSTracker && (currentTime - lastSyncTime) > 1500) {
                    window.floatingTTSTracker.updateTTSState(ttsState.isPlaying, false, ttsState.currentWordIndex, ttsState.totalWords);
                }
                
                // Periodic state saving (every 15 words or 5 seconds)
                if (wordIndex % 15 === 0 || (currentTime - lastSaveTime) > 5000) {
                    if (window.savePlaybackState) {
                        window.savePlaybackState();
                        lastSaveTime = currentTime;
                    }
                }
                
                // Dispatch progress update event for cross-page tracking (throttled)
                if ((currentTime - lastSyncTime) > 2000) {
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
            
            // Update play/pause button to show pause icon when TTS actually starts
            const playPauseBtn = document.getElementById('play-pause-btn');
            if (playPauseBtn) {
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
            }
            
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
        if (charIndex <= 0) return 0;
        
        const textUpToChar = text.substring(0, charIndex);
        const trimmedText = textUpToChar.trim();
        
        // Handle empty or whitespace-only text
        if (!trimmedText) return 0;
        
        // Split by whitespace and filter out empty strings
        const words = trimmedText.split(/\s+/).filter(word => word.length > 0);
        
        // Return the count of complete words (not length - 1)
        // This represents the index of the word currently being spoken
        return Math.max(0, words.length - 1);
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
        const timeDisplay = document.getElementById('time-display');
        
        if (progressBar && ttsState.totalWords > 0) {
            const progress = (ttsState.currentWordIndex / ttsState.totalWords) * 100;
            progressBar.value = progress;
            
            // Update time display with estimated time remaining
            if (timeDisplay) {
                const wordsPerMinute = 150; // Average reading speed
                const totalMinutes = ttsState.totalWords / wordsPerMinute;
                const totalSeconds = Math.round(totalMinutes * 60);
                
                const remainingWords = ttsState.totalWords - ttsState.currentWordIndex;
                const remainingMinutes = remainingWords / wordsPerMinute;
                const remainingSeconds = Math.round(remainingMinutes * 60);
                
                const formatTime = (seconds) => {
                    const mins = Math.floor(seconds / 60);
                    const secs = Math.floor(seconds % 60);
                    return `${mins}:${secs.toString().padStart(2, '0')}`;
                };
                
                timeDisplay.textContent = `${formatTime(remainingSeconds)} / ${formatTime(totalSeconds)}`;
            }
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
            
            // Safety timeout to prevent infinite loading
            setTimeout(() => {
                if (loadingState.style.display === 'flex') {
                    console.warn('Loading timeout reached, showing error');
                    loadingState.style.display = 'none';
                    articleNotFound.style.display = 'block';
                }
            }, 10000); // 10 second timeout
            
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
        sessionStorage.removeItem('profileSetupPrompted');
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
            const submitButton = loginForm.querySelector('button[type="submit"]');
            
            // Show loading state
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Signing In...';
            submitButton.disabled = true;
            
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
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    updateAuthUI();
                    if (authModal) authModal.style.display = 'none';
                    loginForm.reset();
                    
                    // Security code setup removed - password reset is now implemented
                    
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
            } finally {
                // Restore button state
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
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
    
    // Password uniqueness check - properly implemented
    async function checkPasswordUniqueness(password) {
        const uniqueReq = document.getElementById('unique-req');
        if (!uniqueReq || !password || password.length < 6) {
            if (uniqueReq) {
                uniqueReq.className = 'requirement invalid';
            }
            return false;
        }

        try {
            // Check password uniqueness against database
            const response = await fetch(getApiUrl('/api/auth/check-password-uniqueness'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                const isUnique = data.isUnique;
                uniqueReq.className = isUnique ? 'requirement valid' : 'requirement invalid';
                return isUnique;
            } else {
                // If check fails, assume unique to not block users
                uniqueReq.className = 'requirement valid';
                return true;
            }
        } catch (error) {
            console.error('Password uniqueness check failed:', error);
            // If check fails, assume unique to not block users
            uniqueReq.className = 'requirement valid';
            return true;
        }
    }
    
    // Add password validation event listeners
    const signupPassword = document.getElementById('signup-password');
    const signupConfirmPassword = document.getElementById('signup-confirm-password');
    
    if (signupPassword) {
        signupPassword.addEventListener('input', async (e) => {
            const password = e.target.value;
            updatePasswordRequirements(password);
            await checkPasswordUniqueness(password);
            
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

    // Signup form handler
    if (signupForm && signupError) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            hideError(signupError);
            
            const username = document.getElementById('signup-username').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const confirmPassword = document.getElementById('signup-confirm-password').value;
            const submitButton = signupForm.querySelector('button[type="submit"]');
            
            if (password !== confirmPassword) {
                showError(signupError, 'Passwords do not match');
                return;
            }
            
            // Show loading state
            const originalButtonText = submitButton.textContent;
            submitButton.textContent = 'Creating Account...';
            submitButton.disabled = true;
            
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
                    localStorage.setItem('currentUser', JSON.stringify(data.user));
                    updateAuthUI();
                    if (authModal) authModal.style.display = 'none';
                    signupForm.reset();
                    
                    // Show profile setup modal for new users
                    showProfileSetupModal();
                    
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
            } finally {
                // Restore button state
                submitButton.textContent = originalButtonText;
                submitButton.disabled = false;
            }
        });
    }

    // Auth modal functions
    window.showAuthModal = function(mode = 'login') {
        if (!authModal) return;
        
        authModal.style.display = 'block';
        switchAuthTab(mode);
        
        // Clear any previous errors
        hideError(loginError);
        hideError(signupError);
    };
    
    window.switchAuthTab = function(mode) {
        if (!loginTab || !signupTab || !loginContainer || !signupContainer) return;
        
        // Clear all active states first
        loginTab.classList.remove('active');
        signupTab.classList.remove('active');
        loginContainer.classList.remove('active');
        signupContainer.classList.remove('active');
        
        // Set active state for the selected mode
        if (mode === 'login') {
            loginTab.classList.add('active');
            loginContainer.classList.add('active');
        } else if (mode === 'signup') {
            signupTab.classList.add('active');
            signupContainer.classList.add('active');
        }
    };
    
    // Tab click handlers
    if (loginTab) {
        loginTab.addEventListener('click', () => switchAuthTab('login'));
    }
    
    if (signupTab) {
        signupTab.addEventListener('click', () => switchAuthTab('signup'));
    }
    
    // Close modal handler
    if (authModalClose) {
        authModalClose.addEventListener('click', () => {
            if (authModal) authModal.style.display = 'none';
        });
    }

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === authModal) {
            authModal.style.display = 'none';
        }
    });
    
    // Initialize auth modal - don't set any tab as active by default
    // The active tab will be set when the modal is opened
    
    // Initialize voice selection
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    
    // Initialize music UI state and auto-start music if not playing
    setTimeout(async () => {
        console.log('=== DEBUG: article-view.js: Initializing music UI ===');

        const musicToggleBtn = document.getElementById('floating-music-btn');
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
    const musicToggleBtn = document.getElementById('floating-music-btn');
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

// Profile Setup Modal Functions
// Profile Setup Modal Functions - Removed as security code feature is no longer needed