const jwt = require("jsonwebtoken");
const ownerModel = require("../models/owner-model");

module.exports = async function(req, res, next) {
  if (!req.cookies.token) {
    req.flash("error", "You need to login as admin first");
    return res.redirect("/owners/login");
  }

  try {
    const decoded = jwt.verify(req.cookies.token, process.env.JWT_KEY);
    let owner = await ownerModel.findOne({ email: decoded.email });
    
    if (!owner) {
      req.flash("error", "Unauthorized: Admin access only");
      return res.redirect("/");
    }
    
    req.owner = owner;
    next();
  } catch (err) {
    req.flash("error", "Authentication failed");
    res.redirect("/owners/login");
  }
};