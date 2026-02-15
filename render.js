// render.js
(() => {
  class Renderer {
    constructor(canvas, ctx, w, h) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.resize(w,h);

      // offscreen（iOSでも使える範囲）
      this.buf = document.createElement('canvas');
      this.bctx = this.buf.getContext('2d');
      this.buf.width = this.w;
      this.buf.height = this.h;

      this.vs = new VoidShadow(this.w, this.h);
    }

    resize(w,h) {
      this.w = w; this.h = h;
      if (this.buf) {
        this.buf.width = w; this.buf.height = h;
      }
      if (this.vs) this.vs.resize(w,h);
    }

    clear() {
      const ctx = this.ctx;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(5,7,13,1)';
      ctx.fillRect(0,0,this.w,this.h);
    }

    // highlight clamp: value->value
    _tone(v) {
      // v: 0..large
      // exposure
      v *= CFG.EXPOSURE;

      // soft clamp
      const c = CFG.HIGHLIGHT_CLAMP;
      // mapped = v/(v+1) に近いが、clamp感を調整
      const mapped = v / (v + (1.0/c));
      // gamma
      return Math.pow(mapped, 1/CFG.GAMMA);
    }

    draw(ps, meta) {
      const w=this.w, h=this.h;
      const ctx=this.ctx;

      // 1) fade (残像)
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(5,7,13,${CFG.BG_ALPHA})`;
      ctx.fillRect(0,0,w,h);

      // 2) deep shadow layer
      this.vs.draw(ctx);

      // 3) particles to buffer (additive but controlled)
      const bctx = this.bctx;
      bctx.clearRect(0,0,w,h);
      bctx.globalCompositeOperation = 'source-over';

      // draw particles as soft circles (micro/normal/rare big)
      // brightness is controlled later by tone mapping feel (we mod alpha here)
      const n = ps.count;
      const x = ps.x, y = ps.y, size = ps.size, kind = ps.kind;

      // core influence for brightness shaping
      let core = ps.cores[ps.cores.length-1] || null;
      const coreX = core ? core.p.x : w*0.5;
      const coreY = core ? core.p.y : h*0.5;
      const coreHeat = core ? core.heat : 0;

      for (let i=0;i<n;i++) {
        const px = x[i], py = y[i];
        const s = size[i];

        // distance to core affects intensity (nucleus depth)
        const dx = px - coreX, dy = py - coreY;
        const d = Math.hypot(dx,dy);

        // base intensity: micro less intense, big more intense
        let inten = 0.35;
        if (kind[i] === 0) inten = 0.22;
        if (kind[i] === 2) inten = 0.55;

        // core falloff: near core brighter but clampable
        const near = 1.0 - U.clamp(d / 420, 0, 1);
        inten += near * (0.38 + 0.25*meta.coreShape);

        // avoid pure white blowout: cap intensity
        inten = U.clamp(inten, 0.10, 0.85);

        // alpha shaping
        const a = inten * 0.65 * CFG.GLOW_PARTICLE;

        // draw soft circle
        const r = s * (1.0 + 0.35*near);
        const g = bctx.createRadialGradient(px,py,0, px,py, r*2.4);
        g.addColorStop(0.0, `rgba(255,255,255,${a})`);
        g.addColorStop(0.6, `rgba(220,230,255,${a*0.35})`);
        g.addColorStop(1.0, `rgba(0,0,0,0)`);
        bctx.fillStyle = g;
        bctx.beginPath();
        bctx.arc(px,py, r*2.2, 0, Math.PI*2);
        bctx.fill();
      }

      // 4) core glow (buffer)
      if (core) {
        const px = core.p.x, py = core.p.y;
        const heat = coreHeat;
        const base = 0.55 + 0.22*meta.coreShape;

        const r0 = 34 + 28*meta.coreShape;
        const g = bctx.createRadialGradient(px,py, 0, px,py, r0*4.2);
        const a0 = (0.22 + 0.18*heat) * CFG.GLOW_CORE; // 控えめ
        g.addColorStop(0.0, `rgba(240,245,255,${a0})`);
        g.addColorStop(0.25, `rgba(180,200,255,${a0*0.55})`);
        g.addColorStop(1.0, `rgba(0,0,0,0)`);
        bctx.fillStyle = g;
        bctx.beginPath();
        bctx.arc(px,py, r0*3.8, 0, Math.PI*2);
        bctx.fill();
      }

      // 5) composite buffer to main using "lighter" but modest alpha
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = CFG.GLOW_GLOBAL;
      ctx.drawImage(this.buf, 0,0);
      ctx.globalAlpha = 1;

      // 6) final slight clamp overlay (prevents white flash perception)
      // A subtle dark veil that increases only when core is intense
      const veil = 0.04 + 0.06*(meta.coreShape||0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(0,0,0,${veil})`;
      ctx.fillRect(0,0,w,h);
    }
  }

  window.Renderer = Renderer;
})();
