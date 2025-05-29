const mongoose = require('mongoose');

// Define a review schema as a sub-document
const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true
  },
  userName: String, // Store username for quick access
}, { timestamps: true });

const productSchema = new mongoose.Schema({
    image: [Buffer], // Array of Buffers to store multiple images
    name: String,
    price: Number,
    discount: {
        type: Number,
        default: 0,
    },
    description: String, // Added description field
    
    bgcolor: String,
    panelcolor: String,
    textcolor: String,
    productType: {
        type: String,
        enum: ["Beginner Banjo", "Professional Banjo", "Accessories"], // Fixed options
        required: true,
    },
    // New fields for ratings
    reviews: [reviewSchema],
    averageRating: {
        type: Number,
        default: 0
    },
    reviewCount: {
        type: Number,
        default: 0
    }
});

// Calculate average rating whenever reviews change
productSchema.methods.calculateAverageRating = function() {
    if (this.reviews.length === 0) {
        this.averageRating = 0;
        this.reviewCount = 0;
    } else {
        const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
        this.averageRating = totalRating / this.reviews.length;
        this.reviewCount = this.reviews.length;
    }
    return this.averageRating;
};

module.exports = mongoose.model("Product", productSchema);