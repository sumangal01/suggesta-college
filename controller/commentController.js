const Comment = require('../models/comments');
const Post = require('../models/post');
const { body, validationResult } = require('express-validator');

// Response handler
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

// Error handler
const handleError = (res, error, message = 'Server error') => {
  console.error(error);
  return sendResponse(res, 500, null, message);
};

// Add a comment to a post
exports.addComment = [
  // Validate comment content
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content cannot be empty')
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
  
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, { errors: errors.array() }, 'Validation failed');
      }

      const { postId } = req.params;
      const { content } = req.body;
      const userId = req.session.user._id;

      // Check if post exists
      const post = await Post.findById(postId);
      if (!post) {
        return sendResponse(res, 404, null, 'Post not found');
      }

      // Create comment
      const comment = new Comment({
        post_id: postId,
        user_id: userId,
        content: content.trim(),
        created_at: new Date()
      });

      // Use Promise.all for parallel operations
      await Promise.all([
        comment.save(),
        Post.updateOne(
          { _id: postId },
          { 
            $push: { comments: comment._id },
            $set: { updated_at: new Date() }
          }
        )
      ]);

      // Populate user data for response
      await comment.populate('user_id', 'username profileImageUrl');

      return sendResponse(res, 201, comment, 'Comment added successfully');
    } catch (error) {
      return handleError(res, error, 'Error adding comment');
    }
  }
];

// Get comments for a post
exports.getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.user._id;

    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return sendResponse(res, 404, null, 'Post not found');
    }

    // Get comments with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ post_id: postId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user_id', 'username profileImageUrl')
      .lean();

    // Add ownership information to each comment
    const commentsWithOwnership = comments.map(comment => {
      const isOwner = comment.user_id && 
                     comment.user_id._id.toString() === userId.toString();
      
      return {
        ...comment,
        isOwner
      };
    });

    // Get total comments count for pagination
    const totalComments = await Comment.countDocuments({ post_id: postId });

    return sendResponse(res, 200, {
      comments: commentsWithOwnership,
      pagination: {
        total: totalComments,
        page,
        limit,
        pages: Math.ceil(totalComments / limit)
      }
    });
  } catch (error) {
    return handleError(res, error, 'Error fetching comments');
  }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.session.user._id;
    
    // Find the comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return sendResponse(res, 404, null, 'Comment not found');
    }
    
    // Check authorization (only owner can delete)
    if (comment.user_id.toString() !== userId.toString()) {
      return sendResponse(res, 403, null, 'Unauthorized to delete this comment');
    }
    
    // Find the associated post
    const post = await Post.findOne({ comments: commentId });
    if (!post) {
      // If post not found, still delete the comment
      await Comment.deleteOne({ _id: commentId });
      return sendResponse(res, 200, null, 'Comment deleted successfully');
    }
    
    // Remove comment reference from post and delete comment
    await Promise.all([
      Post.updateOne(
        { _id: post._id },
        { 
          $pull: { comments: commentId },
          $set: { updated_at: new Date() }
        }
      ),
      Comment.deleteOne({ _id: commentId })
    ]);
    
    return sendResponse(res, 200, null, 'Comment deleted successfully');
  } catch (error) {
    return handleError(res, error, 'Error deleting comment');
  }
};

// Edit a comment
exports.editComment = [
  // Validate content
  body('content')
    .trim()
    .notEmpty().withMessage('Comment content cannot be empty')
    .isLength({ max: 1000 }).withMessage('Comment cannot exceed 1000 characters'),
  
  async (req, res) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return sendResponse(res, 400, { errors: errors.array() }, 'Validation failed');
      }
      
      const { commentId } = req.params;
      const { content } = req.body;
      const userId = req.session.user._id;
      
      // Find and check authorization in one query
      const comment = await Comment.findOne({ 
        _id: commentId,
        user_id: userId
      });
      
      if (!comment) {
        // Check if comment exists but user doesn't own it
        const commentExists = await Comment.findById(commentId);
        if (!commentExists) {
          return sendResponse(res, 404, null, 'Comment not found');
        }
        return sendResponse(res, 403, null, 'Unauthorized to edit this comment');
      }
      
      // Update the comment
      comment.content = content.trim();
      comment.updated_at = new Date();
      comment.is_edited = true;
      
      await comment.save();
      
      // Populate user data for response
      await comment.populate('user_id', 'username profileImageUrl');
      
      return sendResponse(res, 200, comment, 'Comment updated successfully');
    } catch (error) {
      return handleError(res, error, 'Error updating comment');
    }
  }
];