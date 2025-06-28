// Cart functionality
document.addEventListener('DOMContentLoaded', function() {
    // Function to update cart count in all elements
    function updateCartCount(count) {
        const cartCountElements = [
            'cart-count',
            'mobile-cart-count',
            'mobile-cart-count-header'
        ];
        
        cartCountElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = count;
        });
    }
    
    // Handle add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-product-id');
            
            // Show loading state
            const originalText = this.textContent;
            this.textContent = 'Adding...';
            this.disabled = true;
            
            fetch(`/addtocart/${productId}`, {
                method: 'GET',
                headers: { 
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Update cart count in header
                    updateCartCount(data.cartCount);
                    
                    // Update global user object if it exists
                    if (typeof window.user !== 'undefined' && window.user && window.user.cart) {
                        // Update the user object to reflect new cart state
                        // This is a simplified update - in a real app you'd want to fetch fresh data
                        window.user.cart.push({ product: productId, quantity: 1 });
                    }
                    
                    // Show success message
                    showToast('Product added to cart!', 'success');
                } else if (data.requiresLogin) {
                    // Redirect to login if required
                    window.location.href = '/?showLogin=true';
                } else if (data.outOfStock) {
                    // Handle out of stock
                    showToast('Sorry, this product is currently out of stock!', 'error');
                } else {
                    showToast(data.message || 'Failed to add to cart', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Error adding to cart. Please try again.', 'error');
            })
            .finally(() => {
                // Restore button state
                this.textContent = originalText;
                this.disabled = false;
            });
        });
    });
    
    // Make functions globally available
    window.updateCartCount = updateCartCount;
});

// Toast notification function
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    toast.className = `fixed top-5 right-5 px-4 py-2 rounded-lg z-50 ${bgColor} text-white shadow-lg`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}