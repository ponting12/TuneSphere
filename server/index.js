require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(cors({
  origin: true,           // allow any origin during development
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded audio files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve React build if it exists
const distPath = path.join(__dirname, '..', 'client', 'dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  // Development fallbacks
  app.use(express.static(path.join(__dirname, '..', 'client', 'public')));
  app.use(express.static(path.join(__dirname, '..')));
}

// ── API Routes ─────────────────────────────────────────────
app.use('/api/tracks',    require('./routes/tracks'));
app.use('/api/playlists', require('./routes/playlists'));
app.use('/api/youtube',   require('./routes/youtube'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', message: 'TuneSphere API running' }));

// ── Global Error Handler ───────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start Server ───────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 TuneSphere API running at http://localhost:${PORT}`);
});
