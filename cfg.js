// cfg.js
// ------------------------------------------------------------
// Touching Light — Quiet Luxury (v1.1 cfg)
// 目的：
// - “白飛び(中央の白がデカすぎる)”を抑えつつ、奥行きと層（10段）を強化
// - 10段階の粒子ランクを「見た目/挙動」で差別化（サイズ/速度/残像/慣性）
// - iPhoneでも破綻しにくい（負荷スケールの余地、強い値の上限）
// ------------------------------------------------------------

const CFG = {
  // ===== Runtime / Performance =====
  PD: 1,              // 実効ピクセル密度（端末負荷が重い時は 0.75 などへ下げてもOK）
  FPS: 60,

  // ===== Flow field =====
  CELL: 40,
  FLOW_TIME: 0.020,
  FLOW_SCALE: 0.0020,
  FLOW_STRENGTH: 0.85,

  // ===== Void (中心光核) =====
  // “デカい白玉”を抑える：基準半径を小さめにし、揺らぎも控えめに
  VOID_R: 130,
  VOID_R_MIN: 95,
  VOID_R_MAX: 190,
  VOID_BREATHE: 0.16,
  VOID_WARP: 0.13,

  // 立ち上がりの強さ（白飛び原因になりやすいので上限を下げる）
  VOID_RAISE: 0.46,
  VOID_RAISE_BREATHE: 0.30,

  // 影の層（“空洞の温度”の層感）
  VOID_LAYERS: 12,

  // ===== Void Shadow / Ground =====
  SH_LEN: 0.92,
  SH_ALPHA: 84,
  SH_W0: 280,
  SH_W1: 56,
  SH_GAPS: 0.22,
  SH_ERODE: 0.62,
  SH_BRANCHES: 8,

  GROUND_STEP: 20,
  GROUND_ALPHA: 36,

  // ===== Particles =====
  P_INIT: 520,
  P_CAP: 2100,

  // ランク（層）数：10段階
  RANKS: 10,

  // 既存互換（他ファイルがこの値を直接使っていてもOK）
  P_SIZE_MIN: 1,
  P_SIZE_MAX: 4,
  P_ALPHA_MIN: 10,
  P_ALPHA_MAX: 70,
  P_INERTIA_MIN: 0.85,
  P_INERTIA_MAX: 0.98,
  P_SPEED_MIN: 0.60,
  P_SPEED_MAX: 1.40,

  // 10段階の「段差」を明確にするためのプロファイル
  // rank: 0(最も繊細/奥) → 9(最も強い/手前)
  // 他ファイル側で CFG.RANK_PROFILE[rank] を使えるように追加
  RANK_PROFILE: [
    // sizeMin,sizeMax, alphaMin,alphaMax, speedMin,speedMax, inertiaMin,inertiaMax, tail
    { s0: 0.70, s1: 1.40, a0: 6,  a1: 18, v0: 0.35, v1: 0.60, i0: 0.92, i1: 0.985, tail: 10 },
    { s0: 0.80, s1: 1.55, a0: 7,  a1: 20, v0: 0.38, v1: 0.66, i0: 0.91, i1: 0.984, tail: 10 },
    { s0: 0.95, s1: 1.75, a0: 8,  a1: 24, v0: 0.42, v1: 0.72, i0: 0.90, i1: 0.983, tail: 9  },
    { s0: 1.05, s1: 1.95, a0: 9,  a1: 28, v0: 0.46, v1: 0.80, i0: 0.89, i1: 0.982, tail: 9  },
    { s0: 1.20, s1: 2.15, a0: 10, a1: 34, v0: 0.52, v1: 0.92, i0: 0.88, i1: 0.981, tail: 8  },
    { s0: 1.35, s1: 2.35, a0: 12, a1: 40, v0: 0.58, v1: 1.05, i0: 0.87, i1: 0.979, tail: 8  },
    { s0: 1.55, s1: 2.55, a0: 14, a1: 46, v0: 0.66, v1: 1.18, i0: 0.86, i1: 0.977, tail: 7  },
    { s0: 1.75, s1: 2.85, a0: 16, a1: 54, v0: 0.74, v1: 1.30, i0: 0.85, i1: 0.975, tail: 7  },
    { s0: 2.05, s1: 3.20, a0: 18, a1: 64, v0: 0.82, v1: 1.42, i0: 0.84, i1: 0.972, tail: 6  },
    { s0: 2.40, s1: 3.80, a0: 20, a1: 72, v0: 0.90, v1: 1.55, i0: 0.83, i1: 0.968, tail: 6  },
  ],

  // 互換：既存コードが TAIL_RANK を使っていても破綻しない
  TAIL_RANK: 6,

  // ===== Color hints (滲む緑・紫) =====
  // “白黒に、微量の緑/紫が沈殿する”方向
  HINT_GREEN: 0.14,
  HINT_PURPLE: 0.11,

  // 白飛び対策：光のアルファ上限（重要）
  LIGHT_ALPHA_CAP: 95,

  // ===== Texture (紙感) =====
  PAPER_STRONG_ALPHA: 32,
  PAPER_SOFT_ALPHA: 11,
  PAPER_DOTS_STRONG: 320,
  PAPER_DOTS_SOFT: 130,
  PAPER_DOT_ALPHA_MIN: 7,
  PAPER_DOT_ALPHA_MAX: 18,

  // ===== Bloom (白いにじみ) =====
  // “数を増やすより、控えめに長く残す”ほうが高級感が出やすい
  BLOOM_LIFE: 72,
  BLOOM_R_BASE: 34,
  BLOOM_R_GAIN: 64,
  BLOOM_ALPHA_BASE: 78,
  BLOOM_CAP: 16,

  // ===== Memory field (触った痕跡) =====
  MEM_FORCE: 1.45,
  MEM_DECAY: 0.986,
  MEM_DECAY_PRAY: 0.993,
  HOLD_MS: 900,

  // ===== Edge handling =====
  EDGE_RELOCATE_PAD: 40,

  // ===== Auto performance scaler =====
  PERF_CHECK_EVERY: 60,
  PERF_TARGET_MS: 16.6,
  PERF_DOWN_TH: 1.20,
  PERF_UP_TH: 0.82,
  PERF_SCALE_MIN: 0.55,
  PERF_SCALE_MAX: 1.00,
  PERF_DOWN_RATE: 0.92,
  PERF_UP_RATE: 1.04,

  // ===== Interaction =====
  TAP_SPAWN_ADD: 60,
  TAP_SPAWN_JITTER: 20,

  // ===== Debug =====
  SHOW_DEBUG: false,
};

// 参照しやすいようにグローバルに
window.CFG = CFG;

// 事故防止：値の改変を避けたい場合は freeze（必要なら外してOK）
try { Object.freeze(CFG); } catch(e) {}
