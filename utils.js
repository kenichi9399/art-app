// utils.js
// ------------------------------------------------------------
// Utilities (v1.1)
// 目的：
// - “美しい複雑さ”を支える共通部（乱数/ノイズ/補間/色/ガンマ/ベクトル）
// - iPhoneでも軽い：依存なし・関数は小さく・必要なものだけ
//
// 使い方：
// - 既存コードが utils の関数名に依存していても壊れにくいよう、
//   window.Utils にまとめつつ、よく使う関数はグローバルにも薄く露出。
// ------------------------------------------------------------

(function () {
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------
  // Math
  // ------------------------------------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const invLerp = (a, b, v) => (b - a !== 0 ? (v - a) / (b - a) : 0);
  const remap = (v, inA, inB, outA, outB) => outA + (outB - outA) * clamp(invLerp(inA, inB, v), 0, 1);

  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const smootherstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  const fract = (x) => x - Math.floor(x);

  // ------------------------------------------------------------
  // RNG (xorshift32) – fast & deterministic
  // ------------------------------------------------------------
  function RNG(seed) {
    this.s = (seed >>> 0) || 1;
  }
  RNG.prototype.next = function () {
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return (this.s & 0xffffffff) / 0x100000000;
  };
  RNG.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
  RNG.prototype.int = function (a, b) { return (this.range(a, b + 1) | 0); };
  RNG.prototype.sign = function () { return this.next() < 0.5 ? -1 : 1; };
  RNG.prototype.pick = function (arr) { return arr[(arr.length * this.next()) | 0]; };

  // ------------------------------------------------------------
  // Hash / value noise (lightweight)
  // ------------------------------------------------------------
  const hash1 = (x) => fract(Math.sin(x) * 43758.5453123);
  const hash2 = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
  const hash3 = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453123);

  const vnoise2 = (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = x0 + 1, y1 = y0 + 1;
    const sx = x - x0, sy = y - y0;

    const n00 = hash2(x0, y0);
    const n10 = hash2(x1, y0);
    const n01 = hash2(x0, y1);
    const n11 = hash2(x1, y1);

    const ux = sx * sx * (3 - 2 * sx);
    const uy = sy * sy * (3 - 2 * sy);

    const ix0 = lerp(n00, n10, ux);
    const ix1 = lerp(n01, n11, ux);
    return lerp(ix0, ix1, uy);
  };

  // fbm: 薄い“にじみ”のような複雑さ（使いすぎ注意）
  const fbm2 = (x, y, oct = 4, lac = 2.0, gain = 0.5) => {
    let amp = 0.5;
    let freq = 1.0;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < oct; i++) {
      sum += amp * (vnoise2(x * freq, y * freq) - 0.5) * 2.0;
      norm += amp;
      amp *= gain;
      freq *= lac;
    }
    return norm > 0 ? (sum / norm) : 0;
  };

  // curl-ish vector from noise (approx)
  const curl2 = (x, y, t = 0) => {
    const e = 0.015;
    const n1 = vnoise2(x, y + e + t);
    const n2 = vnoise2(x, y - e + t);
    const a = (n1 - n2) / (2 * e);

    const n3 = vnoise2(x + e + t, y);
    const n4 = vnoise2(x - e + t, y);
    const b = (n3 - n4) / (2 * e);

    let vx = a;
    let vy = -b;
    const m = Math.hypot(vx, vy) || 1;
    vx /= m; vy /= m;
    return { x: vx, y: vy };
  };

  // ------------------------------------------------------------
  // Vector helpers
  // ------------------------------------------------------------
  const vecLen = (x, y) => Math.hypot(x, y);
  const vecNorm = (x, y) => {
    const m = Math.hypot(x, y) || 1;
    return { x: x / m, y: y / m };
  };
  const vecRot = (x, y, a) => {
    const c = Math.cos(a), s = Math.sin(a);
    return { x: x * c - y * s, y: x * s + y * c };
  };

  // ------------------------------------------------------------
  // Color helpers (simple, gamma-aware)
  // ------------------------------------------------------------
  const srgbToLin = (c) => {
    c = c / 255;
    return c <= 0.04045 ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const linToSrgb = (c) => {
    c = clamp(c, 0, 1);
    return (c <= 0.0031308 ? (c * 12.92) : (1.055 * Math.pow(c, 1 / 2.4) - 0.055)) * 255;
  };

  // gamma-correct lerp for colors
  const mixRGB = (c1, c2, t) => {
    const r1 = srgbToLin(c1[0]), g1 = srgbToLin(c1[1]), b1 = srgbToLin(c1[2]);
    const r2 = srgbToLin(c2[0]), g2 = srgbToLin(c2[1]), b2 = srgbToLin(c2[2]);
    const r = lerp(r1, r2, t);
    const g = lerp(g1, g2, t);
    const b = lerp(b1, b2, t);
    return [linToSrgb(r), linToSrgb(g), linToSrgb(b)];
  };

  // rgba string
  const rgba = (r, g, b, a) => `rgba(${r|0},${g|0},${b|0},${a})`;

  // ------------------------------------------------------------
  // Palette (控えめ：緑と紫を “縁” にだけ)
  // ------------------------------------------------------------
  const Palette = {
    deep:  [5, 7, 13],
    ink:   [12, 16, 34],
    mist:  [245, 248, 255],
    pale:  [232, 238, 250],
    green: [90, 255, 170],
    purple:[170, 120, 255],
  };

  // ------------------------------------------------------------
  // Expose
  // ------------------------------------------------------------
  const Utils = {
    TAU,

    clamp, lerp, invLerp, remap,
    smoothstep, smootherstep,
    fract,

    RNG,
    hash1, hash2, hash3,
    vnoise2, fbm2, curl2,

    vecLen, vecNorm, vecRot,

    srgbToLin, linToSrgb,
    mixRGB, rgba,

    Palette,
  };

  window.Utils = Utils;

  // 既存ファイルとの互換用に、よく使うものだけ“薄く”グローバル公開（安全寄り）
  // ※すでに同名がある場合は上書きしない
  if (typeof window.clamp === "undefined") window.clamp = clamp;
  if (typeof window.lerp === "undefined") window.lerp = lerp;
  if (typeof window.smoothstep === "undefined") window.smoothstep = smoothstep;
})();
