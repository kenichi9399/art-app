// sketch.js
(() => {
  "use strict";

  class Sketch {
    constructor(canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;

      this.size = { w: 0, h: 0, dpr: 1, cw: 0, ch: 0 };
      this.P = new Particles(CFG.N);

      this.seed = (Math.random() * 1e9) >>> 0;
      this.field = new FlowField(this.seed);

      this.t = 0;
      this.last = U.now();

      // interaction state
      this.pointer = {
        down: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        lastX: 0, lastY: 0,
        downAt: 0,
        longFired: false
      };

      this.reset();
    }

    reset() {
      this.size = U.resizeCanvas(this.canvas);
      this.P.seed(this.size.w, this.size.h);
      this.t = U.now();
      this.last = this.t;
      Render.clear(this.ctx, this.size.w, this.size.h);
    }

    step() {
      const now = U.now();
      let dt = (now - this.last) / 1000;
      this.last = now;
      dt = Math.min(dt, CFG.dtClamp);

      this.t = now;

      const w = this.size.w, h = this.size.h;

      // update pointer velocity
      if (this.pointer.down) {
        const dx = this.pointer.x - this.pointer.lastX;
        const dy = this.pointer.y - this.pointer.lastY;
        this.pointer.vx = dx / Math.max(1, (now - this.pointer.downAt));
        this.pointer.vy = dy / Math.max(1, (now - this.pointer.downAt));
        this.pointer.lastX = this.pointer.x;
        this.pointer.lastY = this.pointer.y;

        // long press -> gentle “bloom”
        const held = now - this.pointer.downAt;
        if (!this.pointer.longFired && held > CFG.longPressMs) {
          this.pointer.longFired = true;
          this._bloom(this.pointer.x, this.pointer.y, 1.0);
        }
      }

      // physics: flow + slight drift + touch force
      const touch = this.pointer.down ? this.pointer : null;
      const tx = touch ? touch.x : 0;
      const ty = touch ? touch.y : 0;

      for (let i = 0; i < this.P.n; i++) {
        let x = this.P.x[i], y = this.P.y[i];

        const v = this.field.vec(x, y);
        const curl = CFG.curl;
        const drift = CFG.drift;

        let vx = this.P.vx[i];
        let vy = this.P.vy[i];

        // flow influence
        vx = vx * 0.92 + v.x * curl * 22.0 * dt;
        vy = vy * 0.92 + v.y * curl * 22.0 * dt;

        // gentle gravity-like drift toward center (quiet pull)
        const cx = w * 0.5, cy = h * 0.55;
        const dxC = (cx - x), dyC = (cy - y);
        vx += dxC * 0.0008 * drift;
        vy += dyC * 0.0008 * drift;

        // touch: repulse + swirl
        if (touch) {
          const dx = x - tx, dy = y - ty;
          const d = Math.max(1, Math.hypot(dx, dy));
          const R = CFG.touchRadius;

          if (d < R) {
            const k = (1 - d / R);
            const fx = (dx / d) * k * CFG.touchForce * 85.0 * dt;
            const fy = (dy / d) * k * CFG.touchForce * 85.0 * dt;

            // swirl: rotate force
            vx += fx + (-dy / d) * k * 55.0 * dt;
            vy += fy + ( dx / d) * k * 55.0 * dt;

            // brighten slightly when touched
            this.P.a[i] = U.clamp(this.P.a[i] + k * 0.015, 0.06, 0.85);
          }
        }

        // integrate
        x += vx * dt;
        y += vy * dt;

        // wrap softly (no hard bounce)
        if (x < -10) x = w + 10;
        if (x > w + 10) x = -10;
        if (y < -10) y = h + 10;
        if (y > h + 10) y = -10;

        this.P.x[i] = x;
        this.P.y[i] = y;
        this.P.vx[i] = vx;
        this.P.vy[i] = vy;

        // slow alpha relaxation
        this.P.a[i] = U.lerp(this.P.a[i], 0.22, 0.005);
      }

      // render
      Render.drawParticles(this.ctx, w, h, this.P);
      Render.drawVeil(this.ctx, w, h, now);
      drawVoid(this.ctx, w, h, now);

      // tiny grain every few frames (cheap)
      if ((now | 0) % 3 === 0) {
        Render.drawGrain(this.ctx, w, h, CFG.grain);
      }
    }

    _bloom(x, y, power = 1) {
      const ctx = this.ctx;
      const dpr = U.getDPR();
      const w = this.size.w * dpr, h = this.size.h * dpr;

      ctx.save();
      ctx.globalCompositeOperation = "screen";

      const r0 = 0;
      const r1 = Math.min(w, h) * (0.22 + power * 0.18);
      const gx = x * dpr, gy = y * dpr;

      const g = ctx.createRadialGradient(gx, gy, r0, gx, gy, r1);
      g.addColorStop(0, "rgba(240,250,255,0.28)");
      g.addColorStop(0.35, "rgba(240,250,255,0.12)");
      g.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      U.toast("bloom");
    }
  }

  window.Sketch = Sketch;
})();
