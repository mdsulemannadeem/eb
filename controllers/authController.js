const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateToken } = require("../utilis/generateToken");
const productModel = require("../models/product-model");

module.exports.registerUser = async function (req, res) {
    try {
        const { fullname, email, password, contact } = req.body;

        if (!fullname || !email || !password || !contact) {
            return res.status(400).send("All fields are required");
        }

        // Check if email already exists
        let userC = await userModel.findOne({email : email});
        if(userC) return res.status(400).send("Email already exists");

        // Check if phone number already exists
        if(contact) {
            let phoneUser = await userModel.findOne({contact: contact});
            if(phoneUser) return res.status(400).send("Phone number already exists");
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const user = await userModel.create({
            fullname,
            email,
            password: hash,
            contact
        });

        let token = generateToken(user);
        res.cookie("token", token);
        res.send("User created successfully");
    } catch (err) {
        console.log(err.message);
        if(err.code === 11000) {
            return res.status(400).send("Phone number already exists");
        }
        res.status(500).send("Internal server error");
    }
};

module.exports.loginUser = async function (req, res) {
let { email, password } = req.body;
let user = await userModel.findOne({email:email});
if(!user){
    return res.status(400).send("User not found");
}
bcrypt.compare(password, user.password, async function(err, result) {
    if(result){
        let token = generateToken(user);
        res.cookie("token", token);
        const products = await productModel.find();
        const success = req.flash("success") || [];
        
        // Send the user object without the password
        const userForClient = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            contact: user.contact,
            wishlist: user.wishlist || [],
            picture: user.picture
        };
        
        res.render("home", { 
            products, 
            success, 
            loggedin: true,
            user: userForClient,
            productTypes: ["Beginner Banjo", "Professional Banjo", "Accessories"],
            activeType: "all"
        });
    }else{
        res.status(400).send("Invalid credentials");
    }
});
};

module.exports.logout = async function (req, res) {
    res.cookie("token", "");
    res.redirect("/login");
}
