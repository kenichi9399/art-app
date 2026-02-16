;(() => {
  class Core {
    constructor(x, y) {
      this.p = U.v2(x, y);
      this.v = U.v2(U.rand(-0.2, 0.2), U.rand(-0.2, 0.2));
      this.mass = U.rand(1.0, 1.4);
      this.r = U.rand(22, 34);
      this.energy = 0.0;
      this.alive = true;
    }

    step(dt, w, h) {
      // ふわ漂う
      this.v.x += U.rand(-1, 1) * CFG.CORE_WANDER * dt;
      this.v.y += U.rand(-1, 1) * CFG.CORE_WANDER * dt;

      this.v.x *= 0.98;
      this.v.y *= 0.98;

      this.p.x += this.v.x * 60 * dt;
      this.p.y += this.v.y * 60 * dt;

      // 端で反射（やわらかく）
      const m = 40;
      if (this.p.x < m) { this.p.x = m; this.v.x *= -0.7; }
      if (this.p.x > w - m) { this.p.x = w - m; this.v.x *= -0.7; }
      if (this.p.y < m) { this.p.y = m; this.v.y *= -0.7; }
      if (this.p.y > h - m) { this.p.y = h - m; this.v.y *= -0.7; }

      this.energy *= 0.94;
    }
  }

  class Particle {
    constructor(w, h) {
      this.p = U.v2(U.rand(0, w), U.rand(0, h));
      this.v = U.v2(0, 0);

      // 粒径：霧(小)〜硬い粒(大)を混在
      const t = Math.pow(Math.random(), 1.8); // 小粒に寄せる
      this.r = U.lerp(CFG.R_MIN, CFG.R_MAX, t);

      this.hard = (Math.random() < CFG.R_HARD_CENTER_BIAS);

      // 明るさ：白飛びガードのため上限を作る
      this.a = U.lerp(0.05, 0.70, Math.pow(Math.random(), 1.2));
      if (this.hard) this.a = Math.min(0.85, this.a + 0.10);
    }
  }

  class Particles {
    constructor(w, h) {
      this.resize(w, h);
      this.reset();
    }

    resize(w, h) {
      this.w = w; this.h = h;
    }

    reset() {
      // cores: 2〜3個が合体していく
      const n = CFG.CORE_COUNT;
      this.cores = [];
      const cx = this.w * 0.55;
      const cy = this.h * 0.45;
      for (let i = 0; i < n; i++) {
        this.cores.push(new Core(
          cx + U.rand(-120, 120),
          cy + U.rand(-120, 120)
        ));
      }

      // particles
      const count = Math.floor(CFG.COUNT_BASE * CFG.COUNT_MULT);
      this.ps = new Array(count);
      for (let i = 0; i < count; i++) this.ps[i] = new Particle(this.w, this.h);

      this._tapFlash = 0;
    }

    _mergeCores(dt) {
      // 一番近いペアをゆっくり近づけて合体
      let best = null;
      let bestD = 1e9;

      const alive = this.cores.filter(c => c.alive);
      if (alive.length <= 1) return;

      for (let i = 0; i < alive.length; i++) {
        for (let j = i + 1; j < alive.length; j++) {
          const a = alive[i], b = alive[j];
          const d = U.len(U.sub(b.p, a.p));
          if (d < bestD) { bestD = d; best = [a, b]; }
        }
      }
      if (!best) return;

      const [a, b] = best;

      // 近づける（常にわずかに引力）
      const dir = U.sub(b.p, a.p);
      const dist = U.len(dir);
      const n = U.norm(dir);

      const pull = CFG.CORE_MERGE_SPEED * 60 * dt;
      a.v.x += n.x * pull;
      a.v.y += n.y * pull;
      b.v.x -= n.x * pull;
      b.v.y -= n.y * pull;

      // 合体判定
      if (dist < CFG.CORE_MERGE_DIST) {
        // bをaに吸収
        a.mass += b.mass;
        a.r = Math.min(64, a.r + b.r * 0.25);
        a.energy = 1.0;
        b.alive = false;
      }
    }

    step(dt, field, input) {
      // コア更新
      for (const c of this.cores) if (c.alive) c.step(dt, this.w, this.h);
      this._mergeCores(dt);

      // interaction
      const hasTouch = input.down || input.longPress;
      const tp = input.pos;

      // tap: “白飛び”はさせず、局所的にエネルギーだけ上げる
      if (input.down && input.justTapped) {
        this._tapFlash = 1.0;
        for (const c of this.cores) if (c.alive) c.energy = Math.max(c.energy, 0.35);
      }
      this._tapFlash *= 0.90;

      // 粒子更新
      const w = this.w, h = this.h;

      for (let i = 0; i < this.ps.length; i++) {
        const p = this.ps[i];

        // field flow（ドラッグで彫られた流れ）
        const f = field.sample(p.p.x, p.p.y);
        p.v.x += f.x * 0.006;
        p.v.y += f.y * 0.006;

        // core attraction（核に集まる）
        for (const c of this.cores) {
          if (!c.alive) continue;
          const d = U.sub(c.p, p.p);
          const L = U.len(d) + 1e-6;
          const n = U.mul(d, 1.0 / L);

          // 近いほど効く（硬い粒は強く引かれる）
          const fall = 1.0 - U.smoothstep(0, c.r * 3.0, L);
          const k = (p.hard ? 1.4 : 1.0) * fall;

          p.v.x += n.x * k * 0.060;
          p.v.y += n.y * k * 0.060;
        }

        // touch influence
        if (hasTouch) {
          const d = U.sub(tp, p.p);
          const L = U.len(d) + 1e-6;
          const n = U.mul(d, 1.0 / L);
          const fall = 1.0 - U.smoothstep(0, CFG.TOUCH_RADIUS, L);

          if (fall > 0) {
            if (input.longPress) {
              // 長押し：集める
              const k = CFG.LONGPRESS_ATTRACT * fall * (p.hard ? 1.1 : 0.85);
              p.v.x += n.x * k * 0.085;
              p.v.y += n.y * k * 0.085;
            } else if (input.down) {
              // タップ/ドラッグ：局所的な揺れ（白飛びしない）
              const k = CFG.TAP_IMPULSE * fall;
              p.v.x += n.x * k * 0.020;
              p.v.y += n.y * k * 0.020;
            }
          }
        }

        // 漂い（細かい揺れ）
        p.v.x += U.rand(-1, 1) * CFG.SPEED_BASE * 0.002;
        p.v.y += U.rand(-1, 1) * CFG.SPEED_BASE * 0.002;

        // 減衰
        p.v.x *= CFG.DRAG;
        p.v.y *= CFG.DRAG;

        // 位置
        p.p.x += p.v.x * (CFG.SPEED_DETAIL * 60 * dt);
        p.p.y += p.v.y * (CFG.SPEED_DETAIL * 60 * dt);

        // wrap（端で消えない）
        if (p.p.x < 0) p.p.x += w;
        if (p.p.x >= w) p.p.x -= w;
        if (p.p.y < 0) p.p.y += h;
        if (p.p.y >= h) p.p.y -= h;
      }
    }
  }

  window.Particles = Particles;
})();
