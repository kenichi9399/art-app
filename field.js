// field.js
(() => {
  class Field {
    constructor(w, h) {
      this.resize(w, h);

      this.t = 0;
      this.carve = null; // carve buffer（各セルに流れベクトル）
    }

    resize(w, h) {
      this.w = w; this.h = h;
      this.cell = CFG.FIELD_CELL;

      this.cols = Math.ceil(w / this.cell);
      this.rows = Math.ceil(h / this.cell);

      const n = this.cols * this.rows;
      this.vx = new Float32Array(n);
      this.vy = new Float32Array(n);

      this.carveVx = new Float32Array(n);
      this.carveVy = new Float32Array(n);
    }

    _idx(cx, cy) {
      return cy * this.cols + cx;
    }

    // 基本ノイズ場（滑らかな渦っぽさ）
    _baseVector(x, y, t) {
      // noiseから角度作る
      const ns = CFG.FIELD_NOISE_SCALE;
      const n1 = U.noise2(x*ns + t*CFG.FIELD_NOISE_SPEED, y*ns);
      const n2 = U.noise2(x*ns, y*ns - t*CFG.FIELD_NOISE_SPEED);
      const ang = (n1*2.0 + n2*1.2) * Math.PI * 2.0;

      // 回転ベクトル
      return { x: Math.cos(ang), y: Math.sin(ang) };
    }

    update(dt, input) {
      this.t += dt;

      // carve decay（ドラッグの彫り跡をゆっくり減衰）
      const decay = CFG.CARVE_DECAY;
      for (let i = 0; i < this.carveVx.length; i++) {
        this.carveVx[i] *= decay;
        this.carveVy[i] *= decay;
      }

      // carve add（ドラッグ中に、進行方向のベクトルを場へ刻む）
      if (input && input.down) {
        const d = input.delta;
        const v = input.vel;
        const speed = U.clamp(U.len(v) / 900, 0, 1); // 速いほど強く彫る
        const strength = CFG.CARVE_STRENGTH * (0.35 + 0.85*speed);

        // 方向
        const dir = U.norm(d);
        const cx = Math.floor(input.pos.x / this.cell);
        const cy = Math.floor(input.pos.y / this.cell);

        const rad = CFG.CARVE_RADIUS / this.cell;
        const r2 = rad*rad;

        for (let oy = -Math.ceil(rad); oy <= Math.ceil(rad); oy++) {
          for (let ox = -Math.ceil(rad); ox <= Math.ceil(rad); ox++) {
            const x = cx + ox, y = cy + oy;
            if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) continue;
            const dd = ox*ox + oy*oy;
            if (dd > r2) continue;

            const fall = 1.0 - (dd / r2);
            const k = strength * fall * fall;

            const i = this._idx(x,y);
            this.carveVx[i] += dir.x * k;
            this.carveVy[i] += dir.y * k;
          }
        }
      }

      // ベクトル場の構築（base + carve）
      const t = this.t;
      let i = 0;
      for (let y = 0; y < this.rows; y++) {
        const py = (y + 0.5) * this.cell;
        for (let x = 0; x < this.cols; x++) {
          const px = (x + 0.5) * this.cell;

          const b = this._baseVector(px, py, t);

          // carveを合成（彫り跡が“深み”になる）
          const cvx = this.carveVx[i];
          const cvy = this.carveVy[i];

          // base と carve のミックス（carveが強いほど支配）
          const cMag = Math.hypot(cvx, cvy);
          const cMix = U.clamp(cMag / 2.2, 0, 1);

          const vx = U.lerp(b.x, cvx, cMix);
          const vy = U.lerp(b.y, cvy, cMix);

          // 正規化しつつ強度を保持
          const l = Math.hypot(vx, vy) || 1;
          this.vx[i] = vx / l;
          this.vy[i] = vy / l;

          i++;
        }
      }
    }

    sample(x, y) {
      const cx = U.clamp(Math.floor(x / this.cell), 0, this.cols-1);
      const cy = U.clamp(Math.floor(y / this.cell), 0, this.rows-1);
      const i = this._idx(cx, cy);
      return { x: this.vx[i], y: this.vy[i] };
    }
  }

  window.Field = Field;
})();
