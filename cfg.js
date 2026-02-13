// cfg.js
// ------------------------------------------------------------
// Touching Light — Quiet Luxury
// 目標：白飛びしにくい、黒が“頑張れ”と言わない、粒子は静かな層。
// ------------------------------------------------------------
(() => {
  const CFG = {
    // 画面 / 解像度
    DPR_MAX: 2,          // iPhoneでも重くしすぎない
    FPS_TARGET: 60,
    PERF_TARGET_MS: 16.6,

    // 背景（void + dusty）
    BG_BASE: "#05070d",
    BG_VIGNETTE: 0.72,   // 周辺減光
    BG_GRAIN: 0.055,     // ざらつき
    BG_SCRATCH: 0.018,   // かすれ線

    // “触れる光”（大きな光核）
    LIGHT_CORE_RADIUS: 0.27, // 短辺比
    LIGHT_CORE_SOFT: 0.92,   // ぼかし係数
    LIGHT_CORE_ALPHA: 0.95,
    LIGHT_RING_COUNT: 6,     // 層（リング）
    LIGHT_RING_STEP: 0.06,
    LIGHT_RING_ALPHA: 0.12,

    // 粒子（層）
    P_COUNT: 900,
    P_SIZE_MIN: 0.6,
    P_SIZE_MAX: 2.4,
    P_ALPHA_MIN: 0.02,
    P_ALPHA_MAX: 0.12,

    // 流れ場
    FIELD_SCALE: 0.0018,
    FIELD_SPEED: 0.85,
    FIELD_WARP: 0.55,

    // 触れたときの反応
    TOUCH_PULL: 0.95,     // 引力
    TOUCH_SWIRL: 0.42,    // 旋回
    TOUCH_RADIUS: 0.22,   // 短辺比
    TOUCH_IMPULSE: 1.2,

    // 露出・白飛び対策（重要）
    HIGHLIGHT_CLAMP: 0.88, // これ以上の加算を抑える（擬似）
    BLOOM_STRENGTH: 0.55,
    BLOOM_RADIUS: 0.22,    // 短辺比

    // 保存
    EXPORT_SCALE: 2,       // 画像保存倍率
    EXPORT_BG_SAFE: true,  // 背景を必ず塗る
  };

  window.CFG = CFG;
})();
