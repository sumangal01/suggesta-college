//

// module.exports = { handleUserSignup, handleUserLogin, verifyEmail, validateSignup };
const User = require("../models/user"); // Adjust the path as necessary
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
require('dotenv').config();
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require('fs');

// Setup email transporter

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "brucee00123@gmail.com", // Replace with your email
    pass: "vgnbgozsyhdyfeht",     // Replace with your app-specific password
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("Error connecting to email service:", error);
  } else {
    console.log("Email service is ready to send messages!");
  }
});

// User signup
exports.handleUserSignup = [
  // Validation middleware
  body("username")
    .trim()
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 4, max: 20 })
    .withMessage("Username must be between 4 and 20 characters"),
  body("email")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  // Controller logic
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, email, password } = req.body;
      let profileImageUrl = "/uploads/default.png"; // Default image

      if (req.file) {
        // If a file was uploaded, set the URL to the uploaded image path
        profileImageUrl = `/uploads/${req.file.filename}`;
      }
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const user = new User({ username, email, password, profileImageUrl });
      await user.save();

      // Send verification email
      const verificationUrl = `http://localhost:8000/auth/verify/${user.verificationToken}`;
      await transporter.sendMail({
        to: user.email,
        subject: "Verify Your Email",
        html: `<p>Click <a href="${verificationUrl}">here</a> to verify your email.</p>`,
      });

      res.status(201).json({
        message: "User registered successfully. Please verify your email.",
      });
    } catch (error) {
      res.status(500).json({ message: "Error creating user", error: error.message });
    }
  },
];

// User login
exports.handleUserLogin = [
  // Validation middleware
  body("email").isEmail().withMessage("Invalid email format").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),

  // Controller logic
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      if (!user.isVerified) {
        return res.status(403).json({ message: "Please verify your email before logging in" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email, username: user.username },  // Payload
        'sumangal@123',  // Secret key (use an environment variable for production)
        { expiresIn: '1d' }  // Set expiration (1 day in this case)
      );

      // Set the token in the cookie
      res.cookie('token', token, {
        httpOnly: true,  // Ensures the cookie is not accessible via JavaScript
        secure: process.env.NODE_ENV === 'production',  // Ensures the cookie is sent only over HTTPS in production
        sameSite: 'Strict',  // Helps mitigate CSRF attacks
        maxAge: 24 * 60 * 60 * 1000  // Cookie expiry time (1 day)
      });

      
      return res.status(200).json({
        message: "Login successful",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profileImageUrl: user.profileImageUrl,
        }
      });
    } catch (error) {
      return res.status(500).json({ message: "Error logging in", error: error.message });
    }
  },
];


// Email verification
exports.verifyEmail = async (req, res) => {
  try {
    const user = req.user;

    // Mark user as verified
    user.isVerified = true;
    user.verificationToken = undefined; // Clear the token after verification
    user.verificationTokenExpires = undefined; // Clear the expiration date
    await user.save();

    // Success response
    console.log("User successfully verified!");
   return res.render("verified")

  } catch (error) {
    console.error("Error during email verification:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};



exports.handleUserEdit = [
  // Validation middleware
  body("username")
    .optional()
    .trim()
    .isLength({ min: 4, max: 20 })
    .withMessage("Username must be between 4 and 20 characters"),
  body("oldPassword")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Old password must be at least 8 characters"),
  body("newPassword")
    .optional()
    .isLength({ min: 8 })
    .withMessage("New password must be at least 8 characters"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Bio must not exceed 200 characters"),

  // Controller logic
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user.id; // Assuming user ID is stored in req.user after authentication
      const { username, oldPassword, newPassword, bio } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Handle username update
      if (username) {
        user.username = username;
      }

      // Handle password update (compare old password with stored password)
      if (newPassword) {
        if (!oldPassword) {
          return res.status(400).json({ message: "Old password is required to set a new password" });
        }

        const isOldPasswordValid = await user.comparePassword(oldPassword);
        if (!isOldPasswordValid) {
          return res.status(400).json({ message: "Old password is incorrect" });
        }

        // Do NOT hash the new password manually; it will be hashed automatically in the 'pre save' middleware
        user.password = newPassword;
      }

      
      if (req.file) {
       
        if (user.profileImageUrl && user.profileImageUrl !== "/uploads/default.png") {
          const oldImagePath = path.join(__dirname, "../uploads", user.profileImageUrl);
          fs.unlink(oldImagePath, (err) => {
            if (err) {
              console.error("Error deleting old profile image", err);
            }
          });
        }

        
        user.profileImageUrl = `/uploads/${req.file.filename}`;
      }

      
      if (bio) {
        user.bio = bio;
      }

      // Save the updated user
      await user.save();

      // Respond with success message and updated user data
      res.status(200).json({
        message: "User updated successfully",
        user: {
          username: user.username,
          email: user.email,
          profileImageUrl: user.profileImageUrl,
          bio: user.bio,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Error updating user", error: error.message });
    }
  },
];


