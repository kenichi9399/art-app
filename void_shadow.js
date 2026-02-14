// void_shadow.js
// 背景の「沈殿する黒」と、核の周りの陰影を作る

const VoidShadow = (() => {
  const draw = (ctx, w, h, corePx, t) => {
    // base dark wash
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgb(${CFG.BG.r},${CFG.BG.g},${CFG.BG.b})`;
    ctx.fillRect(0, 0, w, h);

    // subtle mottled fog
    ctx.globalAlpha = 0.07;
    const step = 90;
    for (let y = -step; y < h + step; y += step) {
      for (let x = -step; x < w + step; x += step) {
        const n = U.fbm2((x + t * 40) * 0.0016, (y - t * 25) * 0.0016, 3, 2.0, 0.5);
        const a = (n * 0.5 + 0.5);
        const r = 120 + a * 120;
        ctx.fillStyle = `rgba(255,255,255,${0.010 + a * 0.018})`;
        ctx.beginPath();
        ctx.arc(x + a * 12, y + a * 10, r, 0, U.TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // vignette
    const vg = ctx.createRadialGradient(w * 0.5, h * 0.55, Math.min(w,h) * 0.12, w * 0.5, h * 0.55, Math.max(w,h) * 0.75);
    vg.addColorStop(0.0, "rgba(0,0,0,0)");
    vg.addColorStop(1.0, `rgba(0,0,0,${CFG.VIGNETTE})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    // core shadow bowl (gives "核が沈んでいる" depth)
    const cx = corePx.x, cy = corePx.y;
    const rr = Math.min(w,h) * 0.42;
    const bowl = ctx.createRadialGradient(cx, cy, rr * 0.05, cx, cy, rr);
    bowl.addColorStop(0.0, "rgba(0,0,0,0.0)");
    bowl.addColorStop(0.55, "rgba(0,0,0,0.12)");
    bowl.addColorStop(1.0, "rgba(0,0,0,0.42)");
    ctx.fillStyle = bowl;
    ctx.fillRect(0, 0, w, h);

    ctx.restore();
  };

  const grain = (ctx, w, h) => {
    // cheap film grain
    const g = CFG.GRAIN;
    if (g <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = g;

    const n = 2200; // constant cost
    for (let i = 0; i < n; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const a = Math.random() * 0.35;
      const s = 0.6 + Math.random() * 1.6;
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fillRect(x, y, s, s);
    }
    ctx.restore();
  };

  return { draw, grain };
})();
