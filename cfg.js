// cfg.js
// Touching Light — Quiet Luxury

const CFG = {
  // ===== Canvas / Performance =====
  DPR_MAX: 2.0,              // iPhoneでも上げすぎない
  FPS_TARGET: 60,
  PERF_TARGET_MS: 16.6,
  PERF_ADAPT: true,
  PERF_SAMPLE_SEC: 2.0,

  // 粒子数は「端末性能に合わせて」自動で上下する
  PARTICLES_BASE: 2600,      // 中核粒子
  DUST_BASE: 2200,           // 微細ダスト
  PARTICLES_MIN: 1400,
  PARTICLES_MAX: 4200,
  DUST_MIN: 800,
  DUST_MAX: 4200,

  // ===== Aesthetic =====
  BG: { r: 5, g: 7, b: 13 },
  VIGNETTE: 0.62,
  GRAIN: 0.035,

  // ===== Core (核) =====
  CORE: {
    x: 0.50, y: 0.43,
    baseRadius: 26,
    glowRadius: 150,
    pulseAmp: 0.18,
    pulseSpeed: 0.55,
    tint: { r: 210, g: 225, b: 255 },
  },

  // ===== Flow Field =====
  FIELD: {
    scale: 0.0034,
    curl: 1.10,
    drift: 0.060,
    speed: 0.92,
    layers: 4,       // fbm layers
    lacunarity: 2.0,
    gain: 0.5,
  },

  // ===== Interaction =====
  INPUT: {
    influenceRadius: 240,
    pull: 0.85,          // 核へ引く
    swirl: 1.15,         // 渦
    brush: 1.35,         // 指の流れ方向に加速
    longPressMs: 220,
    dragSmoothing: 0.18,
  },

  // ===== Particle behaviour =====
  P: {
    // サイズ分布：微粒子のレンジを増やす
    rMin: 0.35,
    rMax: 3.6,
    rBigChance: 0.10,   // 大きめ粒が混ざる割合
    rBigMin: 2.6,
    rBigMax: 6.8,

    // 速度・慣性
    vMax: 1.6,
    damping: 0.985,
    jitter: 0.040,

    // 核周辺での集積
    coreAttract: 0.22,
    coreOrbit: 0.18,

    // 光り方
    alphaMin: 0.020,
    alphaMax: 0.20,
    sparkle: 0.18,
  },

  DUST: {
    rMin: 0.18,
    rMax: 1.10,
    vMax: 0.85,
    damping: 0.992,
    alphaMin: 0.010,
    alphaMax: 0.09,
  },

  // ===== Reset/Save =====
  SAVE: {
    enabled: true,      // 要らなければ false に
    filename: "touching_light.png",
    scale: 1.0,         // 2.0 にすると高解像度だが重い
  },
};
