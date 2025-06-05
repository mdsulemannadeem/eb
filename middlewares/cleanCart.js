const cleanCart = async (req, res, next) => {
    try {
        if (req.user && req.user.cart) {
            // Filter out invalid cart items
            const validCartItems = req.user.cart.filter(item => {
                return item && 
                       item.product && 
                       item.product._id && 
                       item.product.name && 
                       typeof item.product.price === 'number' &&
                       item.product.price >= 0;
            });

            // If cart was cleaned, update user
            if (validCartItems.length !== req.user.cart.length) {
                req.user.cart = validCartItems;
                await req.user.save();
                console.log(`Cleaned ${req.user.cart.length - validCartItems.length} invalid items from cart`);
            }
        }
        next();
    } catch (error) {
        console.error('Error cleaning cart:', error);
        next();
    }
};

module.exports = cleanCart;