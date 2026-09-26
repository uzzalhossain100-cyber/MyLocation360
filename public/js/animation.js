/**
 * DIKDIGANTA - LIVE WEATHER ANIMATION ENGINE
 * Dynamic Canvas & Overlay System for Realistic Weather Scenes
 * Supports: Sunny (রোদ), Rain (বৃষ্টি), Cloudy (মেঘ), Storm (বজ্রঝড়)
 */

class WeatherSceneRenderer {
  constructor(canvasId, overlayId, stageId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.overlay = document.getElementById(overlayId);
    this.stage = document.getElementById(stageId);
    
    this.currentScene = 'sunny'; // 'sunny', 'rain', 'cloudy', 'storm'
    this.animationFrameId = null;
    this.particles = [];
    this.splashes = [];
    this.clouds = [];
    this.lastTime = performance.now();
    this.lightningTimer = 0;
    
    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.initParticles();
      this.animate();
    }
  }

  resize() {
    if (!this.canvas || !this.stage) return;
    const rect = this.stage.getBoundingClientRect();
    this.width = this.canvas.width = rect.width || 400;
    this.height = this.canvas.height = rect.height || 220;
  }

  initParticles() {
    this.particles = [];
    this.splashes = [];
    this.clouds = [];
    
    // Rain particles
    if (this.currentScene === 'rain' || this.currentScene === 'storm') {
      const dropCount = this.currentScene === 'storm' ? 140 : 80;
      for (let i = 0; i < dropCount; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          length: Math.random() * 18 + 12,
          speed: Math.random() * 12 + 14,
          thickness: Math.random() * 1.5 + 0.8,
          opacity: Math.random() * 0.45 + 0.35,
          slant: this.currentScene === 'storm' ? -3.5 : -1.5
        });
      }
    }
    
    // Sunny particles (solar floating dust motes & gentle glow rays)
    if (this.currentScene === 'sunny') {
      for (let i = 0; i < 35; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: Math.random() * 3 + 1,
          speedX: (Math.random() - 0.5) * 0.4,
          speedY: -Math.random() * 0.5 - 0.1,
          opacity: Math.random() * 0.5 + 0.2,
          color: Math.random() > 0.5 ? '#fde047' : '#fbbf24'
        });
      }
    }

    // Cloudy 2D soft puffs
    if (this.currentScene === 'cloudy' || this.currentScene === 'storm') {
      for (let i = 0; i < 7; i++) {
        this.clouds.push({
          x: (i / 7) * this.width * 1.4 - 50,
          y: Math.random() * (this.height * 0.4) + 20,
          scale: Math.random() * 0.6 + 0.7,
          speed: Math.random() * 0.25 + 0.15,
          opacity: this.currentScene === 'storm' ? 0.75 : 0.45
        });
      }
    }
  }

  setScene(sceneType) {
    if (this.currentScene === sceneType) return;
    this.currentScene = sceneType;
    this.resize();
    this.initParticles();
    this.updateDomOverlays();
  }

  updateDomOverlays() {
    if (!this.overlay) return;
    const sun = this.overlay.querySelector('.sun-glow');
    const cloud1 = this.overlay.querySelector('.layer-1');
    const cloud2 = this.overlay.querySelector('.layer-2');
    
    // Background gradient on stage based on weather condition
    if (this.stage) {
      if (this.currentScene === 'sunny') {
        this.stage.style.background = 'linear-gradient(180deg, #0369a1 0%, #0284c7 50%, #38bdf8 100%)';
      } else if (this.currentScene === 'rain') {
        this.stage.style.background = 'linear-gradient(180deg, #1e293b 0%, #334155 60%, #475569 100%)';
      } else if (this.currentScene === 'cloudy') {
        this.stage.style.background = 'linear-gradient(180deg, #334155 0%, #475569 60%, #64748b 100%)';
      } else if (this.currentScene === 'storm') {
        this.stage.style.background = 'linear-gradient(180deg, #090d16 0%, #1e1b4b 60%, #1f2937 100%)';
      }
    }

    if (sun) sun.style.display = this.currentScene === 'sunny' ? 'block' : 'none';
    if (cloud1) cloud1.style.display = (this.currentScene === 'cloudy' || this.currentScene === 'storm') ? 'block' : 'none';
    if (cloud2) cloud2.style.display = (this.currentScene === 'cloudy') ? 'block' : 'none';
  }

  animate() {
    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);

      if (this.currentScene === 'sunny') {
        this.renderSunnyScene();
      } else if (this.currentScene === 'rain') {
        this.renderRainScene();
      } else if (this.currentScene === 'cloudy') {
        this.renderCloudyScene();
      } else if (this.currentScene === 'storm') {
        this.renderStormScene();
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  /* ☀️ Sunny: Golden rays, rotating radiant sun and floating shimmering dust */
  renderSunnyScene() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Glowing sun rays emanating from top right
    const sunX = w - 85;
    const sunY = 55;
    
    // Rotating light beams
    const time = performance.now() * 0.0005;
    ctx.save();
    ctx.translate(sunX, sunY);
    ctx.rotate(time);
    
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      ctx.beginPath();
      const angle = (i * Math.PI * 2) / rayCount;
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, Math.max(w, h), angle - 0.08, angle + 0.08);
      ctx.closePath();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.07)';
      ctx.fill();
    }
    ctx.restore();

    // Solar Orb and Halo
    const haloGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 100);
    haloGrad.addColorStop(0, 'rgba(253, 224, 71, 0.9)');
    haloGrad.addColorStop(0.3, 'rgba(245, 158, 11, 0.45)');
    haloGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    
    ctx.beginPath();
    ctx.arc(sunX, sunY, 100, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    // Inner bright core
    ctx.beginPath();
    ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 25;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Floating sunny sparks
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

    // Gentle lens flares
    const flareGrad = ctx.createRadialGradient(w * 0.35, h * 0.7, 5, w * 0.35, h * 0.7, 50);
    flareGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    flareGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.beginPath();
    ctx.arc(w * 0.35, h * 0.7, 50, 0, Math.PI * 2);
    ctx.fillStyle = flareGrad;
    ctx.fill();
  }

  /* 🌧️ Rain: Falling realistic droplets with puddle splashes */
  renderRainScene() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Soft overhead rain cloud tint
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, 'rgba(15, 23, 42, 0.5)');
    skyGrad.addColorStop(1, 'rgba(30, 41, 59, 0.2)');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Falling raindrops
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

      // Ground hit -> create splash ripple
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

    // Ground splash circles (puddle ripples)
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const s = this.splashes[i];
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, s.radius * 1.8, s.radius * 0.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(186, 230, 253, ${s.alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      s.radius += 0.7;
      s.alpha -= 0.035;

      if (s.alpha <= 0) {
        this.splashes.splice(i, 1);
      }
    }

    // Puddle shine on the bottom
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.fillRect(0, h - 8, w, 8);
  }

  /* ☁️ Cloudy: Soft drifting clouds with ambient daylight */
  renderCloudyScene() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Drifting cloud shapes
    this.clouds.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(c.scale, c.scale);
      ctx.fillStyle = `rgba(226, 232, 240, ${c.opacity})`;
      
      // Draw fluffy cloud cluster
      ctx.beginPath();
      ctx.arc(50, 50, 35, 0, Math.PI * 2);
      ctx.arc(85, 35, 45, 0, Math.PI * 2);
      ctx.arc(135, 40, 38, 0, Math.PI * 2);
      ctx.arc(170, 55, 30, 0, Math.PI * 2);
      ctx.arc(105, 65, 40, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      c.x += c.speed;
      if (c.x > w + 200) {
        c.x = -220;
        c.y = Math.random() * (h * 0.4) + 20;
      }
    });
  }

  /* ⛈️ Storm: Heavy rain + dark billowing clouds + lightning flashes */
  renderStormScene() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Random lightning flash triggering
    this.lightningTimer += 1;
    if (this.lightningTimer > 180 && Math.random() > 0.94) {
      this.triggerLightning();
      this.lightningTimer = 0;
    }

    // Draw dark storm clouds first
    this.renderCloudyScene();

    // Heavy angled rain
    this.renderRainScene();
  }

  triggerLightning() {
    if (!this.overlay) return;
    const flash = this.overlay.querySelector('.lightning-flash');
    if (!flash) return;

    flash.style.opacity = '0.9';
    setTimeout(() => { flash.style.opacity = '0'; }, 60);
    setTimeout(() => { flash.style.opacity = '0.7'; }, 110);
    setTimeout(() => { flash.style.opacity = '0'; }, 180);
  }
}

// Global instances holder
window.WeatherScenes = {
  currentLocationScene: null,
  otherLocationScene: null,
  
  init() {
    this.currentLocationScene = new WeatherSceneRenderer(
      'cwAnimCanvas',
      'cwSceneOverlay',
      'cwAnimationStage'
    );
    this.otherLocationScene = new WeatherSceneRenderer(
      'owAnimCanvas',
      'owSceneOverlay',
      'owAnimationStage'
    );
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.WeatherScenes.init();
});
