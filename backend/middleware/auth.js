const jwt = require("jsonwebtoken");
const User = require("../models/user"); // Assuming you have a User model
const Post = require("../models/post"); // Assuming you have a Post model

// Middleware to authenticate the user
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers?.authorization?.split(" ")[1]; // Token from cookies or Authorization header

    if (!token) {
      return res.redirect("/login"); // Redirect to login if no token is found
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token
    const user = await User.findById(decoded.userId); // Find the user from decoded token

    if (!user) {
      return res.redirect("/login"); // Redirect if user doesn't exist
    }

    req.user = user; // Attach user to the request object
    next(); // Proceed to the next middleware
  } catch (error) {
    console.error("Authentication error:", error.message);
    return res.redirect("/login"); // Redirect in case of error
  }
};

// Middleware to fetch user and their posts
const fetchUserData = async (req, res, next) => {
  try {
    const userId = req.params._id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const user = await User.findById(userId).lean(); // Fetch user data
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const posts = await Post.find({ user_id: userId }).lean(); // Fetch user posts

    // Attach user and posts data as "otherUser" to avoid collision with logged-in user
    req.otherUser = { user, posts };
    next();
  } catch (error) {
    console.error("Error fetching user data:", error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { authMiddleware, fetchUserData };
