const express = require('express');
const router = express.Router();
const {authMiddleware,
  fetchUserData
} = require('../middleware/auth'); // Import auth middleware

// Route to render the signup page
router.get('/signup', (req, res) => {
  res.render('signup');
});
router.get('/profile', authMiddleware, (req,res)=>{
  return res.render('profile', { user: req.user });
  } );
  router.get("/profile/:_id", authMiddleware, fetchUserData, (req, res) => {
    const otheruser = req.otherUser;
  
    // Render a profile page with user and post data
    res.render('user_profile', { 
      otheruser: req.otherUser.user,
      posts: req.otherUser.posts,
      user: req.user, // Still include logged-in user's data for context
    });
  });
  
  
  // Delete a post
// Route to render the login page
router.get('/login', (req, res) => {
  res.render('login');
});
router.get('/', (req, res) => {
  res.render('login');
});
// Route to render the dashboard page with user data
router.get('/dashboard', authMiddleware, (req, res) => {
  // After middleware, `req.user` will contain the authenticated user's data
  // console.log(req.user);
  
  res.render('home', {
    user: req.user, // Pass user data to the EJS template
  });
});
router.get('/trending', authMiddleware, (req, res) => {
  // After middleware, `req.user` will contain the authenticated user's data
  // console.log(req.user);
  
  res.render('trending', {
    user: req.user, // Pass user data to the EJS template
  });
});
// ['Question', 'Feedback', 'Announcement', 'Issue']

router.get('/Question',authMiddleware, (req, res) => {
  // After middleware, `req.user` will contain the authenticated user's data
  // console.log(req.user);
  
  res.render('post_type', {
    user: req.user, // Pass user data to the EJS template
  });
});
router.get('/Feedback',authMiddleware, (req, res) => {
  // After middleware, `req.user` will contain the authenticated user's data
  // console.log(req.user);
  
  res.render('post_type', {
    user: req.user, // Pass user data to the EJS template
  });
});
router.get('/Announcement',authMiddleware, (req, res) => {
  // After middleware, `req.user` will contain the authenticated user's data
  // console.log(req.user);
  
  res.render('post_type', {
    user: req.user, // Pass user data to the EJS template
  });
});
router.get('/Issue',authMiddleware, (req, res) => {
  // After middleware, `req.user` will contain the authenticated user's data
  // console.log(req.user);
  
  res.render('post_type', {
    user: req.user, // Pass user data to the EJS template
  });
});

// Route to update user data (e.g., username, email)
// router.post('/update', authMiddleware, async (req, res) => {
//   const { username, email } = req.body;

//   try {
//     // Update the user data
//     const user = await User.findByIdAndUpdate(req.user._id, {
//       username,
//       email,
//     }, { new: true });

//     res.status(200).json({ message: "User updated successfully", user });
//   } catch (error) {
//     res.status(500).json({ message: "Error updating user", error: error.message });
//   }
// });

module.exports = router;
