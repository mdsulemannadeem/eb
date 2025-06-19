// Add this to a new file: /public/javascripts/cart-wishlist.js
document.addEventListener('DOMContentLoaded', function() {
    // Handle add to cart buttons
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.getAttribute('data-product-id');
            
            fetch(`/addtocart/${productId}`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Update cart count in header
                    document.getElementById('cart-count').textContent = data.cartCount;
                    // Show success message
                    showToast('Product added to cart!', 'success');
                }
            })
            .catch(error => console.error('Error:', error));
        });
    });
});

// Toast notification function
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed top-5 right-5 px-4 py-2 rounded-lg z-50 ${
        type === 'success' ? 'bg-green-500' : 'bg-blue-500'} text-white`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}