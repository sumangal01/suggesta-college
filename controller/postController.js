const Post = require('../models/post');
const Comment = require('../models/comments');
const fs = require('fs');
const path = require('path');

// Create a new post
exports.createPost = async (req, res) => {
    try {
        const { content, is_anonymous } = req.body;
        const post = new Post({
            user_id: req.user.id,
            content,
            is_anonymous: is_anonymous || false,
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
        const posts = await Post.find()
            .populate('user_id', 'username profileImageUrl')  // Only populate these fields if not anonymous
            .populate({
                path: 'comments',
                populate: {
                    path: 'user_id',
                    select: 'username profileImageUrl'
                }
            })
            .sort({ created_at: -1 });

        // Modify posts for anonymous users
        const postsWithAnonymousUsers = posts.map(post => {
            if (post.is_anonymous) {
                post.user_id = { username: 'Anonymous', profileImageUrl: 'uploads/is_anonymous.png' }; // Add default image for anonymous
            }
            return post;
        });

        res.status(200).json(postsWithAnonymousUsers);
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