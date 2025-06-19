// Add to /public/javascripts/shop-filters.js
document.addEventListener('DOMContentLoaded', function() {
    // Product type filters
    document.querySelectorAll('.product-filter').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const url = this.getAttribute('href');
            
            fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.text())
            .then(html => {
                // Extract the product grid section from the HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const productGrid = doc.querySelector('.product-grid');
                
                // Replace current product grid with new one
                document.querySelector('.product-grid').innerHTML = productGrid.innerHTML;
                
                // Update browser history
                window.history.pushState({}, '', url);
                
                // Update active filter class
                document.querySelectorAll('.product-filter').forEach(f => {
                    f.classList.remove('bg-red-500', 'text-white');
                    f.classList.add('bg-gray-200', 'text-gray-700');
                });
                this.classList.add('bg-red-500', 'text-white');
                this.classList.remove('bg-gray-200', 'text-gray-700');
            });
        });
    });
    
    // Handle sort selection
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            const form = document.getElementById('sortForm');
            const formData = new FormData(form);
            const queryString = new URLSearchParams(formData).toString();
            const url = `/shop?${queryString}`;
            
            fetch(url, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const productGrid = doc.querySelector('.product-grid');
                
                document.querySelector('.product-grid').innerHTML = productGrid.innerHTML;
                window.history.pushState({}, '', url);
            });
        });
    }
});