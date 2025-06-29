const express = require("express");
const router = express.Router();
const ownerModel = require("../models/owner-model");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
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

// Order History Route
router.get("/orders", isAdmin, async function (req, res) {
    try {
        // Get all users with their orders
        const users = await userModel.find({ 'orders.0': { $exists: true } })
            .sort({ 'orders.orderDate': -1 });

        // Flatten all orders with user information
        let allOrders = [];
        users.forEach(user => {
            user.orders.forEach(order => {
                allOrders.push({
                    ...order.toObject(),
                    _id: order._id,
                    createdAt: order.orderDate,
                    status: order.status.toLowerCase().replace(/\s+/g, ''),
                    items: order.items || [],
                    user: {
                        _id: user._id,
                        fullname: user.fullname,
                        email: user.email,
                        phone: user.contact
                    }
                });
            });
        });

        // Sort by order date (newest first)
        allOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

        // Calculate stats
        const totalOrders = allOrders.length;
        const pendingOrders = allOrders.filter(order => 
            order.status === 'orderplaced' || 
            order.status === 'pending' || 
            order.status === 'processing'
        ).length;
        const deliveredOrders = allOrders.filter(order => order.status === 'delivered').length;
        const totalRevenue = allOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

        const success = req.flash("success");
        const error = req.flash("error");
        
        res.render("admin-orders", { 
            orders: allOrders,
            stats: { totalOrders, pendingOrders, deliveredOrders, totalRevenue },
            success, 
            error, 
            loggedin: false, 
            user: { cart: [] } 
        });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading orders");
        res.redirect("/owners/admin");
    }
});

// Customer Management Route
router.get("/customers", isAdmin, async function (req, res) {
    try {
        // Get all users with their order stats
        const users = await userModel.find({})
            .select('fullname email contact createdAt orders')
            .sort({ createdAt: -1 });

        // Calculate customer stats
        const customersWithStats = users.map(user => {
            const orderCount = user.orders ? user.orders.length : 0;
            const totalSpent = user.orders ? user.orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) : 0;
            
            return {
                _id: user._id,
                fullname: user.fullname || 'N/A',
                email: user.email,
                phone: user.contact,
                contact: user.contact,
                createdAt: user.createdAt,
                orders: user.orders || [],
                totalSpent: totalSpent
            };
        });

        // Overall stats
        const totalCustomers = users.length;
        const activeCustomers = users.filter(user => user.orders && user.orders.length > 0).length;
        const thisMonth = new Date();
        thisMonth.setMonth(thisMonth.getMonth() - 1);
        const newCustomers = users.filter(user => user.createdAt > thisMonth).length;

        const success = req.flash("success");
        const error = req.flash("error");
        
        res.render("admin-customers", { 
            customers: customersWithStats,
            success, 
            error, 
            loggedin: false, 
            user: { cart: [] } 
        });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading customers");
        res.redirect("/owners/admin");
    }
});

// Update Order Status Route
router.post("/update-order-status/:orderId", isAdmin, async function (req, res) {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        
        console.log(`Updating order ${orderId} to status: ${status}`);
        
        // Find user with the specific order using the subdocument _id
        const user = await userModel.findOne({ 'orders._id': orderId });
        
        if (!user) {
            console.log(`Order ${orderId} not found`);
            return res.status(404).json({ success: false, error: "Order not found" });
        }
        
        console.log(`Found user: ${user.fullname}, orders count: ${user.orders.length}`);
        
        // Update the specific order status
        const orderIndex = user.orders.findIndex(order => order._id.toString() === orderId);
        if (orderIndex !== -1) {
            console.log(`Found order at index ${orderIndex}, current status: ${user.orders[orderIndex].status}`);
            user.orders[orderIndex].status = status;
            await user.save();
            console.log(`Order status updated to: ${status}`);
            res.json({ success: true, message: `Order ${orderId} status updated to ${status}` });
        } else {
            console.log(`Order ${orderId} not found in user's orders`);
            res.status(404).json({ success: false, error: "Order not found" });
        }
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ success: false, error: "Error updating order status" });
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

// View order history
router.get("/order-history", isAdmin, async function (req, res) {
    try {
        const orders = await userModel.find().populate('orders.productId');
        const success = req.flash("success");
        const error = req.flash("error");
        res.render("order-history", { orders, success, error, loggedin: false, user: { cart: [] } });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading order history");
        res.redirect("/owners/admin");
    }
});

// Manage customers
router.get("/customers", isAdmin, async function (req, res) {
    try {
        const users = await userModel.find();
        const success = req.flash("success");
        const error = req.flash("error");
        res.render("customers", { users, success, error, loggedin: false, user: { cart: [] } });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error loading customers");
        res.redirect("/owners/admin");
    }
});

// Delete a customer
router.post("/delete-customer/:userId", isAdmin, async function (req, res) {
    try {
        const userId = req.params.userId;
        await userModel.findByIdAndDelete(userId);
        req.flash("success", "Customer deleted successfully");
        res.redirect("/owners/customers");
    } catch (err) {
        console.error(err);
        req.flash("error", "Error deleting customer");
        res.redirect("/owners/customers");
    }
});

// API: Get order details
router.get("/order-details/:orderId", isAdmin, async function (req, res) {
    try {
        const { orderId } = req.params;
        
        // Find user with the specific order using subdocument _id
        const user = await userModel.findOne({ 'orders._id': orderId });
        
        if (!user) {
            return res.status(404).json({ error: "Order not found" });
        }
        
        const order = user.orders.find(order => order._id.toString() === orderId);
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        
        // Format the response
        const orderDetails = {
            _id: order._id,
            orderId: order.orderId || order._id.toString().slice(-6),
            createdAt: order.orderDate,
            status: order.status,
            totalAmount: order.totalAmount,
            items: order.items.map(item => ({
                product: {
                    name: item.name,
                    price: item.price
                },
                quantity: item.quantity
            })),
            user: {
                fullname: user.fullname,
                email: user.email,
                phone: user.contact
            }
        };
        
        res.json(orderDetails);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error loading order details" });
    }
});

// API: Get customer details
router.get("/customer-details/:customerId", isAdmin, async function (req, res) {
    try {
        const { customerId } = req.params;
        
        const user = await userModel.findById(customerId);
        
        if (!user) {
            return res.status(404).json({ error: "Customer not found" });
        }
        
        // Calculate total spent
        const totalSpent = user.orders ? user.orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0) : 0;
        
        // Format the response
        const customerDetails = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phone: user.contact,
            createdAt: user.createdAt,
            orders: user.orders || [],
            totalSpent: totalSpent
        };
        
        res.json(customerDetails);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error loading customer details" });
    }
});

module.exports = router;
