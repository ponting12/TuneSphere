const express  = require('express');
const path     = require('path');
const { dbService } = require('../services/dbService');
const Track = require('../models/Track'); // still needed for Mongoose seeding block
const upload   = require('../middleware/upload');

const router = express.Router();

// Seed demo tracks if MongoDB is running and DB is empty
const DEMO_TRACKS = [
  { title: 'Kesariya (Brahmastra)', artist: 'Arijit Singh', videoId: 'W1S9AbHpWFY', artwork: 'https://img.youtube.com/vi/W1S9AbHpWFY/mqdefault.jpg', isDemo: true },
  { title: 'Lollypop Lagelu', artist: 'Pawan Singh', videoId: 'zkAkwudNTj4', artwork: 'https://img.youtube.com/vi/zkAkwudNTj4/mqdefault.jpg', isDemo: true },
  { title: 'Chaleya (Jawan)', artist: 'Anirudh Ravichander, Arijit Singh', videoId: 'Bi7sSC046dk', artwork: 'https://img.youtube.com/vi/Bi7sSC046dk/mqdefault.jpg', isDemo: true },
  { title: 'Rinkiya Ke Papa', artist: 'Manoj Tiwari', videoId: '6-IPf5fvsLo', artwork: 'https://img.youtube.com/vi/6-IPf5fvsLo/mqdefault.jpg', isDemo: true },
  { title: 'Apna Bana Le (Bhediya)', artist: 'Arijit Singh, Sachin-Jigar', videoId: 'PYLxgPKtzZE', artwork: 'https://img.youtube.com/vi/PYLxgPKtzZE/mqdefault.jpg', isDemo: true },
  { title: 'Leke Prabhu Ka Naam', artist: 'Arijit Singh, Nikhita Gandhi', videoId: 'Wn8u-R3wJY8', artwork: 'https://img.youtube.com/vi/Wn8u-R3wJY8/mqdefault.jpg', isDemo: true },
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
    const track  = await dbService.createTrack({ title, artist, src, artwork: '', isUpload: true });
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
      const filePath = path.join(__dirname, '..', 'uploads', path.basename(track.src));
      const fs = require('fs');
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ message: 'Track deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
