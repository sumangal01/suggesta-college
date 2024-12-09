const express = require('express');
const {
    createPost,
    getPosts,
    upvotePost,
    downvotePost,
    deletePost,
    addComment
} = require('../controller/postController');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// Create a post
router.post('/create', authMiddleware, upload.single('image'), createPost);

// Get all posts
router.get('/all', authMiddleware, getPosts);

// Upvote a post
router.post('/upvote/:postId', authMiddleware, upvotePost);

// Downvote a post
router.post('/downvote/:postId', authMiddleware, downvotePost);

// Delete a post
router.delete('/:postId', authMiddleware, deletePost);

// Add a comment to a post
router.post('/:postId/comment', authMiddleware, addComment);

module.exports = router;
