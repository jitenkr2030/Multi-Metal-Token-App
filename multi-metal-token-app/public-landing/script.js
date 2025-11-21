// Landing Page JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 70; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        lastScrollTop = scrollTop;
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animateElements = document.querySelectorAll('.feature-card, .asset-card, .step, .testimonial-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });

    // Hero stats counter animation
    const stats = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = target.textContent;
                const numericValue = parseFloat(finalValue.replace(/[^\d.]/g, ''));
                
                if (!isNaN(numericValue)) {
                    let current = 0;
                    const increment = numericValue / 50;
                    const timer = setInterval(() => {
                        current += increment;
                        if (current >= numericValue) {
                            current = numericValue;
                            clearInterval(timer);
                        }
                        target.textContent = Math.floor(current).toLocaleString() + (finalValue.includes('₹') ? ' Cr+' : finalValue.includes('%') ? '%' : '+');
                    }, 30);
                }
                statsObserver.unobserve(target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => {
        statsObserver.observe(stat);
    });

    // Token cards animation
    const tokenCards = document.querySelectorAll('.token-card');
    tokenCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.2}s`;
    });

    // CTA button hover effects
    const ctaButtons = document.querySelectorAll('.btn-primary, .btn-secondary');
    ctaButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Loading animation for charts
    const chartBars = document.querySelectorAll('.chart-bar');
    chartBars.forEach(bar => {
        const height = bar.style.height;
        bar.style.height = '0%';
        setTimeout(() => {
            bar.style.height = height;
        }, 500);
    });

    // Form validation for contact forms (if any)
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            // Basic validation
            let isValid = true;
            const requiredFields = this.querySelectorAll('[required]');
            
            requiredFields.forEach(field => {
                if (!field.value.trim()) {
                    isValid = false;
                    field.classList.add('error');
                } else {
                    field.classList.remove('error');
                }
            });
            
            if (isValid) {
                // Show success message
                showNotification('Thank you for your interest! We\'ll contact you soon.', 'success');
                this.reset();
            } else {
                showNotification('Please fill in all required fields.', 'error');
            }
        });
    });

    // Notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
        
        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    // Add notification styles dynamically
    const notificationStyles = document.createElement('style');
    notificationStyles.textContent = `
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 1rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            animation: slideIn 0.3s ease-out;
        }
        
        .notification-success {
            border-left: 4px solid #10b981;
        }
        
        .notification-error {
            border-left: 4px solid #ef4444;
        }
        
        .notification-info {
            border-left: 4px solid #3b82f6;
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        
        .notification-close {
            background: none;
            border: none;
            cursor: pointer;
            margin-left: auto;
            color: #6b7280;
        }
        
        .notification-success i {
            color: #10b981;
        }
        
        .notification-error i {
            color: #ef4444;
        }
        
        .notification-info i {
            color: #3b82f6;
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
        
        .error {
            border-color: #ef4444 !important;
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
        }
        
        .animate-in {
            animation: fadeInUp 0.6s ease-out forwards;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .navbar.scrolled {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
        }
    `;
    document.head.appendChild(notificationStyles);

    // Initialize animations
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);

    // Performance optimization: Lazy load images
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => {
        imageObserver.observe(img);
    });

    // Add loading states for buttons
    const loadingButtons = document.querySelectorAll('[data-loading]');
    loadingButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.dataset.loading === 'true') return;
            
            const originalText = this.innerHTML;
            this.dataset.loading = 'true';
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            this.disabled = true;
            
            // Simulate loading (remove in production)
            setTimeout(() => {
                this.innerHTML = originalText;
                this.disabled = false;
                this.dataset.loading = 'false';
            }, 2000);
        });
    });

    // Market data simulation (for demo purposes)
    function updateMarketData() {
        const rates = {
            gold: 5850 + (Math.random() - 0.5) * 100,
            silver: 74.50 + (Math.random() - 0.5) * 2,
            platinum: 3250 + (Math.random() - 0.5) * 50,
            binr: 1.00
        };

        // Update token card prices
        const goldPrice = document.querySelector('.token-card.gold .price');
        const silverPrice = document.querySelector('.token-card.silver .price');
        const platinumPrice = document.querySelector('.token-card.platinum .price');

        if (goldPrice) goldPrice.textContent = `₹${rates.gold.toFixed(0)}/g`;
        if (silverPrice) silverPrice.textContent = `₹${rates.silver.toFixed(2)}/g`;
        if (platinumPrice) platinumPrice.textContent = `₹${rates.platinum.toFixed(0)}/g`;

        // Update asset card rates
        const assetRates = document.querySelectorAll('.asset-card .rate');
        if (assetRates[0]) assetRates[0].textContent = `₹${rates.gold.toFixed(0)}/g`;
        if (assetRates[1]) assetRates[1].textContent = `₹${rates.silver.toFixed(2)}/g`;
        if (assetRates[2]) assetRates[2].textContent = `₹${rates.platinum.toFixed(0)}/g`;
        if (assetRates[3]) assetRates[3].textContent = `₹${rates.binr.toFixed(2)}`;
    }

    // Update market data every 30 seconds
    updateMarketData();
    setInterval(updateMarketData, 30000);

    // Console log for developers
    console.log('%cMetalToken Landing Page Loaded', 'color: #3b82f6; font-size: 16px; font-weight: bold;');
    console.log('Built with ❤️ for Indian precious metals traders');
});

// Utility functions for external use
window.MetalToken = {
    showNotification: function(message, type) {
        // This function can be called from external scripts
        const event = new CustomEvent('showNotification', {
            detail: { message, type }
        });
        document.dispatchEvent(event);
    },
    
    trackEvent: function(eventName, data) {
        // Analytics tracking function
        console.log(`Event: ${eventName}`, data);
        // Integrate with your analytics service here
    }
};

// Handle external notification requests
document.addEventListener('showNotification', function(e) {
    showNotification(e.detail.message, e.detail.type);
});

window.calculateFee = function() {
    // Make fee calculator globally available
    // Implementation in pricing.html
};