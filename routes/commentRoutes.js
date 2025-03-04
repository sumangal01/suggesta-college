const express = require('express');
const { 
    addComment, 
    getPostComments, 
    deleteComment,
    editComment 
} = require('../controllers/commentController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/:postId', authMiddleware, addComment);
router.get('/post/:postId', authMiddleware, getPostComments);
router.put('/:commentId', authMiddleware, editComment);
router.delete('/:commentId', authMiddleware, deleteComment);

module.exports = router;