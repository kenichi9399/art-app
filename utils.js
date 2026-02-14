// utils.js
(() => {
  "use strict";

  const U = {};

  U.clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  U.lerp  = (a, b, t) => a + (b - a) * t;
  U.mix   = U.lerp;

  U.rand  = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randi = (a, b) => (a + Math.floor(Math.random() * (b - a + 1)));
  U.now   = () => (performance && performance.now ? performance.now() : Date.now());

  U.hypot = (x, y) => Math.hypot(x, y);

  U.hexToRgb = (hex) => {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };

  U.rgba = (r, g, b, a) => `rgba(${r|0},${g|0},${b|0},${a})`;

  U.getDPR = () => {
    const dpr = window.devicePixelRatio || 1;
    return U.clamp(dpr, 1, (window.CFG && window.CFG.DPR_MAX) ? window.CFG.DPR_MAX : 2);
  };

  U.resizeCanvas = (canvas) => {
    const dpr = U.getDPR();
    const w = Math.max(1, Math.floor(window.innerWidth));
    const h = Math.max(1, Math.floor(window.innerHeight));
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width  = w + "px";
    canvas.style.height = h + "px";
    return { w, h, dpr, cw: canvas.width, ch: canvas.height };
  };

  U.getCtx2D = (canvas) => {
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    return ctx || null;
  };

  U.downloadPNG = (canvas, filename = "untitled.png", scale = 1) => {
    // scale: export at higher res without changing on-screen size
    const dpr = U.getDPR();
    const srcW = canvas.width, srcH = canvas.height;

    const out = document.createElement("canvas");
    out.width = Math.floor(srcW * scale / dpr);
    out.height = Math.floor(srcH * scale / dpr);

    const octx = out.getContext("2d");
    // draw scaled down/up from device pixels to CSS pixels then scale
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(canvas, 0, 0, out.width, out.height);

    const a = document.createElement("a");
    a.download = filename;
    a.href = out.toDataURL("image/png");
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  U.toast = (msg) => {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(U._toastT);
    U._toastT = setTimeout(() => el.classList.remove("show"), 900);
  };

  U.showError = (err) => {
    const el = document.getElementById("err");
    if (!el) return;
    const txt = (err && err.stack) ? err.stack : String(err || "Unknown error");
    el.style.display = "block";
    el.textContent = "JavaScript error\n" + txt + "\n\nファイル名/読み込み順/拡張子(.txtになってないか)を確認してください";
  };

  // Small deterministic hash for seeds
  U.hash = (str) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  // Simple value noise
  U.fade = (t) => t * t * (3 - 2 * t);
  U.valueNoise2D = (x, y, seed = 0) => {
    // grid cell
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;

    const r = (ix, iy) => {
      const n = (ix * 374761393 + iy * 668265263 + seed * 1442695041) >>> 0;
      const m = (n ^ (n >> 13)) >>> 0;
      return ((Math.imul(m, 1274126177) >>> 0) / 4294967296);
    };

    const v00 = r(xi, yi);
    const v10 = r(xi + 1, yi);
    const v01 = r(xi, yi + 1);
    const v11 = r(xi + 1, yi + 1);

    const u = U.fade(xf);
    const v = U.fade(yf);

    const x1 = U.lerp(v00, v10, u);
    const x2 = U.lerp(v01, v11, u);
    return U.lerp(x1, x2, v);
  };

  window.U = U;
})();
