// Theme Utility - Centralized theme management for persistent dark mode
// This utility ensures consistent theme application across all pages

class ThemeManager {
    constructor() {
        this.STORAGE_KEY = 'userThemePreference';
        this.DEFAULT_THEME = 'light';
        this.init();
    }

    init() {
        // Apply saved theme immediately on page load
        this.applyTheme(this.getTheme());
        
        // Listen for system theme changes if user has auto theme
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (this.getTheme() === 'auto') {
                    this.applyTheme('auto');
                }
            });
        }
    }

    // Get current theme preference from localStorage
    getTheme() {
        try {
            // Check multiple possible storage locations for backward compatibility
            let theme = localStorage.getItem(this.STORAGE_KEY);
            
            if (!theme) {
                // Check old storage key
                theme = localStorage.getItem('themePreference');
                if (theme) {
                    // Migrate to new key
                    this.setTheme(theme);
                    localStorage.removeItem('themePreference');
                }
            }
            
            if (!theme) {
                // Check user preferences object
                const userPrefs = localStorage.getItem('userPreferences');
                if (userPrefs) {
                    const prefs = JSON.parse(userPrefs);
                    if (prefs.theme) {
                        theme = prefs.theme;
                        this.setTheme(theme);
                    }
                }
            }
            
            return theme || this.DEFAULT_THEME;
        } catch (error) {
            console.error('Error getting theme preference:', error);
            return this.DEFAULT_THEME;
        }
    }

    // Set theme preference in localStorage
    setTheme(theme) {
        try {
            localStorage.setItem(this.STORAGE_KEY, theme);
            
            // Also update userPreferences object if it exists
            const userPrefs = localStorage.getItem('userPreferences');
            if (userPrefs) {
                const prefs = JSON.parse(userPrefs);
                prefs.theme = theme;
                localStorage.setItem('userPreferences', JSON.stringify(prefs));
            }
            
            this.applyTheme(theme);
            
            // Dispatch custom event for other components to listen to
            window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
            
        } catch (error) {
            console.error('Error setting theme preference:', error);
        }
    }

    // Apply theme to the document
    applyTheme(theme) {
        const body = document.body;
        
        // Remove existing theme classes and attributes
        body.classList.remove('light-theme', 'dark-theme');
        body.removeAttribute('data-theme');
        
        let actualTheme = theme;
        
        // Handle auto theme
        if (theme === 'auto') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                actualTheme = 'dark';
            } else {
                actualTheme = 'light';
            }
        }
        
        // Apply theme using both methods for maximum compatibility
        if (actualTheme === 'dark') {
            body.classList.add('dark-theme');
            body.setAttribute('data-theme', 'dark');
        } else {
            body.classList.add('light-theme');
            body.setAttribute('data-theme', 'light');
        }
        
        console.log(`Theme applied: ${theme} (actual: ${actualTheme})`);
    }

    // Toggle between light and dark themes
    toggleTheme() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        return newTheme;
    }

    // Check if current theme is dark
    isDark() {
        const theme = this.getTheme();
        if (theme === 'dark') return true;
        if (theme === 'auto') {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    }

    // Get available themes
    getAvailableThemes() {
        return [
            { value: 'light', label: 'Light Theme' },
            { value: 'dark', label: 'Dark Theme' },
            { value: 'auto', label: 'Auto (System)' }
        ];
    }

    // Update theme select element if it exists
    updateThemeSelect() {
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = this.getTheme();
        }
    }

    // Initialize theme select element
    initializeThemeSelect() {
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            // Set current value
            themeSelect.value = this.getTheme();
            
            // Add change listener
            themeSelect.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        }
    }
}

// Create global theme manager instance
window.themeManager = new ThemeManager();

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}