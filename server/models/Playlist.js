const mongoose = require('mongoose');

const PlaylistSchema = new mongoose.Schema({
  name:   { type: String, required: true, unique: true, trim: true },
  tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
}, { timestamps: true });

module.exports = mongoose.model('Playlist', PlaylistSchema);
