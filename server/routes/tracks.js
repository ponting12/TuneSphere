const express  = require('express');
const path     = require('path');
const { dbService } = require('../services/dbService');
const Track = require('../models/Track'); // still needed for Mongoose seeding block
const upload   = require('../middleware/upload');

const router = express.Router();

// Seed demo tracks if MongoDB is running and DB is empty
const DEMO_TRACKS = [
  { title: 'Neon Dreams',     artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', artwork: '/bgimage.jpg', isDemo: true },
  { title: 'Midnight Pulse',  artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', artwork: '/bgimage.jpg', isDemo: true },
  { title: 'Golden Hour',     artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', artwork: '/bgimage.jpg', isDemo: true },
  { title: 'Skyline Haze',    artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', artwork: '/bgimage.jpg', isDemo: true },
  { title: 'Electric Avenue', artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', artwork: '/bgimage.jpg', isDemo: true },
  { title: 'Afterglow',       artist: 'SoundHelix', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', artwork: '/bgimage.jpg', isDemo: true },
];

async function seedDemoTracks() {
  try {
    // Only query if mongoose is connected
    if (require('mongoose').connection.readyState === 1) {
      const count = await Track.countDocuments({ isDemo: true });
      if (count === 0) {
        await Track.insertMany(DEMO_TRACKS);
        console.log('🎵 Demo tracks seeded into MongoDB');
      }
    }
  } catch (err) {
    console.warn('Skipping MongoDB demo seeding: MongoDB is not connected.');
  }
}
// Run seeding checks after a small delay to let connection establish
setTimeout(() => seedDemoTracks().catch(console.error), 2000);

// GET /api/tracks — all tracks
router.get('/', async (req, res) => {
  try {
    const tracks = await dbService.getTracks();
    res.json(tracks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tracks/upload — upload audio file
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const title  = (req.body.title || req.file.originalname).replace(/\.[^/.]+$/, '');
    const artist = req.body.artist || 'Uploaded';
    const src    = `/uploads/${req.file.filename}`;
    const track  = await dbService.createTrack({ title, artist, src, artwork: '/bgimage.jpg', isUpload: true });
    res.status(201).json(track);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tracks/youtube — add YouTube track
router.post('/youtube', async (req, res) => {
  try {
    const { videoId, title, artist, artwork } = req.body;
    if (!videoId) return res.status(400).json({ error: 'videoId is required' });
    const thumb = artwork || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    const track = await dbService.createTrack({ title: title || `YouTube: ${videoId}`, artist: artist || 'YouTube', videoId, artwork: thumb });
    res.status(201).json(track);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tracks/:id/favorite — toggle favorite
router.patch('/:id/favorite', async (req, res) => {
  try {
    const track = await dbService.toggleFavorite(req.params.id);
    res.json(track);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tracks/:id
router.delete('/:id', async (req, res) => {
  try {
    const track = await dbService.deleteTrack(req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    // Remove local file if it exists
    if (track.isUpload && track.src) {
      const filePath = path.join(__dirname, '..', track.src);
      const fs = require('fs');
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ message: 'Track deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
