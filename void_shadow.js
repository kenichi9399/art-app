// void_shadow.js
(() => {
  "use strict";

  // Soft vignette + subtle “void” layers (quiet luxury)
  function drawVoid(ctx, w, h, t) {
    const dpr = U.getDPR();
    const cw = w * dpr, ch = h * dpr;

    ctx.save();

    // Vignette
    const g = ctx.createRadialGradient(cw * 0.5, ch * 0.55, Math.min(cw, ch) * 0.08,
                                      cw * 0.5, ch * 0.55, Math.min(cw, ch) * 0.68);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cw, ch);

    // Very faint drifting “shadow sheets”
    ctx.globalCompositeOperation = "soft-light";
    for (let i = 0; i < 4; i++) {
      const ph = t * (0.00025 + i * 0.00007);
      const ox = (Math.sin(ph * 1.7 + i) * 0.5 + 0.5) * cw;
      const oy = (Math.cos(ph * 1.3 - i) * 0.5 + 0.5) * ch;

      const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.min(cw, ch) * (0.35 + i * 0.08));
      rg.addColorStop(0, "rgba(180,190,210,0.035)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, cw, ch);
    }

    ctx.restore();
  }

  window.drawVoid = drawVoid;
})();
