// The window.user and window.loggedin variables are now set in the template

// Function to handle wishlist actions
function addToWishlist(element, productId) {
    // Get the icon element
    const iconElement = element.querySelector('i');
    const isAlreadyInWishlist = iconElement.classList.contains('ri-heart-fill');
    
    // Add heart beat animation
    iconElement.classList.add('heart-beat');
    
    // Determine endpoint based on current wishlist status
    const endpoint = isAlreadyInWishlist ? 
        `/removefromwishlist/${productId}` : 
        `/addtowishlist/${productId}`;
    
    // Disable the link temporarily to prevent multiple clicks
    element.style.pointerEvents = 'none';
    
    // Make ajax request to add/remove from wishlist
    fetch(endpoint, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
        credentials: 'same-origin' // Ensure cookies are sent with the request
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Only update UI if server confirms the action was successful
        if (data.success) {
            // Update wishlist counter in header
            const wishlistCount = document.getElementById('wishlist-count');
            if (wishlistCount) {
                wishlistCount.textContent = data.count || 0;
            }
            
            // Update the icon based on the server response
            if (isAlreadyInWishlist) {
                // Remove from wishlist - change to outline heart
                iconElement.classList.remove('ri-heart-fill', 'text-red-500');
                iconElement.classList.add('ri-heart-line');
            } else {
                // Add to wishlist - change to filled heart
                iconElement.classList.remove('ri-heart-line');
                iconElement.classList.add('ri-heart-fill', 'text-red-500');
            }
            
            // Persist the change by updating an attribute on the element
            element.setAttribute('data-in-wishlist', isAlreadyInWishlist ? 'false' : 'true');
            
            // Store wishlist state in localStorage
            try {
                let wishlistItems = JSON.parse(localStorage.getItem('wishlistItems') || '[]');
                
                if (isAlreadyInWishlist) {
                    wishlistItems = wishlistItems.filter(id => id !== productId);
                } else if (!wishlistItems.includes(productId)) {
                    wishlistItems.push(productId);
                }
                
                localStorage.setItem('wishlistItems', JSON.stringify(wishlistItems));
                
                // Also update window.user if it exists (for page refresh handling)
                if (window.user && window.user.wishlist) {
                    if (isAlreadyInWishlist) {
                        window.user.wishlist = window.user.wishlist.filter(id => id != productId);
                    } else {
                        window.user.wishlist.push(productId);
                    }
                }
            } catch (error) {
                console.error('Error updating localStorage:', error);
            }
        } else {
            console.error('Server reported failure:', data.message);
            alert('Could not update wishlist. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error updating wishlist:', error);
        alert('Could not update wishlist. Please try again.');
    })
    .finally(() => {
        setTimeout(() => {
            iconElement.classList.remove('heart-beat');
            element.style.pointerEvents = 'auto';
        }, 1000);
    });
}

// On page load, sync wishlist state from localStorage as a backup
document.addEventListener('DOMContentLoaded', function() {
    try {
        const wishlistItems = JSON.parse(localStorage.getItem('wishlistItems') || '[]');
        const wishlistButtons = document.querySelectorAll('.wishlist-button');
        
        wishlistButtons.forEach(button => {
            const productId = button.getAttribute('href').split('/').pop();
            const iconElement = button.querySelector('i');
            const isInLocalWishlist = wishlistItems.includes(productId);
            const isInServerWishlist = iconElement.classList.contains('ri-heart-fill');
            
            // If there's a mismatch between localStorage and server state, trust localStorage
            if (isInLocalWishlist && !isInServerWishlist) {
                iconElement.classList.remove('ri-heart-line');
                iconElement.classList.add('ri-heart-fill', 'text-red-500');
            } else if (!isInLocalWishlist && isInServerWishlist) {
                iconElement.classList.remove('ri-heart-fill', 'text-red-500');
                iconElement.classList.add('ri-heart-line');
            }
        });
    } catch (error) {
        console.error('Error syncing wishlist state:', error);
    }
});