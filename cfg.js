// cfg.js
// ------------------------------------------------------------
// Touching Light — Quiet Luxury
// 目的：iPhoneでも破綻しない範囲で「微細」「粒径分布」「繊細な揺らぎ」を強化
// ------------------------------------------------------------

const CFG = {
  // Canvas / runtime
  FPS: 60,
  PD_MAX: 2,                 // iPhone高DPIの負荷対策
  BG: "#05070d",

  // 粒子総数（端末性能で自動調整されます）
  N_BASE: 5200,              // ←増やすと密度アップ（重ければ下げる）
  N_MIN: 1800,
  N_MAX: 9000,

  // 粒径分布：小が多い + たまに大
  // sizes are in "world px" (before PD)
  SIZE: {
    SMALL_MIN: 0.55,
    SMALL_MAX: 1.35,
    MID_MIN: 1.4,
    MID_MAX: 2.8,
    BIG_MIN: 3.0,
    BIG_MAX: 6.0,
    // 出現比率（合計1.0）
    RATIO_SMALL: 0.82,
    RATIO_MID: 0.15,
    RATIO_BIG: 0.03,
  },

  // 粒子の「微細な動き」：サブステップで滑らかに、ノイズで繊細に
  MOTION: {
    SUBSTEPS: 2,           // 2〜3で滑らか（重いなら1）
    SPEED: 0.55,           // 全体の流速
    JITTER: 0.16,          // 微小なランダム揺らぎ
    DAMP: 0.965,           // 減衰（小さくすると勢いが出る）
    WRAP_MARGIN: 40,       // 画面外ラップ余白
  },

  // フローフィールド（場）
  FIELD: {
    SCALE: 0.00155,        // 小さいほどゆったり、大きいほど細かく曲がる
    FBM_OCT: 4,
    FBM_GAIN: 0.52,
    FBM_LAC: 2.05,
    CURL: 1.15,            // 回転感（上げると渦っぽい）
    DRIFT: 0.016,          // 時間変化
  },

  // “光の膜”/触れた時の反応
  TOUCH: {
    RADIUS: 120,           // 影響半径
    PULL: 0.75,            // 引力
    SWIRL: 0.85,           // 渦
    PRESS_BOOST: 1.35,     // 長押しで強める
    FADE: 0.90,            // 触れ効果の残り方
  },

  // レンダリング（質感）
  RENDER: {
    CLEAR_ALPHA: 0.08,        // 小さいほど残像が強い（0.06〜0.12推奨）
    GRAIN: 0.06,              // 背景の粒状感
    ADDITIVE: true,           // 加算合成（光っぽい）
    DOT_ALPHA: 0.62,          // 粒子の基本不透明度
    DOT_SOFT: 0.55,           // ぼかし（大きいほど柔らかい）
    BLOOM: 0.30,              // 光のにじみ
    VIGNETTE: 0.55,           // 周辺減光
  },

  // パフォーマンスの自動調整
  PERF: {
    TARGET_MS: 16.6,        // 60fps
    ADAPT_RATE: 0.06,       // 粒子数調整の強さ
    MIN_SCALE: 0.55,        // 粒子数スケール下限
    MAX_SCALE: 1.25,        // 粒子数スケール上限
  }
};
