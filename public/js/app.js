/**
 * DIKDIGANTA / MYLOCATION360 - CORE APPLICATION CONTROLLER
 * Tab Navigation (Smooth & Reliable), Geolocation,
 * LocationHistory Date Navigator & Accurate Total KM calculation,
 * Mobile App PWA Install Prompt & Toast Notifications
 */

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

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  console.log('[PWA] beforeinstallprompt captured for mobile widgets!');
  const btnDl = document.getElementById('btnDownloadApp');
  if (btnDl) {
    btnDl.style.animation = 'pulse-ring 2s infinite ease-in-out';
  }
});

// Register Service Worker for PWA Widgets & Force Clean Purge of Stale Cache
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Purge any stale cache storage immediately
    if ('caches' in window) {
      caches.keys().then((cacheNames) => {
        cacheNames.forEach((name) => {
          if (!name.includes('v5-live')) {
            console.log('[App] Purging stale client cache:', name);
            caches.delete(name);
          }
        });
      });
    }

    navigator.serviceWorker.register('/sw.js?v=20260928_v5_live')
      .then((reg) => {
        console.log('[ServiceWorker] registered successfully:', reg.scope);
        // Force check for updates
        reg.update();
      })
      .catch((err) => console.warn('[ServiceWorker] registration failed:', err));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.MapModule) window.MapModule.init();
  if (window.WeatherApp) window.WeatherApp.init();

  setupHomePortalWorkflow();
  setupTabNavigation();
  setupGeolocationWorkflow();
  setupHelpModal();
  setupLocationHistoryWorkflow();
  setupAppDownloadWorkflow();
  handleUrlWidgetParams();
});

// Check if app was opened via Widget Shortcut (/?feature=location or /?feature=weather)
function handleUrlWidgetParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const feature = urlParams.get('feature') || urlParams.get('tab');
  const portalOverlay = document.getElementById('homePortalOverlay');

  if (feature === 'location') {
    if (portalOverlay) portalOverlay.style.display = 'none';
    if (window.switchAppTab) window.switchAppTab('location-tab');
  } else if (feature === 'weather') {
    if (portalOverlay) portalOverlay.style.display = 'none';
    if (window.switchAppTab) window.switchAppTab('weather-tab');
  }
}

/* ================= HOME WELCOME PORTAL WORKFLOW ================= */
function setupHomePortalWorkflow() {
  const portalOverlay = document.getElementById('homePortalOverlay');
  const btnOnlyGoToLocation = document.getElementById('btnOnlyGoToLocation');
  const btnOnlyGoToWeather = document.getElementById('btnOnlyGoToWeather');
  const btnOpenPortal = document.getElementById('btnOpenHomePortal');
  const btnBottomHome = document.getElementById('bottomNavBtnHome');

  // Carousel elements
  const carouselTrack = document.getElementById('homeCarouselTrack');
  const btnSlideWeather = document.getElementById('btnSlideWeather');
  const btnSlideLocation = document.getElementById('btnSlideLocation');
  const carouselDots = document.querySelectorAll('.home-carousel-dots .c-dot');
  const swipeContainer = document.getElementById('homeSwipeCarousel');

  let currentSlideIndex = 0; // 0 = Weather, 1 = Location

  function goToSlide(index) {
    currentSlideIndex = index;
    if (carouselTrack) {
      carouselTrack.style.transform = `translateX(-${index * 50}%)`;
    }

    if (btnSlideWeather && btnSlideLocation) {
      if (index === 0) {
        btnSlideWeather.classList.add('active');
        btnSlideLocation.classList.remove('active');
      } else {
        btnSlideLocation.classList.add('active');
        btnSlideWeather.classList.remove('active');
      }
    }

    carouselDots.forEach((dot, dIdx) => {
      dot.classList.toggle('active', dIdx === index);
    });
  }

  // Tab Pill Clicks
  if (btnSlideWeather) {
    btnSlideWeather.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(0);
    });
  }
  if (btnSlideLocation) {
    btnSlideLocation.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(1);
    });
  }

  // Dot Clicks
  carouselDots.forEach((dot) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(dot.getAttribute('data-index') || '0', 10);
      goToSlide(idx);
    });
  });

  // Touch Swipe Gesture Detection for Mobile
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  if (swipeContainer) {
    swipeContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    swipeContainer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipeGesture();
    }, { passive: true });
  }

  function handleSwipeGesture() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Only trigger horizontal swipe if movement is primarily horizontal (> 40px)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX < 0) {
        // Swiped Left -> Move to Slide 1 (Location)
        goToSlide(1);
      } else {
        // Swiped Right -> Move to Slide 0 (Weather)
        goToSlide(0);
      }
    }
  }

  // Immediately render current Bengali Date & Day
  const hDateEl = document.getElementById('homeCurrentDate');
  if (hDateEl) {
    const now = new Date();
    const bDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const bMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);
    const dayName = bDays[now.getDay()];
    const dateNum = toBengaliDigits(now.getDate());
    const monthName = bMonths[now.getMonth()];
    const yearNum = toBengaliDigits(now.getFullYear());
    hDateEl.innerText = `${dayName}, ${dateNum} ${monthName} ${yearNum}`;
  }

  function openFeature(tabId) {
    if (portalOverlay) {
      portalOverlay.classList.add('portal-closing');
      setTimeout(() => {
        portalOverlay.style.display = 'none';
        portalOverlay.classList.remove('portal-closing');
      }, 250);
    }
    if (window.switchAppTab) {
      window.switchAppTab(tabId);
    }
  }

  function returnToHome() {
    if (portalOverlay) {
      portalOverlay.classList.remove('portal-closing');
      portalOverlay.style.display = 'flex';
      // Reset to slide 0 (Weather first as requested)
      goToSlide(0);
    }
  }

  // STRICT REQUIREMENT: BLOCK ANY CLICKS OUTSIDE THE VIEW DETAILS BUTTON
  const weatherSlide = document.getElementById('slideWeather');
  const locationSlide = document.getElementById('slideLocation');
  const homeCardTrack = document.getElementById('homeCarouselTrack');

  // Intercept and prevent any unintended clicks on the body of the cards in capturing phase
  [weatherSlide, locationSlide, homeCardTrack].forEach((el) => {
    if (el) {
      el.addEventListener('click', (e) => {
        // If the click is NOT inside a .btn-portal-action button, block navigation!
        if (!e.target.closest('.btn-portal-action')) {
          e.stopPropagation();
        }
      }, true);
    }
  });

  // STRICT REQUIREMENT: Only view details button triggers navigation!
  if (btnOnlyGoToLocation) {
    btnOnlyGoToLocation.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openFeature('location-tab');
    });
  }

  if (btnOnlyGoToWeather) {
    btnOnlyGoToWeather.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openFeature('weather-tab');
    });
  }

  if (btnOpenPortal) {
    btnOpenPortal.addEventListener('click', returnToHome);
  }

  if (btnBottomHome) {
    btnBottomHome.addEventListener('click', returnToHome);
  }

  window.returnToHomePortal = returnToHome;

  // Initialize Lockscreen, Wallpaper & Widget Workflow
  setupMobileLockscreenAndWallpaperWorkflow();
}

/* ================= MOBILE LOCKSCREEN & WALLPAPER WORKFLOW ================= */
function setupMobileLockscreenAndWallpaperWorkflow() {
  const btnLockscreen = document.getElementById('btnSetHomeLockscreen');
  const btnWallpaper = document.getElementById('btnSetHomeWallpaper');
  const modalBackdrop = document.getElementById('mobileSetModalBackdrop');
  const btnCloseModal = document.getElementById('btnCloseMobileSetModal');
  const modalTitle = document.getElementById('modalSetTitle');
  const modalIcon = document.getElementById('modalSetIcon');
  const modalDesc = document.getElementById('modalSetDesc');
  const btnDownload = document.getElementById('btnDownloadWallpaper');
  const btnDownloadLabel = document.getElementById('btnDownloadWallpaperLabel');
  const btnLaunchLive = document.getElementById('btnLaunchLiveDisplay');

  // Widget Modal Elements
  const btnWidget = document.getElementById('btnSetHomeWidget');
  const widgetModalBackdrop = document.getElementById('widgetGuideModalBackdrop');
  const btnCloseWidgetModal = document.getElementById('btnCloseWidgetGuideModal');
  const btnGotWidget = document.getElementById('btnGotWidgetGuide');
  const btnInstallPwa = document.getElementById('btnInstallPwaWidget');

  // Preview elements
  const phoneClock = document.getElementById('phoneLiveClock');
  const phoneDate = document.getElementById('phoneLiveDate');
  const phoneAddress = document.getElementById('phonePreviewAddress');
  const phoneTemp = document.getElementById('phonePreviewTemp');
  const phoneCond = document.getElementById('phonePreviewCond');
  const phoneSpeed = document.getElementById('phonePreviewSpeed');
  const phoneDir = document.getElementById('phonePreviewDir');

  let activeMode = 'lockscreen'; // 'lockscreen' or 'wallpaper'
  let wakeLockInstance = null;

  function updatePreviewData() {
    const now = new Date();
    const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);
    const pad = (n) => (n < 10 ? '0' + n : n);

    let hours = now.getHours();
    const mins = pad(now.getMinutes());
    hours = hours % 12 || 12;

    if (phoneClock) phoneClock.innerText = `${toBengaliDigits(pad(hours))}:${toBengaliDigits(mins)}`;
    
    const bDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
    const bMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
    if (phoneDate) phoneDate.innerText = `${bDays[now.getDay()]}, ${toBengaliDigits(now.getDate())} ${bMonths[now.getMonth()]}`;

    const curAddr = document.getElementById('homeCurrentAddress');
    if (phoneAddress && curAddr) phoneAddress.innerText = curAddr.innerText;

    const curTemp = document.getElementById('homeCurrentTemp');
    if (phoneTemp && curTemp) phoneTemp.innerText = `${curTemp.innerText} সে.`;

    const curCond = document.getElementById('homeCurrentConditionText');
    if (phoneCond && curCond) phoneCond.innerText = curCond.innerText;

    const curSpeed = document.getElementById('homeCurrentSpeed');
    if (phoneSpeed && curSpeed) phoneSpeed.innerText = `${curSpeed.innerText} কিমি/ঘ.`;

    const curDir = document.getElementById('homeCurrentHeadingText');
    if (phoneDir && curDir) phoneDir.innerText = curDir.innerText;
  }

  function openModal(mode) {
    activeMode = mode;
    updatePreviewData();

    if (mode === 'lockscreen') {
      if (modalTitle) modalTitle.innerText = 'মোবাইল লকস্ক্রিনে সেট করুন';
      if (modalIcon) modalIcon.className = 'fa-solid fa-mobile-screen-button text-indigo';
      if (modalDesc) modalDesc.innerText = 'আপনার বর্তমান অবস্থান, স্পিডোমিটার ও লাইভ আবহাওয়া সংবলিত স্মার্ট লকস্ক্রিন প্রস্তুত:';
      if (btnDownloadLabel) btnDownloadLabel.innerText = 'লকস্ক্রিন ইমেজ সেভ করুন';
    } else {
      if (modalTitle) modalTitle.innerText = 'মোবাইল ওয়ালপেপারে সেট করুন';
      if (modalIcon) modalIcon.className = 'fa-solid fa-image text-emerald';
      if (modalDesc) modalDesc.innerText = 'আপনার মোবাইল হোমস্ক্রিনের জন্য লাইভ আবহাওয়া ও লোকেশন ওয়ালপেপার প্রস্তুত:';
      if (btnDownloadLabel) btnDownloadLabel.innerText = 'ওয়ালপেপার ইমেজ সেভ করুন';
    }

    if (modalBackdrop) modalBackdrop.style.display = 'flex';
  }

  function closeModal() {
    if (modalBackdrop) modalBackdrop.style.display = 'none';
  }

  function openWidgetModal() {
    if (widgetModalBackdrop) widgetModalBackdrop.style.display = 'flex';
  }

  function closeWidgetModal() {
    if (widgetModalBackdrop) widgetModalBackdrop.style.display = 'none';
  }

  if (btnWidget) {
    btnWidget.addEventListener('click', (e) => {
      e.stopPropagation();
      openWidgetModal();
    });
  }

  if (btnCloseWidgetModal) {
    btnCloseWidgetModal.addEventListener('click', closeWidgetModal);
  }

  if (btnGotWidget) {
    btnGotWidget.addEventListener('click', closeWidgetModal);
  }

  if (widgetModalBackdrop) {
    widgetModalBackdrop.addEventListener('click', (e) => {
      if (e.target === widgetModalBackdrop) closeWidgetModal();
    });
  }

  if (btnInstallPwa) {
    btnInstallPwa.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('[PWA] User accepted the widget install prompt');
          alert('উইজেট সফলভাবে সক্রিয় হয়েছে! এখন হোমস্ক্রিনে লং-প্রেস করে Widgets তালিকা থেকে MyLocation360 উইজেট যোগ করতে পারবেন।');
        }
        deferredInstallPrompt = null;
      } else {
        alert('আপনার ব্রাউজারের মেনু (⋮) ওপেন করে "Add to Home screen" বা "Install App" চাপুন। এরপর মোবাইলের Widgets লিস্টে এই অ্যাপের "মাই লোকেশন" ও "লাইভ আবহাওয়া" উইজেট সরাসরি দেখা যাবে!');
      }
    });
  }

  if (btnLockscreen) {
    btnLockscreen.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal('lockscreen');
    });
  }

  if (btnWallpaper) {
    btnWallpaper.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal('wallpaper');
    });
  }

  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeModal);
  }

  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }

  // Generate & Save HD Wallpaper/Lockscreen Image
  if (btnDownload) {
    btnDownload.addEventListener('click', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');

      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, 1920);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.4, '#0f172a');
      grad.addColorStop(0.7, '#0369a1');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Celestial Sun glow
      const sunGrad = ctx.createRadialGradient(850, 400, 10, 850, 400, 300);
      sunGrad.addColorStop(0, 'rgba(253, 224, 71, 0.8)');
      sunGrad.addColorStop(0.4, 'rgba(245, 158, 11, 0.4)');
      sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(500, 100, 580, 600);

      // Date & Time
      const now = new Date();
      const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);
      const pad = (n) => (n < 10 ? '0' + n : n);
      let hours = now.getHours();
      const mins = pad(now.getMinutes());
      hours = hours % 12 || 12;

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 130px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${toBengaliDigits(pad(hours))}:${toBengaliDigits(mins)}`, 540, 450);

      const bDays = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
      const bMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
      ctx.font = '40px sans-serif';
      ctx.fillStyle = '#93c5fd';
      ctx.fillText(`${bDays[now.getDay()]}, ${toBengaliDigits(now.getDate())} ${bMonths[now.getMonth()]} ${toBengaliDigits(now.getFullYear())}`, 540, 530);

      // Rounded Widget Box for Location
      const drawRoundRect = (x, y, w, h, r, fillColor, strokeColor) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        if (strokeColor) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      };

      // Widget 1: My Location
      drawRoundRect(80, 850, 920, 200, 28, 'rgba(15, 23, 42, 0.75)', 'rgba(56, 189, 248, 0.4)');
      ctx.textAlign = 'left';
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('📍 আমার বর্তমান লোকেশন', 130, 920);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 42px sans-serif';
      const curAddr = document.getElementById('homeCurrentAddress');
      const addrText = curAddr ? curAddr.innerText : 'ধানমন্ডি, ঢাকা, বাংলাদেশ';
      ctx.fillText(addrText.length > 32 ? addrText.substring(0, 32) + '...' : addrText, 130, 990);

      // Widget 2: Live Weather
      drawRoundRect(80, 1100, 440, 260, 28, 'rgba(15, 23, 42, 0.75)', 'rgba(245, 158, 11, 0.4)');
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('⛅ লাইভ আবহাওয়া', 120, 1170);
      const curTemp = document.getElementById('homeCurrentTemp');
      const tempVal = curTemp ? curTemp.innerText : '৩১°';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px sans-serif';
      ctx.fillText(`${tempVal} সে.`, 120, 1260);
      const curCond = document.getElementById('homeCurrentConditionText');
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '32px sans-serif';
      ctx.fillText(curCond ? curCond.innerText : 'পরিষ্কার আকাশ', 120, 1315);

      // Widget 3: Speedometer
      drawRoundRect(560, 1100, 440, 260, 28, 'rgba(15, 23, 42, 0.75)', 'rgba(56, 189, 248, 0.4)');
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('🏎️ স্পিড মিটার', 600, 1170);
      const curSpeed = document.getElementById('homeCurrentSpeed');
      const speedVal = curSpeed ? curSpeed.innerText : '০';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px sans-serif';
      ctx.fillText(`${speedVal} কিমি/ঘ.`, 600, 1260);
      const curDir = document.getElementById('homeCurrentHeadingText');
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '30px sans-serif';
      ctx.fillText(curDir ? curDir.innerText : 'স্থির (উত্তর দিক)', 600, 1315);

      // Brand tag
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('MYLOCATION360 • LIVE PLATFORM', 540, 1820);

      // Trigger direct download or native share
      const fileName = activeMode === 'lockscreen' ? 'mylocation360-lockscreen.png' : 'mylocation360-wallpaper.png';
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], fileName, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: activeMode === 'lockscreen' ? 'MyLocation360 Lockscreen' : 'MyLocation360 Wallpaper',
              text: 'মোবাইলের সেটিংস বা গ্যালারি থেকে ওয়ালপেপার/লকস্ক্রিন হিসেবে সেট করুন।'
            });
            return;
          } catch (e) {
            // User cancelled or fell back to download
          }
        }

        // Direct Download link
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 3000);

        alert(activeMode === 'lockscreen' 
          ? 'লকস্ক্রিন সফলভাবে ডাউনলোড হয়েছে! আপনার মোবাইলের Gallery বা Settings > Wallpaper থেকে এটি Lock Screen হিসেবে সেট করে নিন।' 
          : 'ওয়ালপেপার সফলভাবে ডাউনলোড হয়েছে! আপনার মোবাইলের Gallery বা Settings > Wallpaper থেকে এটি Home Screen / Wallpaper হিসেবে সেট করে নিন।');
      }, 'image/png');
    });
  }

  // Launch Fullscreen Live Display
  if (btnLaunchLive) {
    btnLaunchLive.addEventListener('click', async () => {
      closeModal();

      // Request Fullscreen
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        try { await docEl.requestFullscreen(); } catch (e) {}
      } else if (docEl.webkitRequestFullscreen) {
        try { await docEl.webkitRequestFullscreen(); } catch (e) {}
      }

      // Request Screen Wake Lock
      if ('wakeLock' in navigator) {
        try {
          wakeLockInstance = await navigator.wakeLock.request('screen');
        } catch (e) {}
      }

      alert('লাইভ ফুলস্ক্রিন ডিসপ্লে সক্রিয় হয়েছে! আপনার স্ক্রিন চালু থাকবে এবং লাইভ আবহাওয়া ও লোকেশন প্রদর্শিত হতে থাকবে।');
    });
  }
}

/* ================= TAB NAVIGATION ================= */
function setupTabNavigation() {
  const tabPanes = document.querySelectorAll('.tab-pane');
  const mapWrapper = document.getElementById('mapViewWrapper');
  const activeIcon = document.getElementById('bottomNavActiveIcon');
  const activeLabel = document.getElementById('bottomNavActiveLabel');

  function switchTab(targetTabId) {
    // 1. If currently in full map mode, ALWAYS exit full map first
    if (mapWrapper && mapWrapper.classList.contains('fullscreen-map-mode')) {
      mapWrapper.classList.remove('fullscreen-map-mode');
      document.body.classList.remove('in-fullmap-mode');
      document.documentElement.style.overflow = '';
      if (window.MapModule) window.MapModule.isFullMapMode = false;
    }

    // 2. Update Bottom Nav Active Feature
    if (targetTabId === 'location-tab') {
      if (activeIcon) activeIcon.className = 'fa-solid fa-location-crosshairs';
      if (activeLabel) activeLabel.innerText = 'মাই লোকেশন';
    } else if (targetTabId === 'weather-tab') {
      if (activeIcon) activeIcon.className = 'fa-solid fa-cloud-sun';
      if (activeLabel) activeLabel.innerText = 'লাইভ আবহাওয়া';
    }

    // 3. Update Tab Panes
    tabPanes.forEach(pane => {
      if (pane.id === targetTabId) {
        pane.classList.add('active');
        pane.style.display = 'block';
      } else {
        pane.classList.remove('active');
        pane.style.display = 'none';
      }
    });

    // 4. Hide/Show Search Bar and History Button depending on tab
    const topSearch = document.getElementById('topSlimSearchBar');
    if (topSearch) {
      topSearch.style.display = (targetTabId === 'location-tab') ? 'block' : 'none';
    }
    const btnHistory = document.getElementById('btnOpenLocationHistory');
    if (btnHistory) {
      btnHistory.style.display = (targetTabId === 'location-tab') ? 'inline-flex' : 'none';
    }

    // 5. Scroll to top so user sees the page cleanly
    window.scrollTo({ top: 0, behavior: 'instant' });

    // 6. Refresh respective engines
    if (targetTabId === 'location-tab') {
      setTimeout(() => {
        if (window.MapModule && window.MapModule.map) {
          window.MapModule.map.resize();
        }
      }, 50);
    } else if (targetTabId === 'weather-tab') {
      setTimeout(() => {
        if (window.WeatherScenes) {
          if (window.WeatherScenes.currentLocationScene) {
            window.WeatherScenes.currentLocationScene.resize();
            window.WeatherScenes.currentLocationScene.updateSunProgressFromTime();
          }
          if (window.WeatherScenes.otherLocationScene) {
            window.WeatherScenes.otherLocationScene.resize();
          }
        }
        // Guarantee current weather & live radar map are rendered
        if (window.WeatherApp) {
          window.WeatherApp.startLiveClock();
          if (typeof window.WeatherApp.ensureRadarMapReady === 'function') {
            window.WeatherApp.ensureRadarMapReady();
          } else if (window.WeatherApp.radarMap) {
            window.WeatherApp.radarMap.resize();
          }
        }
      }, 50);
    }
  }

  window.switchAppTab = switchTab;
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
  const totalKmEl = document.getElementById('historyTotalKm');

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

    // Calculate Total Kilometers traveled on this date
    let totalKm = 0;
    trips.forEach(t => {
      const match = t.distance.match(/([0-9.]+)/);
      if (match) {
        totalKm += parseFloat(match[1]);
      }
    });

    if (totalKmEl) {
      totalKmEl.innerText = `${toBengaliDigits(totalKm.toFixed(1))} কিমি`;
    }

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
          <span><i class="fa-solid fa-map-pin text-primary"></i> ট্রিপ #${toBengaliDigits(index + 1)}: ${t.fromName}</span>
          <span class="trip-time-tag"><i class="fa-regular fa-clock"></i> ${t.time}</span>
        </div>
        <div class="trip-route-desc">
          <i class="fa-solid fa-arrow-right-long text-success"></i> গন্তব্য: <strong>${t.toName}</strong>
        </div>
        <div class="trip-metric-row">
          <span><i class="fa-solid fa-road"></i> দূরত্ব: <strong>${t.distance}</strong></span>
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

  if (btnPrevDate) {
    btnPrevDate.addEventListener('click', () => {
      selectedDate = new Date(selectedDate.getTime() - 86400000);
      updateDateDisplay();
      loadTripsForDate();
    });
  }

  if (btnNextDate) {
    btnNextDate.addEventListener('click', () => {
      selectedDate = new Date(selectedDate.getTime() + 86400000);
      updateDateDisplay();
      loadTripsForDate();
    });
  }

  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      if (e.target.value) {
        selectedDate = new Date(e.target.value + 'T00:00:00');
        updateDateDisplay();
        loadTripsForDate();
      }
    });
  }

  if (btnViewHistory) {
    btnViewHistory.addEventListener('click', () => {
      loadTripsForDate();
      if (window.showToast) {
        window.showToast(`${dateLabel ? dateLabel.innerText : 'নির্বাচিত তারিখের'} হিস্টরি লোড হয়েছে`);
      }
    });
  }

  if (btnShowOnMap) {
    btnShowOnMap.addEventListener('click', () => {
      if (currentLoadedTrips.length === 0) return;
      if (modalHistory) modalHistory.style.display = 'none';

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
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            window.showToast('🎉 অ্যাপ ইনস্টলেশন শুরু হয়েছে!');
          }
          deferredInstallPrompt = null;
        });
      } else {
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

        if (window.WeatherApp && window.WeatherApp.setMyGpsLocation) {
          window.WeatherApp.setMyGpsLocation(latitude, longitude);
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
