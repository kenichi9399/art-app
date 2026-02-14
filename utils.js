// utils.js

const U = (() => {
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (t) => t * t * (3 - 2 * t);

  const rand = (a = 1, b = 0) => Math.random() * (a - b) + b;
  const randn = () => {
    // Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  };

  // Hash-based value noise (fast, stable)
  const hash2 = (x, y) => {
    // integer hash
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) >>> 0) / 4294967295;
  };

  const noise2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = smoothstep(xf), v = smoothstep(yf);

    const a = hash2(xi, yi);
    const b = hash2(xi + 1, yi);
    const c = hash2(xi, yi + 1);
    const d = hash2(xi + 1, yi + 1);

    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };

  const fbm2 = (x, y, oct = 4, lac = 2.0, gain = 0.5) => {
    let amp = 1.0, freq = 1.0, sum = 0.0, norm = 0.0;
    for (let i = 0; i < oct; i++) {
      sum += amp * (noise2(x * freq, y * freq) * 2 - 1);
      norm += amp;
      amp *= gain;
      freq *= lac;
    }
    return sum / Math.max(1e-6, norm);
  };

  // Curl-ish field from finite differences on fbm
  const curl2 = (x, y, eps, oct, lac, gain) => {
    const n1 = fbm2(x, y + eps, oct, lac, gain);
    const n2 = fbm2(x, y - eps, oct, lac, gain);
    const a = (n1 - n2) / (2 * eps);

    const n3 = fbm2(x + eps, y, oct, lac, gain);
    const n4 = fbm2(x - eps, y, oct, lac, gain);
    const b = (n3 - n4) / (2 * eps);

    // perpendicular
    return { x: a, y: -b };
  };

  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const norm2 = (x, y) => {
    const d = Math.sqrt(x * x + y * y) || 1e-6;
    return { x: x / d, y: y / d, d };
  };

  const now = () => performance.now();

  const toast = (msg, ms = 1400) => {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.style.display = "none"; }, ms);
  };

  return {
    TAU, clamp, lerp, smoothstep,
    rand, randn,
    noise2, fbm2, curl2,
    dist2, norm2,
    now, toast
  };
})();
