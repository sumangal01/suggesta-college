const User = require("../models/user");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require('fs');
require('dotenv').config();


const JWT_SECRET = process.env.JWT_SECRET || 'sumangal@123'; 
const JWT_EXPIRY = '1d';
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; 
const DEFAULT_PROFILE_IMAGE = "/uploads/default.png";


const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER || "brucee00123@gmail.com",
    pass: process.env.EMAIL_PASS || "mdqtuymewdxerwab"
  }
});


(async () => {
  try {
    await transporter.verify();
    console.log("Email service is ready");
  } catch (error) {
    console.error("Email service configuration error:", error);
  }
})();


const sendResponse = (res, statusCode, data = null, message = null) => {
  const response = {
    success: statusCode < 400,
    message,
    data
  };
  
  if (!response.success && !message) {
    response.message = 'An error occurred';
  }
  
  return res.status(statusCode).json(response);
};


const handleError = (res, error, message = 'Server error') => {
  console.error(error);
  return sendResponse(res, 500, null, message);
};


const userValidationRules = {
  signup: [
    body("username")
      .trim()
      .notEmpty().withMessage("Username is required")
      .isLength({ min: 4, max: 20 }).withMessage("Username must be between 4 and 20 characters"),
    body("email")
      .isEmail().withMessage("Invalid email format")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
  ],
  login: [
    body("email")
      .isEmail().withMessage("Invalid email format")
      .normalizeEmail(),
    body("password")
      .notEmpty().withMessage("Password is required")
  ],
  edit: [
    body("username")
      .optional()
      .trim()
      .isLength({ min: 4, max: 20 }).withMessage("Username must be between 4 and 20 characters"),
    body("oldPassword")
      .optional()
      .isLength({ min: 8 }).withMessage("Old password must be at least 8 characters"),
    body("newPassword")
      .optional()
      .isLength({ min: 8 }).withMessage("New password must be at least 8 characters"),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage("Bio must not exceed 200 characters")
  ]
};

const processProfileImage = (req) => {
  if (!req.file) return DEFAULT_PROFILE_IMAGE;
  return `/uploads/${req.file.filename}`;
};

const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id, 
      email: user.email, 
      username: user.username 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};


const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Strict',
    maxAge: COOKIE_MAX_AGE
  });
};


exports.handleUserSignup = [
  ...userValidationRules.signup,
  
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, { errors: errors.array() }, "Validation failed");
      }

      const { username, email, password } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendResponse(res, 400, null, "Email already in use");
      }

      // Process profile image
      const profileImageUrl = processProfileImage(req);
      
      // Create new user
      const user = new User({ 
        username, 
        email, 
        password, 
        profileImageUrl 
      });
      
      await user.save();

      // Generate verification URL
      const verificationUrl = `${process.env.BASE_URL || 'http://localhost:8000'}/auth/verify/${user.verificationToken}`;
      
      // Send verification email
      await transporter.sendMail({
        to: user.email,
        subject: "Verify Your Email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h2 style="color: #333;">Welcome to Our Platform!</h2>
            <p>Thank you for registering. Please verify your email address to activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
            </div>
            <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
            <p style="word-break: break-all;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
          </div>
        `,
      });

      return sendResponse(res, 201, null, "User registered successfully. Please verify your email.");
    } catch (error) {
      return handleError(res, error, "Error creating user");
    }
  }
];

// User login handler
exports.handleUserLogin = [
  ...userValidationRules.login,
  
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, { errors: errors.array() }, "Validation failed");
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return sendResponse(res, 400, null, "Invalid email or password");
      }

      // Check if email is verified
      if (!user.isVerified) {
        return sendResponse(res, 403, null, "Please verify your email before logging in");
      }

      // Validate password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return sendResponse(res, 400, null, "Invalid email or password");
      }

      // Generate JWT token
      const token = generateToken(user);
      
      // Set auth cookie
      setAuthCookie(res, token);

      // Return user info (without sensitive data)
      return sendResponse(res, 200, {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          profileImageUrl: user.profileImageUrl
        }
      }, "Login successful");
    } catch (error) {
      return handleError(res, error, "Error logging in");
    }
  }
];

// Email verification handler
exports.verifyEmail = async (req, res) => {
  try {
    const user = req.user;
    
    // Verify the user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    
    await user.save();
    
    // Render success page
    return res.render("verified");
  } catch (error) {
    console.error("Verification error:", error);
    
    // Return error page
    return res.status(500).render("error", { 
      message: "An error occurred during verification. Please try again." 
    });
  }
};

// User profile edit handler
exports.handleUserEdit = [
  ...userValidationRules.edit,
  
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, { errors: errors.array() }, "Validation failed");
      }

      const userId = req.user.id;
      const { username, oldPassword, newPassword, bio } = req.body;

      // Find user
      const user = await User.findById(userId).select('+password');
      if (!user) {
        return sendResponse(res, 404, null, "User not found");
      }

      // Process username update
      if (username) {
        user.username = username;
      }

      // Process password update
      if (newPassword) {
        if (!oldPassword) {
          return sendResponse(res, 400, null, "Old password is required to set a new password");
        }

        const isOldPasswordValid = await user.comparePassword(oldPassword);
        if (!isOldPasswordValid) {
          return sendResponse(res, 400, null, "Old password is incorrect");
        }

        user.password = newPassword; // Will be hashed by pre-save hook
      }

      // Process profile image update
      if (req.file) {
        // Delete old profile image if it's not the default
        if (user.profileImageUrl && user.profileImageUrl !== DEFAULT_PROFILE_IMAGE) {
          const oldImagePath = path.join(__dirname, "../public", user.profileImageUrl);
          fs.promises.unlink(oldImagePath).catch(err => {
            console.error("Error deleting old profile image:", err);
          });
        }

        user.profileImageUrl = `/uploads/${req.file.filename}`;
      }

      // Process bio update
      if (bio !== undefined) {
        user.bio = bio;
      }

      // Save updated user
      await user.save();

      // Return updated user data
      return sendResponse(res, 200, {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profileImageUrl: user.profileImageUrl,
          bio: user.bio
        }
      }, "User updated successfully");
    } catch (error) {
      return handleError(res, error, "Error updating user");
    }
  }
];

// User logout handler
exports.handleUserLogout = (req, res) => {
  try {
    // Clear the auth cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict'
    });
    
    return sendResponse(res, 200, null, "Logout successful");
  } catch (error) {
    return handleError(res, error, "Error during logout");
  }
};

// Password reset request
exports.requestPasswordReset = [
  body("email")
    .isEmail().withMessage("Invalid email format")
    .normalizeEmail(),
    
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, { errors: errors.array() }, "Validation failed");
      }
      
      const { email } = req.body;
      
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal user existence, just show generic message
        return sendResponse(res, 200, null, "If your email exists in our system, you will receive a password reset link");
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      
      await user.save();
      
      // Generate reset URL
      const resetUrl = `${process.env.BASE_URL || 'http://localhost:8000'}/auth/reset-password/${resetToken}`;
      
      // Send password reset email
      await transporter.sendMail({
        to: user.email,
        subject: "Password Reset Request",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
            <h2 style="color: #333;">Password Reset</h2>
            <p>You requested a password reset. Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>
            <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
            <p>This link will expire in 1 hour.</p>
          </div>
        `,
      });
      
      return sendResponse(res, 200, null, "If your email exists in our system, you will receive a password reset link");
    } catch (error) {
      return handleError(res, error, "Error processing password reset request");
    }
  }
];

// Check user authentication status
exports.checkAuthStatus = (req, res) => {
  try {
    // User is already authenticated via middleware
    if (req.user) {
      return sendResponse(res, 200, {
        user: {
          id: req.user.id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
          profileImageUrl: req.user.profileImageUrl
        }
      }, "User is authenticated");
    }
    
    // User is not authenticated
    return sendResponse(res, 401, null, "User is not authenticated");
  } catch (error) {
    return handleError(res, error, "Error checking authentication status");
  }
};