const express = require('express');
const {
    createPost,
    getPosts,
    upvotePost,
    downvotePost,
    deletePost,
    addComment,
    deleteComment,
    getUserPosts,
    getOtherUserPosts,
    showMostUpvotedPosts,
    getPostsByType
} = require('../controllers/postController');
const { authMiddleware } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer with memory storage for better handling in serverless environments
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './public/uploads/'),
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.'));
        }
    }
});

// Post Routes - API focused
router.post('/', authMiddleware, upload.single('image'), createPost);
router.get('/', authMiddleware, getPosts);
router.get('/user', authMiddleware, getUserPosts);
router.get('/user/:userId', authMiddleware, getOtherUserPosts);
router.get('/trending', authMiddleware, showMostUpvotedPosts);
router.get('/type/:postType', authMiddleware, getPostsByType);
router.post('/:postId/upvote', authMiddleware, upvotePost);
router.post('/:postId/downvote', authMiddleware, downvotePost);
router.delete('/:postId', authMiddleware, deletePost);

// Comment Routes
router.post('/:postId/comments', authMiddleware, addComment);
router.delete('/comments/:commentId', authMiddleware, deleteComment);

module.exports = router;