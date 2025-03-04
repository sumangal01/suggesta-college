const AuthorityAction = require('../models/authorityAction');
const Post = require('../models/post');

exports.respondToPost = async (req, res) => {
  const { postId } = req.params;
  const { action_type, response_message } = req.body;

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const action = new AuthorityAction({
      post_id: postId,
      authority_id: req.session.user._id,
      action_type,
      response_message
    });

    await action.save();
    res.status(201).json(action);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
