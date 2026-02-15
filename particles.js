// particles.js
(() => {
  class Core {
    constructor(x,y) {
      this.p = U.v2(x,y);
      this.v = U.v2(U.rand(-0.5,0.5), U.rand(-0.5,0.5));
      this.mass = U.rand(0.9, 1.15);
      this.heat = 0; // 合体時に少し光る
    }
  }

  class ParticleSystem {
    constructor(w, h) {
      this.w = w; this.h = h;

      this.count = 0;
      this.x = null;
      this.y = null;
      this.vx = null;
      this.vy = null;
      this.size = null;
      this.kind = null; // 0 micro, 1 normal, 2 rare big

      this.cores = [];
      this.coreMerged = false;

      this._quality = 1.0;
      this._accumTime = 0;

      this.reset();
    }

    resize(w,h) {
      this.w = w; this.h = h;
    }

    _targetCount() {
      const q = this._quality;
      const base = CFG.PCOUNT_BASE * q;
      return Math.floor(U.clamp(base, CFG.PCOUNT_MIN, CFG.PCOUNT_MAX));
    }

    _alloc(n) {
      this.count = n;
      this.x = new Float32Array(n);
      this.y = new Float32Array(n);
      this.vx = new Float32Array(n);
      this.vy = new Float32Array(n);
      this.size = new Float32Array(n);
      this.kind = new Uint8Array(n);
    }

    _spawnCores() {
      this.cores = [];
      const k = U.randInt(CFG.CORE_COUNT_MIN, CFG.CORE_COUNT_MAX);
      for (let i=0;i<k;i++) {
        const x = this.w * (0.40 + 0.20*Math.random());
        const y = this.h * (0.42 + 0.22*Math.random());
        this.cores.push(new Core(x,y));
      }
      this.coreMerged = false;
    }

    reset() {
      if (CFG.AUTO_QUALITY) this._quality = 1.0;

      const n = this._targetCount();
      this._alloc(n);

      // 粒子初期配置：中心〜周縁へ疎密を作る
      const cx = this.w*0.48, cy = this.h*0.52;
      for (let i=0;i<n;i++) {
        const r = Math.pow(Math.random(), 0.65) * Math.max(this.w,this.h)*0.55;
        const a = Math.random()*Math.PI*2;
        const px = cx + Math.cos(a)*r;
        const py = cy + Math.sin(a)*r;

        this.x[i] = px;
        this.y[i] = py;

        this.vx[i] = U.rand(-0.2, 0.2);
        this.vy[i] = U.rand(-0.2, 0.2);

        // サイズ分布：小粒を大量、たまに大粒
        const u = Math.random();
        let s;
        let knd = 1;
        if (u < CFG.SIZE_RARE_BIG) {
          // rare big
          s = U.lerp(1.6, CFG.SIZE_MAX, Math.pow(Math.random(), 0.45));
          knd = 2;
        } else {
          // micro bias
          const t = Math.pow(Math.random(), 1.0 + 3.0*CFG.SIZE_MICRO_BIAS);
          s = U.lerp(CFG.SIZE_MIN, 1.35, t);
          knd = (s < 0.55) ? 0 : 1;
        }
        this.size[i] = s;
        this.kind[i] = knd;
      }

      this._spawnCores();
    }

    // コアの合体
    _updateCores(dt) {
      // ゆっくり漂う
      for (const c of this.cores) {
        const drift = CFG.CORE_DRIFT;
        c.v.x += U.rand(-drift, drift) * dt;
        c.v.y += U.rand(-drift, drift) * dt;
        c.v.x *= 0.98;
        c.v.y *= 0.98;
        c.p.x += c.v.x;
        c.p.y += c.v.y;

        // 範囲内に収める
        c.p.x = U.clamp(c.p.x, this.w*0.12, this.w*0.88);
        c.p.y = U.clamp(c.p.y, this.h*0.12, this.h*0.88);

        c.heat *= 0.94;
      }

      // 2〜3個が近づいて合体
      if (this.cores.length > 1) {
        // 一番近いペアを探す
        let best = null;
        let bestD = 1e9;
        for (let i=0;i<this.cores.length;i++) {
          for (let j=i+1;j<this.cores.length;j++) {
            const a = this.cores[i], b = this.cores[j];
            const dx = a.p.x - b.p.x, dy = a.p.y - b.p.y;
            const d = Math.hypot(dx,dy);
            if (d < bestD) { bestD = d; best = [i,j]; }
          }
        }

        // 近づける（ゆっくり）
        if (best) {
          const [i,j] = best;
          const a = this.cores[i], b = this.cores[j];
          const dir = U.norm(U.sub(b.p, a.p));
          const sp = CFG.CORE_MERGE_SPEED;

          a.p.x += dir.x * sp * bestD;
          a.p.y += dir.y * sp * bestD;
          b.p.x -= dir.x * sp * bestD;
          b.p.y -= dir.y * sp * bestD;

          // 合体
          if (bestD < CFG.CORE_MERGE_DIST) {
            const m = a.mass + b.mass;
            const nx = (a.p.x*a.mass + b.p.x*b.mass) / m;
            const ny = (a.p.y*a.mass + b.p.y*b.mass) / m;

            const nc = new Core(nx, ny);
            nc.mass = m;
            nc.v = U.mul(U.add(a.v, b.v), 0.5);
            nc.heat = 1.0;

            // remove j then i
            this.cores.splice(j,1);
            this.cores.splice(i,1);
            this.cores.push(nc);

            if (this.cores.length === 1) this.coreMerged = true;
          }
        }
      }
    }

    // 粒子の“膜”密度（核が粒子量で変形するための指標）
    _coreDensityEstimate(core) {
      // 粗い近傍カウント（高速化のためサンプル）
      const n = this.count;
      const step = 40; // 25k粒子でも軽い
      let acc = 0;
      const R = 140;
      const R2 = R*R;
      for (let i=0;i<n;i+=step) {
        const dx = this.x[i]-core.p.x;
        const dy = this.y[i]-core.p.y;
        const d2 = dx*dx+dy*dy;
        if (d2 < R2) acc += 1 - d2/R2;
      }
      return acc / (n/step);
    }

    update(dt, field, input, perf) {
      // auto quality
      if (CFG.AUTO_QUALITY && perf) {
        this._accumTime += dt;
        if (this._accumTime > CFG.QUALITY_CHECK_SEC) {
          this._accumTime = 0;
          const fps = perf.fps;
          if (fps < 52) {
            this._quality *= CFG.QUALITY_DOWN_STEP;
            const n2 = this._targetCount();
            if (n2 !== this.count) this.reset();
          } else if (fps > 58 && this._quality < 1.0) {
            this._quality *= CFG.QUALITY_UP_STEP;
            const n2 = this._targetCount();
            if (n2 !== this.count) this.reset();
          }
        }
      }

      this._updateCores(dt);

      // input forces
      const hasInput = input && (input.down || input.justTap);
      const tap = input && input.justTap;
      const dragging = input && input.down && !input.longPress;
      const gathering = input && input.down && input.longPress;

      // タップは一瞬だけ（次フレームで消す）
      if (tap) input.justTap = false;

      // core shape responsiveness
      let coreShape = 0.0;
      if (this.cores.length) {
        const d = this._coreDensityEstimate(this.cores[this.cores.length-1]);
        coreShape = U.clamp(d * CFG.CORE_SHAPE_RESP, 0, 1);
      }

      const n = this.count;
      const damping = CFG.DAMPING;
      const spLimit = CFG.SPEED_LIMIT;

      for (let i=0;i<n;i++) {
        let px = this.x[i], py = this.y[i];
        let vx = this.vx[i], vy = this.vy[i];

        // field force
        const fv = field.sample(px, py);
        vx += fv.x * CFG.DRAG_COUPLING * 0.35;
        vy += fv.y * CFG.DRAG_COUPLING * 0.35;

        // core force (attract + gentle repel near core)
        for (const c of this.cores) {
          const dx = c.p.x - px;
          const dy = c.p.y - py;
          const d2 = dx*dx + dy*dy + 1e-6;

          const soften = (CFG.CORE_SOFTEN * 700);
          const inv = 1 / (d2 + soften);

          // attract
          const a = CFG.CORE_ATTRACT * c.mass;
          vx += dx * inv * a;
          vy += dy * inv * a;

          // repel close (prevents hard white blob)
          const r = CFG.CORE_REPEL * (0.8 + 0.6*coreShape);
          vx -= dx * inv * r * 0.22;
          vy -= dy * inv * r * 0.22;
        }

        // tap splash: outward impulse
        if (tap && input) {
          const dx = px - input.pos.x;
          const dy = py - input.pos.y;
          const d = Math.hypot(dx,dy);
          if (d < 120) {
            const k = (1 - d/120);
            const dir = U.norm({x:dx,y:dy});
            vx += dir.x * k * 1.6 * CFG.TAP_SPLASH;
            vy += dir.y * k * 1.6 * CFG.TAP_SPLASH;
          }
        }

        // drag carve coupling: while dragging, particles get a shove along drag
        if (dragging && input) {
          const dx = px - input.pos.x;
          const dy = py - input.pos.y;
          const d = Math.hypot(dx,dy);
          if (d < 140) {
            const k = (1 - d/140);
            const dir = U.norm(input.delta);
            vx += dir.x * k * 1.35;
            vy += dir.y * k * 1.35;
          }
        }

        // long-press gather: attract toward finger
        if (gathering && input) {
          const dx = input.pos.x - px;
          const dy = input.pos.y - py;
          const d = Math.hypot(dx,dy) + 1e-6;
          if (d < 220) {
            const k = (1 - d/220);
            vx += (dx/d) * k * 1.65 * CFG.LONGPRESS_GATHER;
            vy += (dy/d) * k * 1.65 * CFG.LONGPRESS_GATHER;
          }
        }

        // integrate
        vx *= damping;
        vy *= damping;

        // speed clamp
        const sp = Math.hypot(vx,vy);
        if (sp > spLimit) {
          vx = vx / sp * spLimit;
          vy = vy / sp * spLimit;
        }

        px += vx;
        py += vy;

        // wrap softly (端に行った粒子が戻ってくる)
        if (px < -20) px = this.w + 20;
        if (px > this.w + 20) px = -20;
        if (py < -20) py = this.h + 20;
        if (py > this.h + 20) py = -20;

        this.x[i]=px; this.y[i]=py;
        this.vx[i]=vx; this.vy[i]=vy;
      }

      // core heat decay is already in cores
      return { coreShape };
    }
  }

  window.ParticleSystem = ParticleSystem;
})();
