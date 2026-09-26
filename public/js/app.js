/**
 * DIKDIGANTA / MYLOCATION360 - CORE APPLICATION CONTROLLER
 * Tab Navigation, Geolocation Permission Management,
 * LocationHistory Date Navigator & Trips Viewer,
 * Mobile App PWA Install Prompt & Toast Notifications
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

// Global PWA deferred prompt
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btnDl = document.getElementById('btnDownloadApp');
  if (btnDl) {
    btnDl.style.animation = 'pulse-ring 2s infinite ease-in-out';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (window.MapModule) window.MapModule.init();
  if (window.WeatherApp) window.WeatherApp.init();

  setupTabNavigation();
  setupGeolocationWorkflow();
  setupHelpModal();
  setupLocationHistoryWorkflow();
  setupAppDownloadWorkflow();
});

/* ================= TAB NAVIGATION ================= */
function setupTabNavigation() {
  const topTabBtns = document.querySelectorAll('.nav-tab-btn');
  const bottomNavItems = document.querySelectorAll('.mobile-nav-item');
  const tabPanes = document.querySelectorAll('.tab-pane');

  function switchTab(targetTabId) {
    topTabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabId);
    });

    bottomNavItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-tab') === targetTabId);
    });

    tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === targetTabId);
    });

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
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });

  bottomNavItems.forEach(item => {
    item.addEventListener('click', () => switchTab(item.getAttribute('data-tab')));
  });
}

/* ================= LOCATION HISTORY WORKFLOW ================= */
function setupLocationHistoryWorkflow() {
  const btnOpenHistory = document.getElementById('btnOpenLocationHistory');
  const modalHistory = document.getElementById('locationHistoryModal');
  const btnCloseHistory = document.getElementById('btnCloseHistoryModal');
  const btnPrevDate = document.getElementById('btnPrevDate');
  const btnNextDate = document.getElementById('btnNextDate');
  const datePicker = document.getElementById('historyDatePicker');
  const dateLabel = document.getElementById('historySelectedDateLabel');
  const btnViewHistory = document.getElementById('btnViewHistoryForDate');
  const btnShowOnMap = document.getElementById('btnShowRouteOnMap');
  const tripsList = document.getElementById('historyTripsList');

  // Currently selected date state (Defaults to today)
  let selectedDate = new Date();
  let currentLoadedTrips = [];

  const banglaDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
  const banglaMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  const toBengaliDigits = (num) => num.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);

  function getIsoDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function updateDateDisplay() {
    const todayIso = getIsoDate(new Date());
    const currIso = getIsoDate(selectedDate);
    const isToday = currIso === todayIso;

    const dayName = banglaDays[selectedDate.getDay()];
    const dateNum = toBengaliDigits(selectedDate.getDate());
    const monthName = banglaMonths[selectedDate.getMonth()];
    const yearNum = toBengaliDigits(selectedDate.getFullYear());

    if (dateLabel) {
      dateLabel.innerText = `${dateNum} ${monthName} ${yearNum} ${isToday ? '(আজ)' : `(${dayName})`}`;
    }
    if (datePicker) {
      datePicker.value = currIso;
    }
  }

  function loadTripsForDate() {
    const iso = getIsoDate(selectedDate);
    const rawData = localStorage.getItem('mylocation_history_store');
    const store = rawData ? JSON.parse(rawData) : {};
    const trips = store[iso] || [];
    currentLoadedTrips = trips;

    if (!tripsList) return;
    tripsList.innerHTML = '';

    if (trips.length === 0) {
      tripsList.innerHTML = `
        <div class="poi-placeholder" style="padding: 20px 10px;">
          <i class="fa-solid fa-route" style="font-size:1.8rem; color:#64748b; margin-bottom:8px; display:block;"></i>
          এই তারিখে কোনো যাতায়াত রেকর্ড পাওয়া যায়নি।<br>
          <small style="color:#94a3b8;">(অন্য তারিখে বা আজকের তারিখে যাতায়াত রুট দেখতে পারেন)</small>
        </div>
      `;
      if (btnShowOnMap) btnShowOnMap.style.display = 'none';
      return;
    }

    if (btnShowOnMap) btnShowOnMap.style.display = 'flex';

    trips.forEach((t, index) => {
      const card = document.createElement('div');
      card.className = 'trip-card';
      card.innerHTML = `
        <div class="trip-header-row">
          <span><i class="fa-solid fa-map-pin text-primary"></i> ট্রিপ #${index + 1}: ${t.fromName}</span>
          <span class="trip-time-tag"><i class="fa-regular fa-clock"></i> ${t.time}</span>
        </div>
        <div class="trip-route-desc">
          <i class="fa-solid fa-arrow-right-long text-success"></i> গন্তব্য: <strong>${t.toName}</strong>
        </div>
        <div class="trip-metric-row">
          <span><i class="fa-solid fa-road"></i> দূরত্ব: ${t.distance}</span>
          <span><i class="fa-solid fa-stopwatch"></i> সময়: ${t.duration}</span>
        </div>
      `;
      tripsList.appendChild(card);
    });
  }

  if (btnOpenHistory && modalHistory) {
    btnOpenHistory.addEventListener('click', () => {
      updateDateDisplay();
      loadTripsForDate();
      modalHistory.style.display = 'flex';
    });
  }

  if (btnCloseHistory && modalHistory) {
    btnCloseHistory.addEventListener('click', () => {
      modalHistory.style.display = 'none';
    });
  }

  // Previous date step (<)
  if (btnPrevDate) {
    btnPrevDate.addEventListener('click', () => {
      selectedDate = new Date(selectedDate.getTime() - 86400000);
      updateDateDisplay();
      loadTripsForDate();
    });
  }

  // Next date step (>)
  if (btnNextDate) {
    btnNextDate.addEventListener('click', () => {
      selectedDate = new Date(selectedDate.getTime() + 86400000);
      updateDateDisplay();
      loadTripsForDate();
    });
  }

  // Native date picker change
  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        selectedDate = new Date(e.target.value + 'T00:00:00');
        updateDateDisplay();
        loadTripsForDate();
      }
    });
  }

  // View button
  if (btnViewHistory) {
    btnViewHistory.addEventListener('click', () => {
      loadTripsForDate();
      if (window.showToast) {
        window.showToast(`${dateLabel ? dateLabel.innerText : 'নির্বাচিত তারিখের'} হিস্টরি লোড হয়েছে`);
      }
    });
  }

  // Show route on map
  if (btnShowOnMap) {
    btnShowOnMap.addEventListener('click', () => {
      if (currentLoadedTrips.length === 0) return;
      if (modalHistory) modalHistory.style.display = 'none';

      // Switch to location tab if not active
      const locTabBtn = document.getElementById('tabBtnLocation');
      if (locTabBtn) locTabBtn.click();

      if (window.MapModule) {
        window.MapModule.drawHistoryRouteOnMap(currentLoadedTrips);
      }

      if (window.showToast) {
        window.showToast('🗺️ ম্যাপে নির্বাচিত তারিখের সম্পূর্ণ রুট আঁকা হয়েছে!');
      }
    });
  }
}

/* ================= MOBILE APP DOWNLOAD WORKFLOW ================= */
function setupAppDownloadWorkflow() {
  const btnDownloadApp = document.getElementById('btnDownloadApp');
  const modalDownload = document.getElementById('appDownloadModal');
  const btnCloseDl = document.getElementById('btnCloseDownloadModal');
  const btnCloseDl2 = document.getElementById('btnCloseDownloadModal2');
  const btnTriggerPwa = document.getElementById('btnTriggerPwaInstall');

  const openModal = () => {
    if (modalDownload) modalDownload.style.display = 'flex';
  };

  const closeModal = () => {
    if (modalDownload) modalDownload.style.display = 'none';
  };

  if (btnDownloadApp) {
    btnDownloadApp.addEventListener('click', () => {
      if (deferredInstallPrompt) {
        // Trigger native Chrome/Android install dialog directly
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            window.showToast('🎉 অ্যাপ ইনস্টলেশন শুরু হয়েছে!');
          }
          deferredInstallPrompt = null;
        });
      } else {
        // Open rich instructions modal
        openModal();
      }
    });
  }

  if (btnTriggerPwa) {
    btnTriggerPwa.addEventListener('click', () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            window.showToast('🎉 অ্যাপ ইনস্টলেশন সম্পন্ন হচ্ছে!');
          }
          deferredInstallPrompt = null;
          closeModal();
        });
      } else {
        window.showToast('ব্রাউজার মেনু থেকে "Add to Home screen" বা "Install" চাপুন');
      }
    });
  }

  if (btnCloseDl) btnCloseDl.addEventListener('click', closeModal);
  if (btnCloseDl2) btnCloseDl2.addEventListener('click', closeModal);
}

/* ================= GEOLOCATION WORKFLOW ================= */
function setupGeolocationWorkflow() {
  const modal = document.getElementById('permissionModal');
  const btnGrant = document.getElementById('btnGrantPermission');
  const btnDismiss = document.getElementById('btnDismissPermission');
  const gpsStatusText = document.getElementById('gpsStatusText');

  const hasAsked = localStorage.getItem('dikdiganta_geo_asked');

  if (!hasAsked && navigator.geolocation) {
    if (modal) modal.style.display = 'flex';
  } else {
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

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, speed, altitude, heading } = pos.coords;
        if (gpsStatusText) gpsStatusText.innerText = 'জিপিএস সক্রিয়';

        if (window.MapModule) {
          window.MapModule.setUserPosition(latitude, longitude, speed, altitude, heading);
          window.MapModule.recenter();
        }

        if (window.WeatherApp) {
          window.WeatherApp.fetchCurrentLocationWeather(latitude, longitude);
        }

        window.showToast('📍 আপনার বর্তমান অবস্থান শনাক্ত হয়েছে!');
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
      (err) => console.warn('Watch position error:', err),
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
