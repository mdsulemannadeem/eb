const express = require("express");
const router = express.Router();
const isAdmin = require("../middlewares/isAdmin");
const upload = require("../config/multer-config");
const productModel = require("../models/product-model");

// GET route to render the product creation form
router.get("/create", isAdmin, function (req, res) {
    const success = req.flash("success") || [];
    const error = req.flash("error") || [];
    res.render("createproducts", { success, error, loggedin: false, user: { cart: [] } });
});

// POST route to handle product creation
router.post("/create", isAdmin, (req, res, next) => {
    upload.array("image")(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                req.flash("error", "File size too large. Maximum file size is 100MB per image.");
            } else if (err.code === 'LIMIT_FILE_COUNT') {
                req.flash("error", "Too many files. Maximum is 5 images per product.");
            } else if (err.code === 'LIMIT_FIELD_VALUE') {
                req.flash("error", "Form data too large. Please reduce file sizes.");
            } else if (err.message === 'Only image files are allowed!') {
                req.flash("error", "Only image files are allowed!");
            } else if (err.type === 'entity.too.large') {
                req.flash("error", "Request too large. Please reduce file sizes and try again.");
            } else {
                req.flash("error", "Error uploading files: " + err.message);
            }
            return res.redirect("/products/create");
        }
        next();
    });
}, async function (req, res) {
    try {
        const { name, price, discount, tax, description, category, bgcolor, panelcolor, textcolor, productType, stock } = req.body;

        // Check if at least one image was uploaded
        if (!req.files || req.files.length === 0) {
            req.flash("error", "At least one product image is required");
            return res.redirect("/products/create");
        }

        // Handle multiple images
        const images = req.files.map(file => file.buffer);

        // Create the product
        const product = await productModel.create({
            image: images, // Store array of images
            name,
            price,
            tax,
            discount,
            description,
            bgcolor,
            panelcolor,
            textcolor,
            productType, // Save the product type
            stock: parseInt(stock) || 0,
            inStock: parseInt(stock) > 0
        });

        req.flash("success", "Product created successfully");
        res.redirect("/owners/admin");
    } catch (err) {
        console.error(err);
        req.flash("error", "Error creating product");
        res.redirect("/products/create");
    }
});

// GET route to render edit product form
router.get("/edit/:id", isAdmin, async function (req, res) {
    try {
        const product = await productModel.findById(req.params.id);
        if (!product) {
            req.flash("error", "Product not found");
            return res.redirect("/owners/admin");
        }
        
        const success = req.flash("success") || [];
        const error = req.flash("error") || [];
        res.render("editproduct", { success, error, product, loggedin: false, user: { cart: [] } });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading product");
        res.redirect("/owners/admin");
    }
});

// POST route to handle product editing
router.post("/edit/:id", isAdmin, (req, res, next) => {
    upload.array("image")(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                req.flash("error", "File size too large. Maximum file size is 100MB per image.");
            } else if (err.code === 'LIMIT_FILE_COUNT') {
                req.flash("error", "Too many files. Maximum is 5 images per product.");
            } else if (err.code === 'LIMIT_FIELD_VALUE') {
                req.flash("error", "Form data too large. Please reduce file sizes.");
            } else if (err.message === 'Only image files are allowed!') {
                req.flash("error", "Only image files are allowed!");
            } else if (err.type === 'entity.too.large') {
                req.flash("error", "Request too large. Please reduce file sizes and try again.");
            } else {
                req.flash("error", "Error uploading files: " + err.message);
            }
            return res.redirect(`/products/edit/${req.params.id}`);
        }
        next();
    });
}, async function (req, res) {
    try {
        const { name, price, discount, tax, description, category, bgcolor, panelcolor, textcolor, productType, stock } = req.body;
        
        // Prepare update object
        const updateData = {
            name,
            price,
            discount,
            tax,
            description,
            bgcolor,
            panelcolor,
            textcolor,
            productType,
            stock: parseInt(stock) || 0,
            inStock: parseInt(stock) > 0
        };

        // Handle image updates if new images are provided
        if (req.files && req.files.length > 0) {
            const images = req.files.map(file => file.buffer);
            updateData.image = images;
        }

        // Use findByIdAndUpdate to avoid version conflicts
        const updatedProduct = await productModel.findByIdAndUpdate(
            req.params.id,
            updateData,
            { 
                new: true,
                runValidators: true,
                lean: false
            }
        );

        if (!updatedProduct) {
            req.flash("error", "Product not found");
            return res.redirect("/owners/admin");
        }

        req.flash("success", "Product updated successfully");
        res.redirect("/owners/admin");
    } catch (err) {
        console.error(err);
        if (err.name === 'VersionError') {
            req.flash("error", "Product was modified by another user. Please try again.");
        } else if (err.name === 'ValidationError') {
            req.flash("error", "Validation error: " + err.message);
        } else {
            req.flash("error", "Error updating product");
        }
        res.redirect(`/products/edit/${req.params.id}`);
    }
});

module.exports = router;
