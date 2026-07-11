const express  = require('express');
const { dbService } = require('../services/dbService');

const router = express.Router();

// GET /api/playlists
router.get('/', async (req, res) => {
  try {
    const playlists = await dbService.getPlaylists();
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/playlists — create
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const playlist = await dbService.createPlaylist(name);
    res.status(201).json(playlist);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Playlist name already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/playlists/:id/add — add track
router.put('/:id/add', async (req, res) => {
  try {
    const { trackId } = req.body;
    const playlist = await dbService.addTrackToPlaylist(req.params.id, trackId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/playlists/:id/remove — remove track
router.put('/:id/remove', async (req, res) => {
  try {
    const { trackId } = req.body;
    const playlist = await dbService.removeTrackFromPlaylist(req.params.id, trackId);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/playlists/:id
router.delete('/:id', async (req, res) => {
  try {
    const playlist = await dbService.deletePlaylist(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json({ message: 'Playlist deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
