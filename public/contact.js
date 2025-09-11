// Contact Us Modal Functionality
class ContactManager {
    constructor() {
        this.modal = null;
        this.form = null;
        this.isSubmitting = false;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Get modal elements
        this.modal = document.getElementById('contact-us-modal');
        this.form = document.getElementById('contact-form');
        const contactBtn = document.getElementById('contact-us-btn');
        const closeBtn = document.getElementById('contact-modal-close');
        const cancelBtn = document.getElementById('contact-cancel-btn');

        if (!this.modal || !this.form || !contactBtn) {
            console.warn('Contact modal elements not found');
            return;
        }

        // Open modal
        contactBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal();
        });

        // Close modal events
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        // Close modal when clicking outside
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Handle form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.closeModal();
            }
        });
    }

    openModal() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            // Focus on first input
            const firstInput = this.form.querySelector('input[type="text"]');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = '';
            this.resetForm();
        }
    }

    resetForm() {
        if (this.form) {
            this.form.reset();
            this.isSubmitting = false;
            this.updateSubmitButton(false);
        }
    }

    updateSubmitButton(isSubmitting) {
        const submitBtn = this.form.querySelector('.contact-submit-btn');
        if (submitBtn) {
            if (isSubmitting) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            } else {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
            }
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (this.isSubmitting) return;
        
        this.isSubmitting = true;
        this.updateSubmitButton(true);

        try {
            // Get form data
            const formData = new FormData(this.form);
            
            // Validate required fields
            const name = formData.get('name')?.trim();
            const email = formData.get('email')?.trim();
            const topic = formData.get('topic')?.trim();
            const message = formData.get('message')?.trim();

            if (!name || !email || !topic || !message) {
                this.showMessage('Please fill in all required fields.', 'error');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.showMessage('Please enter a valid email address.', 'error');
                return;
            }

            // Submit to FormSubmit.co
            const response = await fetch(this.form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                this.showMessage('Thank you! Your message has been sent successfully. We\'ll get back to you soon.', 'success');
                setTimeout(() => {
                    this.closeModal();
                }, 2000);
            } else {
                throw new Error('Failed to send message');
            }
        } catch (error) {
            console.error('Contact form submission error:', error);
            this.showMessage('Sorry, there was an error sending your message. Please try again later.', 'error');
        } finally {
            this.isSubmitting = false;
            this.updateSubmitButton(false);
        }
    }

    showMessage(text, type = 'info') {
        // Remove existing message
        const existingMessage = this.form.querySelector('.contact-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `contact-message contact-message-${type}`;
        messageDiv.textContent = text;
        
        // Style the message
        messageDiv.style.cssText = `
            padding: 12px 16px;
            margin: 16px 0;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            ${type === 'success' ? 
                'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
                'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'
            }
        `;

        // Insert message before form actions
        const formActions = this.form.querySelector('.form-actions');
        if (formActions) {
            formActions.parentNode.insertBefore(messageDiv, formActions);
        }

        // Auto-remove error messages after 5 seconds
        if (type === 'error') {
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 5000);
        }
    }
}

// Initialize contact manager
const contactManager = new ContactManager();

// Export for potential use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ContactManager;
}