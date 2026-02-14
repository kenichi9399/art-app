// particles.js
(() => {
  "use strict";

  class Particles {
    constructor(n) {
      this.n = n;
      this.x = new Float32Array(n);
      this.y = new Float32Array(n);
      this.vx = new Float32Array(n);
      this.vy = new Float32Array(n);
      this.a = new Float32Array(n);   // alpha
      this.s = new Float32Array(n);   // size
      this.h = new Float32Array(n);   // hue-ish (0..1)
    }

    seed(w, h) {
      const { spawnRing } = window.CFG;
      const cx = w * 0.5, cy = h * 0.5;
      const R = Math.min(w, h) * 0.5;

      for (let i = 0; i < this.n; i++) {
        const ang = U.rand(0, Math.PI * 2);
        const rr = R * (spawnRing * 0.35 + (1 - spawnRing * 0.35) * Math.sqrt(U.rand()));
        this.x[i] = cx + Math.cos(ang) * rr;
        this.y[i] = cy + Math.sin(ang) * rr;

        this.vx[i] = U.rand(-0.25, 0.25);
        this.vy[i] = U.rand(-0.25, 0.25);

        this.a[i] = U.rand(0.08, 0.45);
        this.s[i] = U.rand(0.55, 1.9);
        this.h[i] = U.rand(0.0, 1.0);
      }
    }
  }

  window.Particles = Particles;
})();
