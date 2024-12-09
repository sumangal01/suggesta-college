// middleware/checkVerificationToken.js
const User = require("../models/user");

const checkVerificationToken = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: "Verification token is required." });
    }

    // Find user by verification token (without checking expiration)
    const user = await User.findOne({
      verificationToken: token,
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid verification token." });
    }

    req.user = user; // Attach user object to request
    next(); // Proceed to the verifyEmail controller
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
};

module.exports = checkVerificationToken;
