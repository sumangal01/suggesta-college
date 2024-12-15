const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        required: true
    },
    image_url: {
        type: String,
        default: null
    },
    is_anonymous: {
        type: Boolean,
        default: false
    },
    upvotes: {
        type: Number,
        default: 0
    },
    upvotedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    downvotedBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    }],
    created_at: {
        type: Date,
        default: Date.now
    },
    post_type: {
        type: String,
        enum: ['Question', 'Feedback', 'Announcement', 'Issue'], // Options for post types
        default: 'Feedback' // Default value if none is specified
    }
});

module.exports = mongoose.model('Post', PostSchema);