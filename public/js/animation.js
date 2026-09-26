/**
 * DIKDIGANTA / MYLOCATION360 - LIVE REALISTIC WEATHER ANIMATION ENGINE
 * Dynamic Canvas & Overlay System for Atmospheric Weather Scenes
 * Supports: 
 *   - clear-day (দিনের রোদ্রোজ্জ্বল রোদ)
 *   - clear-night (তারায় ভরা রাতের মুক্ত আকাশ ও চাঁদ)
 *   - partly-cloudy-day (দিনের আংশিক মেঘলা দৃশ্য)
 *   - partly-cloudy-night (রাতের আংশিক মেঘলা দৃশ্য)
 *   - cloudy (ঘন মেঘলা আকাশ)
 *   - fog (শীতকালীন কুয়াশা ও মিস্ট দৃশ্য)
 *   - rain (বৃষ্টি ও পানির স্প্ল্যাশ)
 *   - storm (বজ্রঝড় ও মেঘের গর্জনসহ লাইটনিং)
 *   - snow (শীতের তুষারপাত)
 */

class WeatherSceneRenderer {
  constructor(canvasId, overlayId, stageId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.overlay = document.getElementById(overlayId);
    this.stage = document.getElementById(stageId);
    
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

    // 1. Stars for Night Skies (Clear Night & Partly Cloudy Night)
    if (this.currentScene.includes('night')) {
      for (let i = 0; i < 65; i++) {
        this.stars.push({
          x: Math.random() * w,
          y: Math.random() * (h * 0.75),
          radius: Math.random() * 1.5 + 0.4,
          baseAlpha: Math.random() * 0.7 + 0.3,
          twinkleSpeed: Math.random() * 0.05 + 0.02,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    // 2. Rain Particles
    if (this.currentScene === 'rain' || this.currentScene === 'storm') {
      const dropCount = this.currentScene === 'storm' ? 140 : 85;
      for (let i = 0; i < dropCount; i++) {
        this.particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          length: Math.random() * 18 + 12,
          speed: Math.random() * 12 + 14,
          thickness: Math.random() * 1.5 + 0.8,
          opacity: Math.random() * 0.45 + 0.35,
          slant: this.currentScene === 'storm' ? -3.5 : -1.5
        });
      }
    }

    // 3. Snow / Winter Particles
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

    // 4. Fog / Mist Horizontal Layers (শীত ও কুয়াশা)
    if (this.currentScene === 'fog') {
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
      // Dew / cool moisture floating particles
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

    // 5. Sunny Day Particles (Solar golden motes)
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

    // 6. Dynamic Moving Clouds (Cloudy, Partly Cloudy Day & Night)
    if (['cloudy', 'partly-cloudy-day', 'partly-cloudy-night', 'storm'].includes(this.currentScene)) {
      const count = this.currentScene === 'cloudy' ? 7 : (this.currentScene === 'storm' ? 8 : 4);
      for (let i = 0; i < count; i++) {
        this.clouds.push({
          x: (i / count) * w * 1.3 - 40,
          y: Math.random() * (h * 0.35) + 15,
          scale: Math.random() * 0.5 + 0.7,
          speed: Math.random() * 0.2 + 0.12,
          opacity: this.currentScene === 'storm' ? 0.75 : (this.currentScene.includes('night') ? 0.4 : 0.55)
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
    
    // Background gradient on stage based on realistic sky conditions
    if (this.stage) {
      if (this.currentScene === 'clear-day') {
        this.stage.style.background = 'linear-gradient(180deg, #0284c7 0%, #38bdf8 65%, #bae6fd 100%)';
      } else if (this.currentScene === 'clear-night') {
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #0f172a 55%, #1e1b4b 100%)';
      } else if (this.currentScene === 'partly-cloudy-day') {
        this.stage.style.background = 'linear-gradient(180deg, #0369a1 0%, #38bdf8 55%, #7dd3fc 100%)';
      } else if (this.currentScene === 'partly-cloudy-night') {
        this.stage.style.background = 'linear-gradient(180deg, #020617 0%, #0f172a 50%, #1e293b 100%)';
      } else if (this.currentScene === 'cloudy') {
        this.stage.style.background = 'linear-gradient(180deg, #334155 0%, #475569 55%, #64748b 100%)';
      } else if (this.currentScene === 'fog') {
        // Winter fog / haze
        this.stage.style.background = 'linear-gradient(180deg, #334155 0%, #64748b 45%, #94a3b8 100%)';
      } else if (this.currentScene === 'rain') {
        this.stage.style.background = 'linear-gradient(180deg, #0f172a 0%, #1e293b 55%, #334155 100%)';
      } else if (this.currentScene === 'storm') {
        this.stage.style.background = 'linear-gradient(180deg, #030712 0%, #0f172a 60%, #1e1b4b 100%)';
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
        this.renderNightScene(false);
      } else if (this.currentScene === 'partly-cloudy-day') {
        this.renderSunnyScene(true);
      } else if (this.currentScene === 'partly-cloudy-night') {
        this.renderNightScene(true);
      } else if (this.currentScene === 'cloudy') {
        this.renderCloudyScene();
      } else if (this.currentScene === 'fog') {
        this.renderFogScene();
      } else if (this.currentScene === 'rain') {
        this.renderRainScene();
      } else if (this.currentScene === 'storm') {
        this.renderStormScene();
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

    // If partly cloudy, draw drifting soft clouds
    if (isPartlyCloudy) {
      this.drawPuffClouds('#ffffff', 0.5);
    }
  }

  /* 🌙 Night / Partly Cloudy Night */
  renderNightScene(isPartlyCloudy) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Twinkling Stars
    const time = performance.now() * 0.002;
    this.stars.forEach(s => {
      const alpha = s.baseAlpha + Math.sin(time * 2 + s.phase) * 0.25;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, Math.min(1, alpha))})`;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = s.radius > 1 ? 5 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 2. Glowing Moon
    const moonX = w - 85;
    const moonY = 55;

    // Outer moon halo
    const haloGrad = ctx.createRadialGradient(moonX, moonY, 15, moonX, moonY, 80);
    haloGrad.addColorStop(0, 'rgba(224, 242, 254, 0.4)');
    haloGrad.addColorStop(0.5, 'rgba(186, 230, 253, 0.15)');
    haloGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.beginPath();
    ctx.arc(moonX, moonY, 80, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    // Moon body
    ctx.beginPath();
    ctx.arc(moonX, moonY, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#bae6fd';
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Moon craters (subtle realism)
    ctx.fillStyle = 'rgba(203, 213, 225, 0.4)';
    ctx.beginPath();
    ctx.arc(moonX - 7, moonY - 6, 5, 0, Math.PI * 2);
    ctx.arc(moonX + 8, moonY + 6, 7, 0, Math.PI * 2);
    ctx.arc(moonX - 4, moonY + 11, 4, 0, Math.PI * 2);
    ctx.fill();

    // If partly cloudy, draw night misty clouds drifting across moon
    if (isPartlyCloudy) {
      this.drawPuffClouds('rgba(203, 213, 225, 0.35)', 0.4);
    }
  }

  /* 🌫️ Fog & Winter Haze (কুয়াশা ও শীতকালীন দৃশ্য) */
  renderFogScene() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Overcast pale horizon glow
    const glowGrad = ctx.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.3, 120);
    glowGrad.addColorStop(0, 'rgba(241, 245, 249, 0.25)');
    glowGrad.addColorStop(1, 'rgba(148, 163, 184, 0)');
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.3, 120, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    // Drifting horizontal mist fog waves
    this.fogLayers.forEach(f => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, f.y - 15, w, f.height);
      const fogGrad = ctx.createLinearGradient(0, f.y - 15, 0, f.y + f.height);
      fogGrad.addColorStop(0, `rgba(226, 232, 240, 0)`);
      fogGrad.addColorStop(0.5, `rgba(226, 232, 240, ${f.opacity})`);
      fogGrad.addColorStop(1, `rgba(226, 232, 240, 0)`);
      ctx.fillStyle = fogGrad;
      ctx.fill();
      ctx.restore();

      f.x += f.speed;
      if (f.x > w) f.x = -w * 0.5;
    });

    // Floating cool dew / moisture particles
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

  /* ☁️ Cloudy / Overcast Scene */
  renderCloudyScene() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Gloomy sky tint
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

  /* 🌧️ Rain Scene */
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

    // Splashes
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

  /* ⛈️ Storm & Thunder */
  renderStormScene() {
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
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.fillRect(0, 0, w, h);
    }

    this.renderRainScene();
    this.drawPuffClouds('#475569', 0.85);
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
    currentLocationScene: new WeatherSceneRenderer('cwAnimCanvas', 'cwAnimOverlay', 'cwAnimStage'),
    otherLocationScene: new WeatherSceneRenderer('owAnimCanvas', 'owAnimOverlay', 'owAnimStage')
  };
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.initWeatherScenes());
} else {
  window.initWeatherScenes();
}
