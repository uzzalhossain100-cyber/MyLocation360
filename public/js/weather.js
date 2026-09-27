/**
 * MYLOCATION360 - ADVANCED WEATHER SUITE & INTERACTIVE RADAR MODULE
 * Handles Live Weather, Exact Location Tracking, Hourly 24-hr Forecast,
 * Timezone-aware Clocks, and Global Weather Radar (Rain, Temp, Wind).
 */

const WeatherApp = {
  // Real GPS coordinates of the user
  myGpsLat: 23.8103,
  myGpsLon: 90.4125,
  myGpsExactAddress: 'ঢাকা, বাংলাদেশ',

  // Current viewed location (could be user's GPS or user's searched city)
  viewLat: 23.8103,
  viewLon: 90.4125,
  viewCityName: 'ঢাকা, বাংলাদেশ',
  viewTimezone: 'auto',
  isViewingMyGps: true,

  // Radar Map instance & layers
  radarMap: null,
  activeRadarLayer: 'wind', // 'wind', 'rain', 'radar', 'satellite', 'temp'
  radarTileLayers: {},
  isRadarMapUserInteracted: false,
  hasInitialGpsWeatherLoaded: false,
  currentWindyLat: 23.8103,
  currentWindyLon: 90.4125,
  currentWindyZoom: 6,

  init() {
    this.startLiveClock();
    this.setupEventListeners();
    this.fetchWeather(this.viewLat, this.viewLon, this.viewCityName, true);
  },

  // Set real GPS coordinates and exact reverse-geocoded address
  setMyGpsLocation(lat, lon, exactAddress) {
    this.myGpsLat = lat;
    this.myGpsLon = lon;
    if (exactAddress) {
      this.myGpsExactAddress = exactAddress;
    }

    // Reverse geocode exact real location (রোড, মহল্লা, থানা/উপজেলা, জেলা)
    this.reverseGeocodeMyPosition(lat, lon);

    // Initial load: view user's location weather
    if (!this.hasInitialGpsWeatherLoaded) {
      this.hasInitialGpsWeatherLoaded = true;
      this.fetchWeather(lat, lon, this.myGpsExactAddress, true);
    }
  },

  // Reverse geocoding to resolve exact location address
  async reverseGeocodeMyPosition(lat, lon) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=bn,en`);
      if (!res.ok) return;
      const data = await res.json();
      if (!data) return;

      const a = data.address || {};
      const parts = [];
      const placePart = a.neighbourhood || a.suburb || a.residential || a.quarter || a.hamlet;
      if (placePart) parts.push(placePart);
      if (a.road) parts.unshift(a.road);
      const cityPart = a.city || a.town || a.municipality || a.county || a.district;
      if (cityPart) parts.push(cityPart);

      let exact = parts.length > 0 ? parts.join(', ') : (data.display_name ? data.display_name.split(',').slice(0, 3).join(', ') : null);
      if (exact) {
        this.myGpsExactAddress = exact;
        if (this.isViewingMyGps) {
          this.viewCityName = exact;
          const cityEl = document.getElementById('cwCityName');
          if (cityEl) cityEl.innerText = exact;
        }
      }
    } catch (e) {
      console.warn('Reverse geocode error:', e);
    }
  },

  setupEventListeners() {
    // 1. Refresh current viewed weather
    const btnRefresh = document.getElementById('btnRefreshCurrentWeather');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        this.fetchWeather(this.viewLat, this.viewLon, this.viewCityName, this.isViewingMyGps);
        if (window.showToast) window.showToast('আবহাওয়া রিফ্রেশ করা হয়েছে');
      });
    }

    // 2. Reset to My Exact GPS Location Button
    const btnResetGps = document.getElementById('btnResetToMyGps');
    if (btnResetGps) {
      btnResetGps.addEventListener('click', () => {
        this.fetchWeather(this.myGpsLat, this.myGpsLon, this.myGpsExactAddress, true);
        if (window.showToast) window.showToast('📍 আপনার মূল অবস্থানের আবহাওয়া প্রদর্শিত হচ্ছে');
      });
    }

    // 3. Inline Location Changer / Search Input with Instant & Live Auto-Suggest
    const inputLoc = document.getElementById('weatherLocationInput');
    const btnSearchLoc = document.getElementById('btnChangeWeatherLocation');
    const btnClearSearch = document.getElementById('btnWeatherSearchClear');
    const dropdown = document.getElementById('weatherSearchDropdown');

    let debounceTimer = null;

    // Instant Popular Locations Dictionary for Zero-Lag Search Auto-Suggest
    const instantPlaces = [
      { name: 'ঢাকা', subdistrict: 'ঢাকা', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '23.8103', lon: '90.4125' },
      { name: 'চট্টগ্রাম', subdistrict: 'চট্টগ্রাম সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '22.3569', lon: '91.7832' },
      { name: 'সিলেট', subdistrict: 'সিলেট সদর', district: 'সিলেট বিভাগ', country: 'বাংলাদেশ', lat: '24.8949', lon: '91.8687' },
      { name: 'রাজশাহী', subdistrict: 'রাজশাহী সদর', district: 'রাজশাহী বিভাগ', country: 'বাংলাদেশ', lat: '24.3745', lon: '88.6042' },
      { name: 'খুলনা', subdistrict: 'খুলনা সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '22.8456', lon: '89.5403' },
      { name: 'বরিশাল', subdistrict: 'বরিশাল সদর', district: 'বরিশাল বিভাগ', country: 'বাংলাদেশ', lat: '22.7010', lon: '90.3535' },
      { name: 'রংপুর', subdistrict: 'রংপুর সদর', district: 'রংপুর বিভাগ', country: 'বাংলাদেশ', lat: '25.7439', lon: '89.2752' },
      { name: 'ময়মনসিংহ', subdistrict: 'ময়মনসিংহ সদর', district: 'ময়মনসিংহ বিভাগ', country: 'বাংলাদেশ', lat: '24.7471', lon: '90.4203' },
      { name: 'কক্সবাজার', subdistrict: 'কক্সবাজার সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '21.4272', lon: '92.0058' },
      { name: 'কুমিল্লা', subdistrict: 'কুমিল্লা আদর্শ সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '23.4607', lon: '91.1809' },
      { name: 'বগুড়া', subdistrict: 'বগুড়া সদর', district: 'রাজশাহী বিভাগ', country: 'বাংলাদেশ', lat: '24.8465', lon: '89.3770' },
      { name: 'যশোর', subdistrict: 'যশোর সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '23.1664', lon: '89.2081' },
      { name: 'দিনাজপুর', subdistrict: 'দিনাজপুর সদর', district: 'রংপুর বিভাগ', country: 'বাংলাদেশ', lat: '25.6217', lon: '88.6355' },
      { name: 'ফরিদপুর', subdistrict: 'ফরিদপুর সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '23.6071', lon: '89.8426' },
      { name: 'টাঙ্গাইল', subdistrict: 'টাঙ্গাইল সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '24.2513', lon: '89.9167' },
      { name: 'পাবনা', subdistrict: 'পাবনা সদর', district: 'রাজশাহী বিভাগ', country: 'বাংলাদেশ', lat: '24.0064', lon: '89.2372' },
      { name: 'কুষ্টিয়া', subdistrict: 'কুষ্টিয়া সদর', district: 'খুলনা বিভাগ', country: 'বাংলাদেশ', lat: '23.9013', lon: '89.1205' },
      { name: 'নোয়াখালী', subdistrict: 'নোয়াখালী সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '22.8696', lon: '91.0991' },
      { name: 'গাজীপুর', subdistrict: 'গাজীপুর সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '23.9999', lon: '90.4203' },
      { name: 'নারায়ণগঞ্জ', subdistrict: 'নারায়ণগঞ্জ সদর', district: 'ঢাকা বিভাগ', country: 'বাংলাদেশ', lat: '23.6238', lon: '90.5000' },
      { name: 'চাঁদপুর', subdistrict: 'চাঁদপুর সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '23.2332', lon: '90.6713' },
      { name: 'ফেনী', subdistrict: 'ফেনী সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '23.0159', lon: '91.3976' },
      { name: 'ব্রাহ্মণবাড়িয়া', subdistrict: 'ব্রাহ্মণবাড়িয়া সদর', district: 'চট্টগ্রাম বিভাগ', country: 'বাংলাদেশ', lat: '23.9571', lon: '91.1119' },
      { name: 'লন্ডন', subdistrict: 'London', district: 'England', country: 'United Kingdom', lat: '51.5072', lon: '-0.1276' },
      { name: 'নিউ ইয়র্ক', subdistrict: 'New York', district: 'NY', country: 'USA', lat: '40.7128', lon: '-74.0060' },
      { name: 'দুবাই', subdistrict: 'Dubai', district: 'Dubai', country: 'UAE', lat: '25.2048', lon: '55.2708' },
      { name: 'মক্কা', subdistrict: 'Makkah', district: 'Makkah', country: 'সৌদি আরব', lat: '21.3891', lon: '39.8579' },
      { name: 'মদিনা', subdistrict: 'Madinah', district: 'Madinah', country: 'সৌদি আরব', lat: '24.5247', lon: '39.5692' },
      { name: 'কলকাতা', subdistrict: 'Kolkata', district: 'West Bengal', country: 'ভারত', lat: '22.5726', lon: '88.3639' },
      { name: 'কুয়ালালামপুর', subdistrict: 'Kuala Lumpur', district: 'KL', country: 'মালয়েশিয়া', lat: '3.1390', lon: '101.6869' }
    ];

    const hideDropdown = () => {
      if (dropdown) {
        dropdown.style.display = 'none';
        dropdown.innerHTML = '';
      }
    };

    const renderSuggestions = (list) => {
      if (!dropdown) return;
      if (!list || list.length === 0) {
        dropdown.style.display = 'none';
        return;
      }

      dropdown.innerHTML = '';
      list.forEach(item => {
        const row = document.createElement('div');
        row.className = 'suggestion-item';

        const subTitle = [item.subdistrict, item.district, item.country].filter(Boolean).join(', ') || item.display_name;

        row.innerHTML = `
          <i class="fa-solid fa-location-dot suggestion-icon"></i>
          <div style="flex: 1; min-width: 0;">
            <div class="suggestion-title">${item.name}</div>
            <div class="suggestion-sub">${subTitle}</div>
          </div>
        `;

        row.addEventListener('click', (e) => {
          e.stopPropagation();
          if (inputLoc) inputLoc.value = item.name;
          hideDropdown();
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
          this.fetchWeather(lat, lon, item.name, false);
          if (this.radarMap) {
            this.radarMap.flyTo({ center: [lon, lat], zoom: 7.5, speed: 1.2 });
          }
        });

        dropdown.appendChild(row);
      });

      dropdown.style.display = 'block';
    };

    if (inputLoc) {
      inputLoc.addEventListener('input', () => {
        const q = inputLoc.value.trim().toLowerCase();
        if (btnClearSearch) btnClearSearch.style.display = q ? 'block' : 'none';
        if (debounceTimer) clearTimeout(debounceTimer);
        
        if (!q) {
          hideDropdown();
          return;
        }

        // 1. Instant local match for instantaneous response
        const instantMatches = instantPlaces.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.subdistrict.toLowerCase().includes(q) || 
          p.district.toLowerCase().includes(q)
        );
        if (instantMatches.length > 0) {
          renderSuggestions(instantMatches.slice(0, 6));
        }

        // 2. Fetch live full results from geocoding API
        debounceTimer = setTimeout(async () => {
          try {
            const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                renderSuggestions(data);
              } else if (instantMatches.length > 0) {
                renderSuggestions(instantMatches);
              }
            }
          } catch (e) {
            if (instantMatches.length > 0) {
              renderSuggestions(instantMatches);
            }
          }
        }, 220);
      });

      inputLoc.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          hideDropdown();
          this.handleSearchLocation(inputLoc.value.trim());
        }
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        inputLoc.value = '';
        btnClearSearch.style.display = 'none';
        hideDropdown();
      });
    }

    if (btnSearchLoc) {
      btnSearchLoc.addEventListener('click', () => {
        hideDropdown();
        const q = inputLoc ? inputLoc.value.trim() : '';
        if (!q) {
          if (window.showToast) window.showToast('দয়া করে কোনো স্থান, শহর বা দেশের নাম লিখুন');
          return;
        }
        this.handleSearchLocation(q);
      });
    }

    // Hide dropdown on clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.weather-inline-search-box')) {
        hideDropdown();
      }
    });

    // 4. Quick Popular City Chips
    const chips = document.querySelectorAll('.w-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const city = chip.getAttribute('data-city');
        const lat = parseFloat(chip.getAttribute('data-lat'));
        const lon = parseFloat(chip.getAttribute('data-lon'));
        if (inputLoc) inputLoc.value = city;
        this.fetchWeather(lat, lon, city, false);
        if (this.radarMap) {
          this.radarMap.flyTo({ center: [lon, lat], zoom: 7.5, speed: 1.2 });
        }
      });
    });

    // 5. Weather Map Layer Toggle Buttons (স্যাটেলাইট, রাডার, বাতাসের গতি, তাপমাত্রা, বৃষ্টিপাত)
    const layerBtns = document.querySelectorAll('.w-layer-btn');
    layerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        layerBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const layer = btn.getAttribute('data-layer');
        this.switchRadarLayer(layer);
      });
    });

    // 6. Real-time Message Listener for Windy Engine Panning, Dragging & Coordinates
    window.addEventListener('message', (event) => {
      try {
        if (event.data && typeof event.data === 'object') {
          // Windy embed postMessage format: { type: "updateValues", payload: { coordinates: { lat, lon }, zoom, overlay } }
          if (event.data.type === 'updateValues' && event.data.payload) {
            const p = event.data.payload;
            if (p.coordinates && typeof p.coordinates.lat === 'number' && typeof p.coordinates.lon === 'number') {
              this.currentWindyLat = p.coordinates.lat;
              this.currentWindyLon = p.coordinates.lon;
              if (p.zoom) this.currentWindyZoom = p.zoom;
              this.isRadarMapUserInteracted = true;

              const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);
              const statusText = document.getElementById('radarStatusText');
              if (statusText) {
                statusText.innerHTML = `📍 নির্বাচিত মানচিত্র স্থান: <b>${toBengaliDigits(this.currentWindyLat.toFixed(2))}°N, ${toBengaliDigits(this.currentWindyLon.toFixed(2))}°E</b> • বাতাস, বৃষ্টি, তাপমাত্রা, রাডার বা স্যাটেলাইটে ক্লিক করলে ঠিক এই স্থানের উপর জীবন্ত ফলাফল দেখাবে`;
              }
            }
          }
        }
      } catch (e) {}
    });

    const resetRadarToUserLocation = () => {
      this.isRadarMapUserInteracted = false;
      this.currentWindyLat = this.myGpsLat || 23.8103;
      this.currentWindyLon = this.myGpsLon || 90.4125;
      this.currentWindyZoom = 7;

      const iframe = document.getElementById('liveWeatherFrame');
      if (iframe) {
        const overlay = this.activeRadarLayer || 'wind';
        iframe.src = `https://embed.windy.com/embed2.html?lat=${this.currentWindyLat}&lon=${this.currentWindyLon}&zoom=7&level=surface&overlay=${overlay}&product=ecmwf&menu=true&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1&embedMake=true`;
      }

      this.fetchWeather(this.myGpsLat || 23.8103, this.myGpsLon || 90.4125, this.myGpsExactAddress, true);
      const statusText = document.getElementById('radarStatusText');
      if (statusText) {
        statusText.innerText = '📍 আপনার বর্তমান জিপিএস অবস্থানের আবহাওয়া ও Windy লাইভ মানচিত্র প্রদর্শিত হচ্ছে';
      }
      if (window.showToast) window.showToast('📍 আবহাওয়া মানচিত্র আপনার বর্তমান অবস্থানে ফিরিয়ে আনা হয়েছে');
    };

    const btnRadarRefresh = document.getElementById('btnRefreshRadarToMyGps');
    if (btnRadarRefresh) {
      btnRadarRefresh.addEventListener('click', resetRadarToUserLocation);
    }

    const btnFloatRadar = document.getElementById('btnFloatingRadarRecenter');
    if (btnFloatRadar) {
      btnFloatRadar.addEventListener('click', resetRadarToUserLocation);
    }
  },

  async handleSearchLocation(query) {
    if (!query) return;
    if (window.showToast) window.showToast(`"${query}" এর আবহাওয়া অনুসন্ধান করা হচ্ছে...`);

    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      const results = await res.json();
      if (results && results.length > 0) {
        const p = results[0];
        const lat = parseFloat(p.lat);
        const lon = parseFloat(p.lon);
        this.fetchWeather(lat, lon, p.name || p.display_name.split(',')[0], false);
        if (this.radarMap) {
          this.radarMap.flyTo({ center: [lon, lat], zoom: 7.5, speed: 1.2 });
        }
        return;
      }

      // Nominatim Direct Fallback
      const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const fallbackData = await fallbackRes.json();
      if (fallbackData && fallbackData.length > 0) {
        const p = fallbackData[0];
        this.fetchWeather(parseFloat(p.lat), parseFloat(p.lon), p.display_name.split(',')[0], false);
        if (this.radarMap) {
          this.radarMap.flyTo({ center: [parseFloat(p.lon), parseFloat(p.lat)], zoom: 7.5, speed: 1.2 });
        }
        return;
      }

      alert(`দুঃখিত, "${query}" খুঁজে পাওয়া যায়নি। অনুগ্রহ করে সঠিক নাম লিখুন।`);
    } catch (e) {
      console.error('Weather search error:', e);
      alert('অনুসন্ধানে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  },

  // Timezone-Aware Live Digital Clock & Date
  startLiveClock() {
    const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const banglaMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const toBengaliDigits = (num) => num.toString().replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);

    const getFormattedTimeAndDate = (tz) => {
      const now = new Date();
      let target = now;
      if (tz && tz !== 'auto') {
        try {
          const invdate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
          if (!isNaN(invdate.getTime())) {
            target = invdate;
          }
        } catch (e) {}
      }

      const dayName = banglaDays[target.getDay()];
      const dateNum = toBengaliDigits(target.getDate());
      const monthName = banglaMonths[target.getMonth()];
      const yearNum = toBengaliDigits(target.getFullYear());
      const fullDateStr = `${dateNum} ${monthName} ${yearNum}`;

      let hours = target.getHours();
      let minutes = target.getMinutes();
      let seconds = target.getSeconds();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const padZero = (n) => (n < 10 ? '0' + n : n);
      const timeStr = `${toBengaliDigits(padZero(hours))}:${toBengaliDigits(padZero(minutes))}:${toBengaliDigits(padZero(seconds))} ${ampm}`;

      return { dayName, fullDateStr, timeStr };
    };

    const updateTimes = () => {
      const loc = getFormattedTimeAndDate(this.viewTimezone);
      const cwDay = document.getElementById('cwDayName');
      const cwDate = document.getElementById('cwDateFull');
      const cwClock = document.getElementById('cwLiveClock');
      if (cwDay) cwDay.innerText = loc.dayName;
      if (cwDate) cwDate.innerText = loc.fullDateStr;
      if (cwClock) cwClock.innerText = loc.timeStr;
    };

    updateTimes();
    setInterval(updateTimes, 1000);
  },

  // Parse WMO Weather Codes
  parseWmoCode(code, isDay = 1, tempC = 25) {
    const isNight = (isDay === 0);

    if (code === 0) {
      if (isNight) {
        return { text: 'পরিষ্কার রাতের আকাশ (চাঁদ ও তারা)', icon: '🌙', scene: 'clear-night', badge: 'তারায় ভরা রাতের আকাশ (চাঁদ ও তারা)' };
      }
      return { text: 'রোদ্রোজ্জ্বল পরিষ্কার আকাশ', icon: '☀️', scene: 'clear-day', badge: 'রোদ্রোজ্জ্বল দিনের দৃশ্য' };
    } else if (code === 1 || code === 2) {
      if (isNight) {
        return { text: 'রাতের আকাশে চাঁদের পাশে মেঘ', icon: '☁️', scene: 'partly-cloudy-night', badge: 'রাতের আংশিক মেঘলা দৃশ্য' };
      }
      return { text: 'আংশিক মেঘলা আকাশ', icon: '🌤️', scene: 'partly-cloudy-day', badge: 'আংশিক মেঘলা দিনের দৃশ্য' };
    } else if (code === 3) {
      if (isNight) {
        return { text: 'রাতের মেঘাচ্ছন্ন আকাশ (অন্ধকারে মেঘ)', icon: '☁️', scene: 'cloudy-night', badge: 'রাতের মেঘাচ্ছন্ন দৃশ্য (অন্ধকারে দৃশ্যমান মেঘ)' };
      }
      return { text: 'মেঘাচ্ছন্ন (আকাশ মেঘলা)', icon: '☁️', scene: 'cloudy', badge: 'মেঘলা আকাশের দৃশ্য' };
    } else if (code === 45 || code === 48) {
      if (isNight) {
        return { text: 'রাতের শীতকালীন কুয়াশা', icon: '🌫️', scene: 'fog-night', badge: 'রাতের শীত ও কুয়াশার দৃশ্য' };
      }
      return { text: 'কুয়াশাচ্ছন্ন ও শীতকালীন পরিবেশ', icon: '🌫️', scene: 'fog', badge: 'কুয়াশা ও শীতকালীন দৃশ্য' };
    } else if (code >= 51 && code <= 55) {
      if (isNight) {
        return { text: 'রাতে হালকা গুঁড়ি গুঁড়ি বৃষ্টি', icon: '🌦️', scene: 'rain-night', badge: 'রাতের বৃষ্টির দৃশ্য (অন্ধকারে বৃষ্টি)' };
      }
      return { text: 'হালকা গুঁড়ি গুঁড়ি বৃষ্টি', icon: '🌦️', scene: 'rain', badge: 'গুঁড়ি গুঁড়ি বৃষ্টির দৃশ্য' };
    } else if (code >= 61 && code <= 65) {
      if (isNight) {
        return { text: 'রাতে রিমঝিম বৃষ্টি পড়ছে', icon: '🌧️', scene: 'rain-night', badge: 'রাতের বৃষ্টির দৃশ্য (অন্ধকারে বৃষ্টি)' };
      }
      return { text: 'বৃষ্টি পড়ছে', icon: '🌧️', scene: 'rain', badge: 'বৃষ্টির জীবন্ত দৃশ্য' };
    } else if (code >= 71 && code <= 77) {
      return { text: 'তুষারপাত / শৈত্য', icon: '🌨️', scene: 'snow', badge: 'শীত ও তুষারপাতের দৃশ্য' };
    } else if (code >= 80 && code <= 82) {
      if (isNight) {
        return { text: 'রাতে বৃষ্টির ধারা পড়ছে', icon: '🌧️', scene: 'rain-night', badge: 'রাতের বৃষ্টির দৃশ্য (অন্ধকারে বৃষ্টি)' };
      }
      return { text: 'বৃষ্টির ধারা পড়ছে', icon: '🌧️', scene: 'rain', badge: 'বৃষ্টির জীবন্ত দৃশ্য' };
    } else if (code >= 95 && code <= 99) {
      if (isNight) {
        return { text: 'রাতের বজ্রঝড় ও বিদ্যুৎ ঝলকানি', icon: '⛈️', scene: 'storm-night', badge: 'রাতের বজ্রঝড় ও বিদ্যুৎ ঝলকানি' };
      }
      return { text: 'বজ্রঝড় ও ভারী বৃষ্টি', icon: '⛈️', scene: 'storm', badge: 'বজ্রঝড় ও মেঘের গর্জন' };
    } else {
      if (isNight) return { text: 'রাতের শান্ত পরিবেশ', icon: '🌙', scene: 'clear-night', badge: 'তারায় ভরা রাতের শান্ত দৃশ্য' };
      return { text: 'স্বাভাবিক আবহাওয়া', icon: '🌤️', scene: 'clear-day', badge: 'স্বাভাবিক পরিবেশ' };
    }
  },

  // Wind Direction Compass & Flow Calculation
  getWindFlowDescription(deg) {
    if (deg === undefined || deg === null || isNaN(deg)) {
      return { flowText: 'বাতাস শান্ত', arrow: '⬆️', angle: 0 };
    }

    const val = Math.floor((deg / 22.5) + 0.5) % 16;
    const directions = [
      { name: 'উত্তর', to: 'দক্ষিণ', arrow: '⬇️' },
      { name: 'উত্তর-উত্তরপূর্ব', to: 'দক্ষিণ-দক্ষিণপশ্চিম', arrow: '↙️' },
      { name: 'উত্তর-পূর্ব', to: 'দক্ষিণ-পশ্চিম', arrow: '↙️' },
      { name: 'পূর্ব-উত্তরপূর্ব', to: 'পশ্চিম-দক্ষিণপশ্চিম', arrow: '↙️' },
      { name: 'পূর্ব', to: 'পশ্চিম', arrow: '⬅️' },
      { name: 'পূর্ব-দক্ষিণপূর্ব', to: 'পশ্চিম-উত্তরপশ্চিম', arrow: '↖️' },
      { name: 'দক্ষিণ-পূর্ব', to: 'উত্তর-পশ্চিম', arrow: '↖️' },
      { name: 'দক্ষিণ-দক্ষিণপূর্ব', to: 'উত্তর-উত্তরপশ্চিম', arrow: '↖️' },
      { name: 'দক্ষিণ', to: 'উত্তর', arrow: '⬆️' },
      { name: 'দক্ষিণ-দক্ষিণপশ্চিম', to: 'উত্তর-উত্তরপূর্ব', arrow: '↗️' },
      { name: 'দক্ষিণ-পশ্চিম', to: 'উত্তর-পূর্ব', arrow: '↗️' },
      { name: 'পশ্চিম-দক্ষিণপশ্চিম', to: 'পূর্ব-উত্তরপূর্ব', arrow: '↗️' },
      { name: 'পশ্চিম', to: 'পূর্ব', arrow: '➡️' },
      { name: 'পশ্চিম-উত্তরপশ্চিম', to: 'পূর্ব-দক্ষিণপূর্ব', arrow: '↘️' },
      { name: 'উত্তর-পশ্চিম', to: 'দক্ষিণ-পূর্ব', arrow: '↘️' },
      { name: 'উত্তর-উত্তরপশ্চিম', to: 'দক্ষিণ-দক্ষিণপূর্ব', arrow: '↘️' }
    ];

    const d = directions[val] || directions[0];
    return {
      flowText: `${d.name} থেকে ${d.to} দিকে ${d.arrow}`,
      arrow: d.arrow,
      angle: deg
    };
  },

  // Primary Comprehensive Weather Fetcher
  async fetchWeather(lat, lon, cityName, isMyGps = false) {
    this.viewLat = lat;
    this.viewLon = lon;
    this.viewCityName = cityName || 'চিহ্নিত স্থান';
    this.isViewingMyGps = isMyGps;

    // Update Top Badges & Address Display
    const elCity = document.getElementById('cwCityName');
    const badgeText = document.getElementById('cwLocationBadgeText');
    const btnResetGps = document.getElementById('btnResetToMyGps');

    if (elCity) elCity.innerText = this.viewCityName;

    // If city name is not provided (e.g. user dragged the weather map to a new location), reverse-geocode it
    if (!cityName) {
      fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.display_name) {
            const parts = data.display_name.split(',').map(s => s.trim());
            const shortName = parts.slice(0, 2).join(', ');
            this.viewCityName = shortName || parts[0];
            if (elCity) elCity.innerText = this.viewCityName;
          }
        })
        .catch(() => {});
    }

    if (badgeText) {
      badgeText.innerText = isMyGps ? 'বর্তমান জিপিএস লোকেশন' : 'মানচিত্রের নির্বাচিত স্থান';
      badgeText.style.color = isMyGps ? '#a7f3d0' : '#bae6fd';
    }

    if (btnResetGps) {
      btnResetGps.style.display = isMyGps ? 'none' : 'inline-flex';
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m&timezone=auto&forecast_days=3`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather API failed');
      const data = await response.json();

      if (data && data.timezone) {
        this.viewTimezone = data.timezone;
      }

      const current = data.current || {};
      const daily = data.daily || {};
      const hourly = data.hourly || {};

      const temp = Math.round(current.temperature_2m ?? 30);
      const feelsLike = Math.round(current.apparent_temperature ?? (temp + 2));
      const rainChance = current.precipitation_probability !== undefined ? current.precipitation_probability : (current.precipitation > 0 ? 80 : 15);
      const windSpeed = Math.round(current.wind_speed_10m ?? 12);
      const windDirDeg = current.wind_direction_10m ?? 220;
      const humidity = Math.round(current.relative_humidity_2m ?? 65);

      const minTemp = daily.temperature_2m_min && daily.temperature_2m_min[0] !== undefined ? Math.round(daily.temperature_2m_min[0]) : (temp - 4);
      const maxTemp = daily.temperature_2m_max && daily.temperature_2m_max[0] !== undefined ? Math.round(daily.temperature_2m_max[0]) : (temp + 3);
      const weatherCode = current.weather_code ?? 0;
      
      const hours = new Date().getHours();
      const isDay = current.is_day !== undefined ? current.is_day : (hours >= 6 && hours < 18 ? 1 : 0);

      const condition = this.parseWmoCode(weatherCode, isDay, temp);
      const windFlow = this.getWindFlowDescription(windDirDeg);

      const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);

      // DOM Updates
      document.getElementById('cwTemp').innerText = toBengaliDigits(temp);
      document.getElementById('cwFeelsLike').innerText = toBengaliDigits(feelsLike);
      document.getElementById('cwConditionIcon').innerText = condition.icon;
      document.getElementById('cwConditionName').innerText = condition.text;
      document.getElementById('cwRainChance').innerText = `${toBengaliDigits(rainChance)}%`;
      document.getElementById('cwWindSpeed').innerText = `${toBengaliDigits(windSpeed)} কিমি/ঘণ্টা`;
      
      const windDirEl = document.getElementById('cwWindDirection');
      if (windDirEl) {
        windDirEl.innerText = windFlow.flowText;
      }

      const windIconWrap = document.getElementById('cwWindIconWrap');
      if (windIconWrap) {
        windIconWrap.innerHTML = `<i class="fa-solid fa-location-arrow" style="transform: rotate(${windDirDeg - 45}deg); transition: transform 0.4s ease; color:#38bdf8;"></i>`;
      }

      document.getElementById('cwHumidity').innerText = `${toBengaliDigits(humidity)}%`;
      
      // MINIMUM & MAXIMUM TEMPERATURE
      const minMaxEl = document.getElementById('cwMinMaxTemp');
      if (minMaxEl) {
        minMaxEl.innerText = `${toBengaliDigits(minTemp)}° / ${toBengaliDigits(maxTemp)}° সে.`;
      }

      document.getElementById('cwAnimBadge').innerText = condition.badge;

      // Update Animated Weather Scene with Actual Sunrise/Sunset and Local Time
      if (window.WeatherScenes && window.WeatherScenes.currentLocationScene) {
        if (daily.sunrise && daily.sunrise[0] && daily.sunset && daily.sunset[0]) {
          window.WeatherScenes.currentLocationScene.setCelestialTimes(daily.sunrise[0], daily.sunset[0], data.timezone);
        }
        window.WeatherScenes.currentLocationScene.setScene(condition.scene);
      }

      // Render Next 24-Hour Hourly Forecast strictly starting from CURRENT hour
      this.renderHourlyForecast(hourly, current.time);

    } catch (err) {
      console.warn('Weather fetch error:', err);
    }
  },

  // Update Direct Links for external viewing (Zoom Earth / Windy external tabs)
  updateSimulationFrame(lat, lon, layerType, force = false) {
    const zoomEarthLink = document.getElementById('zoomEarthLink');
    const windyDirectLink = document.getElementById('windyDirectLink');

    let windyDirectPath = 'wind';
    if (layerType === 'satellite') {
      windyDirectPath = '-Satellite-satellite?satellite';
    } else if (layerType === 'radar') {
      windyDirectPath = '-Weather-radar-radar?radar';
    } else if (layerType === 'temp') {
      windyDirectPath = '-Temperature-temp?temp';
    } else if (layerType === 'rain') {
      windyDirectPath = '-Rain-thunder-rain?rain';
    } else {
      windyDirectPath = '-Wind-wind?wind';
    }

    if (windyDirectLink) {
      windyDirectLink.href = `https://www.windy.com/${windyDirectPath},${lat},${lon},6`;
    }

    if (zoomEarthLink) {
      const zoomPath = layerType === 'satellite' ? 'satellite' :
                       layerType === 'wind' ? 'wind-speed' :
                       layerType === 'temp' ? 'temperature' :
                       layerType === 'rain' ? 'precipitation' : 'radar';
      zoomEarthLink.href = `https://zoom.earth/maps/${zoomPath}/#view=${lat},${lon},6z/model=icon`;
    }
  },

  // Render Next 24-Hour Forecast (Hourly Timeline strictly starting from CURRENT hour)
  renderHourlyForecast(hourly, currentLocalTimeStr) {
    const container = document.getElementById('hourlyTimelineContainer');
    if (!container) return;

    if (!hourly || !hourly.time || hourly.time.length === 0) {
      container.innerHTML = `<div class="hourly-loading">পূর্বাভাস ডেটা পাওয়া যায়নি</div>`;
      return;
    }

    const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);

    // Determine current local hour in "YYYY-MM-DDTHH" format
    let currentHourPrefix = '';
    if (currentLocalTimeStr && typeof currentLocalTimeStr === 'string') {
      currentHourPrefix = currentLocalTimeStr.slice(0, 13); // e.g. "2026-09-27T14"
    } else {
      try {
        const nowObj = this.viewTimezone 
          ? new Date(new Date().toLocaleString('en-US', { timeZone: this.viewTimezone }))
          : new Date();
        const pad = (n) => String(n).padStart(2, '0');
        currentHourPrefix = `${nowObj.getFullYear()}-${pad(nowObj.getMonth() + 1)}-${pad(nowObj.getDate())}T${pad(nowObj.getHours())}`;
      } catch (e) {
        const nowObj = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        currentHourPrefix = `${nowObj.getFullYear()}-${pad(nowObj.getMonth() + 1)}-${pad(nowObj.getDate())}T${pad(nowObj.getHours())}`;
      }
    }

    // Find the exact index for current hour in hourly.time
    let startIndex = hourly.time.findIndex(t => t.startsWith(currentHourPrefix));
    
    // If exact hour match not found, find the first entry that is greater than or equal to currentHourPrefix
    if (startIndex === -1) {
      startIndex = hourly.time.findIndex(t => t >= currentHourPrefix);
    }

    // Safety fallback: ensure startIndex is at least 0
    if (startIndex === -1) {
      startIndex = 0;
    }

    const count = 24; // Strictly next 24 hours
    container.innerHTML = '';

    const endIndex = Math.min(hourly.time.length, startIndex + count);
    for (let i = startIndex; i < endIndex; i++) {
      const timeStr = hourly.time[i]; // "2026-09-27T14:00"
      
      // Extract hour directly from string to prevent timezone distortion
      const timePart = timeStr.split('T')[1] || '12:00';
      const hourNum = parseInt(timePart.split(':')[0], 10);
      
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      let hour12 = hourNum % 12;
      hour12 = hour12 ? hour12 : 12;

      const isFirst = (i === startIndex);
      const displayHour = isFirst ? 'এখন' : `${toBengaliDigits(hour12)} ${ampm}`;

      const tTemp = Math.round(hourly.temperature_2m ? hourly.temperature_2m[i] : 28);
      const tRain = Math.round(hourly.precipitation_probability ? hourly.precipitation_probability[i] : 10);
      const tCode = hourly.weather_code ? hourly.weather_code[i] : 0;
      const tWind = Math.round(hourly.wind_speed_10m ? hourly.wind_speed_10m[i] : 10);

      const isNight = (hourNum < 6 || hourNum >= 18);
      const icon = (tCode === 0) ? (isNight ? '🌙' : '☀️') :
                   (tCode <= 2) ? (isNight ? '☁️' : '🌤️') :
                   (tCode === 3) ? '☁️' :
                   (tCode === 45 || tCode === 48) ? '🌫️' :
                   (tCode >= 51 && tCode <= 65) ? '🌧️' :
                   (tCode >= 95) ? '⛈️' : '🌦️';

      const item = document.createElement('div');
      item.className = `hourly-col-item ${isFirst ? 'is-current' : ''}`;
      item.innerHTML = `
        <span class="hourly-time">${displayHour}</span>
        <span class="hourly-icon">${icon}</span>
        <span class="hourly-temp">${toBengaliDigits(tTemp)}°C</span>
        <span class="hourly-rain"><i class="fa-solid fa-droplet"></i> ${toBengaliDigits(tRain)}%</span>
        <span class="hourly-wind"><i class="fa-solid fa-wind"></i> ${toBengaliDigits(tWind)}</span>
      `;
      container.appendChild(item);
    }
  },

  // Ensure weather radar map is initialized and rendered with correct container dimensions
  ensureRadarMapReady() {
    const container = document.getElementById('weatherRadarMap');
    if (!container) return;

    if (!this.radarMap) {
      this.initWeatherRadarMap();
    } else {
      try {
        this.radarMap.resize();
      } catch (e) {}
    }

    // Trigger progressive resize checks across tab open animations
    [50, 150, 300, 600, 1000].forEach(delay => {
      setTimeout(() => {
        if (this.radarMap) {
          try {
            this.radarMap.resize();
          } catch (e) {}
        }
      }, delay);
    });
  },

  // ==========================================================
  // INTERACTIVE BANGLADESH & GLOBAL WEATHER RADAR MAP
  // ==========================================================
  initWeatherRadarMap() {
    const container = document.getElementById('weatherRadarMap');
    if (!container) return;
    if (this.radarMap) return;

    try {
      this.radarMap = new maplibregl.Map({
        container: 'weatherRadarMap',
        style: {
          version: 8,
          sources: {
            'radar-osm': {
              type: 'raster',
              tiles: [
                'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
                'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              maxzoom: 19,
              attribution: 'CartoDB / OpenStreetMap'
            },
            'radar-satellite': {
              type: 'raster',
              tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
              ],
              tileSize: 256,
              maxzoom: 19,
              attribution: 'Esri World Imagery'
            }
          },
          layers: [
            {
              id: 'radar-osm-layer',
              type: 'raster',
              source: 'radar-osm',
              minzoom: 0,
              maxzoom: 19,
              paint: { 'raster-opacity': 1 }
            },
            {
              id: 'radar-satellite-layer',
              type: 'raster',
              source: 'radar-satellite',
              minzoom: 0,
              maxzoom: 19,
              layout: { 'visibility': 'none' },
              paint: { 'raster-opacity': 1 }
            }
          ]
        },
        center: [this.myGpsLon || 90.35, this.myGpsLat || 23.68],
        zoom: 6.2,
        maxZoom: 18,
        minZoom: 1.5
      });

      this.radarMap.addControl(new maplibregl.NavigationControl({
        showCompass: true,
        showZoom: true
      }), 'top-left');

      this.radarMap.on('load', async () => {
        try {
          this.radarMap.resize();
        } catch (e) {}

        this.renderWeatherPoints();
        await this.loadRainRadarTiles();
        this.applyRadarMapLayers(this.activeRadarLayer || 'rain');
      });

      // Track Map Dragging / Panning to New Location
      this.radarMap.on('movestart', () => {
        this.isRadarMapUserInteracted = true;
      });

      this.radarMap.on('moveend', () => {
        const center = this.radarMap.getCenter();
        this.draggedLat = center.lat;
        this.draggedLon = center.lng;
        this.isRadarMapUserInteracted = true;

        const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);
        const statusText = document.getElementById('radarStatusText');
        if (statusText) {
          statusText.innerHTML = `📍 মানচিত্র স্থান: <b>${toBengaliDigits(center.lat.toFixed(2))}°N, ${toBengaliDigits(center.lng.toFixed(2))}°E</b> • অন্য যে কোন বাটনে চাপ দিলে এই স্থানের আবহাওয়া দৃশ্যমান হবে (কোনো রিফ্রেশ হবে না)`;
        }
      });

    } catch (e) {
      console.warn('Weather Radar Map init error:', e);
    }
  },

  // Apply map layer visibilities without changing map center/zoom
  applyRadarMapLayers(layerType) {
    if (!this.radarMap || !this.radarMap.isStyleLoaded()) return;

    try {
      if (layerType === 'satellite') {
        if (this.radarMap.getLayer('radar-satellite-layer')) {
          this.radarMap.setLayoutProperty('radar-satellite-layer', 'visibility', 'visible');
        }
        if (this.radarMap.getLayer('radar-osm-layer')) {
          this.radarMap.setLayoutProperty('radar-osm-layer', 'visibility', 'none');
        }
        if (this.radarMap.getLayer('rain-radar-layer')) {
          this.radarMap.setPaintProperty('rain-radar-layer', 'raster-opacity', 0.45);
        }
      } else {
        if (this.radarMap.getLayer('radar-satellite-layer')) {
          this.radarMap.setLayoutProperty('radar-satellite-layer', 'visibility', 'none');
        }
        if (this.radarMap.getLayer('radar-osm-layer')) {
          this.radarMap.setLayoutProperty('radar-osm-layer', 'visibility', 'visible');
        }
        if (this.radarMap.getLayer('rain-radar-layer')) {
          const rainOpacity = (layerType === 'rain' || layerType === 'radar') ? 0.78 : 0.25;
          this.radarMap.setPaintProperty('rain-radar-layer', 'raster-opacity', rainOpacity);
        }
      }
    } catch (err) {
      console.warn('Apply layers error:', err);
    }
  },

  // Load RainViewer Live Global Radar Tiles
  async loadRainRadarTiles() {
    if (!this.radarMap) return;
    try {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      const data = await res.json();
      if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
        const latest = data.radar.past[data.radar.past.length - 1];
        const tileUrl = `${data.host}${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;

        if (this.radarMap.getSource('rain-radar-source')) {
          this.radarMap.removeLayer('rain-radar-layer');
          this.radarMap.removeSource('rain-radar-source');
        }

        this.radarMap.addSource('rain-radar-source', {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          maxzoom: 18
        });

        this.radarMap.addLayer({
          id: 'rain-radar-layer',
          type: 'raster',
          source: 'rain-radar-source',
          paint: {
            'raster-opacity': 0.78
          }
        });
      }
    } catch (e) {
      console.warn('RainViewer load error:', e);
    }
  },

  // Render Regional Weather Points on Map (Bangladesh Districts & Major Global Cities)
  renderWeatherPoints() {
    if (!this.radarMap) return;

    const weatherPoints = [
      { name: 'ঢাকা', temp: '৩১°', cond: '☀️', rain: '২০%', wind: '১২ কিমি/ঘণ্টা পূ.', lat: 23.8103, lon: 90.4125 },
      { name: 'চট্টগ্রাম', temp: '২৯°', cond: '🌧️', rain: '৮৫%', wind: '১৮ কিমি/ঘণ্টা দ.-পূ.', lat: 22.3569, lon: 91.7832 },
      { name: 'সিলেট', temp: '২৭°', cond: '🌦️', rain: '৬৫%', wind: '১০ কিমি/ঘণ্টা উ.-পূ.', lat: 24.8949, lon: 91.8687 },
      { name: 'কক্সবাজার', temp: '২৮°', cond: '🌧️', rain: '৯০%', wind: '২২ কিমি/ঘণ্টা দ.', lat: 21.4272, lon: 92.0058 },
      { name: 'রাজশাহী', temp: '৩৩°', cond: '☀️', rain: '১০%', wind: '১৪ কিমি/ঘণ্টা প.', lat: 24.3636, lon: 88.6241 },
      { name: 'খুলনা', temp: '৩০°', cond: '🌤️', rain: '৩৫%', wind: '১৬ কিমি/ঘণ্টা দ.-প.', lat: 22.8456, lon: 89.5403 },
      { name: 'বরিশাল', temp: '২৯°', cond: '🌦️', rain: '৫৫%', wind: '১৫ কিমি/ঘণ্টা দ.', lat: 22.7010, lon: 90.3535 },
      { name: 'রংপুর', temp: '২৯°', cond: '🌤️', rain: '২৫%', wind: '১২ কিমি/ঘণ্টা উ.', lat: 25.7439, lon: 89.2752 },
      { name: 'কলকাতা', temp: '৩২°', cond: '☀️', rain: '১৫%', wind: '১৩ কিমি/ঘণ্টা দ.-প.', lat: 22.5726, lon: 88.3639 },
      { name: 'দিল্লি', temp: '৩৪°', cond: '☀️', rain: '৫%', wind: '১৫ কিমি/ঘণ্টা উ.-প.', lat: 28.6139, lon: 77.2090 },
      { name: 'ব্যাংকক', temp: '৩১°', cond: '🌧️', rain: '৭০%', wind: '১৪ কিমি/ঘণ্টা দ.-পূ.', lat: 13.7563, lon: 100.5018 },
      { name: 'লন্ডন', temp: '১৮°', cond: '🌦️', rain: '৪০%', wind: '২০ কিমি/ঘণ্টা প.', lat: 51.5074, lon: -0.1278 },
      { name: 'নিউ ইয়র্ক', temp: '২২°', cond: '🌤️', rain: '২০%', wind: '১৬ কিমি/ঘণ্টা উ.', lat: 40.7128, lon: -74.0060 },
      { name: 'টোকিও', temp: '২৪°', cond: '☁️', rain: '৩০%', wind: '১২ কিমি/ঘণ্টা পূ.', lat: 35.6762, lon: 139.6503 }
    ];

    weatherPoints.forEach(p => {
      const el = document.createElement('div');
      el.className = 'radar-weather-pin';
      el.innerHTML = `
        <div class="pin-badge pin-${this.activeRadarLayer}">
          <span class="pin-cond">${p.cond}</span>
          <span class="pin-val">${this.activeRadarLayer === 'temp' ? p.temp : (this.activeRadarLayer === 'wind' ? p.wind : p.rain)}</span>
          <span class="pin-city">${p.name}</span>
        </div>
      `;

      el.addEventListener('click', () => {
        this.fetchWeather(p.lat, p.lon, p.name, false);
        if (window.showToast) window.showToast(`📍 ${p.name}-এর আবহাওয়া লোড করা হয়েছে`);
      });

      new maplibregl.Marker({ element: el })
        .setLngLat([p.lon, p.lat])
        .addTo(this.radarMap);
    });
  },

  // Switch Radar Layer: 'satellite', 'radar', 'wind', 'temp', 'rain'
  // CRITICAL USER REQUIREMENT: When clicking wind, rain, temp, radar, satellite, show results
  // for the EXACT location the user is currently at/dragged to, without resetting!
  async switchRadarLayer(layerType) {
    this.activeRadarLayer = layerType;
    const statusText = document.getElementById('radarStatusText');
    const iframe = document.getElementById('liveWeatherFrame');

    // Read the exact coordinates of the location where user is currently looking or dragged to
    const targetLat = (this.isRadarMapUserInteracted && this.currentWindyLat) ? this.currentWindyLat : (this.viewLat || 23.8103);
    const targetLon = (this.isRadarMapUserInteracted && this.currentWindyLon) ? this.currentWindyLon : (this.viewLon || 90.4125);
    const targetZoom = this.currentWindyZoom || 6;

    let overlay = 'wind';
    let product = 'ecmwf';
    if (layerType === 'satellite') { overlay = 'satellite'; product = 'satellite'; }
    else if (layerType === 'radar') { overlay = 'radar'; product = 'radar'; }
    else if (layerType === 'rain') { overlay = 'rain'; product = 'ecmwf'; }
    else if (layerType === 'temp') { overlay = 'temp'; product = 'ecmwf'; }
    else { overlay = 'wind'; product = 'ecmwf'; }

    // Re-render live simulation at the EXACT same current/dragged coordinates and zoom level!
    if (iframe) {
      iframe.src = `https://embed.windy.com/embed2.html?lat=${targetLat}&lon=${targetLon}&zoom=${targetZoom}&level=surface&overlay=${overlay}&product=${product}&menu=true&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1&embedMake=true`;
    }

    // Also update external links
    this.updateSimulationFrame(targetLat, targetLon, layerType);

    // Also fetch comprehensive weather conditions for this exact target location
    this.fetchWeather(targetLat, targetLon, null, false);

    const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);

    if (layerType === 'satellite') {
      if (statusText) statusText.innerHTML = `🛰️ <b>স্যাটেলাইট ভিউ:</b> (${toBengaliDigits(targetLat.toFixed(2))}°N, ${toBengaliDigits(targetLon.toFixed(2))}°E) এই অবস্থানের উপর লাইভ মেঘমালার মহাকাশ দৃশ্য`;
      if (window.showToast) window.showToast('🛰️ নির্বাচিত স্থানের লাইভ স্যাটেলাইট দৃশ্য সক্রিয়');
    } else if (layerType === 'radar') {
      if (statusText) statusText.innerHTML = `📡 <b>ডপলার রাডার:</b> (${toBengaliDigits(targetLat.toFixed(2))}°N, ${toBengaliDigits(targetLon.toFixed(2))}°E) এই অবস্থানের উপর লাইভ বৃষ্টি ও মেঘের ঘূর্ণি`;
      if (window.showToast) window.showToast('📡 নির্বাচিত স্থানের লাইভ ডপলার রাডার সক্রিয়');
    } else if (layerType === 'wind') {
      if (statusText) statusText.innerHTML = `💨 <b>বাতাসের গতি:</b> (${toBengaliDigits(targetLat.toFixed(2))}°N, ${toBengaliDigits(targetLon.toFixed(2))}°E) এই অবস্থানের উপর জীবন্ত বাতাসের প্রবাহ ও কণা অ্যানিমেশন`;
      if (window.showToast) window.showToast('💨 নির্বাচিত স্থানের বাতাসের গতি ও প্রবাহ সক্রিয়');
    } else if (layerType === 'temp') {
      if (statusText) statusText.innerHTML = `🌡️ <b>তাপমাত্রা পরিস্থিতি:</b> (${toBengaliDigits(targetLat.toFixed(2))}°N, ${toBengaliDigits(targetLon.toFixed(2))}°E) এই অবস্থানের উপর সেলসিয়াস (°C) তাপমাত্রা হিটম্যাপ`;
      if (window.showToast) window.showToast('🌡️ নির্বাচিত স্থানের তাপমাত্রা মানচিত্র সক্রিয়');
    } else if (layerType === 'rain') {
      if (statusText) statusText.innerHTML = `🌧️ <b>বৃষ্টিপাত পরিস্থিতি:</b> (${toBengaliDigits(targetLat.toFixed(2))}°N, ${toBengaliDigits(targetLon.toFixed(2))}°E) এই অবস্থানের উপর বৃষ্টি ও আর্দ্রতার পূর্বাভাস`;
      if (window.showToast) window.showToast('🌧️ নির্বাচিত স্থানের বৃষ্টিপাত পরিস্থিতি সক্রিয়');
    }
  }
};

window.WeatherApp = WeatherApp;
