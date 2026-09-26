/**
 * DIKDIGANTA / MYLOCATION360 - LIVE REALISTIC WEATHER ANIMATION ENGINE
 * Dynamic Canvas & Overlay System for Atmospheric Weather Scenes
 * Supports: 
 *   - clear-day (দিনের রোদ্রোজ্জ্বল রোদ)
 *   - clear-night (তারায় ভরা রাতের মুক্ত আকাশ ও উজ্জ্বল চাঁদ)
 *   - partly-cloudy-day (দিনের আংশিক মেঘলা দৃশ্য)
 *   - partly-cloudy-night (রাতের আংশিক মেঘলা দৃশ্য - চাঁদের পাশে মেঘ)
 *   - cloudy (দিনের ঘন মেঘলা আকাশ)
 *   - cloudy-night (রাতের মেঘাচ্ছন্ন আকাশ - অন্ধকারের মাঝেও দৃশ্যমান মেঘ)
 *   - fog (দিনের কুয়াশা ও শীতকালীন দৃশ্য)
 *   - fog-night (রাতের কুয়াশা ও শীতকালীন দৃশ্য)
 *   - rain (দিনের বৃষ্টি ও পানির স্প্ল্যাশ)
 *   - rain-night (রাতের বৃষ্টি - অন্ধকার রাতে চকচকে বৃষ্টির ধারা)
 *   - storm (দিনের বজ্রঝড় ও মেঘের গর্জন)
 *   - storm-night (রাতের বজ্রঝড় ও তীব্র বিদ্যুৎ ঝলকানি)
 *   - snow (শীতের তুষারপাত)
 */

class WeatherSceneRenderer {
  constructor(canvasId, overlayId, stageId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.overlay = document.getElementById(overlayId) || document.getElementById('cwSceneOverlay') || document.getElementById('owSceneOverlay');
    this.stage = document.getElementById(stageId) || document.getElementById('cwAnimationStage') || document.getElementById('owAnimationStage');
    
    this.currentScene = 'clear-night';
    this.animationFrameId = null;
    this.particles = [];
    this.stars = [];
    this.splashes = [];
    this.clouds = [];
    this.fogLayers = [];
    this.lastTime = performance.now();
    this.lightningTimer = 0;
    this.isFlashing = false;
    
    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.initSceneObjects();
      this.animate();
    }
  }

  resize() {
    if (!this.canvas || !this.stage) return;
    const rect = this.stage.getBoundingClientRect();
    this.width = this.canvas.width = rect.width || 400;
    this.height = this.canvas.height = rect.height || 220;
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

    // 1. Stars for Night Skies (Clear Night, Partly Cloudy Night, and faint stars in cloudy/rainy night)
    if (isNight) {
      const starCount = this.currentScene === 'clear-night' ? 70 : (this.currentScene === 'partly-cloudy-night' ? 45 : 18);
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

    // 2. Rain Particles (Day & Night Rain, Storm)
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

    // 4. Fog / Mist Layers (কুয়াশা ও শীত)
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

    // 5. Sunny Day Particles (Solar golden sparks)
    if (this.currentScene === 'clear-day' || this.currentScene === 'partly-cloudy-day') {
      for (let i = 0; i < 30; i++) {
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

    // 6. Dynamic Moving Clouds (Cloudy Day, Cloudy Night, Partly Cloudy)
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
        this.stage.style.background = 'linear-gradient(180deg, #0284c7 0%, #38bdf8 65%, #bae6fd 100%)';
      } else if (this.currentScene === 'clear-night') {
        // Deep realistic starry night
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #090d16 55%, #172554 100%)';
      } else if (this.currentScene === 'partly-cloudy-day') {
        this.stage.style.background = 'linear-gradient(180deg, #0369a1 0%, #38bdf8 55%, #7dd3fc 100%)';
      } else if (this.currentScene === 'partly-cloudy-night') {
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #0b0f19 50%, #1e293b 100%)';
      } else if (this.currentScene === 'cloudy') {
        this.stage.style.background = 'linear-gradient(180deg, #334155 0%, #475569 55%, #64748b 100%)';
      } else if (this.currentScene === 'cloudy-night') {
        // Night overcast: dark sky where clouds are distinctly visible against moon glow
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #1e293b 100%)';
      } else if (this.currentScene === 'fog') {
        this.stage.style.background = 'linear-gradient(180deg, #334155 0%, #64748b 45%, #94a3b8 100%)';
      } else if (this.currentScene === 'fog-night') {
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #334155 100%)';
      } else if (this.currentScene === 'rain') {
        this.stage.style.background = 'linear-gradient(180deg, #0f172a 0%, #1e293b 55%, #334155 100%)';
      } else if (this.currentScene === 'rain-night') {
        // Distinctive Night Rain: unmistakable night darkness with glowing wet rain
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #090d16 50%, #0f172a 100%)';
      } else if (this.currentScene === 'storm') {
        this.stage.style.background = 'linear-gradient(180deg, #030712 0%, #0f172a 60%, #1e1b4b 100%)';
      } else if (this.currentScene === 'storm-night') {
        this.stage.style.background = 'linear-gradient(180deg, #000000 0%, #050510 50%, #0f172a 100%)';
      } else if (this.currentScene === 'snow') {
        this.stage.style.background = 'linear-gradient(180deg, #1e293b 0%, #334155 60%, #94a3b8 100%)';
      }
    }

    if (sun) sun.style.display = (this.currentScene === 'clear-day' || this.currentScene === 'partly-cloudy-day') ? 'block' : 'none';
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
        this.renderCloudyScene(false);
      } else if (this.currentScene === 'cloudy-night') {
        // "মেঘাচ্ছন্ন হয় তবে অন্ধকারের মাঝেও কিছু মেঘ দেখা যাবে"
        this.renderNightScene('cloudy');
      } else if (this.currentScene === 'fog') {
        this.renderFogScene(false);
      } else if (this.currentScene === 'fog-night') {
        this.renderFogScene(true);
      } else if (this.currentScene === 'rain') {
        this.renderRainScene(false);
      } else if (this.currentScene === 'rain-night') {
        // "বৃষ্টি হলে বৃষ্টি দেখা যাবে তবে রাত সেটাও বোঝা যাবে"
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

  /* ☀️ Sunny / Partly Cloudy Day */
  renderSunnyScene(isPartlyCloudy) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const sunX = w - 80;
    const sunY = 55;
    
    // Rotating light beams
    const time = performance.now() * 0.0004;
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(time);
    
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      ctx.beginPath();
      const angle = (i * Math.PI * 2) / rayCount;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, Math.max(w, h), angle - 0.07, angle + 0.07);
      ctx.closePath();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.08)';
      ctx.fill();
    }
    ctx.restore();

    // Solar Orb and Halo
    const haloGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 90);
    haloGrad.addColorStop(0, 'rgba(253, 224, 71, 0.95)');
    haloGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.4)');
    haloGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    
    ctx.beginPath();
    ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    // Inner bright core
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 20;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Floating golden sparks
    this.particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
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

  /* 🌙 Night Scenes: Clear Night, Partly Cloudy, and Cloudy Night with visible clouds */
  renderNightScene(mode) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Twinkling Stars (visible in clear and partly cloudy, faint in cloudy)
    const time = performance.now() * 0.002;
    this.stars.forEach(s => {
      const alphaMultiplier = mode === 'cloudy' ? 0.4 : 1.0;
      const alpha = (s.baseAlpha + Math.sin(time * 2 + s.phase) * 0.25) * alphaMultiplier;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.08, Math.min(1, alpha))})`;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = s.radius > 1 ? 4 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 2. Glowing Moon
    const moonX = w - 85;
    const moonY = 55;

    // Moon halo
    const haloGrad = ctx.createRadialGradient(moonX, moonY, 15, moonX, moonY, 85);
    haloGrad.addColorStop(0, 'rgba(224, 242, 254, 0.45)');
    haloGrad.addColorStop(0.5, 'rgba(186, 230, 253, 0.18)');
    haloGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.beginPath();
    ctx.arc(moonX, moonY, 85, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    // In cloudy night, moon shines from behind clouds
    const moonBodyAlpha = mode === 'cloudy' ? 0.72 : 1.0;
    ctx.save();
    ctx.globalAlpha = moonBodyAlpha;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#bae6fd';
    ctx.shadowBlur = mode === 'cloudy' ? 26 : 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Subtle moon craters
    ctx.fillStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.beginPath();
    ctx.arc(moonX - 7, moonY - 6, 5, 0, Math.PI * 2);
    ctx.arc(moonX + 8, moonY + 6, 7, 0, Math.PI * 2);
    ctx.arc(moonX - 4, moonY + 11, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Clouds in the night sky
    if (mode === 'partly-cloudy') {
      // Light drifting night clouds passing across the moon
      this.drawPuffClouds('rgba(203, 213, 225, 0.42)', 0.55);
    } else if (mode === 'cloudy') {
      // "মেঘাচ্ছন্ন হয় তবে অন্ধকারের মাঝেও কিছু মেঘ দেখা যাবে"
      // Visible volumetric night clouds with silver-blue rim highlighting
      this.drawNightOvercastClouds();
    }
  }

  /* 🌧️ Night Rain: "বৃষ্টি হলে বৃষ্টি দেখা যাবে তবে রাত সেটাও বোঝা যাবে" */
  renderNightRainScene() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Faint moon glow & stars behind the stormy rainy night
    const moonX = w - 85;
    const moonY = 55;
    const moonGlow = ctx.createRadialGradient(moonX, moonY, 10, moonX, moonY, 70);
    moonGlow.addColorStop(0, 'rgba(186, 230, 253, 0.25)');
    moonGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.beginPath();
    ctx.arc(moonX, moonY, 70, 0, Math.PI * 2);
    ctx.fillStyle = moonGlow;
    ctx.fill();

    // Night stars barely visible through rain breaks
    this.stars.slice(0, 15).forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();
    });

    // 2. Dark night rain clouds overhead
    this.drawNightOvercastClouds(0.5);

    // 3. Luminous falling night rain droplets (shining in night ambient light)
    ctx.strokeStyle = '#bfdbfe'; // Bright night water glint
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

      // Ground splash
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

    // Splashes on dark ground reflecting night wetness
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

  /* ☁️ Night Overcast Clouds: Visible even in darkness with moon-silver rims */
  drawNightOvercastClouds(extraAlpha = 1.0) {
    const ctx = this.ctx;
    const w = this.width;

    this.clouds.forEach((c, idx) => {
      ctx.save();
      // Alternating deep slate and silver-blue rim so darkness has deep visible cloud texture
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

  /* 🌫️ Fog & Winter Haze (কুয়াশা ও শীতকালীন দৃশ্য - দিন/রাত) */
  renderFogScene(isNight) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Glowing horizon or moon diffuse glow
    const glowGrad = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.3, 120);
    glowGrad.addColorStop(0, isNight ? 'rgba(186, 230, 253, 0.2)' : 'rgba(241, 245, 249, 0.25)');
    glowGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.3, 120, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Drifting mist fog waves
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

    // Floating dew particles
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

    ctx.fillStyle = 'rgba(30, 41, 59, 0.25)';
    ctx.fillRect(0, 0, w, h);
    this.drawPuffClouds('#cbd5e1', 0.65);
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

  /* ⛈️ Storm Scene (Day & Night) */
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
    currentLocationScene: new WeatherSceneRenderer('cwAnimCanvas', 'cwSceneOverlay', 'cwAnimationStage'),
    otherLocationScene: new WeatherSceneRenderer('owAnimCanvas', 'owSceneOverlay', 'owAnimationStage')
  };
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.initWeatherScenes());
} else {
  window.initWeatherScenes();
}
