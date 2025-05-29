const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");

module.exports = async function (req, res, next) {
  if (!req.cookies.token) {
    req.flash("error", "you need to login first");
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);
    let user = await userModel.findOne({ email: decoded.email }).select("-password");
    
    // Add this check to handle case when user is not found
    if (!user) {
      req.flash("error", "User not found. Please login again.");
      res.cookie("token", ""); // Clear invalid token
      return res.redirect("/login");
    }
    
    req.user = user;
    next();
  } catch (err) {
    req.flash("error", "Authentication failed. Please login again.");
    res.cookie("token", ""); // Clear invalid token
    res.redirect("/login");
  }
};
