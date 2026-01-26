// Main JavaScript for Supermarket App

// Carousel Functionality
document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.querySelector('.carousel');
    
    if (carousel) {
        const slides = carousel.querySelector('.carousel-slides');
        const slideItems = carousel.querySelectorAll('.carousel-slide');
        const prevBtn = carousel.querySelector('.carousel-control.prev');
        const nextBtn = carousel.querySelector('.carousel-control.next');
        const indicators = carousel.querySelectorAll('.carousel-indicator');
        let currentIndex = 0;
        let slideInterval;
        
        // Set initial slide position
        updateSlidePosition();
        
        // Auto-advance slides
        startSlideInterval();
        
        // Event listeners
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                stopSlideInterval();
                currentIndex = (currentIndex - 1 + slideItems.length) % slideItems.length;
                updateSlidePosition();
                startSlideInterval();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                stopSlideInterval();
                currentIndex = (currentIndex + 1) % slideItems.length;
                updateSlidePosition();
                startSlideInterval();
            });
        }
        
        indicators.forEach(indicator => {
            indicator.addEventListener('click', () => {
                stopSlideInterval();
                currentIndex = parseInt(indicator.dataset.index);
                updateSlidePosition();
                startSlideInterval();
            });
        });
        
        // Pause on hover
        carousel.addEventListener('mouseenter', stopSlideInterval);
        carousel.addEventListener('mouseleave', startSlideInterval);
        
        // Update slide position
        function updateSlidePosition() {
            const slideWidth = 100;
            slides.style.transform = `translateX(-${currentIndex * slideWidth}%)`;
            
            // Update active indicator
            indicators.forEach((indicator, index) => {
                if (index === currentIndex) {
                    indicator.classList.add('active');
                } else {
                    indicator.classList.remove('active');
                }
            });
        }
        
        // Auto slide functions
        function startSlideInterval() {
            slideInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % slideItems.length;
                updateSlidePosition();
            }, 5000); // Change slide every 5 seconds
        }
        
        function stopSlideInterval() {
            clearInterval(slideInterval);
        }
    }
});

// Add to cart animation
document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', function(e) {
        // If it's a form submit button, let the form handle it
        if (this.type === 'submit') return;
        
        const originalText = this.textContent;
        this.textContent = 'Added!';
        this.style.backgroundColor = 'var(--primary)';
        this.style.color = 'white';
        
        setTimeout(() => {
            this.textContent = originalText;
            this.style.backgroundColor = '';
            this.style.color = '';
        }, 2000);
    });
});

// Sticky header effect
window.addEventListener('scroll', function() {
    const headerMain = document.querySelector('.header-main');
    if (headerMain) {
        if (window.scrollY > 50) {
            headerMain.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
        } else {
            headerMain.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        }
    }
});

// Search functionality
const searchInput = document.querySelector('.search-bar input');
if (searchInput) {
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const productCards = document.querySelectorAll('.product-card');
        
        productCards.forEach(card => {
            const productName = card.querySelector('.product-name').textContent.toLowerCase();
            if (productName.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// Category filter
const categoryLinks = document.querySelectorAll('.category-nav a');
categoryLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault(); // Prevent default link behavior
        
        // Remove active class from all links
        categoryLinks.forEach(l => l.classList.remove('active'));
        
        // Add active class to clicked link
        this.classList.add('active');
        
        // Get the selected category
        const selectedCategory = this.getAttribute('data-category');
        const productCards = document.querySelectorAll('.product-card');
        
        // Filter products
        productCards.forEach(card => {
            if (!selectedCategory || card.getAttribute('data-category') === selectedCategory) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
});

// Auto-hide alerts after 5 seconds
const alerts = document.querySelectorAll('.alert');
alerts.forEach(alert => {
    setTimeout(() => {
        alert.style.transition = 'opacity 0.5s';
        alert.style.opacity = '0';
        setTimeout(() => {
            alert.remove();
        }, 500);
    }, 5000);
});

// Confirm delete actions
const deleteLinks = document.querySelectorAll('a[href*="delete"], a[href*="Delete"]');
deleteLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        if (!confirm('Are you sure you want to delete this item?')) {
            e.preventDefault();
        }
    });
});

// Form validation
const forms = document.querySelectorAll('form[data-validate]');
forms.forEach(form => {
    form.addEventListener('submit', function(e) {
        const requiredInputs = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = 'var(--danger)';
            } else {
                input.style.borderColor = '';
            }
        });
        
        if (!isValid) {
            e.preventDefault();
            alert('Please fill in all required fields');
        }
    });
});
