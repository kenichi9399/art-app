// render.js
(() => {
  "use strict";

  function clear(ctx, w, h) {
    const dpr = U.getDPR();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    ctx.fillStyle = window.CFG.BG;
    ctx.fillRect(0, 0, w * dpr, h * dpr);
  }

  function drawGrain(ctx, w, h, strength = 0.06) {
    const dpr = U.getDPR();
    const cw = Math.floor(w * dpr), ch = Math.floor(h * dpr);
    const img = ctx.getImageData(0, 0, cw, ch);
    const d = img.data;
    const n = d.length;
    for (let i = 0; i < n; i += 4) {
      const g = (Math.random() - 0.5) * 255 * strength;
      d[i] = U.clamp(d[i] + g, 0, 255);
      d[i + 1] = U.clamp(d[i + 1] + g, 0, 255);
      d[i + 2] = U.clamp(d[i + 2] + g, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  }

  function drawParticles(ctx, w, h, P) {
    const dpr = U.getDPR();
    const cw = w * dpr, ch = h * dpr;

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";

    // subtle trails
    ctx.fillStyle = "rgba(5,7,13,0.06)";
    ctx.fillRect(0, 0, cw, ch);

    for (let i = 0; i < P.n; i++) {
      const x = P.x[i] * dpr;
      const y = P.y[i] * dpr;

      const a = P.a[i];
      const s = P.s[i] * dpr;

      // cool-white with slight hue drift
      const tint = P.h[i];
      const r = 220 + tint * 15;
      const g = 230 + tint * 18;
      const b = 245 + tint * 10;

      ctx.beginPath();
      ctx.fillStyle = U.rgba(r, g, b, a * 0.55);
      ctx.arc(x, y, s * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // micro halo
      ctx.beginPath();
      ctx.fillStyle = U.rgba(r, g, b, a * 0.18);
      ctx.arc(x, y, s * 1.9, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawVeil(ctx, w, h, t) {
    const dpr = U.getDPR();
    const cw = w * dpr, ch = h * dpr;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const ox = (Math.sin(t * 0.00025) * 0.5 + 0.5) * cw;
    const oy = (Math.cos(t * 0.00018) * 0.5 + 0.5) * ch;

    const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.min(cw, ch) * 0.85);
    rg.addColorStop(0.0, "rgba(230,240,255,0.10)");
    rg.addColorStop(0.45, "rgba(230,240,255,0.05)");
    rg.addColorStop(1.0, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, cw, ch);
    ctx.restore();
  }

  window.Render = { clear, drawParticles, drawVeil, drawGrain };
})();
