// field.js
(() => {
  "use strict";

  class Field {
    constructor(w, h) {
      this.resize(w, h);
    }

    resize(w, h) {
      this.w = w;
      this.h = h;
      this.cell = CFG.FIELD_CELL;
      this.cols = Math.max(2, (w / this.cell) | 0);
      this.rows = Math.max(2, (h / this.cell) | 0);
      const n = this.cols * this.rows;

      this.vx = new Float32Array(n);
      this.vy = new Float32Array(n);

      // cached coords
      this.cx = new Float32Array(this.cols);
      this.cy = new Float32Array(this.rows);
      for (let i = 0; i < this.cols; i++) this.cx[i] = (i + 0.5) * this.cell;
      for (let j = 0; j < this.rows; j++) this.cy[j] = (j + 0.5) * this.cell;
    }

    idx(i, j) { return j * this.cols + i; }

    // inject a "carved flow" stamp
    inject(x, y, dx, dy, strength, radius) {
      const r = Math.max(20, radius);
      const r2 = r * r;

      const i0 = U.clamp(((x - r) / this.cell) | 0, 0, this.cols - 1);
      const i1 = U.clamp(((x + r) / this.cell) | 0, 0, this.cols - 1);
      const j0 = U.clamp(((y - r) / this.cell) | 0, 0, this.rows - 1);
      const j1 = U.clamp(((y + r) / this.cell) | 0, 0, this.rows - 1);

      // normalized direction
      const v = U.v2(dx, dy);
      const l = U.len(v) || 1;
      v.x /= l; v.y /= l;

      for (let j = j0; j <= j1; j++) {
        const cy = this.cy[j];
        for (let i = i0; i <= i1; i++) {
          const cx = this.cx[i];
          const ox = cx - x, oy = cy - y;
          const d2 = ox * ox + oy * oy;
          if (d2 > r2) continue;

          const t = 1 - Math.sqrt(d2) / r;
          const w = U.smoothstep(t) * strength;

          const k = this.idx(i, j);

          // inject forward flow + a little swirl
          const sx = -oy, sy = ox; // perpendicular
          this.vx[k] = this.vx[k] * CFG.FIELD_DAMP + (v.x + sx * CFG.FIELD_SWIRL) * w * CFG.FIELD_INJECT;
          this.vy[k] = this.vy[k] * CFG.FIELD_DAMP + (v.y + sy * CFG.FIELD_SWIRL) * w * CFG.FIELD_INJECT;
        }
      }
    }

    // global relaxation
    step() {
      const n = this.vx.length;
      const d = CFG.FIELD_DAMP;
      for (let i = 0; i < n; i++) {
        this.vx[i] *= d;
        this.vy[i] *= d;
      }
    }

    // pull towards core(s) to keep "meaning" / nucleus
    pullToCores(cores) {
      const cols = this.cols, rows = this.rows;
      for (let j = 0; j < rows; j++) {
        const y = this.cy[j];
        for (let i = 0; i < cols; i++) {
          const x = this.cx[i];
          let ax = 0, ay = 0;

          for (const c of cores) {
            const ox = c.x - x, oy = c.y - y;
            const d2 = ox * ox + oy * oy + 80; // soften
            const inv = 1 / d2;
            ax += ox * inv;
            ay += oy * inv;
          }

          const k = this.idx(i, j);
          this.vx[k] += ax * CFG.FIELD_CORE_PULL;
          this.vy[k] += ay * CFG.FIELD_CORE_PULL;
        }
      }
    }

    // sample velocity with bilinear interpolation
    sample(x, y) {
      const fx = x / this.cell - 0.5;
      const fy = y / this.cell - 0.5;
      const i = U.clamp(fx | 0, 0, this.cols - 2);
      const j = U.clamp(fy | 0, 0, this.rows - 2);
      const tx = fx - i;
      const ty = fy - j;

      const k00 = this.idx(i, j);
      const k10 = this.idx(i + 1, j);
      const k01 = this.idx(i, j + 1);
      const k11 = this.idx(i + 1, j + 1);

      const vx0 = U.lerp(this.vx[k00], this.vx[k10], tx);
      const vx1 = U.lerp(this.vx[k01], this.vx[k11], tx);
      const vy0 = U.lerp(this.vy[k00], this.vy[k10], tx);
      const vy1 = U.lerp(this.vy[k01], this.vy[k11], tx);

      return { x: U.lerp(vx0, vx1, ty), y: U.lerp(vy0, vy1, ty) };
    }
  }

  window.Field = Field;
})();
