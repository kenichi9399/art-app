// cfg.js
// Touching Light — Quiet Luxury (iPhone Safari safe)

window.CFG = {
  // Performance
  FPS_CAP: 60,
  DPR_CAP: 2.0,          // iPhoneで重すぎるのを防ぐ
  FADE: 0.065,           // 残像の消え方（大きいほど早く消える）
  BG_GRAIN: 0.06,

  // Particle counts (auto scaled by area)
  DENSITY_PER_10KPX: 26, // 画面面積10,000px^2あたりの粒数
  MIN_PARTICLES: 1200,
  MAX_PARTICLES: 6200,

  // Particle motion
  FIELD_STRENGTH: 0.75,
  FIELD_SCALE: 0.00135,
  DRAG: 0.985,
  JITTER: 0.10,

  // Touch forces
  TAP_IMPULSE: 1.25,
  DRAG_FORCE: 1.5,
  LONGPRESS_ATTRACT: 2.2,
  LONGPRESS_TIME_MS: 260,

  // Core (nucleus)
  CORE_DRIFT: 0.35,
  CORE_PULL: 0.95,
  CORE_RADIUS: 44,
  CORE_SOFT: 110,
  CORE_BREATHE: 0.18,

  // Sizes: many tiny, some mid, few big
  SIZE_TINY: [0.4, 1.2],
  SIZE_MID:  [1.2, 2.8],
  SIZE_BIG:  [2.8, 6.2],

  // Rendering / exposure
  ADDITIVE_ALPHA: 0.10,  // 加算合成の強さ（白飛び防止）
  DOT_ALPHA: 0.55,
  MAX_EXPOSURE: 0.92,
};
