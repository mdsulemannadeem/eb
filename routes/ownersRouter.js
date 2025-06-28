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
    if (owners.length > 2) {
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
  res.render("createowner", {error, loggedin: false, user: { cart: [] }});
});

// Admin login page
router.get("/login", function (req, res) {
  let error = req.flash("error");
  res.render("owner-login", {error, loggedin: false, user: { cart: [] }});
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
        const filter = req.query.filter;
        let products;
        
        if (filter === 'outofstock') {
            // Show only out of stock products
            products = await productModel.find({ $or: [{ stock: 0 }, { stock: { $exists: false } }, { inStock: false }] });
        } else {
            // Show all products
            products = await productModel.find();
        }
        
        const success = req.flash("success");
        res.render("admin", { products, success, loggedin: false, user: { cart: [] }, filter });
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

// Edit product route
router.get("/edit-product/:productId", isAdmin, async function (req, res) {
    try {
        const productId = req.params.productId;
        const product = await productModel.findById(productId);
        
        if (!product) {
            req.flash("error", "Product not found");
            return res.redirect("/owners/admin");
        }
        
        const success = req.flash("success");
        const error = req.flash("error");
        res.render("editproduct", { product, success, error, loggedin: false, user: { cart: [] } });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading product");
        res.redirect("/owners/admin");
    }
});

// Update stock for a specific product
router.post("/update-stock/:id", isAdmin, async function (req, res) {
    try {
        const { stock } = req.body;
        const productId = req.params.id;
        
        const updatedProduct = await productModel.findByIdAndUpdate(
            productId,
            { 
                stock: parseInt(stock) || 0,
                inStock: parseInt(stock) > 0
            },
            { 
                new: true,
                runValidators: true
            }
        );

        if (!updatedProduct) {
            req.flash("error", "Product not found");
            return res.redirect("/owners/admin");
        }

        req.flash("success", `Stock updated for ${updatedProduct.name}`);
        res.redirect("/owners/admin");
    } catch (err) {
        console.error(err);
        if (err.name === 'VersionError') {
            req.flash("error", "Product was modified by another user. Please try again.");
        } else {
            req.flash("error", "Error updating stock");
        }
        res.redirect("/owners/admin");
    }
});

// Restock products - for when inventory is restocked
router.post("/restock/:id", isAdmin, async function (req, res) {
    try {
        const { additionalStock } = req.body;
        const productId = req.params.id;
        const stockToAdd = parseInt(additionalStock) || 0;
        
        if (stockToAdd <= 0) {
            req.flash("error", "Please enter a valid stock quantity to add");
            return res.redirect("/owners/admin");
        }
        
        const product = await productModel.findById(productId);
        if (!product) {
            req.flash("error", "Product not found");
            return res.redirect("/owners/admin");
        }
        
        const oldStock = product.stock || 0;
        const newStock = oldStock + stockToAdd;
        
        const updatedProduct = await productModel.findByIdAndUpdate(
            productId,
            { 
                stock: newStock,
                inStock: newStock > 0
            },
            { 
                new: true,
                runValidators: true
            }
        );

        if (!updatedProduct) {
            req.flash("error", "Product not found");
            return res.redirect("/owners/admin");
        }

        // Log stock change
        console.log(`RESTOCK: ${updatedProduct.name} (${productId}) - ${oldStock} → ${newStock} (+${stockToAdd} added)`);

        req.flash("success", `Successfully restocked ${updatedProduct.name}. Stock increased from ${oldStock} to ${newStock}`);
        res.redirect("/owners/admin");
    } catch (err) {
        console.error(err);
        if (err.name === 'VersionError') {
            req.flash("error", "Product was modified by another user. Please try again.");
        } else {
            req.flash("error", "Error restocking product");
        }
        res.redirect("/owners/admin");
    }
});

module.exports = router;
