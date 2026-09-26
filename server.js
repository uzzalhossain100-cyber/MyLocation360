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
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=bn,en`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MyLocation360App/1.0 (contact@arena.ai)',
        'Accept-Language': 'bn,en;q=0.9'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode' });
  }
});

// Search location geocoding (supports both Bengali & English, location, thana, district, country)
app.get('/api/geocode/search', async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Query q is required' });
  }
  const cleanQ = q.trim();

  try {
    let combinedResults = [];

    // 1. Primary: Nominatim with bilingual accept-language
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanQ)}&limit=8&addressdetails=1&accept-language=bn,en`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'MyLocation360App/1.0 (contact@arena.ai)',
          'Accept-Language': 'bn,en;q=0.9'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          combinedResults = data.map(item => {
            const addr = item.address || {};
            const thana = addr.suburb || addr.quarter || addr.neighbourhood || addr.subdistrict || '';
            const district = addr.city || addr.town || addr.county || addr.state || '';
            const country = addr.country || '';
            return {
              display_name: item.display_name,
              name: item.name || item.display_name.split(',')[0],
              subdistrict: thana,
              district: district,
              country: country,
              lat: item.lat,
              lon: item.lon,
              type: item.type || item.class || 'location'
            };
          });
        }
      }
    } catch (e) {
      console.warn('Nominatim search failed, trying fallback:', e.message);
    }

    // 2. Fallback: Photon by Komoot (excellent for English & Bengali multilingual names, thana, district)
    if (combinedResults.length === 0) {
      try {
        const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQ)}&limit=8`;
        const pRes = await fetch(photonUrl);
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData && pData.features && pData.features.length > 0) {
            combinedResults = pData.features.map(f => {
              const p = f.properties || {};
              const coords = f.geometry ? f.geometry.coordinates : [90.4125, 23.8103];
              const parts = [p.name, p.district || p.suburb, p.city || p.county, p.country].filter(Boolean);
              return {
                display_name: parts.join(', '),
                name: p.name || parts[0] || cleanQ,
                subdistrict: p.suburb || p.district || '',
                district: p.city || p.county || p.state || '',
                country: p.country || '',
                lat: coords[1].toString(),
                lon: coords[0].toString(),
                type: p.type || 'place'
              };
            });
          }
        }
      } catch (e) {
        console.warn('Photon search fallback failed:', e.message);
      }
    }

    // 3. Fallback: Open-Meteo Geocoding API (great for global cities, districts, countries)
    if (combinedResults.length === 0) {
      try {
        const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQ)}&count=8&language=en&format=json`;
        const omRes = await fetch(omUrl);
        if (omRes.ok) {
          const omData = await omRes.json();
          if (omData && omData.results && omData.results.length > 0) {
            combinedResults = omData.results.map(r => ({
              display_name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
              name: r.name,
              subdistrict: '',
              district: r.admin1 || '',
              country: r.country || '',
              lat: r.latitude.toString(),
              lon: r.longitude.toString(),
              type: 'city'
            }));
          }
        }
      } catch (e) {
        console.warn('Open-Meteo search fallback failed:', e.message);
      }
    }

    res.json(combinedResults);
  } catch (error) {
    console.error('Search geocode overall error:', error);
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
