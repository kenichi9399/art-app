// sketch.js
(() => {
  "use strict";

  class App {
    constructor(canvas) {
      this.canvas = canvas;

      this.renderer = new Renderer(canvas);
      this.input = new Input(canvas);

      this.field = new Field(1, 1);
      this.particles = new Particles(1, 1);

      this.cores = [];
      this._last = U.now();

      this._bindUI();
      this._resize();
      this._initCores();

      // start loop
      this._raf = null;
      this._loop = this._loop.bind(this);
      this._raf = requestAnimationFrame(this._loop);
    }

    _bindUI() {
      const btn = document.getElementById("btnReset");
      if (btn) {
        btn.addEventListener("click", () => this.reset(), { passive: true });
        // iOS: clickが遅れることがあるのでtouchも付ける
        btn.addEventListener("touchend", (e) => {
          e.preventDefault();
          this.reset();
        }, { passive: false });
      }
    }

    _dpr() {
      const dpr = (window.devicePixelRatio || 1);
      return Math.min(CFG.DPR_MAX, Math.max(1, dpr));
    }

    _resize() {
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      const dpr = this._dpr();

      this.renderer.resize(cssW, cssH, dpr);
      this.field.resize(this.renderer.w, this.renderer.h);
      this.particles.reset(this.renderer.w, this.renderer.h, dpr);

      // move cores into bounds if needed
      for (const c of this.cores) {
        c.x = U.clamp(c.x, 40, this.renderer.w - 40);
        c.y = U.clamp(c.y, 40, this.renderer.h - 40);
      }
    }

    _initCores() {
      this.cores.length = 0;
      const w = this.renderer.w, h = this.renderer.h;

      // 2〜3核が合体していく前提：初期は少し離して置く
      const baseX = w * 0.55;
      const baseY = h * 0.45;

      for (let i = 0; i < CFG.CORE_COUNT; i++) {
        const ang = (i / CFG.CORE_COUNT) * Math.PI * 2;
        const rad = Math.min(w, h) * 0.12;
        this.cores.push({
          x: baseX + Math.cos(ang) * rad,
          y: baseY + Math.sin(ang) * rad,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          m: 1.0, // mass
          r: CFG.CORE_RADIUS_BASE,
        });
      }
    }

    reset() {
      this._resize();
      this._initCores();
      // 軽く暗幕を引く（残像が強く残りすぎるのを整える）
      this.renderer.fade(1.0);
    }

    _mergeCores() {
      // 近づいた核同士を合体（質量保存＋位置は重心）
      for (let i = 0; i < this.cores.length; i++) {
        for (let j = i + 1; j < this.cores.length; j++) {
          const a = this.cores[i];
          const b = this.cores[j];
          const d = U.dist(a.x, a.y, b.x, b.y);
          if (d < CFG.CORE_MERGE_DIST) {
            const m = a.m + b.m;
            a.x = (a.x * a.m + b.x * b.m) / m;
            a.y = (a.y * a.m + b.y * b.m) / m;
            a.vx = (a.vx * a.m + b.vx * b.m) / m;
            a.vy = (a.vy * a.m + b.vy * b.m) / m;
            a.m = m;

            // remove b
            this.cores.splice(j, 1);
            j--;
          }
        }
      }
    }

    _stepCores(input) {
      const w = this.renderer.w, h = this.renderer.h;

      // 核が「ゆっくり漂う」＋「近づいて合体」するための弱い引力
      for (let i = 0; i < this.cores.length; i++) {
        const c = this.cores[i];

        // drift
        c.vx += (Math.random() - 0.5) * CFG.CORE_DRIFT * 0.02;
        c.vy += (Math.random() - 0.5) * CFG.CORE_DRIFT * 0.02;

        // mutual attraction to promote merging
        for (let j = 0; j < this.cores.length; j++) {
          if (i === j) continue;
          const o = this.cores[j];
          const ox = o.x - c.x, oy = o.y - c.y;
          const d2 = ox * ox + oy * oy + 1800;
          const inv = 1 / d2;
          c.vx += ox * inv * 22;
          c.vy += oy * inv * 22;
        }

        // user long-press gather also tugs cores slightly (subtle)
        if (input.down && input.long) {
          const ox = input.x * this.renderer.dpr - c.x;
          const oy = input.y * this.renderer.dpr - c.y;
          const d2 = ox * ox + oy * oy + 5000;
          const inv = 1 / d2;
          c.vx += ox * inv * 40;
          c.vy += oy * inv * 40;
        }

        // integrate + bounds
        c.vx *= 0.985;
        c.vy *= 0.985;
        c.x += c.vx;
        c.y += c.vy;

        // soft bounds
        if (c.x < 60) c.vx += (60 - c.x) * 0.01;
        if (c.x > w - 60) c.vx -= (c.x - (w - 60)) * 0.01;
        if (c.y < 60) c.vy += (60 - c.y) * 0.01;
        if (c.y > h - 60) c.vy -= (c.y - (h - 60)) * 0.01;

        // radius reacts to mass (and thus "particle amount around it" feeling)
        c.r = CFG.CORE_RADIUS_BASE + (c.m - 1) * 10;
      }

      this._mergeCores();
    }

    _loop() {
      const now = U.now();
      const dt = Math.min(33, now - this._last);
      this._last = now;

      // resize handling
      if (this._needResize) {
        this._needResize = false;
        this._resize();
      }

      const input = this.input.consume();

      // convert input coords to device pixels (renderer space)
      const ix = input.x * this.renderer.dpr;
      const iy = input.y * this.renderer.dpr;
      const ipx = input.px * this.renderer.dpr;
      const ipy = input.py * this.renderer.dpr;

      // flow carving by drag (方向に“流れ”を彫る / しばらく残る層)
      if (input.down && input.dragging) {
        const dx = (ix - ipx);
        const dy = (iy - ipy);
        // 触って白飛びしないように、dx/dyが小さいときは微弱注入
        const mag = Math.hypot(dx, dy);
        const sx = mag > 0.001 ? dx : (Math.random() - 0.5) * 0.5;
        const sy = mag > 0.001 ? dy : (Math.random() - 0.5) * 0.5;
        this.field.inject(ix, iy, sx, sy, 1.0, CFG.HIT_RADIUS);
      }

      // core dynamics
      this._stepCores({ ...input, x: input.x, y: input.y });

      // field relax + core pull
      this.field.step();
      this.field.pullToCores(this.cores);

      // particles update
      this.particles.step(this.field, this.cores, { ...input, x: ix, y: iy, px: ipx, py: ipy });

      // render
      // fade leaves trails (layered), but prevents full white-out
      this.renderer.fade(CFG.CLEAR_ALPHA);
      this.renderer.drawBackground();
      this.renderer.drawParticles(this.particles);
      this.renderer.drawCores(this.cores);

      this._raf = requestAnimationFrame(this._loop);
    }
  }

  function boot() {
    const canvas = document.getElementById("c");
    if (!canvas) return;

    // Avoid double boot
    if (window.__APP__) return;
    window.__APP__ = new App(canvas);

    // resize listener
    const onResize = () => { window.__APP__._needResize = true; };
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
  }

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { passive: true });
  } else {
    boot();
  }

  window.AppBoot = boot;
})();
