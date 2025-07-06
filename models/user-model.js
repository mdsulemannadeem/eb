const mongoose = require('mongoose');



const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        
    },
    image: {
        type: Buffer, // This stores the actual image data
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
    },
    password: {
        type: String,
       
    },
    contact: {
        type: Number,
        unique: true,
        sparse: true
    },
    // Google OAuth fields
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    profilePicture: {
        type: String // URL for Google profile picture
    },
    isGoogleUser: {
        type: Boolean,
        default: false
    },
    cart : [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product'
        },
        quantity: {
            type: Number,
            default: 0
        }
    }],
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    orders: [{
        orderId: {
            type: String,
            required: true
        },
        items: [{
            name: String,
            price: Number,
            quantity: Number,
            discount: Number,
            total: Number
        }],
        totalMRP: Number,
        totalDiscount: Number,
        totalTax: Number,
        shippingFee: Number,
        totalAmount: Number,
        deliveryAddress: {
            fullName: String,
            mobile: String,
            pincode: String,
            locality: String,
            address: String,
            city: String,
            state: String,
            landmark: String,
            alternatePhone: String,
            addressType: String
        },
        status: {
            type: String,
            default: 'Order Placed'
        },
        orderDate: {
            type: Date,
            default: Date.now
        }
    }],
    address: {
        fullName: {
            type: String
        },
        mobile: {
            type: String
        },
        pincode: {
            type: String
        },
        locality: {
            type: String
        },
        address: {
            type: String
        },
        city: {
            type: String
        },
        state: {
            type: String
        },
        landmark: {
            type: String,
            default: ''
        },
        alternatePhone: {
            type: String,
            default: ''
        },
        addressType: {
            type: String,
            default: 'Home',
            enum: ['Home', 'Work']
        }
    },

   
}, {
    timestamps: true
});

// Add indexes for better query performance (only for fields that don't already have unique indexes)
userSchema.index({ 'cart.product': 1 });
userSchema.index({ wishlist: 1 });

module.exports = mongoose.model('User', userSchema);