// utils.js
(() => {
  const U = (window.U = window.U || {});

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.randf = (a = 0, b = 1) => a + (b - a) * Math.random();
  U.randi = (a, b) => (a + (Math.random() * (b - a + 1)) | 0);

  // ✅ input.js が先に走っても落ちないように「後からでも必ず関数化」
  if (typeof U.v2 !== "function") U.v2 = (x = 0, y = 0) => ({ x, y });

  U.len = (x, y) => Math.hypot(x, y);
  U.norm = (x, y) => {
    const l = Math.hypot(x, y) || 1e-9;
    return [x / l, y / l];
  };

  U.now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
})();
