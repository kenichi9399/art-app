// utils.js
(() => {
  "use strict";

  const U = {
    clamp(v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp(a, b, t) { return a + (b - a) * t; },
    invlerp(a, b, v) { return (v - a) / (b - a); },
    smoothstep(t) { return t * t * (3 - 2 * t); },
    rand(a = 1, b = 0) { return b + Math.random() * (a - b); },
    randi(a, b = 0) { return (b + (Math.random() * (a - b + 1)) | 0); },

    // 2D vector helpers
    v2(x = 0, y = 0) { return { x, y }; },
    add(a, b) { a.x += b.x; a.y += b.y; return a; },
    sub(a, b) { a.x -= b.x; a.y -= b.y; return a; },
    mul(a, s) { a.x *= s; a.y *= s; return a; },
    len(a) { return Math.hypot(a.x, a.y); },
    len2(a) { return a.x * a.x + a.y * a.y; },
    norm(a) {
      const l = Math.hypot(a.x, a.y) || 1;
      a.x /= l; a.y /= l;
      return a;
    },
    dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },

    // biased random: bias→1 small, bias→0 large
    randPow(bias = 0.8) {
      const r = Math.random();
      return Math.pow(r, bias);
    },

    // simple hash noise (fast, stable)
    hash2(x, y) {
      // integer-ish hash
      let n = (x * 374761393 + y * 668265263) | 0;
      n = (n ^ (n >> 13)) | 0;
      n = (n * 1274126177) | 0;
      return ((n ^ (n >> 16)) >>> 0) / 4294967295;
    },

    now() { return (typeof performance !== "undefined" ? performance.now() : Date.now()); },
  };

  window.U = U;
})();
