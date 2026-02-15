// utils.js
// Small, fast, iOS Safari-safe helpers.
// Guarantees: window.U exists and U.v2(x,y) exists.

(() => {
  const U = (window.U = window.U || {});

  // ---- numbers ----
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.invLerp = (a, b, v) => (v - a) / (b - a || 1e-9);
  U.smoothstep = (a, b, v) => {
    const t = U.clamp(U.invLerp(a, b, v), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // ---- random ----
  U.rand = () => Math.random();
  U.randf = (a = 0, b = 1) => a + (b - a) * Math.random();
  U.randi = (a, b) => (a + (Math.random() * (b - a + 1)) | 0);

  // ---- 2D vectors (plain objects, GC-friendly enough for this scale) ----
  // Important: this is what input.js expects
  U.v2 = (x = 0, y = 0) => ({ x, y });

  U.v2set = (v, x, y) => { v.x = x; v.y = y; return v; };
  U.v2copy = (a, b) => { a.x = b.x; a.y = b.y; return a; };
  U.v2clone = (v) => ({ x: v.x, y: v.y });

  U.v2add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  U.v2sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  U.v2mul = (a, s) => ({ x: a.x * s, y: a.y * s });

  U.v2iadd = (a, b) => { a.x += b.x; a.y += b.y; return a; };
  U.v2isub = (a, b) => { a.x -= b.x; a.y -= b.y; return a; };
  U.v2imul = (a, s) => { a.x *= s; a.y *= s; return a; };

  U.v2len2 = (v) => v.x * v.x + v.y * v.y;
  U.v2len = (v) => Math.sqrt(U.v2len2(v));
  U.v2dist2 = (a, b) => {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
  };
  U.v2dist = (a, b) => Math.sqrt(U.v2dist2(a, b));

  U.v2norm = (v) => {
    const l = Math.sqrt(v.x * v.x + v.y * v.y) || 1e-9;
    return { x: v.x / l, y: v.y / l };
  };
  U.v2inorm = (v) => {
    const l = Math.sqrt(v.x * v.x + v.y * v.y) || 1e-9;
    v.x /= l; v.y /= l;
    return v;
  };

  // ---- tiny hash/noise (optional, used by some visual modules) ----
  U.hash = (n) => {
    // deterministic 0..1
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3);
    n = n ^ (n >>> 4);
    n = n * 0x27d4eb2d;
    n = n ^ (n >>> 15);
    return (n >>> 0) / 4294967295;
  };

  U.hash2 = (x, y) => {
    // deterministic 0..1 from 2 ints
    return U.hash((x * 374761393 + y * 668265263) | 0);
  };

  U.noise2 = (x, y) => {
    // simple value noise (not expensive)
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const a = U.hash2(xi, yi);
    const b = U.hash2(xi + 1, yi);
    const c = U.hash2(xi, yi + 1);
    const d = U.hash2(xi + 1, yi + 1);
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return U.lerp(U.lerp(a, b, u), U.lerp(c, d, u), v);
  };

  // ---- feature flags (optional) ----
  // sketch.js で参照されても落ちないようにする
  U.now = () => performance.now();
})();
