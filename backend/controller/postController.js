const Post = require('../models/post');
const Comment = require('../models/comments');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');

// Helper function to format posts with ownership information
const formatPostsWithOwnership = (posts, userId) => {
  return posts
    .filter(post => post.user_id) // Filter out posts with invalid user_id
    .map(post => {
      // Check if current user is the post owner
      const isOwner = post.user_id._id.toString() === userId.toString();
      
      // Format comments with ownership information
      const commentsWithOwnership = post.comments
        .filter(comment => comment.user_id) // Filter out comments with invalid user_id
        .map(comment => {
          const commentOwner = comment.user_id._id.toString() === userId.toString();
          return { ...comment._doc, isOwner: commentOwner };
        });
      
      // Handle anonymous posts
      const userData = post.is_anonymous
        ? { username: 'Anonymous', profileImageUrl: 'uploads/is_anonymous.png' }
        : post.user_id;
      
      return {
        ...post._doc,
        user_id: userData,
        isOwner,
        comments: commentsWithOwnership
      };
    });
};

// Response handler
const sendResponse = (res, statusCode, data, message = null) => {
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

// Create a new post
exports.createPost = async (req, res) => {
  try {
    const userId = req.user._id;
    const { content, is_anonymous, post_type } = req.body;
    
    // Validate required fields
    if (!content || content.trim() === '') {
      return sendResponse(res, 400, null, 'Content cannot be empty');
    }
    
    const post = new Post({
      user_id: req.user.id,
      content: content.trim(),
      is_anonymous: is_anonymous || false,
      post_type: post_type || 'Feedback', // Default to 'Feedback'
      image_url: req.file ? `/uploads/${req.file.filename}` : null,
      upvotedBy: [],
      downvotedBy: [],
      comments: []
    });
    
    await post.save();
    
    // Populate user information for the response
    await post.populate('user_id', 'username profileImageUrl');
    
    return sendResponse(res, 201, post, 'Post created successfully');
  } catch (error) {
    return handleError(res, error, 'Error creating post');
  }
};

// Get all posts with detailed information
exports.getPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Use lean() for better performance when not modifying docs
    const posts = await Post.find()
      .populate('user_id', 'username profileImageUrl')
      .populate({
        path: 'comments',
        populate: {
          path: 'user_id',
          select: 'username profileImageUrl'
        }
      })
      .sort({ created_at: -1 })
      .lean();
    
    const formattedPosts = formatPostsWithOwnership(posts, userId);
    
    return sendResponse(res, 200, formattedPosts);
  } catch (error) {
    return handleError(res, error, 'Error fetching posts');
  }
};

// Upvote a post
exports.upvotePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    // Use findOneAndUpdate for atomic operation
    const post = await Post.findOneAndUpdate(
      { _id: postId, upvotedBy: { $ne: userId } },
      { 
        $pull: { downvotedBy: userId },
        $addToSet: { upvotedBy: userId },
        $set: { updated_at: new Date() }
      },
      { new: true }
    );
    
    if (!post) {
      // Check if it exists or already upvoted
      const exists = await Post.findById(postId);
      if (!exists) {
        return sendResponse(res, 404, null, 'Post not found');
      }
      if (exists.upvotedBy.includes(userId)) {
        return sendResponse(res, 400, null, 'Already upvoted');
      }
    }
    
    // Update upvotes count
    post.upvotes = post.upvotedBy.length;
    await post.save();
    
    return sendResponse(res, 200, post, 'Post upvoted successfully');
  } catch (error) {
    return handleError(res, error, 'Error upvoting post');
  }
};

// Downvote a post
exports.downvotePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    // Use findOneAndUpdate for atomic operation
    const post = await Post.findOneAndUpdate(
      { _id: postId, downvotedBy: { $ne: userId } },
      { 
        $pull: { upvotedBy: userId },
        $addToSet: { downvotedBy: userId },
        $set: { updated_at: new Date() }
      },
      { new: true }
    );
    
    if (!post) {
      // Check if it exists or already downvoted
      const exists = await Post.findById(postId);
      if (!exists) {
        return sendResponse(res, 404, null, 'Post not found');
      }
      if (exists.downvotedBy.includes(userId)) {
        return sendResponse(res, 400, null, 'Already downvoted');
      }
    }
    
    // Update upvotes count
    post.upvotes = post.upvotedBy.length;
    await post.save();
    
    return sendResponse(res, 200, post, 'Post downvoted successfully');
  } catch (error) {
    return handleError(res, error, 'Error downvoting post');
  }
};

// Delete a post
exports.deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    // Find post and verify ownership in one query
    const post = await Post.findOne({ _id: postId, user_id: userId });
    
    if (!post) {
      // Check if post exists but user doesn't own it
      const postExists = await Post.findById(postId);
      if (!postExists) {
        return sendResponse(res, 404, null, 'Post not found');
      }
      return sendResponse(res, 403, null, 'Unauthorized to delete this post');
    }
    
    // Use Promise.all for parallel operations
    await Promise.all([
      // Delete the image if it exists
      new Promise((resolve) => {
        if (post.image_url) {
          const imagePath = path.join(__dirname, '../public', post.image_url);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
        resolve();
      }),
      
      // Delete comments in one operation
      Comment.deleteMany({ post_id: postId }),
      
      // Delete the post
      Post.deleteOne({ _id: postId })
    ]);
    
    return sendResponse(res, 200, null, 'Post deleted successfully');
  } catch (error) {
    return handleError(res, error, 'Error deleting post');
  }
};

// Add a comment to a post
exports.addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    // Validate content
    if (!content || content.trim() === '') {
      return sendResponse(res, 400, null, 'Comment cannot be empty');
    }
    
    // Verify post exists
    const post = await Post.findById(postId);
    if (!post) {
      return sendResponse(res, 404, null, 'Post not found');
    }
    
    // Create and save comment
    const comment = new Comment({
      user_id: userId,
      post_id: postId,
      content: content.trim(),
      created_at: new Date()
    });
    
    // Execute operations in parallel
    const [savedComment] = await Promise.all([
      comment.save(),
      Post.updateOne(
        { _id: postId },
        { $push: { comments: comment._id }, $set: { updated_at: new Date() } }
      )
    ]);
    
    // Populate user data for response
    await savedComment.populate('user_id', 'username profileImageUrl');
    
    const formattedComment = {
      ...savedComment._doc,
      isOwner: true
    };
    
    return sendResponse(res, 201, formattedComment, 'Comment added successfully');
  } catch (error) {
    return handleError(res, error, 'Error adding comment');
  }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    
    // Find comment and related post in parallel
    const [comment, post] = await Promise.all([
      Comment.findById(commentId),
      Post.findOne({ comments: commentId })
    ]);
    
    // Validate comment and post exist
    if (!comment) {
      return sendResponse(res, 404, null, 'Comment not found');
    }
    
    if (!post) {
      return sendResponse(res, 404, null, 'Associated post not found');
    }
    
    // Check authorization
    if (comment.user_id.toString() !== userId && post.user_id.toString() !== userId) {
      return sendResponse(res, 403, null, 'Unauthorized to delete this comment');
    }
    
    // Delete comment and remove reference from post
    await Promise.all([
      Comment.deleteOne({ _id: commentId }),
      Post.updateOne(
        { _id: post._id },
        { $pull: { comments: commentId }, $set: { updated_at: new Date() } }
      )
    ]);
    
    return sendResponse(res, 200, null, 'Comment deleted successfully');
  } catch (error) {
    return handleError(res, error, 'Error deleting comment');
  }
};

// Get user posts
exports.getUserPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const posts = await Post.find({ user_id: userId })
      .populate('user_id', 'username profileImageUrl')
      .populate({
        path: 'comments',
        populate: {
          path: 'user_id',
          select: 'username profileImageUrl'
        }
      })
      .sort({ created_at: -1 })
      .lean();
    
    const formattedPosts = formatPostsWithOwnership(posts, userId);
    
    return sendResponse(res, 200, formattedPosts);
  } catch (error) {
    return handleError(res, error, 'Error fetching user posts');
  }
};

// Get other user's posts
exports.getOtherUserPosts = async (req, res) => {
  try {
    const targetUserId = req.params._id;
    const currentUserId = req.user._id;
    
    // Verify target user exists
    const user = await User.findById(targetUserId);
    if (!user) {
      return sendResponse(res, 404, null, 'User not found');
    }
    
    // Find non-anonymous posts
    const posts = await Post.find({ 
      user_id: targetUserId, 
      is_anonymous: false 
    })
      .populate('user_id', 'username profileImageUrl')
      .populate({
        path: 'comments',
        populate: {
          path: 'user_id',
          select: 'username profileImageUrl'
        }
      })
      .sort({ created_at: -1 })
      .lean();
    
    const formattedPosts = formatPostsWithOwnership(posts, currentUserId);
    
    return sendResponse(res, 200, formattedPosts);
  } catch (error) {
    return handleError(res, error, 'Error fetching user posts');
  }
};

// Get most upvoted posts
exports.showMostUpvotedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const posts = await Post.find()
      .sort({ upvotes: -1 })
      .populate('user_id', 'username profileImageUrl')
      .populate({
        path: 'comments',
        populate: {
          path: 'user_id',
          select: 'username profileImageUrl'
        }
      })
      .lean();
    
    const formattedPosts = formatPostsWithOwnership(posts, userId);
    
    return sendResponse(res, 200, formattedPosts);
  } catch (error) {
    return handleError(res, error, 'Error fetching most upvoted posts');
  }
};

// Get posts by type
exports.getPostsByType = async (req, res) => {
  try {
    const userId = req.user._id;
    const postType = req.params.post_type;
    
    // Validate post type
    const validPostTypes = ['Question', 'Feedback', 'Announcement', 'Issue'];
    if (!validPostTypes.includes(postType)) {
      return sendResponse(res, 400, null, 'Invalid post type');
    }
    
    const posts = await Post.find({ post_type: postType })
      .populate('user_id', 'username profileImageUrl')
      .populate({
        path: 'comments',
        populate: {
          path: 'user_id',
          select: 'username profileImageUrl'
        }
      })
      .sort({ created_at: -1 })
      .lean();
    
    const formattedPosts = formatPostsWithOwnership(posts, userId);
    
    return sendResponse(res, 200, formattedPosts);
  } catch (error) {
    return handleError(res, error, 'Error fetching posts by type');
  }
};