const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");
const productModel = require("../models/product-model");
const isAdmin = require("../middlewares/isAdmin");
const bcrypt = require("bcrypt");
const { generateToken } = require("../utilis/generateToken");

router.post("/signup", async function (req, res) {
  try {
    let owners = await ownerModel.find();
    if (owners.length > 0) {
      req.flash("error", "You don't have permission to create a new owner.");
      return res.redirect("/owners/signup");
    }

    let { fullname, email, password } = req.body;

    // Hash password before storing
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    let createdOwner = await ownerModel.create({
      fullname,
      email,
      password: hash,
    });

    // Generate token and set cookie for the new admin
    let token = generateToken(createdOwner);
    res.cookie("token", token);
    
    // Redirect to admin page instead of sending JSON
    res.redirect("/owners/admin");
  } catch (err) {
    console.error(err);
    req.flash("error", "Error creating admin account");
    res.redirect("/owners/signup");
  }
});

router.get("/signup", function (req, res) {
  let error = req.flash("error");
  res.render("createowner", {error});
});

// Admin login page
router.get("/login", function (req, res) {
  let error = req.flash("error");
  res.render("owner-login", {error});
});

// Admin login processing
router.post("/login", async function (req, res) {
  try {
    let { email, password } = req.body;
    let owner = await ownerModel.findOne({email});
    
    if (!owner) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/owners/login");
    }
    
    // Compare passwords
    const validPassword = await bcrypt.compare(password, owner.password);
    if (!validPassword) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/owners/login");
    }
    
    // Generate token and set cookie
    let token = generateToken(owner);
    res.cookie("token", token);
    
    res.redirect("/owners/admin");
  } catch (err) {
    console.error(err);
    req.flash("error", "Login failed");
    res.redirect("/owners/login");
  }
});

// Protected admin route
router.get("/admin", isAdmin, async function (req, res) {
    try {
        const products = await productModel.find();
        const success = req.flash("success");
        res.render("admin", { products, success });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading products");
        res.redirect("/owners/login");
    }
});

// Delete single product
router.post("/delete-product/:productId", isAdmin, async function (req, res) {
    try {
        const productId = req.params.productId;
        await productModel.findByIdAndDelete(productId);
        req.flash("success", "Product deleted successfully");
        res.redirect("/owners/admin");
    } catch (err) {
        console.error(err);
        req.flash("error", "Error deleting product");
        res.redirect("/owners/admin");
    }
});

// Delete all products
router.post("/delete-all", isAdmin, async function (req, res) {
    try {
        await productModel.deleteMany({});
        req.flash("success", "All products deleted successfully");
        res.redirect("/owners/admin");
    } catch (err) {
        console.error(err);
        req.flash("error", "Error deleting all products");
        res.redirect("/owners/admin");
    }
});

// Admin logout
router.get("/logout", function(req, res) {
  res.cookie("token", "");
  res.redirect("/owners/login");
});

module.exports = router;
