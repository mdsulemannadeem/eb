const express = require("express");
const router = express.Router();
const isloggedin = require("../middlewares/isLoggedin");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const upload = require("../config/multer-config");

// Add clean cart middleware
const cleanCart = require('../middlewares/cleanCart');


router.get("/login", function(req, res) {
  const redirect = req.query.redirect;
  let message = redirect ? "Please login to add products to your cart" : "";
  let error = req.flash("error");
  res.render("index", { error, message, loggedin: false });
});

router.get("/register", function(req, res) {
  res.render("index", { error: [], message: "", loggedin: false });
});

// Add email validation middleware
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// Registration route - Make sure this exists and is working
router.post("/users/register", async function(req, res) {
  try {
    const { 
      email, 
      password, 
      fullname, 
      contact,
      deliveryName,
      deliveryMobile,
      pincode,
      locality,
      address,
      city,
      state,
      landmark,
      alternatePhone,
      addressType
    } = req.body;
    
    console.log("Registration form data received:", req.body); // Debug log
    
    // Validate required fields
    if (!email || !password || !fullname || !contact) {
      req.flash("error", "Please fill all required personal information fields");
      return res.redirect("/");
    }

    if (!deliveryName || !deliveryMobile || !pincode || !locality || !address || !city || !state) {
      req.flash("error", "Please fill all required address fields");
      return res.redirect("/");
    }

    // Validate mobile numbers
    if (!/^\d{10}$/.test(contact)) {
      req.flash("error", "Please enter a valid 10-digit phone number");
      return res.redirect("/");
    }

    if (!/^\d{10}$/.test(deliveryMobile)) {
      req.flash("error", "Please enter a valid 10-digit delivery mobile number");
      return res.redirect("/");
    }

    // Validate pincode
    if (!/^\d{6}$/.test(pincode)) {
      req.flash("error", "Please enter a valid 6-digit pincode");
      return res.redirect("/");
    }

    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      req.flash("error", "User with this email already exists");
      return res.redirect("/");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user with address
    const newUser = new userModel({
      email,
      password: hashedPassword,
      fullname,
      contact,
      address: {
        fullName: deliveryName,
        mobile: deliveryMobile,
        pincode,
        locality,
        address,
        city,
        state,
        landmark: landmark || '',
        alternatePhone: alternatePhone || '',
        addressType: addressType || 'Home'
      }
    });

    const savedUser = await newUser.save();
    console.log("User saved successfully with address:", savedUser.address); // Debug log
    
    req.flash("success", "Registration successful! Your address has been saved. Please login.");
    res.redirect("/");
    
  } catch (err) {
    console.error("Registration error:", err);
    req.flash("error", "Registration failed. Please try again.");
    res.redirect("/");
  }
});

router.get("/", async function (req, res) {
  try {
    let error = req.flash("error");
    let message = req.flash("success") || [];
    
    // Get filter from query parameter
    const productTypeFilter = req.query.type;
    
    // Build query based on filter
    let query = {};
    if (productTypeFilter) {
      query.productType = productTypeFilter;
    }
    
    // Get all products with optional filter
    let products = await productModel.find(query);
    
    // Get unique product types for filter buttons
    const productTypes = ["Beginner Banjo", "Professional Banjo", "Accessories"];
    
    // Check if user is logged in based on token
    const loggedin = req.cookies.token ? true : false;
    let user = { wishlist: [] };
    
    if (loggedin) {
      // Get fresh user data with populated wishlist
      const decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);
      user = await userModel.findOne({ email: decoded.email }).select("-password");
    }
    
    res.render("home", { 
      error, 
      message, 
      loggedin, 
      products, 
      user, 
      productTypes, 
      activeType: productTypeFilter || "all" 
    });
  } catch (err) {
    console.error(err.message);
    res.render("home", { 
      error: [], 
      message: [], 
      loggedin: false, 
      products: [], 
      user: { wishlist: [] },
      productTypes: ["Beginner Banjo", "Professional Banjo", "Accessories"],
      activeType: "all"
    });
  }
});

router.get("/shop", isloggedin, async function (req, res) {
    try {
        const sortby = req.query.sortby || 'popular'; // Default sort
        
        let success = req.flash("success");
        // Get filter from query parameter
    const productTypeFilter = req.query.type;
    
    // Build query based on filter
    let query = {};
    if (productTypeFilter) {
      query.productType = productTypeFilter;
    }
    
    // Get all products with optional filter
    let products = await productModel.find(query);
    
    // Get unique product types for filter buttons
    const productTypes = ["Beginner Banjo", "Professional Banjo", "Accessories"];
    
        
      
        
        // Sort products based on selected option
        products = sortItems(products, sortby);
        
        res.render("shop", { 
            products,
            success,
            sortby, // Pass the current sort option to maintain selection state
            loggedin: true,
            user: req.user, // Make sure this is populated by your isloggedin middleware
            productTypes,
            activeType: productTypeFilter || "all"  // Add productTypes to the render data
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server Error");
    }
});

// Add the sortItems function
function sortItems(items, sortType) {
  let sortedItems = [...items]; // clone to avoid modifying original

  switch (sortType) {
    case "popular":
      // You might need to add a popularity field to your product model
      // For now, just return the default order
      break;

    case "newest":
      // Assuming products have a createdAt field
      sortedItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;

    case "lowToHigh":
      sortedItems.sort((a, b) => a.price - b.price);
      break;

    case "highToLow":
      sortedItems.sort((a, b) => b.price - a.price);
      break;

    default:
      console.warn("Unknown sort type");
  }

  return sortedItems;
}

// Update cart route - Fix discount calculation
router.get('/cart', isloggedin, async function(req, res, next) {
    try {
        const user = await userModel.findOne({ email: req.user.email }).populate('cart.product');
        
        let totalMRP = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        const platformFee = 20;
        const shippingFee = "FREE";

        if (user.cart && user.cart.length > 0) {
            // Filter out any invalid items inline
            const validCartItems = user.cart.filter(item => 
                item && item.product && item.product.price && typeof item.product.price === 'number'
            );

            for (const item of validCartItems) {
                const quantity = item.quantity || 1;
                const itemMRP = item.product.price * quantity;
                
                // Fixed: discount is now a direct amount in rupees, not percentage
                const discountPerUnit = item.product.discount || 0;
                const discountAmount = discountPerUnit * quantity; // Total discount for this item
                const discountedPrice = itemMRP - discountAmount;
                
                // Tax is calculated as percentage on discounted price
                const taxRate = item.product.taxRate || 0;
                const taxAmount = (discountedPrice * taxRate) / 100;

                totalMRP += itemMRP;
                totalDiscount += discountAmount; // Fixed: now adds discount amount, not discounted price
                totalTax += taxAmount;
            }
        }

        const totalAmount = totalMRP - totalDiscount + totalTax + platformFee;

        res.render('cart', {
            user,
            totalMRP: Math.round(totalMRP),
            totalDiscount: Math.round(totalDiscount),
            totalTax: Math.round(totalTax),
            platformFee,
            shippingFee,
            totalAmount: Math.round(totalAmount),
            success: req.flash('success'),
            error: req.flash('error')
        });

    } catch (error) {
        console.error('Cart error:', error);
        req.flash('error', 'Error loading cart');
        res.redirect('/');
    }
});

router.get("/addtocart/:productid", isloggedin, async function (req, res) {
  try {
    // Add this check
    if (!req.user || !req.user.email) {
      req.flash("error", "Authentication error");
      return res.redirect("/login");
    }
    
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.productid;
    
    // Check if product already exists in cart
    const existingProductIndex = user.cart.findIndex(item => 
      item.product && item.product.toString() === productId
    );
    
    if (existingProductIndex >= 0) {
      // Increment quantity if product already exists
      user.cart[existingProductIndex].quantity += 1;
    } else {
      // Add new product with quantity 1
      user.cart.push({ product: productId, quantity: 1 });
    }
    
    await user.save();
    req.flash("success", "Product added to cart");
    res.redirect("/cart");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Increase quantity
router.get("/increasequantity/:productid", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.productid;
    
    const existingProductIndex = user.cart.findIndex(item => 
      item.product && item.product.toString() === productId
    );
    
    if (existingProductIndex >= 0) {
      user.cart[existingProductIndex].quantity += 1;
      await user.save();
    }
    
    res.redirect("/cart");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Decrease quantity
router.get("/decreasequantity/:productid", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.productid;
    
    const existingProductIndex = user.cart.findIndex(item => 
      item.product && item.product.toString() === productId
    );
    
    if (existingProductIndex >= 0) {
      if (user.cart[existingProductIndex].quantity > 1) {
        user.cart[existingProductIndex].quantity -= 1;
      } else {
        // Remove product if quantity becomes 0
        user.cart.splice(existingProductIndex, 1);
      }
      await user.save();
    }
    
    res.redirect("/cart");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});


router.get("/logout", isloggedin, function (req, res) {
  res.render("shop");
});

// Profile route - Include orders
router.get("/profile", isloggedin, async function (req, res) {
  try {
    // Find user with full address info and orders
    const user = await userModel.findOne({ email: req.user.email })
                              .select("-password");
    
    console.log("Profile - User found:", !!user);
    console.log("Profile - User address:", user?.address);
    console.log("Profile - User orders count:", user?.orders?.length || 0);
    
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/login");
    }
    
    // Sort orders by date (newest first)
    if (user.orders) {
      user.orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
    }
    
    // Get flash messages
    const success = req.flash("success");
    const error = req.flash("error");
    
    res.render("profile", { user, success, error });
  } catch (err) {
    console.error("Profile error:", err);
    req.flash("error", "Error loading profile");
    res.redirect("/shop");
  }
});

// Update profile route
router.post("/profile/update", isloggedin, upload.single("image"), async function (req, res) {
  try {
    const { fullname, contact } = req.body;
    
    // Prepare update object
    const updateData = { fullname };
    
    // Add contact if provided and validate
    if (contact) {
      if (!/^\d{10}$/.test(contact)) {
        req.flash("error", "Please enter a valid 10-digit contact number");
        return res.redirect("/profile");
      }
      updateData.contact = contact;
    }
    
    // Handle profile picture upload
    if (req.file) {
      console.log("File uploaded:", req.file); // Debug log
      
      // Store image as Buffer (matching your user model)
      updateData.image = req.file.buffer;
      // If you have contentType field in your model, add this:
      // updateData.imageContentType = req.file.mimetype;
    }
    
    console.log("Update data:", updateData); // Debug log
    
    // Update user info
    const updatedUser = await userModel.findOneAndUpdate(
      { email: req.user.email },
      updateData,
      { new: true } // Return updated document
    );
    
    console.log("User updated successfully:", !!updatedUser.image); // Debug log
    
    req.flash("success", "Profile updated successfully");
    res.redirect("/profile");
  } catch (err) {
    console.error("Profile update error:", err.message);
    req.flash("error", "Failed to update profile");
    res.redirect("/profile");
  }
});

// Change password route
router.post("/profile/change-password", isloggedin, async function (req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Find user with password
    const user = await userModel.findOne({ email: req.user.email });
    
    // Check if current password is correct
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      req.flash("error", "Current password is incorrect");
      return res.redirect("/profile");
    }
    
    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      req.flash("error", "New passwords don't match");
      return res.redirect("/profile");
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hash;
    await user.save();
    
    req.flash("success", "Password changed successfully");
    res.redirect("/profile");
  } catch (err) {
    console.error(err.message);
    req.flash("error", "Failed to change password");
    res.redirect("/profile");
  }
});

// Order details route
router.get("/order/:orderId", isloggedin, async function (req, res) {
  try {
    const user = await userModel.findOne({ email: req.user.email });
    const orderId = req.params.orderId;
    
    // Find the specific order in the user's orders array
    const order = user.orders.find(o => o._id.toString() === orderId);
    
    if (!order) {
      req.flash("error", "Order not found");
      return res.redirect("/profile");
    }
    
    res.render("order-details", { user, order });
  } catch (err) {
    console.error(err.message);
    req.flash("error", "Failed to load order details");
    res.redirect("/profile");
  }
});

// Individual order details route
router.get("/order-details/:orderId", isloggedin, async function (req, res) {
  try {
    const user = await userModel.findOne({ email: req.user.email }).select("-password");
    const orderId = req.params.orderId;
    
    // Find the specific order in the user's orders array
    const order = user.orders.find(o => o.orderId === orderId);
    
    if (!order) {
      req.flash("error", "Order not found");
      return res.redirect("/profile");
    }
    
    res.render("order-details", { 
      user, 
      order,
      success: req.flash("success"),
      error: req.flash("error")
    });
  } catch (err) {
    console.error(err.message);
    req.flash("error", "Failed to load order details");
    res.redirect("/profile");
  }
});

// Wishlist route
router.get("/wishlist", isloggedin, async function (req, res) {
  try {
    // Find user with populated wishlist products
    const user = await userModel.findOne({ email: req.user.email })
                              .select("-password")
                              .populate('wishlist');
    
    res.render("wishlist", { user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Add to wishlist route
router.get("/addtowishlist/:productid", isloggedin, async function (req, res) {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        const productId = req.params.productid;
        
        // Check if product already exists in wishlist
        const isProductInWishlist = user.wishlist.some(item => 
            item.toString() === productId
        );
        
        if (!isProductInWishlist) {
            // Only add if not already in wishlist
            user.wishlist.push(productId);
            await user.save();
            
            // For AJAX requests, return JSON
            if (req.xhr || req.headers.accept.includes('application/json')) {
                return res.json({ 
                    success: true, 
                    message: "Product added to wishlist", 
                    count: user.wishlist.length 
                });
            }
            
            // For regular requests, use flash and redirect
            req.flash("success", "Product added to wishlist");
        } else if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.json({ 
                success: true, 
                message: "Product is already in wishlist", 
                count: user.wishlist.length 
            });
        }
        
        // Redirect back to the referring page
        const referer = req.headers.referer || "/shop";
        res.redirect(referer);
    } catch (err) {
        console.error(err.message);
        if (req.xhr || req.headers.accept.includes('application/json')) {
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
        res.status(500).send("Internal Server Error");
    }
});



// Remove from wishlist route
router.get("/removefromwishlist/:productid", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.productid;
    
    // Find and remove the product from wishlist
    const productIndex = user.wishlist.findIndex(item => item.toString() === productId);
    
    if (productIndex !== -1) {
      user.wishlist.splice(productIndex, 1);
      await user.save();
      
      // For AJAX requests, return JSON with updated user data
      if (req.xhr || req.headers.accept.includes('application/json')) {
        // Get fresh user data to confirm changes
        const updatedUser = await userModel.findOne({ email: req.user.email });
        
        return res.json({
          success: true,
          message: "Product removed from wishlist",
          count: updatedUser.wishlist.length,
          wishlist: updatedUser.wishlist
        });
      }
      
      req.flash("success", "Product removed from wishlist");
    }
    
    // Only redirect for non-AJAX requests
    if (!(req.xhr || req.headers.accept.includes('application/json'))) {
      res.redirect("/wishlist");
    }
  } catch (err) {
    console.error(err.message);
    
    if (req.xhr || req.headers.accept.includes('application/json')) {
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
    res.status(500).send("Internal Server Error");
  }
});

// Move from wishlist to cart
router.get("/movetocart/:productid", isloggedin, async function (req, res) {
  try {
    let user = await userModel.findOne({ email: req.user.email });
    const productId = req.params.productid;
    
    // Find and remove the product from wishlist
    const productIndex = user.wishlist.findIndex(item => item.toString() === productId);
    
    if (productIndex !== -1) {
      user.wishlist.splice(productIndex, 1);
      
      // Check if product already exists in cart
      const existingProductIndex = user.cart.findIndex(item => 
        item.product && item.product.toString() === productId
      );
      
      if (existingProductIndex >= 0) {
        // Increment quantity if product already exists
        user.cart[existingProductIndex].quantity += 1;
      } else {
        // Add new product with quantity 1
        user.cart.push({ product: productId, quantity: 1 });
      }
      
      await user.save();
      req.flash("success", "Product moved to cart");
    }
    
    res.redirect("/cart");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Internal Server Error");
  }
});

// Product showcase route
router.get("/product-show/:productid", isloggedin, async function (req, res) {
    try {
        const productId = req.params.productid;
        const product = await productModel.findById(productId).populate({
            path: 'reviews.user',
            select: 'fullname'
        });

        if (!product) {
            return res.status(404).send("Product not found");
        }
        
        // Check if user is logged in
        const loggedin = req.cookies.token ? true : false;
        let user = null;
        
        if (loggedin && req.user) {
            user = req.user;
        }
        
        const success = req.flash("success");
        const error = req.flash("error");

        res.render("product-showcase", { 
            product, 
            user,
            loggedin,
            success,
            error
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Internal Server Error");
    }
});

// Add review routes

// Submit new review
router.post("/product/:productId/review", isloggedin, async function (req, res) {
  try {
    const productId = req.params.productId;
    const { rating, comment } = req.body;
    
    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      req.flash("error", "Rating must be between 1 and 5");
      return res.redirect(`/product-show/${productId}`);
    }
    
    // Find product
    const product = await productModel.findById(productId);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/shop");
    }
    
    // Check if user already reviewed this product
    const existingReview = product.reviews.find(
      r => r.user.toString() === req.user._id.toString()
    );
    
    if (existingReview) {
      req.flash("error", "You've already reviewed this product");
      return res.redirect(`/product-show/${productId}`);
    }
    
    // Create new review
    const newReview = {
      user: req.user._id,
      rating: Number(rating),
      comment,
      userName: req.user.fullname
    };
    
    // Add review and update average
    product.reviews.push(newReview);
    product.calculateAverageRating();
    await product.save();
    
    req.flash("success", "Review added successfully");
    res.redirect(`/product-show/${productId}`);
  } catch (err) {
    console.error(err.message);
    req.flash("error", "Error adding review");
    res.redirect(`/product-show/${req.params.productId}`);
  }
});

// Delete review (optional)
router.post("/product/:productId/review/:reviewId/delete", isloggedin, async function (req, res) {
  try {
    const { productId, reviewId } = req.params;
    
    // Find product
    const product = await productModel.findById(productId);
    if (!product) {
      req.flash("error", "Product not found");
      return res.redirect("/shop");
    }
    
    // Find and verify review belongs to user
    const reviewIndex = product.reviews.findIndex(
      r => r._id.toString() === reviewId && r.user.toString() === req.user._id.toString()
    );
    
    if (reviewIndex === -1) {
      req.flash("error", "Review not found or you're not authorized");
      return res.redirect(`/product-show/${productId}`);
    }
    
    // Remove review
    product.reviews.splice(reviewIndex, 1);
    product.calculateAverageRating();
    await product.save();
    
    req.flash("success", "Review deleted successfully");
    res.redirect(`/product-show/${productId}`);
  } catch (err) {
    console.error(err.message);
    req.flash("error", "Error deleting review");
    res.redirect(`/product-show/${req.params.productId}`);
  }
});

// Simple place order route - Save order to user's orders array
router.post('/place-order', isloggedin, async function(req, res, next) {
    try {
        const user = await userModel.findOne({ email: req.user.email }).populate('cart.product');
        
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/cart');
        }

        if (!user.cart || user.cart.length === 0) {
            req.flash('error', 'Your cart is empty');
            return res.redirect('/cart');
        }

        // Check if user has address
        if (!user.address || !user.address.fullName) {
            req.flash('error', 'Please add your delivery address first');
            return res.redirect('/profile');
        }

        // Validate cart items
        const validItems = user.cart.filter(item => 
            item && item.product && item.product.price && typeof item.product.price === 'number'
        );

        if (validItems.length === 0) {
            req.flash('error', 'No valid items in cart');
            return res.redirect('/cart');
        }

        // Calculate totals
        let totalMRP = 0;
        let totalDiscount = 0;
        let totalTax = 0;
        const platformFee = 20;
        const shippingFee = 0;

        for (const item of validItems) {
            const quantity = item.quantity || 1;
            const itemMRP = item.product.price * quantity;
            
            // Fixed: discount is now a direct amount in rupees, not percentage
            const discountPerUnit = item.product.discount || 0;
            const discountAmount = discountPerUnit * quantity;
            const discountedPrice = itemMRP - discountAmount;
            
            // Tax is calculated as percentage on discounted price
            const taxRate = item.product.taxRate || 0;
            const taxAmount = (discountedPrice * taxRate) / 100;

            totalMRP += itemMRP;
            totalDiscount += discountAmount;
            totalTax += taxAmount;
        }

        const totalAmount = totalMRP - totalDiscount + totalTax + platformFee + shippingFee;

        // Generate order ID
        const orderId = `EB${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Create order object
        const orderData = {
            orderId: orderId,
            items: validItems.map(item => {
                const quantity = item.quantity || 1;
                const itemMRP = item.product.price * quantity;
                const discountPerUnit = item.product.discount || 0;
                const discountAmount = discountPerUnit * quantity;
                const discountedPrice = itemMRP - discountAmount;
                const taxRate = item.product.taxRate || 0;
                const taxAmount = (discountedPrice * taxRate) / 100;
                
                return {
                    name: item.product.name,
                    price: item.product.price,
                    quantity: quantity,
                    discount: discountPerUnit,
                    total: discountedPrice + taxAmount
                };
            }),
            totalMRP: Math.round(totalMRP),
            totalDiscount: Math.round(totalDiscount),
            totalTax: Math.round(totalTax),
            platformFee: platformFee,
            shippingFee: shippingFee,
            totalAmount: Math.round(totalAmount),
            deliveryAddress: {
                fullName: user.address.fullName,
                mobile: user.address.mobile,
                pincode: user.address.pincode,
                locality: user.address.locality,
                address: user.address.address,
                city: user.address.city,
                state: user.address.state,
                landmark: user.address.landmark || '',
                alternatePhone: user.address.alternatePhone || '',
                addressType: user.address.addressType || 'Home'
            },
            status: 'Order Placed',
            orderDate: new Date()
        };

        // Add order to user's orders array
        user.orders.push(orderData);

        // Store order in session for success page
        req.session.lastOrder = orderData;

        // Clear cart after successful order
        user.cart = [];
        
        // Save user with new order and cleared cart
        await user.save();

        req.flash('success', 'Order placed successfully!');
        res.redirect('/order-success');

    } catch (error) {
        console.error('Place order error:', error);
        req.flash('error', 'Failed to place order. Please try again.');
        res.redirect('/cart');
    }
});

// Order success route using session data
router.get("/order-success", isloggedin, async function (req, res) {
  try {
    const user = await userModel.findOne({ email: req.user.email });
    const order = req.session.lastOrder || null;
    
    // Clear the order from session after displaying
    if (req.session.lastOrder) {
      delete req.session.lastOrder;
    }
    
    res.render("order-success", { 
      user: user, 
      order: order,
      success: req.flash("success")
    });
  } catch (err) {
    console.error("Order success error:", err.message);
    req.flash("error", "Error loading order details");
    res.redirect("/");
  }
});

// Update address route
router.post("/profile/update-address", isloggedin, async function (req, res) {
  try {
    const { fullName, mobile, pincode, locality, address, city, state, landmark, alternatePhone, addressType } = req.body;
    
    console.log("Received address data:", req.body); // Debug log
    
    // Validate required fields
    if (!fullName || !mobile || !pincode || !locality || !address || !city || !state) {
      req.flash("error", "Please fill all required fields");
      return res.redirect("/profile");
    }
    
    // Validate pincode (should be 6 digits)
    if (!/^\d{6}$/.test(pincode)) {
      req.flash("error", "Please enter a valid 6-digit pincode");
      return res.redirect("/profile");
    }
    
    // Validate mobile number (should be 10 digits)
    if (!/^\d{10}$/.test(mobile)) {
      req.flash("error", "Please enter a valid 10-digit mobile number");
      return res.redirect("/profile");
    }
    
    // Update user address
    const user = await userModel.findOneAndUpdate(
      { email: req.user.email },
      {
        $set: {
          address: {
            fullName,
            mobile,
            pincode,
            locality,
            address,
            city,
            state,
            landmark: landmark || '',
            alternatePhone: alternatePhone || '',
            addressType: addressType || 'Home'
          }
        }
      },
      { new: true } // Return updated document
    );
    
    console.log("Updated user address:", user.address); // Debug log
    
    req.flash("success", "Address updated successfully!");
    res.redirect("/profile");
    
  } catch (err) {
    console.error("Address update error:", err.message);
    req.flash("error", "Failed to update address");
    res.redirect("/profile");
  }
});

// Login POST route
router.post("/users/login", async function(req, res) {
  try {
    const { email, password } = req.body;
    
    const user = await userModel.findOne({ email });
    if (!user) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/");
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      req.flash("error", "Invalid email or password");
      return res.redirect("/");
    }
    
    // Create JWT token
    const token = jwt.sign(
      { email: user.email, userId: user._id }, 
      process.env.JWT_KEY || "defaultsecret",
      { expiresIn: "7d" }
    );
    
    res.cookie("token", token, { 
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    console.log("User logged in with address:", user.address); // Debug log
    
    req.flash("success", "Login successful!");
    res.redirect("/shop");
    
  } catch (err) {
    console.error("Login error:", err);
    req.flash("error", "Login failed. Please try again.");
    res.redirect("/");
  }
});

// Route to remove invalid cart items
router.get('/remove-invalid-item/:index', isloggedin, async function(req, res) {
    try {
        const user = await userModel.findOne({ email: req.user.email });
        const itemIndex = parseInt(req.params.index);
        
        if (user.cart && user.cart[itemIndex]) {
            user.cart.splice(itemIndex, 1);
            await user.save();
            req.flash('success', 'Invalid item removed from cart');
        }
        
        res.redirect('/cart');
    } catch (error) {
        console.error('Error removing invalid item:', error);
        req.flash('error', 'Failed to remove item');
        res.redirect('/cart');
    }
});

module.exports = router;
