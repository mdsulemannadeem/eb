const mongoose = require('mongoose');

const ownerSchema = new mongoose.Schema({
    fullname: {
        type: String,
        trim: true,
        minlength: 3,
        maxlength: 22,
    },
    email: {
        type: String,
        
    },
    password: {
        type: String,
       
    },
    products: {
        type: Array,
        default: []
    },
    
    picture: String
});

module.exports = mongoose.model('Owner', ownerSchema);