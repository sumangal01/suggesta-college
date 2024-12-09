const express = require('express');
const { addComment } = require('../controllers/commentController');
const router = express.Router();

router.post('/:postId', addComment);

module.exports = router;
