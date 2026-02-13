// utils.js
(() => {
  const U = {};

  // --- math / random ---------------------------------------------------------
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.smoothstep = (e0, e1, x) => {
    const t = U.clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // Mulberry32
  U.rng = (seed = 123456789) => {
    let t = seed >>> 0;
    return () => {
      t += 0x6D2B79F5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  };

  // hash-based 2D noise (fast, good enough)
  U.hash2 = (x, y) => {
    let n = x * 374761393 + y * 668265263; // primes
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967296;
  };

  // value noise 2D
  U.vnoise2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);

    const a = U.hash2(xi, yi);
    const b = U.hash2(xi + 1, yi);
    const c = U.hash2(xi, yi + 1);
    const d = U.hash2(xi + 1, yi + 1);

    const ab = a + (b - a) * u;
    const cd = c + (d - c) * u;
    return ab + (cd - ab) * v;
  };

  // fBm
  U.fbm2 = (x, y, oct = 4) => {
    let f = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < oct; i++) {
      f += amp * U.vnoise2(x * freq, y * freq);
      freq *= 2;
      amp *= 0.5;
    }
    return f;
  };

  // --- color ----------------------------------------------------------------
  U.hexToRgb = (hex) => {
    const h = hex.replace("#", "").trim();
    const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };

  U.rgba = (r, g, b, a) => `rgba(${r|0},${g|0},${b|0},${a})`;

  // soft additive that clamps highlights a bit
  U.softAdd = (base, add, k) => {
    // base/add: 0..1, k: clamp strength
    const x = base + add;
    if (x <= 1) return x;
    // compress highlights (filmic-ish)
    return 1 - Math.exp(-(x - 1) * k);
  };

  // --- device / canvas -------------------------------------------------------
  U.fitCanvas = (canvas, dprMax = 2) => {
    const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
    const w = Math.max(1, Math.floor(window.innerWidth * dpr));
    const h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { w, h, dpr };
  };

  U.now = () => performance.now();

  window.U = U;
})();
