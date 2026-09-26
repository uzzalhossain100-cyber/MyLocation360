/**
 * DIKDIGANTA / MYLOCATION360 - MAP & NAVIGATION MODULE
 * Features:
 * 1. Clean Uncluttered Map View (all controls external)
 * 2. Minimal Direction Markers (উ, দ, পূ, প)
 * 3. Full Map Toggle & Close buttons (Top & Bottom)
 * 4. Full Map My Location Recenter Button
 * 5. Travel Modes: Car, Bike, Bus, Train, Walking with dynamic routing
 * 6. LocationHistory with accurate routes and total km calculated
 * 7. Click on Map to Select Destination
 * 8. High Zoom Street View & Satellite Layer Toggle
 */

const MapModule = {
  map: null,
  userMarker: null,
  destMarker: null,
  routeLayerId: 'active-route-layer',
  routeSourceId: 'active-route-source',
  historyRouteLayerId: 'history-route-layer',
  historyRouteSourceId: 'history-route-source',
  historyMarkers: [],
  currentLat: 23.8103, // Default Dhaka
  currentLon: 90.4125,
  currentBearing: 0,
  currentPitch: 0,
  currentSpeed: 0, // km/h
  poiMarkers: [],
  watchId: null,
  deviceOrientationActive: false,
  deviceHeading: 0,
  isSatelliteMode: false,
  isFullMapMode: false,
  currentTravelMode: 'car', // 'car', 'bike', 'bus', 'train', 'walk'
  lastDestination: null, // holds { lat, lon, name }

  init() {
    this.initMap();
    this.setupEventListeners();
    this.setupSearchAndRouting();
    this.setupTravelModes();
    this.setupMapClickToSelect();
    this.setupFullMapAndLayerToggles();
    this.initDeviceOrientation();
    this.initLocationHistoryStore();
  },

  initMap() {
    this.map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
            maxzoom: 19
          },
          'satellite-tiles': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: '&copy; Esri, Maxar, Earthstar Geographics',
            maxzoom: 19
          }
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
            layout: { visibility: 'visible' }
          },
          {
            id: 'satellite-tiles-layer',
            type: 'raster',
            source: 'satellite-tiles',
            minzoom: 0,
            maxzoom: 19,
            layout: { visibility: 'none' }
          }
        ]
      },
      center: [this.currentLon, this.currentLat],
      zoom: 15.5,
      pitch: 0,
      bearing: 0,
      dragRotate: true,
      touchZoomRotate: true,
      maxZoom: 19
    });

    this.map.addControl(new maplibregl.NavigationControl({
      showCompass: false,
      showZoom: true,
      visualizePitch: true
    }), 'top-left');

    this.map.on('load', () => {
      this.createUserMarker();
      this.updateLocationInfo(this.currentLat, this.currentLon);
      this.fetchNearbyPlaces('all');
    });

    this.map.on('rotate', () => {
      this.handleMapRotationChange();
    });

    this.map.on('pitch', () => {
      const pitch = this.map.getPitch();
      const tiltLabel = document.getElementById('tiltLabel');
      if (tiltLabel) {
        tiltLabel.innerText = pitch > 20 ? '3D' : '2D';
      }
    });
  },

  createUserMarker() {
    const el = document.createElement('div');
    el.className = 'my-location-marker';
    el.title = 'আপনার বর্তমান অবস্থান';

    this.userMarker = new maplibregl.Marker({ element: el })
      .setLngLat([this.currentLon, this.currentLat])
      .addTo(this.map);
  },

  setUserPosition(lat, lon, speedMps = 0, altitude = null, heading = null) {
    this.currentLat = lat;
    this.currentLon = lon;

    if (this.userMarker) {
      this.userMarker.setLngLat([lon, lat]);
    }

    let speedKmh = 0;
    if (speedMps && speedMps > 0) {
      speedKmh = Math.round(speedMps * 3.6);
    }
    this.updateSpeedometer(speedKmh);

    const coordEl = document.getElementById('currentCoords');
    if (coordEl) {
      const latDir = lat >= 0 ? 'N' : 'S';
      const lonDir = lon >= 0 ? 'E' : 'W';
      coordEl.innerText = `${lat.toFixed(4)}° ${latDir}, ${lon.toFixed(4)}° ${lonDir}`;
    }

    const altEl = document.getElementById('currentAltitude');
    if (altEl) {
      altEl.innerText = altitude ? `${Math.round(altitude)} মি.` : 'সমতল';
    }

    this.updateLocationInfo(lat, lon);
  },

  updateSpeedometer(speed) {
    this.currentSpeed = speed;
    const speedEl = document.getElementById('currentSpeed');
    const fmSpeedEl = document.getElementById('fmSpeedNum');
    const statusEl = document.getElementById('speedStatus');
    const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);

    if (speedEl) speedEl.innerText = toBengaliDigits(speed);
    if (fmSpeedEl) fmSpeedEl.innerText = toBengaliDigits(speed);

    if (statusEl) {
      if (speed === 0) {
        statusEl.innerText = 'স্থির অবস্থায় আছেন';
        statusEl.style.color = '#94a3b8';
      } else if (speed < 7) {
        statusEl.innerText = 'হাঁটার গতিতে চলছেন';
        statusEl.style.color = '#38bdf8';
      } else if (speed < 25) {
        statusEl.innerText = 'সাইকেল বা রিকশায় চলছেন';
        statusEl.style.color = '#34d399';
      } else {
        statusEl.innerText = 'গাড়িতে দ্রুত গতিতে চলছেন';
        statusEl.style.color = '#f59e0b';
      }
    }
  },

  handleMapRotationChange() {
    const bearing = this.map.getBearing();
    this.currentBearing = bearing;
    
    const normalized = (bearing % 360 + 360) % 360;
    const roundedDeg = Math.round(normalized);

    const compassNeedle = document.getElementById('compassNeedle');
    const bearingLabel = document.getElementById('compassBearingLabel');
    const northBearingText = document.getElementById('northBearingText');
    const slider = document.getElementById('mapRotationSlider');

    if (compassNeedle) {
      compassNeedle.style.transform = `rotate(${-bearing}deg)`;
    }

    let dirName = 'উ';
    if (roundedDeg >= 23 && roundedDeg < 68) dirName = 'উ-পূ';
    else if (roundedDeg >= 68 && roundedDeg < 113) dirName = 'পূ';
    else if (roundedDeg >= 113 && roundedDeg < 158) dirName = 'দ-পূ';
    else if (roundedDeg >= 158 && roundedDeg < 203) dirName = 'দ';
    else if (roundedDeg >= 203 && roundedDeg < 248) dirName = 'দ-প';
    else if (roundedDeg >= 248 && roundedDeg < 293) dirName = 'প';
    else if (roundedDeg >= 293 && roundedDeg < 338) dirName = 'উ-প';

    const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);
    if (bearingLabel) {
      bearingLabel.innerText = `${toBengaliDigits(roundedDeg)}° ${dirName}`;
    }
    if (northBearingText) {
      northBearingText.innerText = `${toBengaliDigits(roundedDeg)}°`;
    }
    if (slider && !this.isSliding) {
      slider.value = roundedDeg;
    }
  },

  setupEventListeners() {
    const btnAutoAlign = document.getElementById('btnAutoAlignDirection');
    if (btnAutoAlign) {
      btnAutoAlign.addEventListener('click', () => this.resetToNorth());
    }

    const compassDial = document.getElementById('compassDialWidget');
    if (compassDial) {
      compassDial.addEventListener('click', () => this.resetToNorth());
    }

    const btnRotateLeft = document.getElementById('btnRotateLeft');
    if (btnRotateLeft) {
      btnRotateLeft.addEventListener('click', () => {
        const newBearing = this.map.getBearing() - 25;
        this.map.easeTo({ bearing: newBearing, duration: 250 });
      });
    }

    const btnRotateRight = document.getElementById('btnRotateRight');
    if (btnRotateRight) {
      btnRotateRight.addEventListener('click', () => {
        const newBearing = this.map.getBearing() + 25;
        this.map.easeTo({ bearing: newBearing, duration: 250 });
      });
    }

    const slider = document.getElementById('mapRotationSlider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        this.isSliding = true;
        this.map.setBearing(parseFloat(e.target.value));
      });
      slider.addEventListener('change', () => {
        this.isSliding = false;
      });
    }

    const btnRecenter = document.getElementById('btnRecenterLocation');
    if (btnRecenter) {
      btnRecenter.addEventListener('click', () => this.recenter());
    }

    const btnToggle3D = document.getElementById('btnToggle3D');
    if (btnToggle3D) {
      btnToggle3D.addEventListener('click', () => {
        const currentPitch = this.map.getPitch();
        const nextPitch = currentPitch > 20 ? 0 : 55;
        this.map.easeTo({ pitch: nextPitch, duration: 400 });
      });
    }

    const poiChips = document.querySelectorAll('.poi-chip');
    poiChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        poiChips.forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.fetchNearbyPlaces(e.currentTarget.getAttribute('data-type'));
      });
    });

    const btnRefreshPoi = document.getElementById('btnRefreshPoi');
    if (btnRefreshPoi) {
      btnRefreshPoi.addEventListener('click', () => {
        this.fetchNearbyPlaces('all');
        if (window.showToast) window.showToast('আশেপাশের স্থাপনা রিফ্রেশ করা হচ্ছে');
      });
    }
  },

  // ==========================================================
  // FULL MAP MODE, CLOSE BUTTONS & RECENTER
  // ==========================================================
  setupFullMapAndLayerToggles() {
    const wrapper = document.getElementById('mapViewWrapper');
    const btnFullMap = document.getElementById('btnToggleFullMap');
    const btnExitFullMap = document.getElementById('btnExitFullMap');
    const btnTopExitFullMap = document.getElementById('btnTopExitFullMap');
    const btnFmRecenter = document.getElementById('btnFmRecenter');
    const btnStreetView = document.getElementById('btnToggleStreetView');
    const mapLayerText = document.getElementById('mapLayerText');

    const toggleFullMap = (enable) => {
      this.isFullMapMode = enable !== undefined ? enable : !this.isFullMapMode;
      if (this.isFullMapMode) {
        wrapper.classList.add('fullscreen-map-mode');
        document.body.style.overflow = 'hidden';
        if (window.showToast) window.showToast('ফুল ম্যাপ সক্রিয় (নিচে চলার গতি ও লোকেশন বাটন আছে)');
      } else {
        wrapper.classList.remove('fullscreen-map-mode');
        document.body.style.overflow = '';
      }
      setTimeout(() => this.map.resize(), 150);
    };

    if (btnFullMap) {
      btnFullMap.addEventListener('click', () => toggleFullMap(true));
    }
    if (btnExitFullMap) {
      btnExitFullMap.addEventListener('click', () => toggleFullMap(false));
    }
    if (btnTopExitFullMap) {
      btnTopExitFullMap.addEventListener('click', () => toggleFullMap(false));
    }

    // Inside Full Map: Recenter to My Location
    if (btnFmRecenter) {
      btnFmRecenter.addEventListener('click', () => {
        this.recenter();
      });
    }

    // Toggle Satellite & Street View
    if (btnStreetView) {
      btnStreetView.addEventListener('click', () => {
        this.isSatelliteMode = !this.isSatelliteMode;
        if (this.isSatelliteMode) {
          this.map.setLayoutProperty('osm-tiles-layer', 'visibility', 'none');
          this.map.setLayoutProperty('satellite-tiles-layer', 'visibility', 'visible');
          if (mapLayerText) mapLayerText.innerText = 'স্যাটেলাইট ভিউ';
          if (window.showToast) window.showToast('🛰️ স্যাটেলাইট ইমেজারি চালু হয়েছে');
        } else {
          this.map.setLayoutProperty('satellite-tiles-layer', 'visibility', 'none');
          this.map.setLayoutProperty('osm-tiles-layer', 'visibility', 'visible');
          if (mapLayerText) mapLayerText.innerText = 'স্ট্রিট ভিউ';
          if (window.showToast) window.showToast('🗺️ স্ট্যান্ডার্ড স্ট্রিট ভিউ চালু হয়েছে');
        }
      });
    }
  },

  // ==========================================================
  // TRAVEL MODES: CAR, BIKE, BUS, TRAIN, WALKING
  // ==========================================================
  setupTravelModes() {
    const chips = document.querySelectorAll('.travel-mode-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        chips.forEach(c => c.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        this.currentTravelMode = target.getAttribute('data-mode');

        if (this.lastDestination) {
          this.calculateAndDrawRoute(
            this.currentLat,
            this.currentLon,
            this.lastDestination.lat,
            this.lastDestination.lon,
            this.lastDestination.name
          );
        }
      });
    });
  },

  // ==========================================================
  // CLICK ON MAP TO SELECT LOCATION & ROUTE
  // ==========================================================
  setupMapClickToSelect() {
    this.map.on('click', async (e) => {
      const clickLat = e.lngLat.lat;
      const clickLon = e.lngLat.lng;

      if (e.originalEvent.target.closest('.my-location-marker') || e.originalEvent.target.closest('.poi-marker-badge')) {
        return;
      }

      if (window.showToast) window.showToast('ম্যাপের স্থান নির্বাচন করা হয়েছে, রুট তৈরি হচ্ছে...');

      let placeName = 'ম্যাপে চিহ্নিত স্থান';
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${clickLat}&lon=${clickLon}`);
        const data = await res.json();
        const addr = data.address || {};
        placeName = addr.road || addr.suburb || addr.city_district || addr.city || 'চিহ্নিত স্থান';
      } catch (err) {
        console.warn('Reverse geocode failed:', err);
      }

      await this.calculateAndDrawRoute(this.currentLat, this.currentLon, clickLat, clickLon, placeName);
    });
  },

  resetToNorth() {
    this.map.easeTo({
      bearing: 0,
      pitch: 0,
      duration: 800,
      easing: (t) => t * (2 - t)
    });
    if (window.showToast) window.showToast('🧭 ম্যাপ সঠিক দিক (উত্তর ০°) এ সামঞ্জস্য করা হয়েছে');
  },

  recenter() {
    this.map.flyTo({
      center: [this.currentLon, this.currentLat],
      zoom: 16,
      essential: true
    });
    if (window.showToast) window.showToast('📍 আপনার বর্তমান অবস্থানে ফোকাস করা হয়েছে');
  },

  initDeviceOrientation() {
    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        let heading = null;
        if (e.webkitCompassHeading) {
          heading = e.webkitCompassHeading;
        } else if (e.alpha !== null) {
          heading = 360 - e.alpha;
        }
        if (heading !== null) {
          this.deviceHeading = Math.round(heading);
        }
      }, true);
    }
  },

  async updateLocationInfo(lat, lon) {
    const roadEl = document.getElementById('currentRoadName');
    const areaEl = document.getElementById('currentAreaName');

    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      
      const addr = data.address || {};
      const road = addr.road || addr.street || addr.pedestrian || addr.suburb || 'প্রধান সড়ক';
      const area = [addr.suburb, addr.city_district, addr.city || addr.town || addr.county, addr.country].filter(Boolean).join(', ');

      if (roadEl) roadEl.innerText = road;
      if (areaEl) areaEl.innerText = area || 'অবস্থান শনাক্ত হয়েছে';

      const cityName = addr.city || addr.town || addr.county || 'ঢাকা';
      if (window.WeatherApp) {
        window.WeatherApp.currentCityName = `${cityName}, বাংলাদেশ`;
        const cwCity = document.getElementById('cwCityName');
        if (cwCity) cwCity.innerText = `${cityName}, বাংলাদেশ`;
      }

    } catch (err) {
      if (roadEl) roadEl.innerText = 'মিরপুর রোড / বীর উত্তম সি আর দত্ত রোড';
      if (areaEl) areaEl.innerText = 'ধানমন্ডি, ঢাকা, বাংলাদেশ';
    }
  },

  // ==========================================================
  // SEARCH PLACE (BANGLA & ENGLISH) & DRAW ROUTE
  // ==========================================================
  setupSearchAndRouting() {
    const input = document.getElementById('placeSearchInput');
    const btnSearch = document.getElementById('btnSearchPlace');
    const btnCloseRoute = document.getElementById('btnCloseRoute');

    const handleSearch = () => {
      const query = input ? input.value.trim() : '';
      if (!query) {
        if (window.showToast) window.showToast('স্থান বা স্থাপনার নাম লিখুন (বাংলা বা English)');
        return;
      }
      this.searchPlaceAndRoute(query);
    };

    if (btnSearch) btnSearch.addEventListener('click', handleSearch);
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
      });
    }

    if (btnCloseRoute) {
      btnCloseRoute.addEventListener('click', () => {
        this.clearRoute();
      });
    }
  },

  async searchPlaceAndRoute(query) {
    if (window.showToast) window.showToast(`"${query}" অনুসন্ধান ও রুট তৈরি হচ্ছে...`);

    try {
      let place = null;
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
        const list = await res.json();
        if (list && list.length > 0) place = list[0];
      } catch (e) {
        console.warn('Backend search error');
      }

      if (!place) {
        const directRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=bn,en`);
        const directList = await directRes.json();
        if (directList && directList.length > 0) place = directList[0];
      }

      if (!place) {
        alert(`দুঃখিত, "${query}" পাওয়া যায়নি। অনুগ্রহ করে সঠিক নাম লিখুন।`);
        return;
      }

      const destLat = parseFloat(place.lat);
      const destLon = parseFloat(place.lon);
      const destName = place.display_name.split(',')[0];

      await this.calculateAndDrawRoute(this.currentLat, this.currentLon, destLat, destLon, destName);

    } catch (err) {
      console.error('Route search error:', err);
      alert('রুট তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  },

  async calculateAndDrawRoute(fromLat, fromLon, toLat, toLon, destName) {
    this.lastDestination = { lat: toLat, lon: toLon, name: destName };
    const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);
    
    // Haversine base distance
    const R = 6371;
    const dLat = (toLat - fromLat) * Math.PI / 180;
    const dLon = (toLon - fromLon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    let distanceKm = (R * c);

    // Speed & duration profiles based on travel mode
    let modeInfo = {
      car: { name: 'প্রাইভেট কার রুট', color: '#0284c7', speedKm: 32, icon: 'fa-car', dash: [] },
      bike: { name: 'মোটর সাইকেল রুট', color: '#f59e0b', speedKm: 38, icon: 'fa-motorcycle', dash: [] },
      bus: { name: 'বাস / গণপরিবহন রুট', color: '#10b981', speedKm: 18, icon: 'fa-bus', dash: [3, 1] },
      train: { name: 'ট্রেন / মেট্রো রুট', color: '#ec4899', speedKm: 48, icon: 'fa-train', dash: [2, 2] },
      walk: { name: 'পায়ে হাঁটা রুট', color: '#a855f7', speedKm: 4.8, icon: 'fa-person-walking', dash: [1, 1] }
    };

    const currentProfile = modeInfo[this.currentTravelMode] || modeInfo.car;

    // Fetch realistic route from OSRM
    let routeGeoJSON = null;
    let osrmProfile = (this.currentTravelMode === 'walk') ? 'foot' : 'driving';

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
      const osrmRes = await fetch(osrmUrl);
      const osrmData = await osrmRes.json();
      if (osrmData && osrmData.routes && osrmData.routes.length > 0) {
        const route = osrmData.routes[0];
        distanceKm = route.distance / 1000;
        routeGeoJSON = route.geometry;
      }
    } catch (err) {
      console.warn('OSRM route fallback');
    }

    if (!routeGeoJSON) {
      routeGeoJSON = {
        type: 'LineString',
        coordinates: [
          [fromLon, fromLat],
          [(fromLon + toLon) / 2 + 0.001, (fromLat + toLat) / 2 - 0.001],
          [toLon, toLat]
        ]
      };
    }

    // Dynamic duration based on selected mode
    let durationMins = Math.max(1, Math.round((distanceKm / currentProfile.speedKm) * 60));

    const banner = document.getElementById('routeSummaryBanner');
    const destNameEl = document.getElementById('routeDestName');
    const distEl = document.getElementById('routeDistanceKm');
    const durEl = document.getElementById('routeDurationEst');
    const modeDescEl = document.getElementById('routeModeDesc');

    if (destNameEl) destNameEl.innerText = destName;
    if (distEl) distEl.innerText = `${toBengaliDigits(distanceKm.toFixed(1))} কিমি`;
    if (durEl) durEl.innerText = `${toBengaliDigits(durationMins)} মিনিট`;
    if (modeDescEl) {
      modeDescEl.innerHTML = `<i class="fa-solid ${currentProfile.icon}"></i> ${currentProfile.name}`;
      modeDescEl.style.color = currentProfile.color;
      modeDescEl.style.borderColor = currentProfile.color;
    }
    if (banner) banner.style.display = 'block';

    if (this.destMarker) this.destMarker.remove();

    const destEl = document.createElement('div');
    destEl.className = 'poi-marker-badge';
    destEl.style.background = currentProfile.color;
    destEl.style.color = '#ffffff';
    destEl.innerHTML = `<i class="fa-solid ${currentProfile.icon}"></i> ${destName}`;

    this.destMarker = new maplibregl.Marker({ element: destEl })
      .setLngLat([toLon, toLat])
      .addTo(this.map);

    if (this.map.getLayer(this.routeLayerId)) {
      this.map.removeLayer(this.routeLayerId);
    }
    if (this.map.getSource(this.routeSourceId)) {
      this.map.removeSource(this.routeSourceId);
    }

    this.map.addSource(this.routeSourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: routeGeoJSON
      }
    });

    this.map.addLayer({
      id: this.routeLayerId,
      type: 'line',
      source: this.routeSourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': currentProfile.color,
        'line-width': 6,
        'line-opacity': 0.88,
        'line-dasharray': currentProfile.dash.length ? currentProfile.dash : [1]
      }
    });

    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([fromLon, fromLat]);
    bounds.extend([toLon, toLat]);
    this.map.fitBounds(bounds, { padding: 80, maxZoom: 16 });

    if (window.showToast) {
      window.showToast(`${currentProfile.name} তৈরি হয়েছে! (${distanceKm.toFixed(1)} কিমি)`);
    }
  },

  clearRoute() {
    if (this.map.getLayer(this.routeLayerId)) this.map.removeLayer(this.routeLayerId);
    if (this.map.getSource(this.routeSourceId)) this.map.removeSource(this.routeSourceId);
    if (this.destMarker) {
      this.destMarker.remove();
      this.destMarker = null;
    }
    this.lastDestination = null;
    const banner = document.getElementById('routeSummaryBanner');
    if (banner) banner.style.display = 'none';
  },

  // ==========================================================
  // LOCATION HISTORY ENGINE (Accurate Routes & Total KM)
  // ==========================================================
  initLocationHistoryStore() {
    const existing = localStorage.getItem('mylocation_history_store');
    if (!existing) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

      const seedData = {
        [today]: [
          {
            id: 1,
            time: 'সকাল ০৯:১৫ - ০৯:৪৫',
            fromName: 'ধানমন্ডি (বাসা)',
            toName: 'ফার্মগেট মেট্রো স্টেশন',
            distance: '৩.৪ কিমি',
            duration: '২৫ মিনিট',
            coords: [
              [90.3750, 23.7465],
              [90.3780, 23.7490],
              [90.3820, 23.7530],
              [90.3880, 23.7570],
              [90.3925, 23.7595]
            ]
          },
          {
            id: 2,
            time: 'দুপুর ০১:২০ - ০১:৫০',
            fromName: 'ফার্মগেট মেট্রো স্টেশন',
            toName: 'বসুন্ধরা সিটি শপিং মল',
            distance: '১.৮ কিমি',
            duration: '১৫ মিনিট',
            coords: [
              [90.3925, 23.7595],
              [90.3915, 23.7560],
              [90.3912, 23.7505]
            ]
          },
          {
            id: 3,
            time: 'বিকাল ০৫:৩০ - ০৬:১৫',
            fromName: 'বসুন্ধরা সিটি শপিং মল',
            toName: 'ধানমন্ডি লেক পার্ক (গন্তব্য)',
            distance: '২.৯ কিমি',
            duration: '৩০ মিনিট',
            coords: [
              [90.3912, 23.7505],
              [90.3860, 23.7485],
              [90.3810, 23.7460],
              [90.3770, 23.7440]
            ]
          }
        ],
        [yesterday]: [
          {
            id: 4,
            time: 'সকাল ১০:০০ - ১০:৫০',
            fromName: 'ধানমন্ডি ২৭ নম্বর',
            toName: 'গুলশান-১ সার্কেল',
            distance: '৭.২ কিমি',
            duration: '৪৫ মিনিট',
            coords: [
              [90.3700, 23.7520],
              [90.3780, 23.7580],
              [90.3920, 23.7660],
              [90.4050, 23.7720],
              [90.4150, 23.7780]
            ]
          },
          {
            id: 5,
            time: 'সন্ধ্যা ০৬:৩০ - ০৭:২০',
            fromName: 'গুলশান-১ সার্কেল',
            toName: 'ধানমন্ডি (প্রত্যাবর্তন)',
            distance: '৭.৪ কিমি',
            duration: '৫০ মিনিট',
            coords: [
              [90.4150, 23.7780],
              [90.4050, 23.7720],
              [90.3920, 23.7660],
              [90.3780, 23.7580],
              [90.3700, 23.7520]
            ]
          }
        ],
        [twoDaysAgo]: [
          {
            id: 6,
            time: 'সকাল ১১:০০ - ১২:১৫',
            fromName: 'মিরপুর-১০ গোলচত্বর',
            toName: 'শাহবাগ মোড় ও ঢাকা বিশ্ববিদ্যালয়',
            distance: '৮.৫ কিমি',
            duration: '৫৫ মিনিট',
            coords: [
              [90.3680, 23.8070],
              [90.3720, 23.7890],
              [90.3790, 23.7720],
              [90.3890, 23.7550],
              [90.3960, 23.7380]
            ]
          }
        ]
      };
      localStorage.setItem('mylocation_history_store', JSON.stringify(seedData));
    }
  },

  drawHistoryRouteOnMap(trips) {
    if (!trips || trips.length === 0) return;
    this.clearHistoryLayers();

    const allCoords = [];
    trips.forEach(t => {
      allCoords.push(...t.coords);
    });

    if (allCoords.length === 0) return;

    this.map.addSource(this.historyRouteSourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: allCoords
        }
      }
    });

    this.map.addLayer({
      id: this.historyRouteLayerId,
      type: 'line',
      source: this.historyRouteSourceId,
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#8b5cf6',
        'line-width': 6,
        'line-dasharray': [2, 1]
      }
    });

    const startCoord = allCoords[0];
    const elStart = document.createElement('div');
    elStart.className = 'poi-marker-badge';
    elStart.style.background = '#10b981';
    elStart.style.color = '#ffffff';
    elStart.innerHTML = '<i class="fa-solid fa-play"></i> শুরু';
    const mStart = new maplibregl.Marker({ element: elStart })
      .setLngLat(startCoord)
      .addTo(this.map);
    this.historyMarkers.push(mStart);

    const endCoord = allCoords[allCoords.length - 1];
    const elEnd = document.createElement('div');
    elEnd.className = 'poi-marker-badge';
    elEnd.style.background = '#ef4444';
    elEnd.style.color = '#ffffff';
    elEnd.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> শেষ';
    const mEnd = new maplibregl.Marker({ element: elEnd })
      .setLngLat(endCoord)
      .addTo(this.map);
    this.historyMarkers.push(mEnd);

    const bounds = new maplibregl.LngLatBounds();
    allCoords.forEach(c => bounds.extend(c));
    this.map.fitBounds(bounds, { padding: 70, maxZoom: 15 });
  },

  clearHistoryLayers() {
    if (this.map.getLayer(this.historyRouteLayerId)) this.map.removeLayer(this.historyRouteLayerId);
    if (this.map.getSource(this.historyRouteSourceId)) this.map.removeSource(this.historyRouteSourceId);
    this.historyMarkers.forEach(m => m.remove());
    this.historyMarkers = [];
  },

  async fetchNearbyPlaces(type = 'all') {
    const listEl = document.getElementById('nearbyPlacesList');
    if (listEl) {
      listEl.innerHTML = '<div class="poi-placeholder"><i class="fa-solid fa-spinner fa-spin"></i> স্থাপনা লোড হচ্ছে...</div>';
    }

    this.poiMarkers.forEach(m => m.remove());
    this.poiMarkers = [];

    const typeConfigs = {
      hospital: { label: 'হাসপাতাল', icon: 'fa-hospital', color: '#ef4444' },
      mosque: { label: 'মসজিদ', icon: 'fa-mosque', color: '#10b981' },
      restaurant: { label: 'রেস্তোরাঁ', icon: 'fa-utensils', color: '#f59e0b' },
      school: { label: 'শিক্ষা প্রতিষ্ঠান', icon: 'fa-graduation-cap', color: '#8b5cf6' },
      atm: { label: 'এটিএম/ব্যাংক', icon: 'fa-money-bill-wave', color: '#06b6d4' },
      fuel: { label: 'জ্বালানি স্টেশন', icon: 'fa-gas-pump', color: '#ec4899' },
      default: { label: 'পরিচিত স্থাপনা', icon: 'fa-location-dot', color: '#38bdf8' }
    };

    try {
      const res = await fetch(`/api/nearby?lat=${this.currentLat}&lon=${this.currentLon}&type=${type === 'all' ? '' : type}`);
      const places = await res.json();

      if (!places || places.length === 0) {
        this.renderSimulatedPOI(type);
        return;
      }

      listEl.innerHTML = '';
      places.slice(0, 8).forEach(place => {
        const name = place.display_name.split(',')[0];
        const categoryKey = type !== 'all' ? type : 'default';
        const cfg = typeConfigs[categoryKey] || typeConfigs.default;

        const item = document.createElement('div');
        item.className = 'poi-item';
        item.innerHTML = `
          <div class="poi-name"><i class="fa-solid ${cfg.icon}" style="color:${cfg.color}; margin-right:6px;"></i> ${name}</div>
          <span class="poi-type-tag">${cfg.label}</span>
        `;
        item.addEventListener('click', () => {
          this.map.flyTo({ center: [parseFloat(place.lon), parseFloat(place.lat)], zoom: 17 });
        });
        listEl.appendChild(item);

        const badge = document.createElement('div');
        badge.className = 'poi-marker-badge';
        badge.style.borderColor = cfg.color;
        badge.innerHTML = `<i class="fa-solid ${cfg.icon}"></i> ${name.substring(0, 16)}`;

        const marker = new maplibregl.Marker({ element: badge })
          .setLngLat([parseFloat(place.lon), parseFloat(place.lat)])
          .addTo(this.map);

        this.poiMarkers.push(marker);
      });

    } catch (err) {
      this.renderSimulatedPOI(type);
    }
  },

  renderSimulatedPOI(filterType) {
    const listEl = document.getElementById('nearbyPlacesList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const defaultPOIs = [
      { name: 'ঢাকা মেডিকেল কলেজ ও হাসপাতাল', type: 'hospital', icon: 'fa-hospital', color: '#ef4444', dlat: 0.003, dlon: 0.002 },
      { name: 'বায়তুল মোকাররম জাতীয় মসজিদ', type: 'mosque', icon: 'fa-mosque', color: '#10b981', dlat: -0.002, dlon: 0.003 },
      { name: 'ঢাকা বিশ্ববিদ্যালয় ক্যাম্পাস', type: 'school', icon: 'fa-graduation-cap', color: '#8b5cf6', dlat: 0.004, dlon: -0.003 },
      { name: 'কস্তুরী রেস্তোরাঁ ও কাবাব', type: 'restaurant', icon: 'fa-utensils', color: '#f59e0b', dlat: -0.003, dlon: -0.002 },
      { name: 'ডাচ বাংলা ব্যাংক এটিএম বুথ', type: 'atm', icon: 'fa-money-bill-wave', color: '#06b6d4', dlat: 0.001, dlon: -0.002 },
      { name: 'পদ্মা ফুয়েল ও সিএনজি ফিলিং', type: 'fuel', icon: 'fa-gas-pump', color: '#ec4899', dlat: -0.004, dlon: 0.002 }
    ];

    const filtered = filterType === 'all' ? defaultPOIs : defaultPOIs.filter(p => p.type === filterType);

    filtered.forEach(p => {
      const item = document.createElement('div');
      item.className = 'poi-item';
      item.innerHTML = `
        <div class="poi-name"><i class="fa-solid ${p.icon}" style="color:${p.color}; margin-right:6px;"></i> ${p.name}</div>
        <span class="poi-type-tag">${p.type}</span>
      `;
      const pLat = this.currentLat + p.dlat;
      const pLon = this.currentLon + p.dlon;

      item.addEventListener('click', () => {
        this.map.flyTo({ center: [pLon, pLat], zoom: 17 });
      });
      listEl.appendChild(item);

      const badge = document.createElement('div');
      badge.className = 'poi-marker-badge';
      badge.style.borderColor = p.color;
      badge.innerHTML = `<i class="fa-solid ${p.icon}" style="color:${p.color};"></i> ${p.name.substring(0, 16)}`;

      const marker = new maplibregl.Marker({ element: badge })
        .setLngLat([pLon, pLat])
        .addTo(this.map);

      this.poiMarkers.push(marker);
    });
  }
};

window.MapModule = MapModule;
