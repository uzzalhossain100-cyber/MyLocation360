/**
 * DIKDIGANTA - WEATHER MODULE
 * Handles Live Weather Fetching, Bangla DateTime formatting,
 * Realtime Clocks, and Other Location Search
 */

const WeatherApp = {
  // Current user coordinates (Defaults to Dhaka)
  currentLat: 23.8103,
  currentLon: 90.4125,
  currentCityName: 'ঢাকা, বাংলাদেশ',

  // Other location coordinates
  otherLat: null,
  otherLon: null,

  init() {
    this.startLiveClock();
    this.setupEventListeners();
    // Initial fetch for Dhaka default
    this.fetchCurrentLocationWeather(this.currentLat, this.currentLon, this.currentCityName);
  },

  setupEventListeners() {
    // Current weather refresh
    const btnRefreshCW = document.getElementById('btnRefreshCurrentWeather');
    if (btnRefreshCW) {
      btnRefreshCW.addEventListener('click', () => {
        this.fetchCurrentLocationWeather(this.currentLat, this.currentLon, this.currentCityName);
        if (window.showToast) window.showToast('বর্তমান আবহাওয়া রিফ্রেশ করা হয়েছে');
      });
    }

    // Other location: View Weather Button
    const btnViewOther = document.getElementById('btnViewOtherWeather');
    const inputOther = document.getElementById('otherCityInput');
    const btnClearSearch = document.getElementById('btnClearSearch');

    if (inputOther) {
      inputOther.addEventListener('input', () => {
        if (btnClearSearch) btnClearSearch.style.display = inputOther.value ? 'block' : 'none';
      });

      inputOther.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleOtherLocationSearch(inputOther.value.trim());
        }
      });
    }

    if (btnClearSearch) {
      btnClearSearch.addEventListener('click', () => {
        inputOther.value = '';
        btnClearSearch.style.display = 'none';
      });
    }

    if (btnViewOther) {
      btnViewOther.addEventListener('click', () => {
        const query = inputOther ? inputOther.value.trim() : '';
        if (!query) {
          if (window.showToast) window.showToast('দয়া করে কোনো শহর বা এলাকার নাম লিখুন');
          return;
        }
        this.handleOtherLocationSearch(query);
      });
    }

    // Quick city chips
    const cityChips = document.querySelectorAll('.city-chip');
    cityChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const city = chip.getAttribute('data-city');
        const lat = parseFloat(chip.getAttribute('data-lat'));
        const lon = parseFloat(chip.getAttribute('data-lon'));
        if (inputOther) inputOther.value = city;
        this.fetchOtherLocationWeather(lat, lon, `${city}, বাংলাদেশ`);
      });
    });

    // Interactive Atmospheric Scene Switcher Pills
    const scenePillBtns = document.querySelectorAll('.scene-pill-btn');
    scenePillBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        scenePillBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const scene = btn.getAttribute('data-scene');
        const badge = btn.getAttribute('data-badge');

        const badgeEl = document.getElementById('cwAnimBadge');
        if (badgeEl && badge) badgeEl.innerText = badge;

        if (window.WeatherScenes && window.WeatherScenes.currentLocationScene) {
          window.WeatherScenes.currentLocationScene.setScene(scene);
        }

        if (window.showToast) window.showToast(`দৃশ্য পরিবর্তিত হয়েছে: ${btn.innerText}`);
      });
    });
  },

  // Bangla Digital Clock & Date
  startLiveClock() {
    const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const banglaMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const toBengaliDigits = (num) => {
      return num.toString().replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
    };

    const updateTimes = () => {
      const now = new Date();
      const dayName = banglaDays[now.getDay()];
      const dateNum = toBengaliDigits(now.getDate());
      const monthName = banglaMonths[now.getMonth()];
      const yearNum = toBengaliDigits(now.getFullYear());
      
      const fullDateStr = `${dateNum} ${monthName} ${yearNum}`;
      
      // Formatting Time
      let hours = now.getHours();
      let minutes = now.getMinutes();
      let seconds = now.getSeconds();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 becomes 12
      
      const padZero = (n) => (n < 10 ? '0' + n : n);
      const timeStr = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)} ${ampm}`;

      // Update Current Location DateTime
      const cwDay = document.getElementById('cwDayName');
      const cwDate = document.getElementById('cwDateFull');
      const cwClock = document.getElementById('cwLiveClock');
      if (cwDay) cwDay.innerText = dayName;
      if (cwDate) cwDate.innerText = fullDateStr;
      if (cwClock) cwClock.innerText = timeStr;

      // Update Other Location DateTime (if displayed)
      const owDay = document.getElementById('owDayName');
      const owDate = document.getElementById('owDateFull');
      const owClock = document.getElementById('owLiveClock');
      if (owDay) owDay.innerText = dayName;
      if (owDate) owDate.innerText = fullDateStr;
      if (owClock) owClock.innerText = timeStr;
    };

    updateTimes();
    setInterval(updateTimes, 1000);
  },

  // Parse WMO Weather Codes to Bengali description, Icon and Dynamic Realistic Animation Scene
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

  // Fetch Current Location Weather
  async fetchCurrentLocationWeather(lat, lon, cityName) {
    this.currentLat = lat;
    this.currentLon = lon;
    if (cityName) {
      this.currentCityName = cityName;
      const elCity = document.getElementById('cwCityName');
      if (elCity) elCity.innerText = cityName;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,precipitation_probability,weather_code,wind_speed_10m&daily=uv_index_max&timezone=auto`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Weather API failed');
      const data = await response.json();

      const current = data.current || {};
      const daily = data.daily || {};

      const temp = Math.round(current.temperature_2m ?? 30);
      const feelsLike = Math.round(current.apparent_temperature ?? (temp + 2));
      const rainChance = current.precipitation_probability !== undefined ? current.precipitation_probability : (current.precipitation > 0 ? 80 : 15);
      const windSpeed = Math.round(current.wind_speed_10m ?? 12);
      const humidity = Math.round(current.relative_humidity_2m ?? 65);
      const uvIndex = daily.uv_index_max && daily.uv_index_max[0] ? Math.round(daily.uv_index_max[0]) : 5;
      const weatherCode = current.weather_code ?? 0;
      
      const hours = new Date().getHours();
      const isDay = current.is_day !== undefined ? current.is_day : (hours >= 6 && hours < 18 ? 1 : 0);

      const condition = this.parseWmoCode(weatherCode, isDay, temp);

      // Render to DOM
      const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);

      document.getElementById('cwTemp').innerText = toBengaliDigits(temp);
      document.getElementById('cwFeelsLike').innerText = toBengaliDigits(feelsLike);
      document.getElementById('cwConditionIcon').innerText = condition.icon;
      document.getElementById('cwConditionName').innerText = condition.text;
      document.getElementById('cwRainChance').innerText = `${toBengaliDigits(rainChance)}%`;
      document.getElementById('cwWindSpeed').innerText = `${toBengaliDigits(windSpeed)} কিমি/ঘণ্টা`;
      document.getElementById('cwHumidity').innerText = `${toBengaliDigits(humidity)}%`;
      document.getElementById('cwUvIndex').innerText = `${toBengaliDigits(uvIndex)} (UV)`;
      document.getElementById('cwAnimBadge').innerText = condition.badge;

      // Update Animated Scene to Match Reality!
      if (window.WeatherScenes && window.WeatherScenes.currentLocationScene) {
        window.WeatherScenes.currentLocationScene.setScene(condition.scene);
      }

    } catch (err) {
      console.warn('Weather fetch error, using fallback:', err);
      const hours = new Date().getHours();
      const isNight = hours < 6 || hours >= 18;
      document.getElementById('cwTemp').innerText = '৩১';
      document.getElementById('cwFeelsLike').innerText = '৩৪';
      document.getElementById('cwConditionIcon').innerText = isNight ? '🌙' : '☀️';
      document.getElementById('cwConditionName').innerText = isNight ? 'পরিষ্কার রাতের আকাশ' : 'রোদ্রোজ্জ্বল ও উষ্ণ';
      document.getElementById('cwRainChance').innerText = '২০%';
      document.getElementById('cwWindSpeed').innerText = '১২ কিমি/ঘণ্টা';
      document.getElementById('cwHumidity').innerText = '৬২%';
      document.getElementById('cwUvIndex').innerText = '৬ (UV)';
      document.getElementById('cwAnimBadge').innerText = isNight ? 'তারায় ভরা রাতের দৃশ্য' : 'রোদ্রোজ্জ্বল দিনের দৃশ্য';
      if (window.WeatherScenes && window.WeatherScenes.currentLocationScene) {
        window.WeatherScenes.currentLocationScene.setScene(isNight ? 'clear-night' : 'clear-day');
      }
    }
  },

  // Handle Other Location Search
  async handleOtherLocationSearch(query) {
    if (!query) return;
    if (window.showToast) window.showToast(`"${query}" এর আবহাওয়া খোঁজা হচ্ছে...`);

    try {
      const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(query)}`);
      const results = await res.json();
      
      if (!results || results.length === 0) {
        // Fallback search with direct nominatim
        const fallbackRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
        const fallbackData = await fallbackRes.json();
        if (!fallbackData || fallbackData.length === 0) {
          alert(`দুঃখিত, "${query}" পাওয়া যায়নি। অনুগ্রহ করে সঠিক শহরের নাম লিখুন।`);
          return;
        }
        const place = fallbackData[0];
        this.fetchOtherLocationWeather(parseFloat(place.lat), parseFloat(place.lon), place.display_name.split(',')[0]);
        return;
      }

      const place = results[0];
      const displayName = place.display_name.split(',').slice(0, 2).join(', ');
      this.fetchOtherLocationWeather(parseFloat(place.lat), parseFloat(place.lon), displayName);

    } catch (err) {
      console.error('Search error:', err);
      alert('লোকেশন অনুসন্ধানে সমস্যা হয়েছে, অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  },

  // Fetch Other Location Weather
  async fetchOtherLocationWeather(lat, lon, cityName) {
    this.otherLat = lat;
    this.otherLon = lon;

    const resultCard = document.getElementById('otherWeatherResultCard');
    if (resultCard) {
      resultCard.style.display = 'block';
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const owCity = document.getElementById('owCityName');
    if (owCity) owCity.innerText = cityName;

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,precipitation_probability,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
      const response = await fetch(url);
      const data = await response.json();

      const current = data.current || {};
      const daily = data.daily || {};

      const temp = Math.round(current.temperature_2m ?? 29);
      const feelsLike = Math.round(current.apparent_temperature ?? (temp + 2));
      const rainChance = current.precipitation_probability !== undefined ? current.precipitation_probability : (current.precipitation > 0 ? 85 : 25);
      const windSpeed = Math.round(current.wind_speed_10m ?? 14);
      const humidity = Math.round(current.relative_humidity_2m ?? 70);
      const minTemp = daily.temperature_2m_min && daily.temperature_2m_min[0] ? Math.round(daily.temperature_2m_min[0]) : (temp - 4);
      const maxTemp = daily.temperature_2m_max && daily.temperature_2m_max[0] ? Math.round(daily.temperature_2m_max[0]) : (temp + 3);
      const weatherCode = current.weather_code ?? 0;

      const isDay = current.is_day !== undefined ? current.is_day : (new Date().getHours() >= 6 && new Date().getHours() < 18 ? 1 : 0);
      const condition = this.parseWmoCode(weatherCode, isDay, temp);

      const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);

      document.getElementById('owTemp').innerText = toBengaliDigits(temp);
      document.getElementById('owFeelsLike').innerText = toBengaliDigits(feelsLike);
      document.getElementById('owConditionIcon').innerText = condition.icon;
      document.getElementById('owConditionName').innerText = condition.text;
      document.getElementById('owRainChance').innerText = `${toBengaliDigits(rainChance)}%`;
      document.getElementById('owWindSpeed').innerText = `${toBengaliDigits(windSpeed)} কিমি/ঘণ্টা`;
      document.getElementById('owHumidity').innerText = `${toBengaliDigits(humidity)}%`;
      document.getElementById('owMinMaxTemp').innerText = `${toBengaliDigits(minTemp)}° / ${toBengaliDigits(maxTemp)}° সে.`;
      
      const badge = document.getElementById('owAnimBadge');
      if (badge) badge.innerText = condition.badge;

      // Update the animation for the Other Location
      if (window.WeatherScenes && window.WeatherScenes.otherLocationScene) {
        window.WeatherScenes.otherLocationScene.setScene(condition.scene);
      }

      if (window.showToast) window.showToast(`${cityName}-এর আবহাওয়া লোড হয়েছে`);

    } catch (err) {
      console.warn('Other location weather fetch error:', err);
    }
  }
};

window.WeatherApp = WeatherApp;
