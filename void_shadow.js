// void_shadow.js
// 背景テクスチャ（黒の堆積：粒・擦過・にじみ）
(() => {
  function makeVoidTexture(w, h, seed = 1337) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d", { alpha: true });

    const rng = U.rng(seed);

    // base fill
    g.fillStyle = CFG.BG_BASE;
    g.fillRect(0, 0, w, h);

    // subtle fog using fbm
    const img = g.getImageData(0, 0, w, h);
    const data = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const nx = x / w, ny = y / h;
        const f = U.fbm2(nx * 2.2 + 13.7, ny * 2.0 + 9.3, 5);
        const v = (f - 0.5) * 0.22; // subtle
        const i = (y * w + x) * 4;

        // base rgb slightly tinted
        const r = 5 + v * 18;
        const gg = 7 + v * 22;
        const b = 13 + v * 30;

        data[i] = U.clamp(r, 0, 255);
        data[i + 1] = U.clamp(gg, 0, 255);
        data[i + 2] = U.clamp(b, 0, 255);
        data[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);

    // grain
    g.globalCompositeOperation = "overlay";
    g.globalAlpha = CFG.BG_GRAIN;
    for (let i = 0; i < Math.floor((w * h) / 1200); i++) {
      const x = rng() * w, y = rng() * h;
      const s = 1 + rng() * 2.2;
      g.fillStyle = rng() > 0.5 ? "rgba(255,255,255,.8)" : "rgba(0,0,0,.8)";
      g.fillRect(x, y, s, s);
    }

    // scratches / wipe marks
    g.globalCompositeOperation = "screen";
    g.globalAlpha = CFG.BG_SCRATCH;
    g.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const x0 = rng() * w;
      const y0 = rng() * h;
      const len = (0.15 + rng() * 0.55) * w;
      const ang = (rng() * 0.4 - 0.2) + (rng() > 0.6 ? Math.PI * 0.5 : 0);
      const x1 = x0 + Math.cos(ang) * len;
      const y1 = y0 + Math.sin(ang) * len;
      g.strokeStyle = "rgba(220,235,255,.9)";
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    }

    // vignette
    g.globalCompositeOperation = "multiply";
    g.globalAlpha = 1;
    const rad = g.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.65);
    rad.addColorStop(0, "rgba(255,255,255,1)");
    rad.addColorStop(1, `rgba(0,0,0,${CFG.BG_VIGNETTE})`);
    g.fillStyle = rad;
    g.fillRect(0, 0, w, h);

    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;

    return c;
  }

  window.VoidShadow = { makeVoidTexture };
})();
