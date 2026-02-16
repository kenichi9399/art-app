;(() => {
  const CFG = {
    // ===== Canvas / Performance =====
    FPS_CAP: 60,
    DPR_MAX: 1.25,           // iPhoneで重くなりにくい上限
    CLEAR_ALPHA: 0.10,       // “層”を残す（小さいほど長く残る）

    // ===== Particles =====
    COUNT_BASE: 1500,        // 基本粒子数
    COUNT_MULT: 1.20,        // 要望：1.2倍
    R_MIN: 0.35,             // 小さい粒（霧）
    R_MAX: 2.2,              // 大きい粒（硬い粒）
    R_HARD_CENTER_BIAS: 0.55,// 中心は硬い粒が混ざる比率
    SPEED_BASE: 0.55,        // 全体の漂い
    SPEED_DETAIL: 1.35,      // 細かい動き（カクつきにくい範囲で）
    DRAG: 0.985,             // 速度減衰

    // ===== Core (核) =====
    CORE_COUNT: 3,           // 2〜3個（ここは3固定で開始）
    CORE_MERGE_DIST: 34,     // 合体距離（px基準）
    CORE_MERGE_SPEED: 0.025, // 合体の“ゆっくり感”
    CORE_WANDER: 0.20,       // ふわ漂い
    CORE_GLOW: 1.0,

    // ===== Interaction =====
    TAP_IMPULSE: 1.2,        // タップで波紋/寄り
    LONGPRESS_ATTRACT: 1.35, // 長押しで集める
    DRAG_CARVE: 1.25,        // ドラッグ方向に“流れ”を彫る強さ
    CARVE_DECAY: 0.965,      // 流れがしばらく残る（層）
    TOUCH_RADIUS: 110,       // 影響半径

    // ===== Visual =====
    BG: [5, 6, 8],
    GRAIN: 0.055,            // フィルム粒状感
    VIGNETTE: 0.40,          // 周辺減光
    WHITE_CLIP_GUARD: 0.82,  // 白飛び抑制（高いほど抑える）
  };

  window.CFG = CFG;
})();
