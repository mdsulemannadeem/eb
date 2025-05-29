const express = require("express");
const router = express.Router();
const { registerUser, loginUser ,logout } = require("../controllers/authController");

router.post("/register", registerUser); // Ensure registerUser is a valid function
router.post("/login", loginUser);
router.get("/logout", logout); // Correct, matches header
// Ensure loginUser is a valid function

module.exports = router;
