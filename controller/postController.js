const Post = require('../models/post');
const Comment = require('../models/comments');
const fs = require('fs');
const path = require('path');
const User = require('../models/user')
// Create a new post
exports.createPost = async (req, res) => {
    const userId = req.user._id;
    try {
        const { content, is_anonymous, post_type } = req.body; // Extract post_type from the request body
        const post = new Post({
            user_id: req.user.id,
            content,
            is_anonymous: is_anonymous || false,
            post_type: post_type || 'Feedback', // Use 'Feedback' as default if not provided
            image_url: req.file ? `/uploads/${req.file.filename}` : null,
            upvotedBy: [],
            downvotedBy: [],
            comments: []
        });
        await post.save();
        res.status(201).json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating post' });
    }
};

// Get all posts with detailed information
exports.getPosts = async (req, res) => {
    try {
        const userId = req.user._id; // Assume user ID is available in req.user from authentication middleware
        const posts = await Post.find()
            .populate('user_id', 'username profileImageUrl') // Populate user details
            .populate({
                path: 'comments',
                populate: {
                    path: 'user_id',
                    select: 'username profileImageUrl'
                }
            })
            .sort({ created_at: -1 });

        // Modify posts for anonymous users
        const postsWithOwnership = posts.map(post => {
            // Ensure user_id is not null before accessing _id
            const isOwner = post.user_id && post.user_id._id.toString() === userId.toString();

            // Process comments and check for ownership
            const commentsWithOwnership = post.comments.map(comment => {
                const commentOwner =
                    comment.user_id && comment.user_id._id.toString() === userId.toString();
                return {
                    ...comment._doc,
                    isOwner: commentOwner
                };
            });

            // Handle anonymous posts
            if (post.is_anonymous) {
                post.user_id = { username: 'Anonymous', profileImageUrl: 'uploads/is_anonymous.png' };
            }

            return {
                ...post._doc,
                isOwner,
                comments: commentsWithOwnership
            };
        });

        res.status(200).json(postsWithOwnership);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching posts' });
    }
};

// Upvote a post
exports.upvotePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        // Check if user has already upvoted
        if (post.upvotedBy.includes(userId)) {
            return res.status(400).json({ error: 'Already upvoted' });
        }

        // Remove from downvoted if previously downvoted
        const downvoteIndex = post.downvotedBy.indexOf(userId);
        if (downvoteIndex > -1) {
            post.downvotedBy.splice(downvoteIndex, 1);
        }

        // Add upvote
        post.upvotedBy.push(userId);
        post.upvotes = post.upvotedBy.length;

        await post.save();
        res.status(200).json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error upvoting post' });
    }
};

// Downvote a post
exports.downvotePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        // Check if user has already downvoted
        if (post.downvotedBy.includes(userId)) {
            return res.status(400).json({ error: 'Already downvoted' });
        }

        // Remove from upvoted if previously upvoted
        const upvoteIndex = post.upvotedBy.indexOf(userId);
        if (upvoteIndex > -1) {
            post.upvotedBy.splice(upvoteIndex, 1);
        }

        // Add downvote
        post.downvotedBy.push(userId);
        post.upvotes = post.upvotedBy.length;

        await post.save();
        res.status(200).json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error downvoting post' });
    }
};

// Delete a post
exports.deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await Post.findById(postId);

        if (!post) return res.status(404).json({ error: 'Post not found' });

        // Check if the current user is the post owner
        if (post.user_id.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to delete this post' });
        }

        // Remove the image file if it exists
        if (post.image_url) {
            const imagePath = path.join(__dirname, '../public', post.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Delete associated comments
        await Comment.deleteMany({ post_id: postId });

        // Delete the post
        await Post.findByIdAndDelete(postId);

        res.status(200).json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting post' });
    }
};

// Add a comment to a post
exports.addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { content } = req.body;

        // Validate content
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Comment cannot be empty' });
        }

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        const comment = new Comment({
            user_id: req.user.id,
            post_id: postId,
            content: content.trim(),
            created_at: new Date()
        });

        await comment.save();

        // Optionally, you can add the comment to the post's comments array
        post.comments.push(comment._id);
        await post.save();

        // Populate the comment with user details
        await comment.populate('user_id', 'username profileImageUrl');

        res.status(201).json(comment);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error adding comment' });
    }
};
exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;

        // Find the comment to be deleted
        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ error: 'Comment not found' });

        // Find the associated post
        const post = await Post.findById(comment.post_id);
        if (!post) return res.status(404).json({ error: 'Post not found' });

        // Check authorization: Either the comment's owner or the post's owner can delete
        if (comment.user_id.toString() !== req.user.id && post.user_id.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to delete this comment' });
        }

        // Remove comment reference from the post
        post.comments = post.comments.filter(id => id.toString() !== commentId);
        await post.save();

        // Delete the comment
        await Comment.findByIdAndDelete(commentId);

        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting comment' });
    }
};

exports.getuserPosts = async (req, res) => {
    try {
        const userId = req.user._id; // Assume user ID is available in req.user from authentication middleware
        const posts = await Post.find({ user_id: userId })
            .populate('user_id', 'username profileImageUrl')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user_id',
                    select: 'username profileImageUrl'
                }
            })
            .sort({ created_at: -1 });

        // Modify posts for anonymous users
        const postsWithOwnership = posts.map(post => {
            const isOwner = post.user_id._id.toString() === userId.toString();
            const commentsWithOwnership = post.comments.map(comment => {
                const commentOwner = comment.user_id._id.toString() === userId.toString();
                return { ...comment._doc, isOwner: commentOwner };
            });
            if (post.is_anonymous) {
                post.user_id = { username: 'Anonymous', profileImageUrl: 'uploads/is_anonymous.png' };
            }
            return { ...post._doc, isOwner, comments: commentsWithOwnership };
        });

        res.status(200).json(postsWithOwnership);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching posts' });
    }
};

exports.getOtherUserPosts = async (req, res) => {
    try {
        const { _id } = req.params;  // Extract user ID from the route parameter
        const currentUser = req.user._id;  // Assume user ID is available in req.user from authentication middleware

        // Fetch the user to ensure the user exists
        const user = await User.findById(_id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Fetch the posts of the other user, excluding anonymous posts
        const posts = await Post.find({ user_id: _id, is_anonymous: false }) // Exclude anonymous posts
            .populate('user_id', 'username profileImageUrl')  // Populate user info
            .populate({
                path: 'comments',
                populate: {
                    path: 'user_id',
                    select: 'username profileImageUrl'  // Populate comment user info
                }
            })
            .sort({ created_at: -1 });  // Sort by creation date (optional)

        // Modify posts to check for ownership and assign comments ownership
        const postsWithOwnership = posts.map(post => {
            const isOwner = post.user_id._id.toString() === currentUser.toString();
            const commentsWithOwnership = post.comments.map(comment => {
                const commentOwner = comment.user_id._id.toString() === currentUser.toString();
                return { ...comment._doc, isOwner: commentOwner };
            });

            return { ...post._doc, isOwner, comments: commentsWithOwnership };
        });

        // Return the posts with ownership information
        res.status(200).json(postsWithOwnership);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching posts' });
    }
};
exports.showMostUpvotedPosts = async (req, res) => {
    try {
      const userId = req.user._id;
      const posts = await Post.find()
        .sort({ upvotes: -1 }) // Sort by upvotes in descending order
        .populate('user_id', 'username profileImageUrl')
        .populate({
          path: 'comments',
          populate: {
            path: 'user_id',
            select: 'username profileImageUrl',
          },
        })
        .exec();
  
      // Filter and process posts safely
      const postsWithOwnership = posts
        .filter(post => post.user_id) // Skip posts without a valid user_id
        .map(post => {
          const isOwner = post.user_id._id.toString() === userId.toString();
  
          // Handle comments safely
          const commentsWithOwnership = post.comments
            .filter(comment => comment.user_id) // Skip comments without a valid user_id
            .map(comment => {
              const commentOwner = comment.user_id._id.toString() === userId.toString();
              return { ...comment._doc, isOwner: commentOwner };
            });
  
          if (post.is_anonymous) {
            post.user_id = { username: 'Anonymous', profileImageUrl: 'uploads/is_anonymous.png' };
          }
  
          return { ...post._doc, isOwner, comments: commentsWithOwnership };
        });
  
      res.status(200).json(postsWithOwnership);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching posts', error: err });
    }
  };
  

  exports.post_type_post = async (req,res)=>{
   const post_type = req.params.post_type
  }



  exports.getPostsByType = async (req, res) => {
    try {
        const userId = req.user._id; // Assume user ID is available in req.user from authentication middleware
        const postType = req.params.post_type; // Get the post type from the URL parameter

        // Validate post type
        const validPostTypes = ['Question', 'Feedback', 'Announcement', 'Issue'];
        if (!validPostTypes.includes(postType)) {
            return res.status(400).json({ message: 'Invalid post type' });
        }

        // Fetch posts based on the post type
        const posts = await Post.find({ post_type: postType })
            .populate('user_id', 'username profileImageUrl')
            .populate({
                path: 'comments',
                populate: {
                    path: 'user_id',
                    select: 'username profileImageUrl'
                }
            })
            .sort({ created_at: -1 });

        // Filter out invalid posts and comments with missing user_id
        const postsWithOwnership = posts
            .filter(post => post.user_id) // Remove posts with null user_id
            .map(post => {
                const isOwner = post.user_id && post.user_id._id.toString() === userId.toString();

                // Process comments and filter null user_id
                const commentsWithOwnership = post.comments
                    .filter(comment => comment.user_id) // Remove comments with null user_id
                    .map(comment => {
                        const commentOwner =
                            comment.user_id && comment.user_id._id.toString() === userId.toString();
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

        console.log(postsWithOwnership);

        res.status(200).json(postsWithOwnership);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching posts' });
    }
};

