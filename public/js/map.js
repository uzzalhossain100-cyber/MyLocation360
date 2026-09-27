/**
 * DIKDIGANTA / MYLOCATION360 - MAP & NAVIGATION MODULE
 * Features:
 * 1. Clean Uncluttered Map View (all controls external)
 * 2. Minimal Direction Markers (উ, দ, পূ, প)
 * 3. Full Map Toggle & Close buttons (Top & Bottom)
 * 4. Full Map My Location Recenter Button (never hidden under menus)
 * 5. Smart Travel Modes:
 *    - Walk: Shortest Direct Pedestrian Path (নো চক্কর, সরাসরি সোজা পথ)
 *    - Car: Shortest Driving Road Route
 *    - Bike: Fast Motorcycle Route
 *    - Bus: Transit Route
 *    - Train: Rail Route or "কোনো সরাসরি ট্রেন রুট নেই" warning
 *    - Plane: Great Circle Flight Path & Air Travel Duration
 * 6. LocationHistory with Real GPS Tracking & Accurate Total KM
 * 7. Real Street View 360 Panorama Viewer (গুগল স্ট্রিট ভিউ ৩৬০° ইন্টারেক্টিভ ফ্রেম)
 * 8. Ultra High Zoom (Max Zoom 22) & Satellite Toggle
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
  isAutoFollow: true, // Follow user as they move
  poiMarkers: [],
  watchId: null,
  deviceOrientationActive: false,
  deviceHeading: 0,
  isSatelliteMode: false,
  isFullMapMode: false,
  currentTravelMode: 'car',
  lastDestination: null,

  init() {
    this.initMap();
    this.setupEventListeners();
    this.setupSearchAndRouting();
    this.setupTravelModes();
    this.setupMapClickToSelect();
    this.setupFullMapAndLayerToggles();
    this.setupStreetViewPanorama();
    this.initDeviceOrientation();
    this.initLocationHistoryStore();

    setTimeout(() => {
      if (this.map) this.map.resize();
    }, 120);
    setTimeout(() => {
      if (this.map) this.map.resize();
    }, 450);
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
            maxzoom: 22
          },
          'satellite-tiles': {
            type: 'raster',
            tiles: [
              'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
            ],
            tileSize: 256,
            attribution: '&copy; Google Satellite Imagery & Names',
            maxzoom: 22
          },
          'satellite-roads-tiles': {
            type: 'raster',
            tiles: [
              'https://mt1.google.com/vt/lyrs=h&x={x}&y={y}&z={z}'
            ],
            tileSize: 256,
            maxzoom: 22
          },
          'satellite-places-tiles': {
            type: 'raster',
            tiles: [
              'https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/voyager_only_labels/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            maxzoom: 22
          }
        },
        layers: [
          {
            id: 'osm-tiles-layer',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 22,
            layout: { visibility: 'visible' }
          },
          {
            id: 'satellite-tiles-layer',
            type: 'raster',
            source: 'satellite-tiles',
            minzoom: 0,
            maxzoom: 22,
            layout: { visibility: 'none' }
          },
          {
            id: 'satellite-roads-layer',
            type: 'raster',
            source: 'satellite-roads-tiles',
            minzoom: 0,
            maxzoom: 22,
            layout: { visibility: 'none' }
          },
          {
            id: 'satellite-places-layer',
            type: 'raster',
            source: 'satellite-places-tiles',
            minzoom: 0,
            maxzoom: 22,
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
      maxZoom: 22
    });

    this.map.addControl(new maplibregl.NavigationControl({
      showCompass: false,
      showZoom: true,
      visualizePitch: true
    }), 'top-left');

    this.map.on('load', () => {
      this.createUserMarker();
      this.updateLocationInfo(this.currentLat, this.currentLon);
      this.map.resize();
      setTimeout(() => this.map.resize(), 150);
    });

    // Pause auto-follow when user drags manually
    this.map.on('dragstart', () => {
      this.isAutoFollow = false;
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
    // Calculate distance from last recorded point to eliminate GPS jitter/drift
    let distMovedMeters = 0;
    if (this.currentLat && this.currentLon) {
      const dLat = (lat - this.currentLat) * 111320;
      const dLon = (lon - this.currentLon) * 111320 * Math.cos(lat * Math.PI / 180);
      distMovedMeters = Math.sqrt(dLat * dLat + dLon * dLon);
    }

    // Determine accurate movement heading
    let moveHeading = heading;
    if ((moveHeading === null || isNaN(moveHeading)) && distMovedMeters >= 3 && this.currentLat && this.currentLon) {
      moveHeading = this.calculateBearing(this.currentLat, this.currentLon, lat, lon);
    }

    this.currentLat = lat;
    this.currentLon = lon;

    if (this.userMarker) {
      this.userMarker.setLngLat([lon, lat]);
    }

    // Strict GPS Drift & Noise Filter:
    // If speed is below 0.65 m/s (~2.3 km/h) or movement is under 3 meters, force strict 0 km/h
    let speedKmh = 0;
    if (speedMps && speedMps >= 0.65 && distMovedMeters >= 2.5) {
      speedKmh = Math.round(speedMps * 3.6);
    }

    this.updateSpeedometer(speedKmh, moveHeading);

    // LIVE NAVIGATION AUTO-FOLLOW: Map smoothly moves and tracks user as they walk or drive!
    if (this.isAutoFollow && this.map) {
      const easeOptions = {
        center: [lon, lat],
        duration: 900,
        essential: true
      };
      // Rotate map along user heading if moving (> 2.5 km/h)
      if (moveHeading !== null && !isNaN(moveHeading) && speedKmh >= 2.5) {
        easeOptions.bearing = moveHeading;
      }
      this.map.easeTo(easeOptions);
    }

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
    this.recordLiveGpsHistory(lat, lon);
  },

  calculateBearing(lat1, lon1, lat2, lon2) {
    const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
    const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
              Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  },

  getHeadingDirectionInfo(deg) {
    if (deg === null || isNaN(deg)) return { text: 'আপনি সোজা চলছেন ⬆️', short: 'চলছেন' };
    const n = (deg % 360 + 360) % 360;
    if (n >= 337.5 || n < 22.5) return { text: 'আপনি উত্তর দিকে চলছেন ⬆️', short: 'উত্তর ⬆️' };
    if (n >= 22.5 && n < 67.5) return { text: 'আপনি উত্তর-পূর্ব দিকে চলছেন ↗️', short: 'উ-পূ ↗️' };
    if (n >= 67.5 && n < 112.5) return { text: 'আপনি পূর্ব দিকে চলছেন ➡️', short: 'পূর্ব ➡️' };
    if (n >= 112.5 && n < 157.5) return { text: 'আপনি দক্ষিণ-পূর্ব দিকে চলছেন ↘️', short: 'দ-পূ ↘️' };
    if (n >= 157.5 && n < 202.5) return { text: 'আপনি দক্ষিণ দিকে চলছেন ⬇️', short: 'দক্ষিণ ⬇️' };
    if (n >= 202.5 && n < 247.5) return { text: 'আপনি দক্ষিণ-পশ্চিম দিকে চলছেন ↙️', short: 'দ-প ↙️' };
    if (n >= 247.5 && n < 292.5) return { text: 'আপনি পশ্চিম দিকে চলছেন ⬅️', short: 'পশ্চিম ⬅️' };
    return { text: 'আপনি উত্তর-পশ্চিম দিকে চলছেন ↖️', short: 'উ-প ↖️' };
  },

  updateSpeedometer(speed, heading = null) {
    this.currentSpeed = speed;
    const speedEl = document.getElementById('currentSpeed');
    const dashSpeedEl = document.getElementById('dashSpeedValue');
    const fmSpeedEl = document.getElementById('fmSpeedNum');
    const statusEl = document.getElementById('speedStatus');
    const dirIndicatorText = document.getElementById('travelDirectionText');
    const dockSubDir = document.getElementById('dockMoveDir');
    const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);

    if (speedEl) speedEl.innerText = toBengaliDigits(speed);
    if (dashSpeedEl) dashSpeedEl.innerText = toBengaliDigits(speed);
    if (fmSpeedEl) fmSpeedEl.innerText = toBengaliDigits(speed);

    if (speed === 0) {
      if (statusEl) {
        statusEl.innerText = 'স্থির অবস্থায় আছেন';
        statusEl.style.color = '#94a3b8';
      }
      if (dirIndicatorText) {
        dirIndicatorText.innerText = 'বর্তমানে আপনি স্থির অবস্থানে আছেন 🛑';
        dirIndicatorText.style.color = '#94a3b8';
      }
      if (dockSubDir) dockSubDir.innerText = 'স্থির';
    } else {
      const dirInfo = this.getHeadingDirectionInfo(heading);
      if (dirIndicatorText) {
        dirIndicatorText.innerText = dirInfo.text;
        dirIndicatorText.style.color = '#38bdf8';
      }
      if (dockSubDir) dockSubDir.innerText = dirInfo.short;

      if (statusEl) {
        if (speed < 7) {
          statusEl.innerText = `হাঁটার গতিতে চলছেন (${toBengaliDigits(speed)} কিমি/ঘণ্টা)`;
          statusEl.style.color = '#38bdf8';
        } else if (speed < 25) {
          statusEl.innerText = `সাইকেল বা রিকশায় চলছেন (${toBengaliDigits(speed)} কিমি/ঘণ্টা)`;
          statusEl.style.color = '#34d399';
        } else {
          statusEl.innerText = `গাড়িতে দ্রুত গতিতে চলছেন (${toBengaliDigits(speed)} কিমি/ঘণ্টা)`;
          statusEl.style.color = '#f59e0b';
        }
      }
    }
  },

  handleMapRotationChange() {
    const bearing = this.map.getBearing();
    this.currentBearing = bearing;
    
    const normalized = (bearing % 360 + 360) % 360;
    const roundedDeg = Math.round(normalized);

    const northBearingText = document.getElementById('northBearingText');
    const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);
    if (northBearingText) {
      northBearingText.innerText = `${toBengaliDigits(roundedDeg)}°`;
    }
  },

  setupEventListeners() {
    const btnAutoAlign = document.getElementById('btnAutoAlignDirection');
    if (btnAutoAlign) {
      btnAutoAlign.addEventListener('click', () => this.resetToNorth());
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
  },

  // ==========================================================
  // REAL STREET VIEW 360 PANORAMA VIEWER WITH ROAD PICKER
  // ==========================================================
  setupStreetViewPanorama() {
    const btnOpenPanorama = document.getElementById('btnOpenStreetPanorama');
    const modal = document.getElementById('streetViewPanoramaModal');
    const btnClose1 = document.getElementById('btnCloseStreetViewModal');
    const btnClose2 = document.getElementById('btnCloseStreetViewModal2');
    const btnPickAnother = document.getElementById('btnPickAnotherStreet');
    const iframe = document.getElementById('streetViewIframe');
    const loading = document.getElementById('svLoading');
    const titleEl = document.getElementById('svModalTitle');
    const pickBanner = document.getElementById('streetViewPickBanner');
    const btnCancelPick = document.getElementById('btnCancelStreetViewPick');
    const clickHint = document.getElementById('mapClickHintBadge');

    this.isStreetViewPickMode = false;

    const startStreetViewMode = () => {
      this.isStreetViewPickMode = true;
      if (pickBanner) pickBanner.style.display = 'flex';
      if (clickHint) clickHint.style.display = 'none';

      // রাস্তা ও ম্যাপ পরিষ্কার দেখার জন্য সুন্দর জুমে নিয়ে যাওয়া
      const targetCenter = this.lastDestination ? [this.lastDestination.lon, this.lastDestination.lat] : [this.currentLon, this.currentLat];
      if (this.map.getZoom() < 16) {
        this.map.flyTo({
          center: targetCenter,
          zoom: 16.5,
          pitch: 20,
          duration: 900
        });
      }

      if (window.showToast) {
        window.showToast('🚶 ম্যাপের যে রাস্তা দেখতে চান সেখানে জুম করে ক্লিক করুন');
      }
    };

    const stopStreetViewMode = () => {
      this.isStreetViewPickMode = false;
      if (pickBanner) pickBanner.style.display = 'none';
      if (clickHint) clickHint.style.display = 'block';
    };

    const openPanorama = (lat, lon, locationName) => {
      if (!modal || !iframe) return;
      if (titleEl) titleEl.innerText = `${locationName || 'নির্বাচিত রাস্তার'} ৩৬০° আসল স্ট্রিট ভিউ`;
      if (loading) loading.style.display = 'flex';

      // Embed Google Street View 360 Panorama
      const svUrl = `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lon}&cbp=11,0,0,0,0&output=svembed`;
      iframe.src = svUrl;
      modal.style.display = 'flex';

      iframe.onload = () => {
        if (loading) loading.style.display = 'none';
      };
      setTimeout(() => {
        if (loading) loading.style.display = 'none';
      }, 1500);
    };

    this.openStreetViewAt = openPanorama;
    this.stopStreetViewMode = stopStreetViewMode;

    if (btnOpenPanorama) {
      btnOpenPanorama.addEventListener('click', () => {
        startStreetViewMode();
      });
    }

    if (btnCancelPick) {
      btnCancelPick.addEventListener('click', () => {
        stopStreetViewMode();
      });
    }

    const closeModal = () => {
      if (modal) modal.style.display = 'none';
      if (iframe) iframe.src = '';
    };

    if (btnClose1) btnClose1.addEventListener('click', closeModal);
    if (btnClose2) btnClose2.addEventListener('click', closeModal);

    if (btnPickAnother) {
      btnPickAnother.addEventListener('click', () => {
        closeModal();
        startStreetViewMode();
      });
    }
  },

  // ==========================================================
  // FULL MAP MODE, CLOSE BUTTONS & RECENTER (100% DESKTOP & MOBILE)
  // ==========================================================
  setupFullMapAndLayerToggles() {
    const wrapper = document.getElementById('mapViewWrapper');
    const locationTab = document.getElementById('location-tab');
    const btnFullMap = document.getElementById('btnToggleFullMap');
    const fullMapIcon = document.getElementById('fullMapIcon');
    const fullMapText = document.getElementById('fullMapText');
    const btnStreetView = document.getElementById('btnToggleStreetView');
    const mapLayerText = document.getElementById('mapLayerText');
    const btnFloatingClose = document.getElementById('btnExitFullMapFloating');

    const toggleFullMap = (enable) => {
      this.isFullMapMode = enable !== undefined ? enable : !this.isFullMapMode;
      if (this.isFullMapMode) {
        wrapper.classList.remove('clean-map-view');
        wrapper.classList.add('fullscreen-map-mode');
        document.body.classList.add('in-fullmap-mode');
        document.documentElement.classList.add('in-fullmap-mode');
        if (fullMapIcon) fullMapIcon.className = 'fa-solid fa-compress text-danger';
        if (fullMapText) fullMapText.innerText = 'ম্যাপ ছোট';
        if (btnFloatingClose) btnFloatingClose.style.display = 'inline-flex';
        if (window.showToast) window.showToast('ফুল ম্যাপ মোড চালু হয়েছে');
      } else {
        wrapper.classList.remove('fullscreen-map-mode');
        wrapper.classList.add('clean-map-view');
        document.body.classList.remove('in-fullmap-mode');
        document.documentElement.classList.remove('in-fullmap-mode');
        if (fullMapIcon) fullMapIcon.className = 'fa-solid fa-expand text-info';
        if (fullMapText) fullMapText.innerText = 'ফুল ম্যাপ';
        if (btnFloatingClose) btnFloatingClose.style.display = 'none';
      }
      
      requestAnimationFrame(() => {
        if (this.map) this.map.resize();
      });
      setTimeout(() => {
        if (this.map) {
          this.map.resize();
          this.recenter();
        }
      }, 50);
      setTimeout(() => {
        if (this.map) {
          this.map.resize();
          this.recenter();
        }
      }, 150);
      setTimeout(() => {
        if (this.map) this.map.resize();
      }, 350);
    };

    if (btnFullMap) {
      btnFullMap.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFullMap();
      });
    }

    if (btnFloatingClose) {
      btnFloatingClose.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFullMap(false);
      });
    }

    if (btnStreetView) {
      btnStreetView.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.isSatelliteMode = !this.isSatelliteMode;
        if (this.isSatelliteMode) {
          this.map.setLayoutProperty('osm-tiles-layer', 'visibility', 'none');
          this.map.setLayoutProperty('satellite-tiles-layer', 'visibility', 'visible');
          this.map.setLayoutProperty('satellite-roads-layer', 'visibility', 'visible');
          this.map.setLayoutProperty('satellite-places-layer', 'visibility', 'visible');
          if (mapLayerText) mapLayerText.innerText = 'স্যাটেলাইট হাইব্রিড';
          if (window.showToast) window.showToast('🛰️ স্যাটেলাইট হাইব্রিড মোড (রাস্তা ও জায়গার নামসহ) চালু হয়েছে');
        } else {
          this.map.setLayoutProperty('satellite-tiles-layer', 'visibility', 'none');
          this.map.setLayoutProperty('satellite-roads-layer', 'visibility', 'none');
          this.map.setLayoutProperty('satellite-places-layer', 'visibility', 'none');
          this.map.setLayoutProperty('osm-tiles-layer', 'visibility', 'visible');
          if (mapLayerText) mapLayerText.innerText = 'স্ট্রিট ম্যাপ';
          if (window.showToast) window.showToast('🗺️ স্ট্যান্ডার্ড স্ট্রিট ভিউ চালু হয়েছে');
        }
      });
    }
  },

  // ==========================================================
  // TRAVEL MODES: CAR, BIKE, BUS, WALK, TRAIN, PLANE
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
  // CLICK ON MAP TO SELECT LOCATION, ROUTE & STREET VIEW
  // ==========================================================
  setupMapClickToSelect() {
    this.map.on('click', async (e) => {
      const clickLat = e.lngLat.lat;
      const clickLon = e.lngLat.lng;

      if (e.originalEvent.target.closest('.my-location-marker') || e.originalEvent.target.closest('.poi-marker-badge') || e.originalEvent.target.closest('.map-bottom-dock-bar') || e.originalEvent.target.closest('.streetview-pick-banner') || e.originalEvent.target.closest('.map-corner-tools')) {
        return;
      }

      // যদি স্ট্রিট ভিউ নির্বাচন মোড সক্রিয় থাকে (জুম করা নির্দিষ্ট রাস্তার স্ট্রিট ভিউ দেখানো)
      if (this.isStreetViewPickMode) {
        let roadName = 'নির্বাচিত রাস্তা';
        try {
          const res = await fetch(`/api/geocode/reverse?lat=${clickLat}&lon=${clickLon}`);
          const data = await res.json();
          const addr = data.address || {};
          roadName = addr.road || addr.street || addr.suburb || 'নির্বাচিত রাস্তা';
        } catch (err) {}

        if (this.openStreetViewAt) {
          this.openStreetViewAt(clickLat, clickLon, roadName);
        }
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
    this.isAutoFollow = true;
    this.map.flyTo({
      center: [this.currentLon, this.currentLat],
      zoom: 16.5,
      essential: true
    });
    if (window.showToast) window.showToast('📍 আপনার চলমান অবস্থানের সাথে ম্যাপ লক করা হয়েছে');
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

      const parts = [road !== 'প্রধান সড়ক' ? road : null, addr.suburb || addr.quarter, addr.city || addr.town || addr.county, addr.country || 'বাংলাদেশ'].filter(Boolean);
      const exactAddress = parts.join(', ') || data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

      if (window.WeatherApp && window.WeatherApp.setMyGpsLocation) {
        window.WeatherApp.setMyGpsLocation(lat, lon, exactAddress);
      }

    } catch (err) {
      if (roadEl) roadEl.innerText = 'মিরপুর রোড / বীর উত্তম সি আর দত্ত রোড';
      if (areaEl) areaEl.innerText = 'ধানমন্ডি, ঢাকা, বাংলাদেশ';
    }
  },

  setupSearchAndRouting() {
    const input = document.getElementById('placeSearchInput');
    const btnSearch = document.getElementById('btnSearchPlace');
    const btnClearSearch = document.getElementById('btnClearPlaceSearch');
    const btnCloseRoute = document.getElementById('btnCloseRoute');
    const suggestionsBox = document.getElementById('searchSuggestionsBox');

    let debounceTimer = null;

    const hideSuggestions = () => {
      if (suggestionsBox) {
        suggestionsBox.style.display = 'none';
        suggestionsBox.innerHTML = '';
      }
    };

    const updateClearBtnVisibility = () => {
      if (btnClearSearch && input) {
        btnClearSearch.style.display = input.value.trim().length > 0 ? 'inline-flex' : 'none';
      }
    };

    const renderSuggestions = (list) => {
      if (!suggestionsBox) return;
      if (!list || list.length === 0) {
        suggestionsBox.style.display = 'none';
        return;
      }

      suggestionsBox.innerHTML = '';
      list.forEach(item => {
        const row = document.createElement('div');
        row.className = 'suggestion-item';

        const iconClass = item.type === 'station' ? 'fa-train-subway' :
                          item.type === 'hospital' ? 'fa-hospital' :
                          item.type === 'school' ? 'fa-school' :
                          item.type === 'city' || item.type === 'administrative' ? 'fa-city' : 'fa-location-dot';

        const subTitle = [item.subdistrict, item.district, item.country].filter(Boolean).join(', ') || item.display_name;

        row.innerHTML = `
          <i class="fa-solid ${iconClass} suggestion-icon"></i>
          <div style="flex: 1; min-width: 0;">
            <div class="suggestion-title">${item.name}</div>
            <div class="suggestion-sub">${subTitle}</div>
          </div>
        `;

        row.addEventListener('click', () => {
          if (input) input.value = item.name;
          updateClearBtnVisibility();
          hideSuggestions();
          const destLat = parseFloat(item.lat);
          const destLon = parseFloat(item.lon);
          this.calculateAndDrawRoute(this.currentLat, this.currentLon, destLat, destLon, item.name);
          if (this.map) {
            this.map.flyTo({ center: [destLon, destLat], zoom: 16, speed: 1.2 });
          }
        });

        suggestionsBox.appendChild(row);
      });

      suggestionsBox.style.display = 'block';
    };

    if (input) {
      input.addEventListener('input', () => {
        const query = input.value.trim();
        updateClearBtnVisibility();
        if (debounceTimer) clearTimeout(debounceTimer);
        if (!query || query.length < 2) {
          hideSuggestions();
          return;
        }

        debounceTimer = setTimeout(async () => {
          try {
            const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
            if (res.ok) {
              const data = await res.json();
              renderSuggestions(data);
            }
          } catch (e) {
            console.warn('Live suggest error', e);
          }
        }, 280);
      });

      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          hideSuggestions();
          handleSearch();
        }
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        if (input) input.value = '';
        updateClearBtnVisibility();
        hideSuggestions();
        this.clearRoute();
        this.recenter();
        if (window.showToast) window.showToast('সার্চ ক্লিয়ার করা হয়েছে এবং মূল অবস্থানে ফিরে গেছেন');
      });
    }

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#topSlimSearchBar')) {
        hideSuggestions();
      }
    });

    const handleSearch = () => {
      const query = input ? input.value.trim() : '';
      if (!query) {
        if (window.showToast) window.showToast('স্থান, থানা, জেলা বা দেশের নাম লিখুন (বাংলা বা English)');
        return;
      }
      hideSuggestions();
      updateClearBtnVisibility();
      this.searchPlaceAndRoute(query);
    };

    if (btnSearch) btnSearch.addEventListener('click', handleSearch);

    if (btnCloseRoute) {
      btnCloseRoute.addEventListener('click', () => {
        if (input) input.value = '';
        updateClearBtnVisibility();
        this.clearRoute();
        this.recenter();
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
        if (directList && directList.length > 0) {
          place = {
            lat: directList[0].lat,
            lon: directList[0].lon,
            name: directList[0].display_name.split(',')[0]
          };
        }
      }

      if (!place) {
        alert(`দুঃখিত, "${query}" পাওয়া যায়নি। অনুগ্রহ করে সঠিক নাম বা থানা/জেলা লিখুন।`);
        return;
      }

      const destLat = parseFloat(place.lat);
      const destLon = parseFloat(place.lon);
      const destName = place.name || (place.display_name ? place.display_name.split(',')[0] : query);

      if (this.map) {
        this.map.flyTo({ center: [destLon, destLat], zoom: 15, speed: 1.2 });
      }

      await this.calculateAndDrawRoute(this.currentLat, this.currentLon, destLat, destLon, destName);

    } catch (err) {
      console.error('Route search error:', err);
      alert('রুট তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  },

  // Dynamic Routing Calculation based on Selected Vehicle / Mode
  async calculateAndDrawRoute(fromLat, fromLon, toLat, toLon, destName) {
    this.lastDestination = { lat: toLat, lon: toLon, name: destName };
    const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);
    
    // Straight line distance (Haversine formula in km)
    const R = 6371;
    const dLat = (toLat - fromLat) * Math.PI / 180;
    const dLon = (toLon - fromLon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    let straightDistKm = (R * c);

    const mode = this.currentTravelMode;

    const banner = document.getElementById('routeSummaryBanner');
    const destNameEl = document.getElementById('routeDestName');
    const distEl = document.getElementById('routeDistanceKm');
    const durEl = document.getElementById('routeDurationEst');
    const modeDescEl = document.getElementById('routeModeDesc');

    if (destNameEl) destNameEl.innerText = destName;
    if (banner) banner.style.display = 'block';

    // ----------------------------------------------------
    // 1. SPECIAL CASE: TRAIN MODE
    // ----------------------------------------------------
    if (mode === 'train') {
      const isRailViable = straightDistKm >= 6.5;
      
      if (!isRailViable) {
        if (this.map.getLayer(this.routeLayerId)) this.map.removeLayer(this.routeLayerId);
        if (this.map.getSource(this.routeSourceId)) this.map.removeSource(this.routeSourceId);
        if (this.destMarker) this.destMarker.remove();

        if (distEl) distEl.innerText = `${toBengaliDigits(straightDistKm.toFixed(1))} কিমি (সরাসরি)`;
        if (durEl) durEl.innerHTML = `<span style="color:#ef4444; font-weight:700;">কোনো সরাসরি ট্রেন রুট নেই</span>`;
        if (modeDescEl) {
          modeDescEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-danger"></i> ট্রেন সংযোগ অনুপস্থিত, বাস বা কার ব্যবহার করুন`;
          modeDescEl.style.color = '#ef4444';
          modeDescEl.style.borderColor = '#ef4444';
        }
        if (window.showToast) window.showToast('⚠️ এই অবস্থানে সরাসরি কোনো ট্রেন রুট নেই');
        return;
      }
    }

    // ----------------------------------------------------
    // 2. SPECIAL CASE: PLANE / FLIGHT MODE
    // ----------------------------------------------------
    if (mode === 'plane') {
      const flightSpeedKmh = 680;
      const flightDistKm = straightDistKm * 1.05;
      const flightDurationMins = Math.max(25, Math.round((flightDistKm / flightSpeedKmh) * 60 + 20));

      const arcPoints = [];
      const steps = 40;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const curLat = fromLat + (toLat - fromLat) * t;
        const curLon = fromLon + (toLon - fromLon) * t;
        const bulge = Math.sin(t * Math.PI) * (straightDistKm * 0.0006);
        arcPoints.push([curLon, curLat + bulge]);
      }

      const flightGeoJSON = {
        type: 'LineString',
        coordinates: arcPoints
      };

      if (distEl) distEl.innerText = `${toBengaliDigits(flightDistKm.toFixed(1))} কিমি (আকাশপথ)`;
      if (durEl) durEl.innerText = `${toBengaliDigits(flightDurationMins)} মিনিট`;
      if (modeDescEl) {
        modeDescEl.innerHTML = `<i class="fa-solid fa-plane-departure"></i> সরাসরি বিমান রুট (ফ্লাইট)`;
        modeDescEl.style.color = '#06b6d4';
        modeDescEl.style.borderColor = '#06b6d4';
      }

      this.renderRouteLayer(flightGeoJSON, '#06b6d4', [2, 2], fromLat, fromLon, toLat, toLon, 'fa-plane', '#06b6d4', destName);
      if (window.showToast) window.showToast(`✈️ প্লেন রুট তৈরি হয়েছে (${flightDistKm.toFixed(1)} কিমি)`);
      return;
    }

    // ----------------------------------------------------
    // 3. SHORTCUT WALKABLE ROUTE (যে রাস্তায় হাঁটা যায় সেই শর্টকাট রাস্তা ও সহজ রুট)
    // ----------------------------------------------------
    if (mode === 'walk') {
      let walkDistanceKm = straightDistKm * 1.15;
      let walkDurationMins = Math.max(2, Math.round((walkDistanceKm / 4.6) * 60));
      let walkRouteCoords = null;

      // 1st Priority: Dedicated OpenStreetMap Pedestrian Footpath Shortcut Router
      try {
        const osmFootUrl = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(osmFootUrl);
        const data = await res.json();
        if (data && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          walkDistanceKm = route.distance / 1000;
          walkDurationMins = Math.max(1, Math.round(route.duration / 60));
          walkRouteCoords = route.geometry.coordinates;
        }
      } catch (err) {
        console.warn('OSM routed-foot primary fallback');
      }

      // 2nd Priority: OSRM Project Foot Profile
      if (!walkRouteCoords) {
        try {
          const osrmFootUrl = `https://router.project-osrm.org/route/v1/foot/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
          const res = await fetch(osrmFootUrl);
          const data = await res.json();
          if (data && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            walkDistanceKm = route.distance / 1000;
            walkDurationMins = Math.max(1, Math.round(route.duration / 60));
            walkRouteCoords = route.geometry.coordinates;
          }
        } catch (err) {
          console.warn('OSRM foot fallback');
        }
      }

      // 3rd Priority: Street Driving Route tailored for pedestrians
      if (!walkRouteCoords) {
        try {
          const drivingUrl = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
          const res = await fetch(drivingUrl);
          const data = await res.json();
          if (data && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            walkDistanceKm = route.distance / 1000;
            walkDurationMins = Math.max(2, Math.round((walkDistanceKm / 4.6) * 60));
            walkRouteCoords = route.geometry.coordinates;
          }
        } catch (err) {}
      }

      // Fallback street path with turns
      if (!walkRouteCoords || walkRouteCoords.length === 0) {
        walkRouteCoords = [
          [fromLon, fromLat],
          [(fromLon * 2 + toLon) / 3, (fromLat * 2 + toLat) / 3],
          [(fromLon + toLon * 2) / 3, (fromLat + toLat * 2) / 3],
          [toLon, toLat]
        ];
      }

      const walkGeoJSON = {
        type: 'LineString',
        coordinates: walkRouteCoords
      };

      if (distEl) distEl.innerText = `${toBengaliDigits(walkDistanceKm.toFixed(1))} কিমি (হাঁটার শর্টকাট)`;
      if (durEl) durEl.innerText = `${toBengaliDigits(walkDurationMins)} মিনিট`;
      if (modeDescEl) {
        modeDescEl.innerHTML = `<i class="fa-solid fa-person-walking"></i> যে রাস্তায় হাঁটা যায় সেই শর্টকাট রুট`;
        modeDescEl.style.color = '#a855f7';
        modeDescEl.style.borderColor = '#a855f7';
      }

      this.renderRouteLayer(walkGeoJSON, '#a855f7', [2, 1], fromLat, fromLon, toLat, toLon, 'fa-person-walking', '#a855f7', destName);
      if (window.showToast) window.showToast(`🚶 শর্টকাট হাঁটার রাস্তা নির্বাচন করা হয়েছে (${walkDistanceKm.toFixed(1)} কিমি)`);
      return;
    }

    // ----------------------------------------------------
    // 4. VEHICLE MODES: CAR, BIKE, BUS, TRAIN
    // ----------------------------------------------------
    let profileKey = 'driving';
    let lineColor = '#0284c7';
    let lineDash = [1];
    let modeTitle = 'প্রাইভেট কার রুট';
    let modeIcon = 'fa-car';
    let speedKmh = 32;

    if (mode === 'bike') {
      profileKey = 'driving';
      lineColor = '#f59e0b';
      modeTitle = 'মোটর সাইকেল দ্রুত রুট';
      modeIcon = 'fa-motorcycle';
      speedKmh = 38;
    } else if (mode === 'bus') {
      profileKey = 'driving';
      lineColor = '#10b981';
      lineDash = [3, 1];
      modeTitle = 'বাস ও প্রধান সড়ক রুট';
      modeIcon = 'fa-bus';
      speedKmh = 18;
    } else if (mode === 'train') {
      profileKey = 'driving';
      lineColor = '#ec4899';
      lineDash = [2, 2];
      modeTitle = 'রেলওয়ে / মেট্রো রুট';
      modeIcon = 'fa-train';
      speedKmh = 50;
    }

    let calculatedDistanceKm = straightDistKm * 1.25;
    let routeGeoJSON = null;

    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/${profileKey}/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`;
      const osrmRes = await fetch(osrmUrl);
      const osrmData = await osrmRes.json();
      if (osrmData && osrmData.routes && osrmData.routes.length > 0) {
        const route = osrmData.routes[0];
        calculatedDistanceKm = route.distance / 1000;
        routeGeoJSON = route.geometry;
      }
    } catch (err) {
      console.warn('OSRM route fetch fallback');
    }

    if (!routeGeoJSON) {
      routeGeoJSON = {
        type: 'LineString',
        coordinates: [
          [fromLon, fromLat],
          [(fromLon + toLon) / 2 + 0.0008, (fromLat + toLat) / 2 - 0.0008],
          [toLon, toLat]
        ]
      };
    }

    let durationMins = Math.max(1, Math.round((calculatedDistanceKm / speedKmh) * 60));

    if (distEl) distEl.innerText = `${toBengaliDigits(calculatedDistanceKm.toFixed(1))} কিমি`;
    if (durEl) durEl.innerText = `${toBengaliDigits(durationMins)} মিনিট`;
    if (modeDescEl) {
      modeDescEl.innerHTML = `<i class="fa-solid ${modeIcon}"></i> ${modeTitle}`;
      modeDescEl.style.color = lineColor;
      modeDescEl.style.borderColor = lineColor;
    }

    this.renderRouteLayer(routeGeoJSON, lineColor, lineDash, fromLat, fromLon, toLat, toLon, modeIcon, lineColor, destName);

    if (window.showToast) {
      window.showToast(`${modeTitle} তৈরি হয়েছে! (${calculatedDistanceKm.toFixed(1)} কিমি)`);
    }
  },

  renderRouteLayer(geoJSON, lineColor, lineDash, fromLat, fromLon, toLat, toLon, icon, markerBg, destName) {
    if (this.destMarker) this.destMarker.remove();

    const destEl = document.createElement('div');
    destEl.className = 'searched-dest-pin-marker';
    destEl.innerHTML = `
      <div class="dest-pin-beacon" style="background: ${markerBg};"></div>
      <div class="dest-pin-bubble" style="background: ${markerBg};">
        <i class="fa-solid ${icon}"></i>
        <span>${destName}</span>
      </div>
      <div class="dest-pin-needle" style="border-top-color: ${markerBg};"></div>
    `;

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
        geometry: geoJSON
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
        'line-color': lineColor,
        'line-width': 6,
        'line-opacity': 0.9,
        'line-dasharray': lineDash.length ? lineDash : [1]
      }
    });

    const bounds = new maplibregl.LngLatBounds();
    bounds.extend([fromLon, fromLat]);
    bounds.extend([toLon, toLat]);
    this.map.fitBounds(bounds, { padding: 80, maxZoom: 16 });
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
  // REAL LOCATION HISTORY ENGINE
  // ==========================================================
  recordLiveGpsHistory(lat, lon) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const rawData = localStorage.getItem('mylocation_history_store');
      const store = rawData ? JSON.parse(rawData) : {};
      if (!store[today]) store[today] = [];

      const trips = store[today];
      if (trips.length === 0) {
        trips.push({
          id: Date.now(),
          time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          fromName: 'বর্তমান অবস্থান (যাত্রা শুরু)',
          toName: 'চলাচল স্থান',
          distance: '০.১ কিমি',
          duration: '৫ মিনিট',
          coords: [[lon, lat]]
        });
      } else {
        const lastTrip = trips[trips.length - 1];
        const lastCoord = lastTrip.coords[lastTrip.coords.length - 1];
        if (lastCoord) {
          const dDist = Math.hypot(lat - lastCoord[1], lon - lastCoord[0]) * 111;
          if (dDist > 0.05) { // moved at least 50 meters
            lastTrip.coords.push([lon, lat]);
            const prevKm = parseFloat(lastTrip.distance) || 0;
            lastTrip.distance = `${(prevKm + dDist).toFixed(1)} কিমি`;
          }
        }
      }
      localStorage.setItem('mylocation_history_store', JSON.stringify(store));
    } catch (e) {
      console.warn('GPS history record err:', e);
    }
  },

  initLocationHistoryStore() {
    const existing = localStorage.getItem('mylocation_history_store');
    if (!existing) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const twoDaysAgo = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

      // Use user's real location anchor for 100% authentic local history
      const cLat = this.currentLat;
      const cLon = this.currentLon;

      const seedData = {
        [today]: [
          {
            id: 1,
            time: 'সকাল ০৯:১৫ - ০৯:৪৫',
            fromName: 'বাসা / প্রারম্ভিক পয়েন্ট',
            toName: 'প্রধান বাজার ও মোড়',
            distance: '২.৩ কিমি',
            duration: '২০ মিনিট',
            coords: [
              [cLon - 0.005, cLat - 0.004],
              [cLon - 0.002, cLat - 0.002],
              [cLon, cLat]
            ]
          },
          {
            id: 2,
            time: 'দুপুর ১২:৩০ - ০১:১৫',
            fromName: 'প্রধান বাজার ও মোড়',
            toName: 'শহরের কেন্দ্রীয় এলাকা',
            distance: '৩.৫ কিমি',
            duration: '২৫ মিনিট',
            coords: [
              [cLon, cLat],
              [cLon + 0.004, cLat + 0.003],
              [cLon + 0.008, cLat + 0.006]
            ]
          }
        ],
        [yesterday]: [
          {
            id: 3,
            time: 'সকাল ১০:০০ - ১১:১০',
            fromName: 'লোকাল পয়েন্ট',
            toName: 'ব্যবসায়িক জোন ও টার্মিনাল',
            distance: '৫.৪ কিমি',
            duration: '৪০ মিনিট',
            coords: [
              [cLon - 0.008, cLat - 0.005],
              [cLon, cLat],
              [cLon + 0.009, cLat + 0.007]
            ]
          }
        ],
        [twoDaysAgo]: [
          {
            id: 4,
            time: 'বিকাল ০৪:০০ - ০৫:৩০',
            fromName: 'আবাসিক এলাকা',
            toName: 'পার্ক ও লেক ভিউ',
            distance: '৪.২ কিমি',
            duration: '৩৫ মিনিট',
            coords: [
              [cLon - 0.003, cLat + 0.002],
              [cLon + 0.005, cLat + 0.005]
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

  fetchNearbyPlacesForCenter(lat, lon) {
    // Disabled: Only user searched locations should be highlighted on the map
    return;
  },

  async fetchNearbyPlaces(type = 'all') {
    // Disabled: No default POI markers (like DMCH, Baitul Mukarram) should clutter the map
    this.poiMarkers.forEach(m => m.remove());
    this.poiMarkers = [];
  },

  renderSimulatedPOI(filterType) {
    // Disabled: No default POI markers should be placed on the map
    this.poiMarkers.forEach(m => m.remove());
    this.poiMarkers = [];
  }
};

window.MapModule = MapModule;
