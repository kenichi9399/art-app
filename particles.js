// particles.js
(() => {
  "use strict";

  class Particles {
    constructor(w, h) {
      this.reset(w, h);
    }

    _computeCount(w, h, dpr) {
      // 端末・画面サイズで自動調整（安全側）
      const area = (w * h) / (dpr * dpr);
      const base = CFG.PARTICLE_COUNT_BASE;
      const scaled = base * (area / (800 * 1400)); // iPhone縦長基準
      const n = Math.max(2400, Math.min(9000, (scaled * CFG.PARTICLE_COUNT_MUL) | 0));
      return n;
    }

    reset(w, h, dpr = 1) {
      this.w = w;
      this.h = h;
      this.n = this._computeCount(w, h, dpr);

      this.x = new Float32Array(this.n);
      this.y = new Float32Array(this.n);
      this.vx = new Float32Array(this.n);
      this.vy = new Float32Array(this.n);
      this.s = new Float32Array(this.n);  // size
      this.a = new Float32Array(this.n);  // alpha

      // initial distribution: sparse fog + a little density band
      for (let i = 0; i < this.n; i++) {
        this.x[i] = Math.random() * w;
        this.y[i] = Math.random() * h;

        this.vx[i] = (Math.random() - 0.5) * 0.2;
        this.vy[i] = (Math.random() - 0.5) * 0.2;

        const t = U.randPow(CFG.SIZE_BIAS); // small-biased
        this.s[i] = U.lerp(CFG.SIZE_MAX, CFG.SIZE_MIN, t);

        const at = U.clamp((CFG.SIZE_MAX - this.s[i]) / (CFG.SIZE_MAX - CFG.SIZE_MIN), 0, 1);
        this.a[i] = U.lerp(CFG.OPACITY_MIN, CFG.OPACITY_MAX, at * 0.9 + Math.random() * 0.1);
      }
    }

    step(field, cores, input) {
      const w = this.w, h = this.h;
      const n = this.n;

      // core influence / gather
      const gather = input.down && input.long;
      const drag = input.down && input.dragging;
      const tap = input.tap;

      // small tap impulse into field to avoid white flash
      if (tap) {
        field.inject(input.x, input.y, (Math.random() - 0.5), (Math.random() - 0.5), CFG.TAP_IMPULSE, CFG.HIT_RADIUS * 0.75);
      }

      for (let i = 0; i < n; i++) {
        let x = this.x[i], y = this.y[i];
        let vx = this.vx[i], vy = this.vy[i];

        // flow field
        const f = field.sample(x, y);
        vx += f.x * 0.55;
        vy += f.y * 0.55;

        // core attraction
        for (const c of cores) {
          const ox = c.x - x, oy = c.y - y;
          const d2 = ox * ox + oy * oy + 120;
          const inv = 1 / d2;

          vx += ox * inv * CFG.CORE_ATTRACT;
          vy += oy * inv * CFG.CORE_ATTRACT;
        }

        // user interactions: drag carves flow already in field, but also nudges particles
        if (drag) {
          const ox = x - input.x, oy = y - input.y;
          const d2 = ox * ox + oy * oy;
          if (d2 < CFG.HIT_RADIUS * CFG.HIT_RADIUS) {
            const t = 1 - Math.sqrt(d2) / CFG.HIT_RADIUS;
            const wgt = U.smoothstep(t) * CFG.DRAG_STRENGTH;
            vx += (input.vx * 140) * wgt;
            vy += (input.vy * 140) * wgt;
          }
        }

        // long-press gather
        if (gather) {
          const ox = input.x - x, oy = input.y - y;
          const d2 = ox * ox + oy * oy + 80;
          if (d2 < (CFG.HIT_RADIUS * 1.25) ** 2) {
            const inv = 1 / d2;
            vx += ox * inv * CFG.GATHER_STRENGTH * 2.0;
            vy += oy * inv * CFG.GATHER_STRENGTH * 2.0;
          }
        }

        // integrate
        const sp = Math.hypot(vx, vy);
        if (sp > CFG.SPEED_LIMIT) {
          const k = CFG.SPEED_LIMIT / (sp || 1);
          vx *= k; vy *= k;
        }

        x += vx;
        y += vy;

        // wrap around edges (seamless)
        if (x < -20) x += w + 40;
        if (x > w + 20) x -= w + 40;
        if (y < -20) y += h + 40;
        if (y > h + 20) y -= h + 40;

        // damping
        vx *= 0.975;
        vy *= 0.975;

        this.x[i] = x; this.y[i] = y;
        this.vx[i] = vx; this.vy[i] = vy;
      }
    }
  }

  window.Particles = Particles;
})();
