const express = require("express");
const router = express.Router();
const isAdmin = require("../middlewares/isAdmin");
const upload = require("../config/multer-config");
const productModel = require("../models/product-model");

// GET route to render the product creation form
router.get("/create", isAdmin, function (req, res) {
    const success = req.flash("success") || [];
    res.render("createproducts", { success, loggedin: false, user: { cart: [] } });
});

// POST route to handle product creation
router.post("/create", isAdmin, upload.array("image"), async function (req, res) {
    try {
        const { name, price, discount, tax, description, category, bgcolor, panelcolor, textcolor, productType } = req.body;

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
        });

        req.flash("success", "Product created successfully");
        res.redirect("/owners/admin");
    } catch (err) {
        console.error(err);
        req.flash("error", "Error creating product");
        res.redirect("/owners/create-product");
    }
});

module.exports = router;
