// particles.js
(function () {
  "use strict";

  const CFG = window.CFG;

  class Particles {
    constructor(field, cores) {
      this.field = field;
      this.cores = cores;
      this.p = [];
      this.reset();
    }

    reset() {
      this.p.length = 0;
      const n = Math.floor(CFG.PARTICLE_COUNT * CFG.PARTICLE_COUNT_MULT); // 1.2倍対応
      for (let i = 0; i < n; i++) {
        this.p.push(this._spawn());
      }
    }

    _spawn() {
      const U = window.U;
      const w = window.innerWidth, h = window.innerHeight;

      // 粒径のバリエーション：小粒多め + たまに中粒/大粒
      const rRand = Math.random();
      let r;
      if (rRand < 0.82) r = U.lerp(CFG.P_RADIUS_MIN, CFG.P_RADIUS_MIN + 0.9, Math.random());
      else if (rRand < 0.97) r = U.lerp(1.0, 2.4, Math.random());
      else r = U.lerp(2.4, 4.2, Math.random());

      const x = Math.random() * w;
      const y = Math.random() * h;

      return {
        x, y,
        vx: 0, vy: 0,
        r,
        life: U.lerp(0.55, 1.0, Math.random()),
        seed: Math.random() * 1000
      };
    }

    update(dt) {
      const U = window.U;
      const w = window.innerWidth, h = window.innerHeight;

      for (let i = 0; i < this.p.length; i++) {
        const a = this.p[i];

        // flow field
        const f = this.field.sample(a.x, a.y);
        a.vx += f.x * CFG.FIELD_FORCE * dt;
        a.vy += f.y * CFG.FIELD_FORCE * dt;

        // cores attraction (核へ集まる/離れるの感じ)
        for (let k = 0; k < this.cores.length; k++) {
          const c = this.cores[k];
          const dx = c.x - a.x;
          const dy = c.y - a.y;
          const d2 = dx * dx + dy * dy + 1e-6;
          const d = Math.sqrt(d2);

          // 中距離で吸う、近すぎると過曝しないように弱める
          const att = CFG.CORE_ATTRACT * (1.0 / (1.0 + d2 * 0.001));
          a.vx += (dx / d) * att * dt;
          a.vy += (dy / d) * att * dt;
        }

        // damping
        a.vx *= Math.pow(CFG.DAMPING, dt * 60);
        a.vy *= Math.pow(CFG.DAMPING, dt * 60);

        // integrate
        a.x += a.vx * dt;
        a.y += a.vy * dt;

        // wrap
        if (a.x < -20) a.x = w + 20;
        if (a.x > w + 20) a.x = -20;
        if (a.y < -20) a.y = h + 20;
        if (a.y > h + 20) a.y = -20;

        // gentle life drift (濃淡の呼吸)
        a.life = U.clamp(a.life + (Math.random() - 0.5) * 0.02, 0.35, 1.0);
      }
    }

    draw(ctx) {
      const R = window.R;
      R.drawParticles(ctx, this.p, this.cores);
    }
  }

  // ★重要：グローバルに公開（Safariで確実に参照できるように）
  window.Particles = Particles;
})();
