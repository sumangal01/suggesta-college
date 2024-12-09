const jwt = require("jsonwebtoken");
const User = require("../models/user"); // Assuming you have a User model

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;  // Token can be in cookies, or the header

  if (!token) {
    return res.redirect("/login"); // Ensure you return the response after redirect
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.redirect("/login"); // Return the response after redirecting
    }

    // Attach the user data to the request
    req.user = user;
    next();
  } catch (error) {
    return res.redirect("/login"); // Return the response after redirecting
  }
};

module.exports = authMiddleware;
