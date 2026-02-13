// render.js
(() => {
  function Renderer(app) {
    this.app = app;
    this.bgTex = null;
    this.bgReady = false;

    // offscreen for bloom
    this.bloom = document.createElement("canvas");
    this.bctx = this.bloom.getContext("2d");
  }

  Renderer.prototype.resize = function () {
    const a = this.app;
    const w = a.w, h = a.h;

    // background texture fixed size (lighter)
    const bw = Math.max(320, Math.floor(w * 0.6));
    const bh = Math.max(320, Math.floor(h * 0.6));
    this.bgTex = VoidShadow.makeVoidTexture(bw, bh, 1337);
    this.bgReady = true;

    // bloom canvas
    this.bloom.width = w;
    this.bloom.height = h;
  };

  Renderer.prototype.drawBackground = function (ctx) {
    const a = this.app;
    const w = a.w, h = a.h;

    ctx.fillStyle = CFG.BG_BASE;
    ctx.fillRect(0, 0, w, h);

    if (this.bgReady && this.bgTex) {
      // tile
      ctx.globalAlpha = 1;
      const pat = ctx.createPattern(this.bgTex, "repeat");
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, w, h);
    }
  };

  Renderer.prototype.drawLight = function (ctx) {
    const a = this.app;
    const w = a.w, h = a.h;

    const cx = a.light.x * w;
    const cy = a.light.y * h;
    const baseR = Math.min(w, h) * CFG.LIGHT_CORE_RADIUS;

    // core
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR);
    g.addColorStop(0, "rgba(255,255,255,0.92)");
    g.addColorStop(CFG.LIGHT_CORE_SOFT, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = CFG.LIGHT_CORE_ALPHA;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.fill();

    // rings (quiet layers)
    ctx.globalAlpha = 1;
    for (let i = 0; i < CFG.LIGHT_RING_COUNT; i++) {
      const rr = baseR * (1 + i * CFG.LIGHT_RING_STEP);
      ctx.globalAlpha = CFG.LIGHT_RING_ALPHA * (1 - i / CFG.LIGHT_RING_COUNT);
      ctx.strokeStyle = "rgba(240,245,255,.35)";
      ctx.lineWidth = Math.max(1, baseR * 0.012);
      ctx.beginPath();
      ctx.arc(cx, cy, rr, -Math.PI * 0.45, Math.PI * 1.75);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  Renderer.prototype.drawParticles = function (ctx) {
    const a = this.app;
    const w = a.w, h = a.h;

    ctx.globalCompositeOperation = "screen";

    for (const p of a.ps.p) {
      const x = p.x * w;
      const y = p.y * h;

      // fade near core to avoid “white disaster”
      const dx = (p.x - a.light.x);
      const dy = (p.y - a.light.y);
      const d = Math.sqrt(dx * dx + dy * dy);
      const coreFade = U.smoothstep(0.0, CFG.LIGHT_CORE_RADIUS * 0.55, d);
      const a0 = p.alpha * coreFade;

      // slightly warm impurities
      const col = p.warm ? `rgba(255,220,180,${a0})` : `rgba(220,235,255,${a0})`;

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, p.size * a.dpr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  };

  Renderer.prototype.drawBloom = function (ctx) {
    const a = this.app;
    const w = a.w, h = a.h;

    // simple bloom: render light into bloom canvas then blur by scaling
    const b = this.bctx;
    b.clearRect(0, 0, w, h);

    // draw a soft blob around light and around touch trail
    const cx = a.light.x * w;
    const cy = a.light.y * h;
    const r = Math.min(w, h) * CFG.BLOOM_RADIUS;

    let g = b.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, "rgba(255,255,255,.65)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    b.fillStyle = g;
    b.beginPath();
    b.arc(cx, cy, r, 0, Math.PI * 2);
    b.fill();

    if (a.touch.trail.length) {
      for (let i = 0; i < a.touch.trail.length; i++) {
        const t = a.touch.trail[i];
        const tx = t.x * w;
        const ty = t.y * h;
        const tr = r * (0.35 + i / a.touch.trail.length * 0.55);
        const ga = 0.18 * (i / a.touch.trail.length);
        const tg = b.createRadialGradient(tx, ty, 0, tx, ty, tr);
        tg.addColorStop(0, `rgba(255,255,255,${ga})`);
        tg.addColorStop(1, "rgba(255,255,255,0)");
        b.fillStyle = tg;
        b.beginPath();
        b.arc(tx, ty, tr, 0, Math.PI * 2);
        b.fill();
      }
    }

    // blur-ish: scale down then up a few times
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = CFG.BLOOM_STRENGTH;

    for (let i = 0; i < 3; i++) {
      const s = 0.55 + i * 0.12;
      const sw = w * s, sh = h * s;
      const ox = (w - sw) * 0.5;
      const oy = (h - sh) * 0.5;
      ctx.drawImage(this.bloom, ox, oy, sw, sh);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  Renderer.prototype.frame = function () {
    const a = this.app;
    const ctx = a.ctx;

    // ctx sanity
    if (!ctx || typeof ctx.beginPath !== "function") {
      throw new Error("Canvas 2D context not available (ctx invalid).");
    }

    this.drawBackground(ctx);
    this.drawLight(ctx);
    this.drawParticles(ctx);
    this.drawBloom(ctx);

    // tiny exposure clamp overlay to avoid white burn
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "rgba(240,245,255,1)";
    ctx.fillRect(0, 0, a.w, a.h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  window.Renderer = Renderer;
})();
