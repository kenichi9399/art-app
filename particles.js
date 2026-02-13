// particles.js
(() => {
  function Particle(app, rng) {
    this.app = app;
    this.rng = rng;

    this.reset(true);
  }

  Particle.prototype.reset = function (first = false) {
    const a = this.app;
    const r = this.rng;

    // distribute: more density around mid / lower area to avoid “center = answer”
    const biasY = r() * r();
    this.x = r();
    this.y = U.clamp(0.15 + biasY * 0.85, 0, 1);

    // size / alpha layers
    const layer = r();
    this.size = U.lerp(CFG.P_SIZE_MIN, CFG.P_SIZE_MAX, layer * layer);
    this.alpha = U.lerp(CFG.P_ALPHA_MIN, CFG.P_ALPHA_MAX, 1 - layer);

    // velocity
    this.vx = (r() - 0.5) * 0.002;
    this.vy = (r() - 0.5) * 0.002;

    // life
    this.life = first ? r() * 1.0 : 0;
    this.maxLife = 2.5 + r() * 4.5;

    // tone
    this.hue = 205 + (r() - 0.5) * 18; // cold silver-blue
    this.warm = r() > 0.92;            // small warm impurities
  };

  Particle.prototype.step = function (dt) {
    const a = this.app;

    // sample field
    const f = a.field.sample(this.x, this.y);
    const sp = 0.08 + this.size * 0.035;

    this.vx = this.vx * 0.92 + f.vx * sp * dt;
    this.vy = this.vy * 0.92 + f.vy * sp * dt;

    // touch impulse (gentle)
    if (a.touch.impulse > 0) {
      const dx = this.x - a.touch.x;
      const dy = this.y - a.touch.y;
      const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
      const r = CFG.TOUCH_RADIUS * 0.85;
      const w = U.smoothstep(r, 0, d) * a.touch.impulse;
      this.vx += (dx / d) * w * 0.006;
      this.vy += (dy / d) * w * 0.006;
    }

    this.x += this.vx;
    this.y += this.vy;

    // wrap (soft)
    if (this.x < -0.05) this.x += 1.1;
    if (this.x > 1.05) this.x -= 1.1;
    if (this.y < -0.08 || this.y > 1.08) this.reset(false);

    // life
    this.life += dt;
    if (this.life > this.maxLife) this.reset(false);
  };

  function ParticleSystem(app, count = CFG.P_COUNT, seed = 20240214) {
    this.app = app;
    this.rng = U.rng(seed);
    this.p = new Array(count);
    for (let i = 0; i < count; i++) this.p[i] = new Particle(app, this.rng);
  }

  ParticleSystem.prototype.step = function (dt) {
    for (let i = 0; i < this.p.length; i++) this.p[i].step(dt);
  };

  window.ParticleSystem = ParticleSystem;
})();
