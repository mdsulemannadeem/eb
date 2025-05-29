const mongoose = require('mongoose');



const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        
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
    orders:{
        type: Array,
        default: []
    },

    picture:String
})
module.exports = mongoose.model('User', userSchema)