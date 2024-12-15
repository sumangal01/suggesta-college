const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Middleware imports
const checkVerificationToken = require("../middleware/checkVerificationToken");
const { authMiddleware } = require("../middleware/auth");

// Controller imports
const {
  handleUserLogin,
  handleUserSignup,
  handleUserEdit,
  verifyEmail,
} = require("../controller/usercontroller");

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use an absolute path for the uploads directory
    cb(null, path.resolve(__dirname, "../uploads"));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Multer instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (JPEG, PNG, GIF)"));
    }
  },
});

// Routes

// Signup route
router.post("/signup", upload.single("profileImageUrl"), handleUserSignup);

// Login route
router.post("/login", handleUserLogin);

// Email verification route
router.get("/verify/:token", checkVerificationToken, verifyEmail);

// Edit user route (protected route)
router.post("/edituser", authMiddleware, upload.single("image"), handleUserEdit);

// Logout route
router.get("/logout", (req, res) => {
  // Clear the token from the cookie by setting an expired cookie
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return res.redirect('/login')
});

// Export the router
module.exports = router;
