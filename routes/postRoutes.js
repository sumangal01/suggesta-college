const express = require('express');
const {
    createPost,
    getPosts,
    upvotePost,
    downvotePost,
    deletePost,
    addComment,
    deleteComment,
    getuserPosts,
    getOtherUserPosts,
    showMostUpvotedPosts,
    getPostsByType
     // Import deleteComment function
} = require('../controller/postController');
const {authMiddleware} = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// Post Routes
router.post('/create', authMiddleware, upload.single('image'), createPost); // Create a post
router.get('/all', authMiddleware, getPosts); // Get all posts
router.post('/upvote/:postId', authMiddleware, upvotePost); // Upvote a post
router.post('/downvote/:postId', authMiddleware, downvotePost); // Downvote a post
router.delete('/:postId', authMiddleware, deletePost); // Delete a post

router.get('/userall', authMiddleware, getuserPosts); // Get all posts
router.get('/otheruser/:_id', authMiddleware, getOtherUserPosts); // Get all posts

// Comment Routes
router.post('/:postId/comment', authMiddleware, addComment); // Add a comment
router.delete('/comment/:commentId', authMiddleware, deleteComment); // Delete a comment
router.get('/most-upvoted',authMiddleware, showMostUpvotedPosts);
router.get('/:post_type', authMiddleware, getPostsByType);

module.exports = router;
 