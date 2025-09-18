// Floating Icons Animation
document.addEventListener('DOMContentLoaded', () => {
    // Create container for floating icons
    const container = document.createElement('div');
    container.className = 'floating-icons-container';
    document.body.appendChild(container);
    
    // Icon types with their SVG paths
    const icons = [
        {
            type: 'book',
            svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M21 4H3c-1.1 0-2 .9-2 2v13c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 15H3V6h18v13z"/><path d="M21 4H3c-1.1 0-2 .9-2 2v13c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 15H3V6h18v13z"/><path d="M12 7.5c2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4 1.79-4 4-4z"/></svg>'
        },
        {
            type: 'headphones',
            svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a9 9 0 0 0-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7a9 9 0 0 0-9-9z"/></svg>'
        },
        {
            type: 'music',
            svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>'
        }
    ];
    
    // Function to create a new floating icon
    function createFloatingIcon() {
        // Select random icon
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];
        
        // Create icon element
        const icon = document.createElement('div');
        icon.className = `floating-icon icon-${randomIcon.type}`;
        icon.innerHTML = randomIcon.svg;
        
        // Random position, size and animation duration
        const size = Math.floor(Math.random() * 30) + 20; // 20-50px
        const startPosition = Math.random() * 100; // 0-100% of viewport width
        const duration = Math.floor(Math.random() * 10) + 8; // 8-18 seconds (faster)
        const delay = Math.random() * 2; // 0-2 seconds delay (shorter)
        
        // Apply styles
        icon.style.left = `${startPosition}%`;
        icon.style.width = `${size}px`;
        icon.style.height = `${size}px`;
        icon.style.animationDuration = `${duration}s`;
        icon.style.animationDelay = `${delay}s`;
        
        // Add to container
        container.appendChild(icon);
        
        // Remove after animation completes
        setTimeout(() => {
            icon.remove();
        }, (duration + delay) * 1000);
    }
    
    // Create initial batch of icons
    for (let i = 0; i < 20; i++) {
        createFloatingIcon();
    }
    
    // Continue creating new icons periodically
    setInterval(createFloatingIcon, 800); // More frequent (was 2000ms)
});