// cfg.js
// Touching Light — Quiet Luxury
// 目的：iPhone Safariでも破綻しない、軽量で深みのある粒子＋核＋流れ場

(() => {
  "use strict";

  const CFG = {
    // Canvas / Perf
    FPS_HINT: 60,
    DPR_MAX: 2.0,          // iPhoneで過剰DPRは重いので上限
    CLEAR_ALPHA: 0.075,    // 残像（小さいほど残る/層になる）
    BG_GRAIN: 0.05,        // 背景の粒状感
    BG_VIGNETTE: 0.28,     // 周辺減光

    // Particles
    PARTICLE_COUNT_BASE: 5200, // iPhoneでも動く上限寄り（端末で自動調整）
    PARTICLE_COUNT_MUL: 1.20,  // ユーザー要望：1.2倍くらい
    SIZE_MIN: 0.35,
    SIZE_MAX: 2.4,           // 大小混在（中心は硬く、周縁は霧）
    SIZE_BIAS: 0.82,         // 1に近いほど小粒多め
    OPACITY_MIN: 0.03,
    OPACITY_MAX: 0.22,
    SPEED_LIMIT: 2.4,

    // Flow Field (低解像度の速度グリッド)
    FIELD_CELL: 26,          // 小さいほど精密だが重い
    FIELD_DAMP: 0.94,        // 速度減衰（層が残る）
    FIELD_INJECT: 0.55,      // 入力で場に彫る強さ
    FIELD_SWIRL: 0.45,       // うねりの強さ
    FIELD_CORE_PULL: 0.25,   // 核に寄る基調

    // Cores (2〜3個がゆっくり近づいて合体して1つへ)
    CORE_COUNT: 3,
    CORE_MERGE_DIST: 90,
    CORE_DRIFT: 0.18,        // ふわっと漂う
    CORE_ATTRACT: 1.15,      // 粒子を引き寄せる
    CORE_RADIUS_BASE: 26,    // 光の核のサイズ
    CORE_RADIUS_GAIN: 0.018, // 粒子量（密度）で変形感

    // Interaction
    TAP_IMPULSE: 1.0,        // タップで微細なうねり
    DRAG_STRENGTH: 1.0,      // ドラッグで流れを彫る
    LONGPRESS_MS: 260,       // 長押し判定
    GATHER_STRENGTH: 1.35,   // 長押し=集める
    HIT_RADIUS: 140,         // 触れた影響範囲

    // Color / Light
    TINT_CORE: [230, 240, 255],  // 中心の冷たい光
    TINT_FOG: [200, 210, 220],   // 周縁の霧
  };

  // export
  window.CFG = CFG;
})();
