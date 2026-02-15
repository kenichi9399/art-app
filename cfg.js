// cfg.js
// iPhoneでも破綻しない「上品な暗さ + 核 + 粒子」の設定

(() => {
  const CFG = (window.CFG = window.CFG || {});

  // iOSはDPRが高いほど重いので上限を持つ
  CFG.DPR_MAX = 2.0;

  // 粒子数（端末幅でスケール）
  CFG.P_BASE =2160;       // 基本粒子
  CFG.P_MAX  = 3200;       // 上限（重ければ勝手に抑える）

  // 粒径レンジ（「微細を増やす」）
  CFG.R_SMALL = [0.35, 1.2];
  CFG.R_MID   = [1.2, 2.4];
  CFG.R_BIG   = [2.8, 5.0];   // 大粒は少数だけ

  // 核（2〜3個→合体して1つ）
  CFG.CORE_COUNT = 3;
  CFG.CORE_MASS  = 1.0;
  CFG.CORE_MERGE_DIST = 34;    // px（画面座標）
  CFG.CORE_MERGE_SPEED = 0.08; // 近づき方（ゆっくり）

  // 入力
  CFG.TOUCH_RADIUS = 110;   // タップの影響半径
  CFG.DRAG_STRENGTH = 1.35; // ドラッグで流れを彫る強さ
  CFG.LONGPRESS_MS = 240;

  // 物理
  CFG.DT_MAX = 0.033;     // 30fps相当で上限
  CFG.FRICTION = 0.985;
  CFG.SWIRL = 0.35;       // 微渦（深み）

  // 描画（白飛び防止）
  CFG.BG_ALPHA = 0.08;    // 残像（小さいほど残像強い）
  CFG.GLOW = 0.55;        // 発光の強さ
  CFG.EXPOSURE = 0.85;    // 露光（下げると白飛び減）
})();
