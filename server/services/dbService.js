const fs   = require('fs');
const path = require('path');
const Track = require('../models/Track');
const Playlist = require('../models/Playlist');

// File paths for JSON fallback database
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE  = path.join(DATA_DIR, 'db.json');

// Ensure data directory and file exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ tracks: [], playlists: [] }, null, 2));
}

// Global connection state
let useLocalDb = false;

// 6 YouTube demo songs
const DEMO_TRACKS = [
  { _id: 'demo1', title: 'Kesariya (Brahmastra)', artist: 'Arijit Singh', videoId: 'W1S9AbHpWFY', artwork: 'https://img.youtube.com/vi/W1S9AbHpWFY/mqdefault.jpg', isDemo: true, isFavorite: false },
  { _id: 'demo2', title: 'Lollypop Lagelu', artist: 'Pawan Singh', videoId: 'zkAkwudNTj4', artwork: 'https://img.youtube.com/vi/zkAkwudNTj4/mqdefault.jpg', isDemo: true, isFavorite: false },
  { _id: 'demo3', title: 'Chaleya (Jawan)', artist: 'Anirudh Ravichander, Arijit Singh', videoId: 'Bi7sSC046dk', artwork: 'https://img.youtube.com/vi/Bi7sSC046dk/mqdefault.jpg', isDemo: true, isFavorite: false },
  { _id: 'demo4', title: 'Rinkiya Ke Papa', artist: 'Manoj Tiwari', videoId: '6-IPf5fvsLo', artwork: 'https://img.youtube.com/vi/6-IPf5fvsLo/mqdefault.jpg', isDemo: true, isFavorite: false },
  { _id: 'demo5', title: 'Apna Bana Le (Bhediya)', artist: 'Arijit Singh, Sachin-Jigar', videoId: 'PYLxgPKtzZE', artwork: 'https://img.youtube.com/vi/PYLxgPKtzZE/mqdefault.jpg', isDemo: true, isFavorite: false },
  { _id: 'demo6', title: 'Leke Prabhu Ka Naam', artist: 'Arijit Singh, Nikhita Gandhi', videoId: 'Wn8u-R3wJY8', artwork: 'https://img.youtube.com/vi/Wn8u-R3wJY8/mqdefault.jpg', isDemo: true, isFavorite: false },
];

function setDbMode(mode) {
  useLocalDb = mode === 'local';
  if (useLocalDb) {
    console.log('📂 Local Database mode activated (using server/data/db.json)');
    // Seed JSON database if empty
    const data = readLocalDb();
    if (!data.tracks || data.tracks.length === 0) {
      data.tracks = [...DEMO_TRACKS];
      writeLocalDb(data);
      console.log('🌱 Seeded local JSON database with demo tracks');
    }
  }
}

// ── JSON Helper functions ─────────────────────────────────
function readLocalDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { tracks: [], playlists: [] };
  }
}

function writeLocalDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error writing to local JSON db:', err);
  }
}

// ── Service API ───────────────────────────────────────────
const dbService = {
  // --- TRACKS ---
  getTracks: async () => {
    if (useLocalDb) {
      return readLocalDb().tracks;
    }
    return await Track.find().sort({ createdAt: 1 });
  },

  createTrack: async (trackData) => {
    if (useLocalDb) {
      const data = readLocalDb();
      const newTrack = {
        _id: `track_${Date.now()}_${Math.round(Math.random() * 1000)}`,
        isFavorite: false,
        ...trackData,
        createdAt: new Date().toISOString(),
      };
      data.tracks.push(newTrack);
      writeLocalDb(data);
      return newTrack;
    }
    return await Track.create(trackData);
  },

  toggleFavorite: async (id) => {
    if (useLocalDb) {
      const data = readLocalDb();
      const track = data.tracks.find(t => t._id === id);
      if (!track) throw new Error('Track not found');
      track.isFavorite = !track.isFavorite;
      writeLocalDb(data);
      return track;
    }
    const track = await Track.findById(id);
    if (!track) throw new Error('Track not found');
    track.isFavorite = !track.isFavorite;
    await track.save();
    return track;
  },

  deleteTrack: async (id) => {
    if (useLocalDb) {
      const data = readLocalDb();
      const track = data.tracks.find(t => t._id === id);
      if (!track) throw new Error('Track not found');
      data.tracks = data.tracks.filter(t => t._id !== id);
      // Remove from any playlists
      data.playlists.forEach(pl => {
        pl.tracks = (pl.tracks || []).filter(tid => tid !== id);
      });
      writeLocalDb(data);
      return track;
    }
    const track = await Track.findByIdAndDelete(id);
    if (!track) throw new Error('Track not found');
    await Playlist.updateMany({}, { $pull: { tracks: id } });
    return track;
  },

  // --- PLAYLISTS ---
  getPlaylists: async () => {
    if (useLocalDb) {
      const data = readLocalDb();
      // Populate playlist tracks manually
      return data.playlists.map(pl => ({
        ...pl,
        tracks: (pl.tracks || []).map(tid => data.tracks.find(t => t._id === tid)).filter(Boolean)
      }));
    }
    return await Playlist.find().populate('tracks').sort({ createdAt: 1 });
  },

  createPlaylist: async (name) => {
    if (useLocalDb) {
      const data = readLocalDb();
      if (data.playlists.find(p => p.name.toLowerCase() === name.toLowerCase())) {
        const err = new Error('Playlist name already exists');
        err.code = 11000;
        throw err;
      }
      const newPl = {
        _id: `pl_${Date.now()}_${Math.round(Math.random() * 1000)}`,
        name,
        tracks: [],
        createdAt: new Date().toISOString(),
      };
      data.playlists.push(newPl);
      writeLocalDb(data);
      return newPl;
    }
    return await Playlist.create({ name });
  },

  addTrackToPlaylist: async (playlistId, trackId) => {
    if (useLocalDb) {
      const data = readLocalDb();
      const pl = data.playlists.find(p => p._id === playlistId);
      if (!pl) throw new Error('Playlist not found');
      if (!pl.tracks.includes(trackId)) {
        pl.tracks.push(trackId);
        writeLocalDb(data);
      }
      return {
        ...pl,
        tracks: pl.tracks.map(tid => data.tracks.find(t => t._id === tid)).filter(Boolean)
      };
    }
    return await Playlist.findByIdAndUpdate(
      playlistId,
      { $addToSet: { tracks: trackId } },
      { new: true }
    ).populate('tracks');
  },

  removeTrackFromPlaylist: async (playlistId, trackId) => {
    if (useLocalDb) {
      const data = readLocalDb();
      const pl = data.playlists.find(p => p._id === playlistId);
      if (!pl) throw new Error('Playlist not found');
      pl.tracks = pl.tracks.filter(tid => tid !== trackId);
      writeLocalDb(data);
      return {
        ...pl,
        tracks: pl.tracks.map(tid => data.tracks.find(t => t._id === tid)).filter(Boolean)
      };
    }
    return await Playlist.findByIdAndUpdate(
      playlistId,
      { $pull: { tracks: trackId } },
      { new: true }
    ).populate('tracks');
  },

  deletePlaylist: async (playlistId) => {
    if (useLocalDb) {
      const data = readLocalDb();
      const pl = data.playlists.find(p => p._id === playlistId);
      if (!pl) throw new Error('Playlist not found');
      data.playlists = data.playlists.filter(p => p._id !== playlistId);
      writeLocalDb(data);
      return pl;
    }
    return await Playlist.findByIdAndDelete(playlistId);
  }
};

module.exports = { dbService, setDbMode };
