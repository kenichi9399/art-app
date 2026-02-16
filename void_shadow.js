;(() => {
  class VoidShadow {
    constructor() {}

    draw(ctx, w, h) {
      // 背景塗り（完全黒は避ける：階調を確保）
      ctx.fillStyle = `rgb(${CFG.BG[0]},${CFG.BG[1]},${CFG.BG[2]})`;
      ctx.fillRect(0, 0, w, h);

      // vignette
      const g = ctx.createRadialGradient(
        w * 0.52, h * 0.44, Math.min(w, h) * 0.15,
        w * 0.52, h * 0.44, Math.max(w, h) * 0.70
      );
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${CFG.VIGNETTE})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // grain（軽量な疑似粒状）
      ctx.globalAlpha = CFG.GRAIN;
      for (let i = 0; i < 900; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const a = Math.random() * 0.9;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  window.VoidShadow = VoidShadow;
})();
