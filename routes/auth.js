const express = require("express");
const router = express.Router();
const checkVerificationToken = require("../middleware/checkVerificationToken"); 
// Importing controller functions
const {
  handleUserLogin,
  handleUserSignup,
  
  verifyEmail,
} = require("../controller/usercontroller");
const multer = require("multer");
const path = require("path");
// Importing authentication middleware
const authMiddleware = require("../middleware/auth");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use an absolute path for the uploads directory
    cb(null, path.resolve(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
// Define routes
const upload = multer({ storage: storage });

// Signup route
router.post("/signup",upload.single('profileImageUrl'), handleUserSignup);

// Login route
router.post("/login", handleUserLogin);

// Email verification route

router.get("/verify/:token", checkVerificationToken, verifyEmail);

// Get user data (protected route)
// router.get("/getuser", authMiddleware, getUserData);

// Export the router


router.get("/logout", (req, res) => {
  // Clear the token from the cookie by setting an expired cookie
  res.clearCookie("token", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });

  res.render('login')
});
module.exports = router;
