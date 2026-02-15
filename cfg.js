// cfg.js
(() => {
  const CFG = {
    // ===== Canvas / performance =====
    FPS_TARGET: 60,
    DPR_MAX: 2.0,          // iPhoneで過剰DPRを避ける
    DESYNC: true,          // Safariで効くことがある

    // ===== Particle counts (自動補正あり) =====
    PCOUNT_BASE: 24000,    // 「もう少し多く」
    PCOUNT_MIN:  11000,
    PCOUNT_MAX:  34000,

    // ===== Size distribution（小粒が増え、時々大粒が混ざる） =====
    SIZE_MIN: 0.26,
    SIZE_MAX: 2.8,
    SIZE_MICRO_BIAS: 0.82,   // 1に近いほど小粒寄り
    SIZE_RARE_BIG: 0.06,     // たまに大粒

    // ===== Motion =====
    DAMPING: 0.986,        // 大きいほど滑らか（慣性）
    SPEED_LIMIT: 2.5,
    DRAG_COUPLING: 1.25,   // 場に従う強さ

    // ===== Field =====
    FIELD_CELL: 22,        // 小さいほど繊細だが重い
    FIELD_NOISE_SCALE: 0.0019,
    FIELD_NOISE_SPEED: 0.036,

    // ===== Drag carve（流れを彫る） =====
    CARVE_STRENGTH: 1.55,
    CARVE_RADIUS: 46,
    CARVE_DECAY: 0.986,    // 軌跡の残り具合（1に近いほど残る）

    // ===== Touch =====
    TAP_SPLASH: 1.10,        // タップ拡散
    LONGPRESS_GATHER: 1.34,  // 長押し吸引

    // ===== Core（核：2〜3個→合体→1つ） =====
    CORE_COUNT_MIN: 2,
    CORE_COUNT_MAX: 3,
    CORE_MERGE_DIST: 44,
    CORE_MERGE_SPEED: 0.035,
    CORE_DRIFT: 0.10,
    CORE_ATTRACT: 1.05,
    CORE_REPEL: 0.26,
    CORE_SOFTEN: 0.0018,     // 特異点回避
    CORE_SHAPE_RESP: 0.14,   // 粒子量で膜が変形

    // ===== Rendering（白飛び防止・深み） =====
    BG_ALPHA: 0.065,         // 残像（低いほど長い）
    GLOW_GLOBAL: 0.64,
    GLOW_CORE: 0.55,         // 核の発光を抑える（白飛び防止）
    GLOW_PARTICLE: 0.75,

    // トーンマップ（真っ白化しない）
    EXPOSURE: 1.0,
    HIGHLIGHT_CLAMP: 0.82,   // 0..1（小さいほど白が抑えられる）
    GAMMA: 1.18,

    // vignette / fog
    VIGNETTE: 0.55,
    FOG: 0.18,

    // ===== Auto quality =====
    AUTO_QUALITY: true,
    QUALITY_DOWN_STEP: 0.88, // 重ければ粒子を減らす
    QUALITY_UP_STEP: 1.03,   // 余裕があれば戻す
    QUALITY_CHECK_SEC: 1.2,

    // ===== UI =====
    RESET_SETTLE_SEC: 0.25,
  };

  window.CFG = CFG;
})();
