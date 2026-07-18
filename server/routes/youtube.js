const express = require('express');
const axios   = require('axios');

const router = express.Router();

// GET /api/youtube/search?q=query
// Server-side proxy — avoids browser CORS restrictions on YouTube Data API
router.get('/search', async (req, res) => {
  const { q, maxResults = 10 } = req.query;
  const apiKey = process.env.YT_API_KEY;

  if (!q)      return res.status(400).json({ error: 'Query parameter "q" is required' });
  if (!apiKey) return res.status(503).json({ error: 'YouTube API key not configured on server' });

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part:        'snippet',
        type:        'video',
        q,
        maxResults,
        key:         apiKey,
        safeSearch:  'moderate',
        videoCategoryId: '10', // Music category
      },
    });

    const results = (response.data.items || []).map(item => ({
      videoId:  item.id?.videoId,
      title:    item.snippet?.title         || 'Unknown',
      channel:  item.snippet?.channelTitle  || 'YouTube',
      thumbnail: item.snippet?.thumbnails?.medium?.url
              || item.snippet?.thumbnails?.default?.url
              || `https://img.youtube.com/vi/${item.id?.videoId}/mqdefault.jpg`,
    })).filter(r => r.videoId);

    res.json(results);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// GET /api/youtube/suggest?q=query
router.get('/suggest', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  try {
    const response = await axios.get('http://suggestqueries.google.com/complete/search', {
      params: {
        client: 'firefox',
        ds:     'yt',
        q,
      },
    });
    const suggestions = response.data[1] || [];
    res.json(suggestions);
  } catch (err) {
    res.json([]);
  }
});

module.exports = router;
