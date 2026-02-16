// render.js
(() => {
  "use strict";

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      this.w = 0; this.h = 0;
      this.dpr = 1;

      // offscreen for grain (cheap reuse)
      this._grain = document.createElement("canvas");
      this._gctx = this._grain.getContext("2d");
      this._grainW = 0; this._grainH = 0;
    }

    resize(cssW, cssH, dpr) {
      this.dpr = dpr;
      this.w = Math.max(1, (cssW * dpr) | 0);
      this.h = Math.max(1, (cssH * dpr) | 0);
      this.canvas.width = this.w;
      this.canvas.height = this.h;
      this.canvas.style.width = cssW + "px";
      this.canvas.style.height = cssH + "px";

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.imageSmoothingEnabled = true;

      // grain buffer
      const gw = Math.max(64, (cssW / 2) | 0);
      const gh = Math.max(64, (cssH / 2) | 0);
      if (gw !== this._grainW || gh !== this._grainH) {
        this._grainW = gw; this._grainH = gh;
        this._grain.width = gw;
        this._grain.height = gh;
        this._regenGrain();
      }
    }

    _regenGrain() {
      const g = this._gctx;
      const w = this._grain.width, h = this._grain.height;
      const img = g.createImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }

    // 半透明で上塗りして“層”を残す（白飛びさせない）
    fade(alpha) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(0,0,0,${U.clamp(alpha, 0, 1)})`;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.restore();
    }

    drawBackground() {
      const ctx = this.ctx;
      const w = this.w, h = this.h;

      // vignette
      ctx.save();
      const g = ctx.createRadialGradient(
        w * 0.55, h * 0.45, Math.min(w, h) * 0.08,
        w * 0.55, h * 0.45, Math.max(w, h) * 0.75
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${CFG.BG_VIGNETTE})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // grain overlay
      ctx.save();
      ctx.globalAlpha = CFG.BG_GRAIN;
      ctx.globalCompositeOperation = "overlay";
      ctx.drawImage(this._grain, 0, 0, w, h);
      ctx.restore();
    }

    drawCores(cores) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      for (const c of cores) {
        const x = c.x, y = c.y;
        const r = c.r;

        // soft halo
        const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
        halo.addColorStop(0, "rgba(230,240,255,0.20)");
        halo.addColorStop(0.35, "rgba(230,240,255,0.08)");
        halo.addColorStop(1, "rgba(230,240,255,0)");
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
        ctx.fill();

        // core
        const core = ctx.createRadialGradient(x, y, 0, x, y, r);
        core.addColorStop(0, "rgba(255,255,255,0.95)");
        core.addColorStop(0.5, "rgba(230,240,255,0.40)");
        core.addColorStop(1, "rgba(230,240,255,0)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    drawParticles(particles) {
      const ctx = this.ctx;
      ctx.save();

      // 粒は加算で発光。ただし強すぎると白飛び→粒ごとのalphaを抑える
      ctx.globalCompositeOperation = "lighter";

      const t1 = CFG.TINT_CORE, t2 = CFG.TINT_FOG;

      for (let i = 0; i < particles.n; i++) {
        const x = particles.x[i], y = particles.y[i];
        const s = particles.s[i];
        const a = particles.a[i];

        // sizeに応じて色味を変える（小さいほど硬い/白い）
        const tt = U.clamp(U.invlerp(CFG.SIZE_MIN, CFG.SIZE_MAX, s), 0, 1);
        const r = (t1[0] * (1 - tt) + t2[0] * tt) | 0;
        const g = (t1[1] * (1 - tt) + t2[1] * tt) | 0;
        const b = (t1[2] * (1 - tt) + t2[2] * tt) | 0;

        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  window.Renderer = Renderer;
})();
