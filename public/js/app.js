/**
 * DIKDIGANTA (দিকদিগন্ত) - CORE APPLICATION CONTROLLER
 * Tab Navigation, Geolocation Permission Management,
 * Mobile Touch Sync, and Toast Notifications
 */

// Global Toast Function
window.showToast = function(message, duration = 3000) {
  const toast = document.getElementById('appToast');
  const msgEl = document.getElementById('toastMessage');
  if (!toast || !msgEl) return;

  msgEl.innerText = message;
  toast.classList.add('show');

  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize App Modules
  if (window.MapModule) window.MapModule.init();
  if (window.WeatherApp) window.WeatherApp.init();

  // Setup Navigation Tabs
  setupTabNavigation();

  // Setup Geolocation & Permission Dialog
  setupGeolocationWorkflow();

  // Setup Help Modal
  setupHelpModal();
});

/* ================= TAB NAVIGATION ================= */
function setupTabNavigation() {
  const topTabBtns = document.querySelectorAll('.nav-tab-btn');
  const bottomNavItems = document.querySelectorAll('.mobile-nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function switchTab(targetTabId) {
    // Update Top Tabs
    topTabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabId);
    });

    // Update Mobile Nav
    bottomNavItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === targetTabId);
    });

    // Update Panes
    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === targetTabId);
    });

    // Specific pane wake-up calls
    if (targetTabId === 'location-tab') {
      setTimeout(() => {
        if (window.MapModule && window.MapModule.map) {
          window.MapModule.map.resize();
        }
      }, 100);
    } else if (targetTabId === 'weather-tab') {
      setTimeout(() => {
        if (window.WeatherScenes) {
          if (window.WeatherScenes.currentLocationScene) {
            window.WeatherScenes.currentLocationScene.resize();
          }
          if (window.WeatherScenes.otherLocationScene) {
            window.WeatherScenes.otherLocationScene.resize();
          }
        }
      }, 100);
    }
  }

  topTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  bottomNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

/* ================= GEOLOCATION WORKFLOW ================= */
function setupGeolocationWorkflow() {
  const modal = document.getElementById('permissionModal');
  const btnGrant = document.getElementById('btnGrantPermission');
  const btnDismiss = document.getElementById('btnDismissPermission');
  const gpsStatusText = document.getElementById('gpsStatusText');

  const hasAsked = localStorage.getItem('dikdiganta_geo_asked');

  if (!hasAsked && navigator.geolocation) {
    // Show welcoming permission prompt
    if (modal) modal.style.display = 'flex';
  } else {
    // Already asked before, try direct request
    requestLivePosition();
  }

  if (btnGrant) {
    btnGrant.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
      localStorage.setItem('dikdiganta_geo_asked', 'yes');
      requestLivePosition();
    });
  }

  if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
      if (modal) modal.style.display = 'none';
      localStorage.setItem('dikdiganta_geo_asked', 'yes');
      window.showToast('ডিফল্ট লোকেশন (ঢাকা) নিয়ে চালু করা হলো');
    });
  }

  function requestLivePosition() {
    if (!navigator.geolocation) {
      if (gpsStatusText) gpsStatusText.innerText = 'জিপিএস অনুপস্থিত';
      return;
    }

    if (gpsStatusText) gpsStatusText.innerText = 'জিপিএস সংযোগ হচ্ছে...';

    // Get current position first
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, speed, altitude, heading } = pos.coords;
        if (gpsStatusText) gpsStatusText.innerText = 'জিপিএস সক্রিয়';

        // Update Map
        if (window.MapModule) {
          window.MapModule.setUserPosition(latitude, longitude, speed, altitude, heading);
          window.MapModule.recenter();
        }

        // Update Weather for real location
        if (window.WeatherApp) {
          window.WeatherApp.fetchCurrentLocationWeather(latitude, longitude);
        }

        window.showToast('📍 আপনার বর্তমান অবস্থান শনাক্ত হয়েছে!');

        // Start continuous position tracking (Speedometer & Movement)
        startWatchingPosition();
      },
      (err) => {
        console.warn('Geolocation denied or error:', err.message);
        if (gpsStatusText) gpsStatusText.innerText = 'ডিফল্ট লোকেশন';
        window.showToast('লোকেশন অনুমতি পাওয়া যায়নি। ডিফল্ট অবস্থান প্রদর্শিত হচ্ছে।');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000
      }
    );
  }

  function startWatchingPosition() {
    navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, altitude, heading } = pos.coords;
        if (window.MapModule) {
          window.MapModule.setUserPosition(latitude, longitude, speed, altitude, heading);
        }
      },
      (err) => {
        console.warn('Watch position error:', err);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 2000
      }
    );
  }
}

/* ================= HELP MODAL ================= */
function setupHelpModal() {
  const btnHelp = document.getElementById('btnHelp');
  const modalHelp = document.getElementById('helpModal');
  const btnClose = document.getElementById('btnCloseHelp');
  const btnGotIt = document.getElementById('btnGotItHelp');

  if (btnHelp && modalHelp) {
    btnHelp.addEventListener('click', () => {
      modalHelp.style.display = 'flex';
    });
  }

  const closeHelp = () => {
    if (modalHelp) modalHelp.style.display = 'none';
  };

  if (btnClose) btnClose.addEventListener('click', closeHelp);
  if (btnGotIt) btnGotIt.addEventListener('click', closeHelp);
}
