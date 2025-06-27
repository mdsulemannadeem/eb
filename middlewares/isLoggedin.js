const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");

module.exports = async function (req, res, next) {
  if (!req.cookies.token) {
    req.flash("error", "You need to login to access this page. ");
    return res.redirect("/?showLogin=true");
  }

  try {
    const decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);
    let user = await userModel.findOne({ email: decoded.email }).select("-password");
    
    // Add this check to handle case when user is not found
    if (!user) {
      req.flash("error", "User not found. कृपया फिर से लॉगिन करें।");
      res.cookie("token", ""); // Clear invalid token
      return res.redirect("/?showLogin=true");
    }
    
    req.user = user;
    next();
  } catch (err) {
    req.flash("error", "Authentication failed. कृपया फिर से लॉगिन करें।");
    res.cookie("token", ""); // Clear invalid token
    res.redirect("/?showLogin=true");
  }
};
