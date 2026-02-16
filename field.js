;(() => {
  class Field {
    constructor(w, h, cell = 18) {
      this.cell = cell;
      this.resize(w, h);
    }

    resize(w, h) {
      this.w = w;
      this.h = h;
      this.gw = Math.ceil(w / this.cell);
      this.gh = Math.ceil(h / this.cell);
      this.N = this.gw * this.gh;

      this.vx = new Float32Array(this.N);
      this.vy = new Float32Array(this.N);
    }

    idx(ix, iy) {
      ix = (ix < 0) ? 0 : (ix >= this.gw ? this.gw - 1 : ix);
      iy = (iy < 0) ? 0 : (iy >= this.gh ? this.gh - 1 : iy);
      return ix + iy * this.gw;
    }

    addFlowLine(p0, p1, strength) {
      const d = U.sub(p1, p0);
      const L = U.len(d);
      if (L < 1e-3) return;

      const dir = U.mul(U.norm(d), strength);

      // 線分上に少しずつ“彫る”
      const steps = Math.min(80, Math.ceil(L / (this.cell * 0.35)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = U.lerp(p0.x, p1.x, t);
        const y = U.lerp(p0.y, p1.y, t);

        const ix = Math.floor(x / this.cell);
        const iy = Math.floor(y / this.cell);

        // 周囲も軽く影響（厚み）
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const j = this.idx(ix + ox, iy + oy);
            const fall = (ox === 0 && oy === 0) ? 1.0 : 0.55;
            this.vx[j] += dir.x * fall;
            this.vy[j] += dir.y * fall;
          }
        }
      }
    }

    sample(x, y) {
      const ix = Math.floor(x / this.cell);
      const iy = Math.floor(y / this.cell);
      const j = this.idx(ix, iy);
      return U.v2(this.vx[j], this.vy[j]);
    }

    step() {
      // “しばらく残る層”＝ゆっくり減衰
      const d = CFG.CARVE_DECAY;
      for (let i = 0; i < this.N; i++) {
        this.vx[i] *= d;
        this.vy[i] *= d;
      }
    }
  }

  window.Field = Field;
})();
