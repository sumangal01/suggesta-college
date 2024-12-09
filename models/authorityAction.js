const mongoose = require('mongoose');

const authorityActionSchema = new mongoose.Schema({
  post_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  authority_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action_type: { type: String, enum: ['resolved', 'flagged', 'responded'], required: true },
  response_message: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuthorityAction', authorityActionSchema);
