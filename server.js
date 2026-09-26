const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Geocoding Proxy (Nominatim / OSM) to avoid CORS or header restrictions
app.get('/api/geocode/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MyLocation360App/1.0 (contact@arena.ai)'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode' });
  }
});

// Search location geocoding
app.get('/api/geocode/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query q is required' });
  }
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MyLocation360App/1.0 (contact@arena.ai)'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Search geocode error:', error);
    res.status(500).json({ error: 'Failed to search geocode' });
  }
});

// Nearby POI search
app.get('/api/nearby', async (req, res) => {
  const { lat, lon, type } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon are required' });
  }
  try {
    const queryTerm = type || 'hospital,school,restaurant,mosque';
    const minLon = Number(lon) - 0.02;
    const maxLon = Number(lon) + 0.02;
    const minLat = Number(lat) - 0.02;
    const maxLat = Number(lat) + 0.02;
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryTerm)}&bounded=1&viewbox=${minLon},${maxLat},${maxLon},${minLat}&limit=12`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MyLocation360App/1.0 (contact@arena.ai)'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Nearby search error:', error);
    res.status(500).json({ error: 'Failed to fetch nearby places' });
  }
});

// Fallback to index.html for SPA (compatible with Express 5)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MyLocation360 server running at http://0.0.0.0:${PORT}`);
});
