const mongoose = require('mongoose');

const TrackSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  artist:   { type: String, default: 'Unknown', trim: true },
  artwork:  { type: String, default: '' },
  src:      { type: String, default: null },   // local file path served by Express
  videoId:  { type: String, default: null },   // YouTube video ID
  duration: { type: Number, default: 0 },
  isDemo:   { type: Boolean, default: false },
  isUpload: { type: Boolean, default: false },
  isFavorite: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Track', TrackSchema);
