/**
 * DIKDIGANTA / MYLOCATION360 - REALISTIC CELESTIAL WEATHER ENGINE
 * Dynamic Celestial Arc with Sun Position & Solar Intensity Tracking
 * Accurate Astronomical Moon Phase (Crescent, Quarter, Gibbous, Full & New Moon)
 */

class WeatherSceneRenderer {
  constructor(canvasId, overlayId, stageId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.overlay = document.getElementById(overlayId) || document.getElementById('cwSceneOverlay');
    this.stage = document.getElementById(stageId) || document.getElementById('cwAnimationStage');
    
    this.currentScene = 'clear-day';
    this.animationFrameId = null;
    this.particles = [];
    this.stars = [];
    this.splashes = [];
    this.clouds = [];
    this.fogLayers = [];
    this.lastTime = performance.now();
    this.lightningTimer = 0;
    this.isFlashing = false;
    
    // Solar & Lunar metrics
    this.sunProgress = 0.5; // 0.0 (sunrise) to 1.0 (sunset)
    this.solarIntensity = 0.85; // 0.0 (dim) to 1.0 (blazing)
    this.moonData = this.getMoonPhaseInfo();

    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.initSceneObjects();
      this.updateSunProgressFromTime();
      this.animate();
    }
  }

  resize() {
    if (!this.canvas || !this.stage) return;
    const rect = this.stage.getBoundingClientRect();
    this.width = this.canvas.width = rect.width || 400;
    this.height = this.canvas.height = rect.height || 220;
  }

  // Astronomical Moon Phase Calculation (Real Lunar Cycle)
  getMoonPhaseInfo(date = new Date()) {
    const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
    const synodicMonthMs = 29.53058867 * 86400000;
    const diffMs = date.getTime() - knownNewMoon;
    const cycle = ((diffMs % synodicMonthMs) + synodicMonthMs) % synodicMonthMs / synodicMonthMs;

    // Illumination 0% to 100%
    const illumination = 0.5 * (1 - Math.cos(cycle * 2 * Math.PI));
    const percent = Math.round(illumination * 100);

    let phaseType = 'waxing-crescent';
    let phaseName = 'বাঁকা চাঁদ (শুক্লপক্ষ)';

    if (cycle < 0.03 || cycle > 0.97) {
      phaseType = 'new';
      phaseName = 'অমাবস্যা (চাঁদ দৃশ্যমান নয়)';
    } else if (cycle < 0.22) {
      phaseType = 'waxing-crescent';
      phaseName = 'বাঁকা চাঁদ (শুক্লপক্ষ)';
    } else if (cycle < 0.28) {
      phaseType = 'first-quarter';
      phaseName = 'অর্ধচন্দ্র (প্রথম চতুর্থাংশ)';
    } else if (cycle < 0.47) {
      phaseType = 'waxing-gibbous';
      phaseName = 'উজ্জ্বল কুঁজো চাঁদ';
    } else if (cycle < 0.53) {
      phaseType = 'full';
      phaseName = 'পূর্ণিমা (পূর্ণ চাঁদ)';
    } else if (cycle < 0.72) {
      phaseType = 'waning-gibbous';
      phaseName = 'ক্ষীয়মাণ কুঁজো চাঁদ';
    } else if (cycle < 0.78) {
      phaseType = 'last-quarter';
      phaseName = 'অর্ধচন্দ্র (শেষ চতুর্থাংশ)';
    } else {
      phaseType = 'waning-crescent';
      phaseName = 'বাঁকা চাঁদ (কৃষ্ণপক্ষ)';
    }

    return {
      cycle,
      illumination: percent,
      type: phaseType,
      name: phaseName
    };
  }

  // Calculate Sun Position along the Arc from Local Time
  updateSunProgressFromTime() {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    const sunrise = 5.8; // ~5:48 AM
    const sunset = 18.2; // ~6:12 PM

    if (hours >= sunrise && hours <= sunset) {
      this.sunProgress = (hours - sunrise) / (sunset - sunrise);
    } else {
      this.sunProgress = 0.5; // default noon when simulating
    }

    // Solar Intensity based on distance from solar noon (~12:00 PM)
    const distanceFromNoon = Math.abs(this.sunProgress - 0.5) * 2; // 0 at noon, 1 at dawn/dusk
    let baseIntensity = 1.0 - (distanceFromNoon * 0.65); // 1.0 at noon, ~0.35 at dawn/dusk

    // If cloudy, rainy or overcast, intensity is dimmed
    if (this.currentScene === 'partly-cloudy-day') {
      baseIntensity *= 0.75;
    } else if (this.currentScene === 'cloudy' || this.currentScene === 'fog') {
      baseIntensity *= 0.4;
    } else if (this.currentScene === 'rain' || this.currentScene === 'storm') {
      baseIntensity *= 0.2;
    }

    this.solarIntensity = Math.max(0.15, Math.min(1.0, baseIntensity));
    this.updateStatusText();
  }

  updateStatusText() {
    const statusTextEl = document.getElementById('celestialStatusText');
    const statusIconEl = document.getElementById('celestialStatusIcon');
    if (!statusTextEl) return;

    const toBengaliDigits = (n) => n.toString().replace(/[0-9]/g, d => "০১২৩৪৫৬৭৮৯"[d]);

    if (this.currentScene.includes('night')) {
      const moon = this.moonData || this.getMoonPhaseInfo();
      if (statusIconEl) statusIconEl.className = 'fa-solid fa-moon text-info';
      if (moon.type === 'new') {
        statusTextEl.innerText = `রাতের আকাশ: ${moon.name} | আকাশে কোনো চাঁদ দৃশ্যমান নেই`;
      } else {
        statusTextEl.innerText = `রাতের আকাশ: ${moon.name} | চাঁদের দৃশ্যমানতা: ${toBengaliDigits(moon.illumination)}%`;
      }
    } else {
      if (statusIconEl) statusIconEl.className = 'fa-solid fa-sun text-warning';
      const intPercent = Math.round(this.solarIntensity * 100);
      let desc = 'মৃদু স্নিগ্ধ রোদ';
      if (this.solarIntensity > 0.75) {
        desc = 'তীব্র প্রখর রোদ';
      } else if (this.solarIntensity > 0.45) {
        desc = 'স্বাভাবিক নির্মল রোদ';
      } else {
        desc = 'সীমিত আবছা রোদ';
      }

      let posDesc = 'দুপুরে শীর্ষ অবস্থানে';
      if (this.sunProgress < 0.3) {
        posDesc = 'সকাল (পূর্ব দিগন্ত থেকে উঠছে)';
      } else if (this.sunProgress > 0.7) {
        posDesc = 'বিকাল/সন্ধ্যা (পশ্চিম দিগন্তমুখী)';
      }

      statusTextEl.innerText = `সূর্যের অবস্থান: ${posDesc} | রোদের প্রখরতা: ${desc} (${toBengaliDigits(intPercent)}%)`;
    }
  }

  initSceneObjects() {
    this.particles = [];
    this.stars = [];
    this.splashes = [];
    this.clouds = [];
    this.fogLayers = [];

    const w = this.width || 400;
    const h = this.height || 220;
    const isNight = this.currentScene.includes('night');

    // 1. Stars for Night Skies
    if (isNight) {
      const moon = this.moonData || this.getMoonPhaseInfo();
      // More stars visible during crescent or new moon!
      const starCount = moon.type === 'new' ? 85 : (moon.illumination < 50 ? 65 : 40);
      for (let i = 0; i < starCount; i++) {
        this.stars.push({
          x: Math.random() * w,
          y: Math.random() * (h * 0.72),
          radius: Math.random() * 1.5 + 0.4,
          baseAlpha: Math.random() * 0.7 + 0.3,
          twinkleSpeed: Math.random() * 0.05 + 0.02,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    // 2. Rain Particles
    if (this.currentScene.includes('rain') || this.currentScene.includes('storm')) {
      const dropCount = this.currentScene.includes('storm') ? 140 : 85;
      for (let i = 0; i < dropCount; i++) {
        this.particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          length: Math.random() * 18 + 12,
          speed: Math.random() * 12 + 14,
          thickness: isNight ? (Math.random() * 1.6 + 0.9) : (Math.random() * 1.4 + 0.8),
          opacity: isNight ? (Math.random() * 0.55 + 0.4) : (Math.random() * 0.45 + 0.3),
          slant: this.currentScene.includes('storm') ? -3.5 : -1.5
        });
      }
    }

    // 3. Snow Particles
    if (this.currentScene === 'snow') {
      for (let i = 0; i < 60; i++) {
        this.particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          radius: Math.random() * 3 + 1.2,
          speedY: Math.random() * 1.5 + 0.8,
          speedX: Math.sin(Math.random() * 3) * 0.8,
          opacity: Math.random() * 0.6 + 0.4,
          swing: Math.random() * 2
        });
      }
    }

    // 4. Fog / Mist Layers
    if (this.currentScene.includes('fog')) {
      for (let i = 0; i < 5; i++) {
        this.fogLayers.push({
          x: -100 - i * 60,
          y: (h * 0.25) + i * 28,
          width: w * 1.6,
          height: 45 + i * 8,
          speed: 0.25 + i * 0.12,
          opacity: 0.25 + (i * 0.08)
        });
      }
      for (let i = 0; i < 25; i++) {
        this.particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          radius: Math.random() * 2.5 + 1,
          speedX: Math.random() * 0.4 - 0.2,
          speedY: Math.random() * 0.3 + 0.1,
          opacity: Math.random() * 0.4 + 0.2
        });
      }
    }

    // 5. Sunny Day Particles (Solar golden sparks - proportional to intensity)
    if (this.currentScene === 'clear-day' || this.currentScene === 'partly-cloudy-day') {
      const sparkCount = Math.round(35 * this.solarIntensity);
      for (let i = 0; i < sparkCount; i++) {
        this.particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          radius: Math.random() * 2.8 + 1,
          speedX: (Math.random() - 0.5) * 0.35,
          speedY: -Math.random() * 0.45 - 0.1,
          opacity: Math.random() * 0.45 + 0.2,
          color: Math.random() > 0.5 ? '#fef08a' : '#f59e0b'
        });
      }
    }

    // 6. Dynamic Moving Clouds
    if (['cloudy', 'cloudy-night', 'partly-cloudy-day', 'partly-cloudy-night', 'storm', 'storm-night', 'rain-night'].includes(this.currentScene)) {
      const isHeavy = this.currentScene.includes('cloudy') || this.currentScene.includes('storm');
      const count = isHeavy ? 8 : 4;
      for (let i = 0; i < count; i++) {
        this.clouds.push({
          x: (i / count) * w * 1.4 - 50,
          y: Math.random() * (h * 0.4) + 10,
          scale: Math.random() * 0.55 + 0.75,
          speed: Math.random() * 0.22 + 0.12,
          opacity: isNight ? (isHeavy ? 0.78 : 0.48) : 0.65
        });
      }
    }
  }

  setScene(sceneType) {
    if (this.currentScene === sceneType) return;
    this.currentScene = sceneType;
    this.moonData = this.getMoonPhaseInfo();
    this.updateSunProgressFromTime();
    this.resize();
    this.initSceneObjects();
    this.updateDomOverlays();
  }

  updateDomOverlays() {
    if (!this.overlay) return;
    const sun = this.overlay.querySelector('.sun-glow');
    const cloud1 = this.overlay.querySelector('.layer-1');
    const cloud2 = this.overlay.querySelector('.layer-2');
    
    // Background gradient on stage based on realistic night/day conditions
    if (this.stage) {
      if (this.currentScene === 'clear-day') {
        // Dynamic day sky according to solar intensity & time
        if (this.solarIntensity > 0.75) {
          this.stage.style.background = 'linear-gradient(180deg, #0284c7 0%, #38bdf8 65%, #bae6fd 100%)';
        } else if (this.sunProgress > 0.75 || this.sunProgress < 0.25) {
          // Dawn or Sunset golden-amber tint
          this.stage.style.background = 'linear-gradient(180deg, #0369a1 0%, #ea580c 60%, #fdba74 100%)';
        } else {
          this.stage.style.background = 'linear-gradient(180deg, #0369a1 0%, #38bdf8 65%, #bae6fd 100%)';
        }
      } else if (this.currentScene === 'clear-night') {
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #090d16 55%, #172554 100%)';
      } else if (this.currentScene === 'partly-cloudy-day') {
        this.stage.style.background = 'linear-gradient(180deg, #0369a1 0%, #38bdf8 55%, #7dd3fc 100%)';
      } else if (this.currentScene === 'partly-cloudy-night') {
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #0b0f19 50%, #1e293b 100%)';
      } else if (this.currentScene === 'cloudy') {
        this.stage.style.background = 'linear-gradient(180deg, #334155 0%, #475569 55%, #64748b 100%)';
      } else if (this.currentScene === 'cloudy-night') {
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #1e293b 100%)';
      } else if (this.currentScene === 'fog') {
        this.stage.style.background = 'linear-gradient(180deg, #334155 0%, #64748b 45%, #94a3b8 100%)';
      } else if (this.currentScene === 'fog-night') {
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #334155 100%)';
      } else if (this.currentScene === 'rain') {
        this.stage.style.background = 'linear-gradient(180deg, #0f172a 0%, #1e293b 55%, #334155 100%)';
      } else if (this.currentScene === 'rain-night') {
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #090d16 50%, #0f172a 100%)';
      } else if (this.currentScene === 'storm') {
        this.stage.style.background = 'linear-gradient(180deg, #030712 0%, #0f172a 60%, #1e1b4b 100%)';
      } else if (this.currentScene === 'storm-night') {
        this.stage.style.background = 'linear-gradient(180deg, #000000 0%, #050510 50%, #0f172a 100%)';
      } else if (this.currentScene === 'snow') {
        this.stage.style.background = 'linear-gradient(180deg, #1e293b 0%, #334155 60%, #94a3b8 100%)';
      }
    }

    if (sun) sun.style.display = 'none'; // We render authentic procedural sun on canvas along the arc!
    if (cloud1) cloud1.style.display = ['cloudy', 'partly-cloudy-day', 'storm'].includes(this.currentScene) ? 'block' : 'none';
    if (cloud2) cloud2.style.display = (this.currentScene === 'cloudy') ? 'block' : 'none';
  }

  animate() {
    const now = performance.now();
    this.lastTime = now;

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);

      if (this.currentScene === 'clear-day') {
        this.renderSunnyScene(false);
      } else if (this.currentScene === 'clear-night') {
        this.renderNightScene('clear');
      } else if (this.currentScene === 'partly-cloudy-day') {
        this.renderSunnyScene(true);
      } else if (this.currentScene === 'partly-cloudy-night') {
        this.renderNightScene('partly-cloudy');
      } else if (this.currentScene === 'cloudy') {
        this.renderCloudyScene();
      } else if (this.currentScene === 'cloudy-night') {
        this.renderNightScene('cloudy');
      } else if (this.currentScene === 'fog') {
        this.renderFogScene(false);
      } else if (this.currentScene === 'fog-night') {
        this.renderFogScene(true);
      } else if (this.currentScene === 'rain') {
        this.renderRainScene();
      } else if (this.currentScene === 'rain-night') {
        this.renderNightRainScene();
      } else if (this.currentScene === 'storm') {
        this.renderStormScene(false);
      } else if (this.currentScene === 'storm-night') {
        this.renderStormScene(true);
      } else if (this.currentScene === 'snow') {
        this.renderSnowScene();
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  /* ==========================================================
     ☀️ DAYTIME: CELESTIAL SUN PATH ARC & ACCURATE SOLAR POSITION
     ========================================================== */
  renderSunnyScene(isPartlyCloudy) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Draw Celestial Sun Trajectory Arc (সকাল থেকে সন্ধ্যা পর্যন্ত কার্ভ রেখা)
    const arcStartX = 45;
    const arcEndX = w - 45;
    const arcBaseY = h - 25;
    const arcApexY = 48; // Apex height near noon

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.4)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(arcStartX, arcBaseY);
    ctx.quadraticCurveTo(w / 2, arcApexY - 30, arcEndX, arcBaseY);
    ctx.stroke();
    ctx.restore();

    // Horizon Endpoints (পূর্ব ও পশ্চিম দিগন্ত সূচক)
    ctx.fillStyle = 'rgba(254, 240, 138, 0.7)';
    ctx.font = '10px Hind Siliguri, sans-serif';
    ctx.fillText('🌅 পূর্ব (সকাল)', arcStartX - 10, arcBaseY + 16);
    ctx.fillText('🌇 পশ্চিম (সন্ধ্যা)', arcEndX - 45, arcBaseY + 16);

    // 2. Compute Sun Coordinates along the Curve
    const t = this.sunProgress; // 0.0 to 1.0
    // Quadratic bezier math: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const p0x = arcStartX, p0y = arcBaseY;
    const p1x = w / 2, p1y = arcApexY - 30;
    const p2x = arcEndX, p2y = arcBaseY;

    const sunX = Math.round((1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * p1x + t * t * p2x);
    const sunY = Math.round((1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * p1y + t * t * p2y);

    // 3. Render Radiant Sun based on Solar Intensity (রোদের প্রখরতা)
    const intensity = this.solarIntensity; // 0.15 to 1.0
    const time = performance.now() * 0.0004;

    // Solar Beams / Rays (rotating)
    const rayCount = intensity > 0.7 ? 14 : 8;
    const rayLength = Math.max(w, h) * (0.6 + intensity * 0.4);
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(time);
    for (let i = 0; i < rayCount; i++) {
      ctx.beginPath();
      const angle = (i * Math.PI * 2) / rayCount;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, rayLength, angle - 0.06 * intensity, angle + 0.06 * intensity);
      ctx.closePath();
      ctx.fillStyle = `rgba(254, 240, 138, ${0.03 + intensity * 0.07})`;
      ctx.fill();
    }
    ctx.restore();

    // Outer Solar Corona / Halo
    const haloRadius = 35 + intensity * 60;
    const haloGrad = ctx.createRadialGradient(sunX, sunY, 12, sunX, sunY, haloRadius);
    haloGrad.addColorStop(0, `rgba(253, 224, 71, ${0.4 + intensity * 0.55})`);
    haloGrad.addColorStop(0.4, `rgba(245, 158, 11, ${0.2 + intensity * 0.3})`);
    haloGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

    ctx.beginPath();
    ctx.arc(sunX, sunY, haloRadius, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    // Inner Radiant Core
    const coreRadius = 18 + intensity * 10;
    ctx.beginPath();
    ctx.arc(sunX, sunY, coreRadius, 0, Math.PI * 2);
    ctx.fillStyle = intensity > 0.75 ? '#ffffff' : '#fef08a';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 15 + intensity * 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Sun Pin Label on the Arc (সৌর মার্কার)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Hind Siliguri, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('☀️ সূর্য', sunX, sunY - coreRadius - 6);
    ctx.textAlign = 'start';

    // Floating Golden Sun Motes
    this.particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity * intensity;
      ctx.fill();
      ctx.globalAlpha = 1.0;

      p.x += p.speedX;
      p.y += p.speedY;
      if (p.y < 0) {
        p.y = h;
        p.x = Math.random() * w;
      }
    });

    if (isPartlyCloudy) {
      this.drawPuffClouds('#ffffff', 0.52);
    }
  }

  /* ==========================================================
     🌙 NIGHT: ACCURATE MOON PHASE & REALISTIC VISIBILITY
     ========================================================== */
  renderNightScene(mode) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const moon = this.moonData || this.getMoonPhaseInfo();

    // 1. Twinkling Stars
    const time = performance.now() * 0.002;
    this.stars.forEach(s => {
      const alphaMultiplier = mode === 'cloudy' ? 0.35 : 1.0;
      const alpha = (s.baseAlpha + Math.sin(time * 2 + s.phase) * 0.25) * alphaMultiplier;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.08, Math.min(1, alpha))})`;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = s.radius > 1 ? 4 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 2. Render Authentic Moon according to Lunar Phase
    // If New Moon (অমাবস্যা) -> Moon is dark/invisible, only stars are present!
    if (moon.type !== 'new') {
      const moonX = w - 85;
      const moonY = 55;
      const moonR = 24;

      // Soft Moon Halo proportional to illumination
      if (moon.illumination > 15) {
        const haloScale = moon.illumination / 100;
        const haloGrad = ctx.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, moonR * (1.6 + haloScale * 1.6));
        haloGrad.addColorStop(0, `rgba(224, 242, 254, ${0.15 + haloScale * 0.3})`);
        haloGrad.addColorStop(0.5, `rgba(186, 230, 253, ${0.05 + haloScale * 0.12})`);
        haloGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR * (1.6 + haloScale * 1.6), 0, Math.PI * 2);
        ctx.fillStyle = haloGrad;
        ctx.fill();
      }

      // Procedural Moon Phase Drawing
      ctx.save();
      const moonAlpha = mode === 'cloudy' ? 0.72 : 1.0;
      ctx.globalAlpha = moonAlpha;

      if (moon.type === 'full') {
        // Full Moon: Completely illuminated sphere
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = '#bae6fd';
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Subtle crater marks
        ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
        ctx.beginPath();
        ctx.arc(moonX - 6, moonY - 5, 4.5, 0, Math.PI * 2);
        ctx.arc(moonX + 7, moonY + 5, 6, 0, Math.PI * 2);
        ctx.arc(moonX - 3, moonY + 9, 3.5, 0, Math.PI * 2);
        ctx.fill();

      } else if (moon.type === 'waxing-crescent' || moon.type === 'waning-crescent') {
        // Crescent Moon: Slender silver crescent (বাঁকা চাঁদ)
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.5)'; // Dark unlit silhouette
        ctx.fill();

        // Lit Crescent Curve
        ctx.beginPath();
        const offset = moon.type === 'waxing-crescent' ? 7 : -7;
        ctx.arc(moonX, moonY, moonR, -Math.PI / 2, Math.PI / 2, moon.type === 'waxing-crescent');
        ctx.quadraticCurveTo(moonX + offset, moonY, moonX, moonY - moonR);
        ctx.closePath();
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = '#bae6fd';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;

      } else if (moon.type === 'first-quarter' || moon.type === 'last-quarter') {
        // Half Moon (অর্ধচন্দ্র)
        ctx.beginPath();
        const isFirst = moon.type === 'first-quarter';
        ctx.arc(moonX, moonY, moonR, -Math.PI / 2, Math.PI / 2, !isFirst);
        ctx.closePath();
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = '#bae6fd';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;

      } else {
        // Gibbous Moon (কুঁজো চাঁদ - প্রায় পূর্ণ)
        ctx.beginPath();
        ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = '#bae6fd';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    // 3. Clouds in Night Sky
    if (mode === 'partly-cloudy') {
      this.drawPuffClouds('rgba(203, 213, 225, 0.42)', 0.55);
    } else if (mode === 'cloudy') {
      this.drawNightOvercastClouds();
    }
  }

  /* 🌧️ Night Rain */
  renderNightRainScene() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const moon = this.moonData || this.getMoonPhaseInfo();
    if (moon.type !== 'new') {
      const moonX = w - 85;
      const moonY = 55;
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 70);
      moonGlow.addColorStop(0, 'rgba(186, 230, 253, 0.22)');
      moonGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.beginPath();
      ctx.arc(moonX, moonY, 70, 0, Math.PI * 2);
      ctx.fillStyle = moonGlow;
      ctx.fill();
    }

    this.drawNightOvercastClouds(0.5);

    ctx.strokeStyle = '#bfdbfe';
    ctx.lineCap = 'round';

    this.particles.forEach(p => {
      ctx.lineWidth = p.thickness;
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.slant * (p.length / 10), p.y + p.length);
      ctx.stroke();

      p.x += p.slant;
      p.y += p.speed;

      if (p.y > h - 15) {
        if (Math.random() > 0.35) {
          this.splashes.push({
            x: p.x,
            y: h - Math.random() * 12,
            radius: 1,
            maxRadius: Math.random() * 12 + 6,
            alpha: 0.65
          });
        }
        p.y = -p.length;
        p.x = Math.random() * (w + 100) - 50;
      }
    });
    ctx.globalAlpha = 1.0;

    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.radius * 1.8, s.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(191, 219, 254, ${s.alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      s.radius += 0.65;
      s.alpha -= 0.045;
      if (s.alpha <= 0) this.splashes.splice(i, 1);
    }
  }

  /* ☁️ Night Overcast Clouds */
  drawNightOvercastClouds(extraAlpha = 1.0) {
    const ctx = this.ctx;
    const w = this.width;

    this.clouds.forEach((c, idx) => {
      ctx.save();
      const cloudColor = (idx % 2 === 0) ? 'rgba(51, 65, 85, 0.72)' : 'rgba(71, 85, 105, 0.65)';
      ctx.globalAlpha = c.opacity * extraAlpha;
      ctx.fillStyle = cloudColor;

      const cx = c.x;
      const cy = c.y;
      const s = c.scale;

      ctx.beginPath();
      ctx.arc(cx, cy, 32 * s, 0, Math.PI * 2);
      ctx.arc(cx + 28 * s, cy - 16 * s, 40 * s, 0, Math.PI * 2);
      ctx.arc(cx + 72 * s, cy - 8 * s, 32 * s, 0, Math.PI * 2);
      ctx.arc(cx + 48 * s, cy + 12 * s, 30 * s, 0, Math.PI * 2);
      ctx.arc(cx + 14 * s, cy + 12 * s, 28 * s, 0, Math.PI * 2);
      ctx.closePath();
      ctx.shadowColor = '#64748b';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();

      c.x += c.speed;
      if (c.x > w + 140) {
        c.x = -140;
      }
    });
  }

  /* 🌫️ Fog Scene */
  renderFogScene(isNight) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const glowGrad = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.3, 120);
    glowGrad.addColorStop(0, isNight ? 'rgba(186, 230, 253, 0.2)' : 'rgba(241, 245, 249, 0.25)');
    glowGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.3, 120, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    this.fogLayers.forEach(f => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, f.y - 15, w, f.height);
      const fogGrad = ctx.createLinearGradient(0, f.y - 15, 0, f.y + f.height);
      const fogColor = isNight ? '148, 163, 184' : '226, 232, 240';
      fogGrad.addColorStop(0, `rgba(${fogColor}, 0)`);
      fogGrad.addColorStop(0.5, `rgba(${fogColor}, ${f.opacity})`);
      fogGrad.addColorStop(1, `rgba(${fogColor}, 0)`);
      ctx.fillStyle = fogGrad;
      ctx.fill();
      ctx.restore();

      f.x += f.speed;
      if (f.x > w) f.x = -w * 0.5;
    });

    this.particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(241, 245, 249, ${p.opacity})`;
      ctx.fill();

      p.x += p.speedX;
      p.y += p.speedY;
      if (p.y > h) {
        p.y = 0;
        p.x = Math.random() * w;
      }
    });
  }

  /* ☁️ Daytime Cloudy Scene */
  renderCloudyScene() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Dim sun faintly visible behind clouds
    this.renderSunnyScene(false);

    ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
    ctx.fillRect(0, 0, w, h);
    this.drawPuffClouds('#cbd5e1', 0.72);
  }

  /* 🌨️ Snow Scene */
  renderSnowScene() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    this.particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
      ctx.shadowColor = '#e0f2fe';
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.shadowBlur = 0;

      p.y += p.speedY;
      p.x += Math.sin(p.y * 0.05 + p.swing) * 0.6;

      if (p.y > h) {
        p.y = -5;
        p.x = Math.random() * w;
      }
    });
  }

  /* 🌧️ Daytime Rain Scene */
  renderRainScene() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.strokeStyle = '#93c5fd';
    ctx.lineCap = 'round';

    this.particles.forEach(p => {
      ctx.lineWidth = p.thickness;
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.slant * (p.length / 10), p.y + p.length);
      ctx.stroke();

      p.x += p.slant;
      p.y += p.speed;

      if (p.y > h - 15) {
        if (Math.random() > 0.4) {
          this.splashes.push({
            x: p.x,
            y: h - Math.random() * 12,
            radius: 1,
            maxRadius: Math.random() * 12 + 6,
            alpha: 0.6
          });
        }
        p.y = -p.length;
        p.x = Math.random() * (w + 100) - 50;
      }
    });
    ctx.globalAlpha = 1.0;

    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.radius * 1.8, s.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(186, 230, 253, ${s.alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      s.radius += 0.6;
      s.alpha -= 0.04;
      if (s.alpha <= 0) this.splashes.splice(i, 1);
    }
  }

  /* ⛈️ Storm Scene */
  renderStormScene(isNight) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    this.lightningTimer += 1;
    if (this.lightningTimer > 180 && Math.random() > 0.96) {
      this.isFlashing = true;
      this.lightningTimer = 0;
      setTimeout(() => { this.isFlashing = false; }, 80);
      setTimeout(() => { 
        if (Math.random() > 0.5) {
          this.isFlashing = true; 
          setTimeout(() => { this.isFlashing = false; }, 60);
        }
      }, 140);
    }

    if (this.isFlashing) {
      ctx.fillStyle = isNight ? 'rgba(224, 242, 254, 0.9)' : 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(0, 0, w, h);
    }

    if (isNight) {
      this.renderNightRainScene();
    } else {
      this.renderRainScene();
      this.drawPuffClouds('#475569', 0.85);
    }
  }

  /* Helper to draw organic puff clouds */
  drawPuffClouds(fillColor, baseAlpha) {
    const ctx = this.ctx;
    const w = this.width;

    this.clouds.forEach(c => {
      ctx.save();
      ctx.globalAlpha = baseAlpha * c.opacity;
      ctx.fillStyle = fillColor;

      const cx = c.x;
      const cy = c.y;
      const s = c.scale;

      ctx.beginPath();
      ctx.arc(cx, cy, 28 * s, 0, Math.PI * 2);
      ctx.arc(cx + 25 * s, cy - 14 * s, 36 * s, 0, Math.PI * 2);
      ctx.arc(cx + 62 * s, cy - 6 * s, 28 * s, 0, Math.PI * 2);
      ctx.arc(cx + 42 * s, cy + 10 * s, 26 * s, 0, Math.PI * 2);
      ctx.arc(cx + 12 * s, cy + 10 * s, 24 * s, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      c.x += c.speed;
      if (c.x > w + 120) {
        c.x = -120;
      }
    });
  }
}

// Global factory initializer
window.initWeatherScenes = () => {
  window.WeatherScenes = {
    currentLocationScene: new WeatherSceneRenderer('cwAnimCanvas', 'cwSceneOverlay', 'cwAnimationStage')
  };
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.initWeatherScenes());
} else {
  window.initWeatherScenes();
}
