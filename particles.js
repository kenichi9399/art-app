// particles.js
// -------------------------------------------------------
// Touching Light — Quiet Luxury / Particles
// 役割：
// - 空間の“微細な気配”を担う（黒を単なる黒にしない）
// - 10段階(ranks)で、粒径/速度/慣性/透明度/尾を分ける → 多様性
// - 「場の記憶(field)」「抜け(void)」に引かれて動く → 意味の一貫
// - 端の白飽和を避ける（edgeFade + exposureCap）
// -------------------------------------------------------

let P = [];
let perfScale = 1.0;   // 自動軽量化係数（0.55〜1.0）

/**
 * initParticles: 初期生成
 */
function initParticles(w, h) {
  P.length = 0;
  for (let i = 0; i < CFG.P_INIT; i++) {
    P.push(makeParticle(random(w), random(h)));
  }
}

/**
 * makeParticle: rankにより性格が変わる
 */
function makeParticle(x, y) {
  const rank = Math.floor(random(CFG.RANKS)); // 0..9

  const t = rank / (CFG.RANKS - 1);

  // 10段階：上位ほど粒が大きく、慣性が強く、速度係数が少し上がる
  const s = lerp01(CFG.P_SIZE_MIN,     CFG.P_SIZE_MAX,     t);
  const a = lerp01(CFG.P_ALPHA_MIN,    CFG.P_ALPHA_MAX,    t);
  const inertia = lerp01(CFG.P_INERTIA_MIN, CFG.P_INERTIA_MAX, t);
  const speedW  = lerp01(CFG.P_SPEED_MIN,   CFG.P_SPEED_MAX,   t);

  // 固有ノイズ用
  const n = random(100000);

  return {
    x, y,
    vx: random(-0.4, 0.4),
    vy: random(-0.4, 0.4),
    n,
    rank,
    s,
    a,
    inertia,
    speedW
  };
}

/**
 * stepParticles: 更新（perfScaleもここで更新）
 * 戻り値：描画対象数
 */
function stepParticles(w, h, hole, breathe, praying) {
  // ---- perf auto-scale ----
  if (frameCount % CFG.PERF_CHECK_EVERY === 0) {
    const ms = deltaTime;
    if (ms > CFG.PERF_TARGET_MS * CFG.PERF_DOWN_TH) {
      perfScale = Math.max(CFG.PERF_SCALE_MIN, perfScale * CFG.PERF_DOWN_RATE);
    } else if (ms < CFG.PERF_TARGET_MS * CFG.PERF_UP_TH) {
      perfScale = Math.min(CFG.PERF_SCALE_MAX, perfScale * CFG.PERF_UP_RATE);
    }
  }

  const dt = Math.min(deltaTime, 33) / 16.6667;
  const pCount = Math.floor(P.length * perfScale);

  for (let i = 0; i < pCount; i++) {
    stepParticle(P[i], w, h, hole, dt, breathe, praying);
  }

  return pCount;
}

/**
 * stepParticle: 1粒の更新
 */
function stepParticle(p, w, h, hole, dt, breathe, praying) {
  const t = frameCount * CFG.FLOW_TIME + p.n * 0.0004;

  // ノイズ流れ（基礎）
  let fx = (noise(p.x * CFG.FLOW_SCALE,      p.y * CFG.FLOW_SCALE,      t) - 0.5) * CFG.FLOW_STRENGTH;
  let fy = (noise(p.x * CFG.FLOW_SCALE + 50, p.y * CFG.FLOW_SCALE + 50, t) - 0.5) * CFG.FLOW_STRENGTH;

  // 場の記憶（ドラッグ）
  const f = sampleField(p.x, p.y);
  fx += f.vx;
  fy += f.vy;

  // 抜け（空）の近傍：上へ持ち上げる
  const d = dist(p.x, p.y, hole.x, hole.y);
  const inside = Math.max(0, 1 - d / (hole.r * 1.12));
  fy -= inside * (CFG.VOID_RAISE + breathe * CFG.VOID_RAISE_BREATHE);

  // 祈り中：全体が澄む（ノイズを抑え、上方向へ少し）
  if (praying) {
    fx *= 0.92;
    fy = fy * 0.92 - 0.08;
  }

  // ランクの速度係数
  const sp = dt * 1.08 * p.speedW;

  // 慣性
  p.vx = (p.vx + fx * sp) * p.inertia;
  p.vy = (p.vy + fy * sp) * p.inertia;

  p.x += p.vx;
  p.y += p.vy;

  // 端に溜まらないよう再配置（白飽和＆端密集対策）
  const pad = CFG.EDGE_RELOCATE_PAD;
  if (p.x < -pad || p.x > w + pad || p.y < -pad || p.y > h + pad) {
    p.x = random(w);
    p.y = random(h);
    p.vx = random(-0.6, 0.6);
    p.vy = random(-0.6, 0.6);
  }
}

/**
 * drawParticles: 光レイヤーへ描画
 */
function drawParticles(g, w, h, hole, breathe, praying, pCount) {
  g.push();
  g.blendMode(SCREEN);
  g.noStroke();

  for (let i = 0; i < pCount; i++) {
    const p = P[i];

    // 端で減光 → 白塊を抑える
    const e = edgeFade01(p.x, p.y, w, h);

    // 抜け近傍ブースト（澄みの中心）
    const d = dist(p.x, p.y, hole.x, hole.y);
    const boost = Math.max(0, 1 - d / (hole.r * 1.1));

    // rankに応じて緑/紫を“微量”に混ぜる
    const greenK  = (p.rank >= 5) ? CFG.HINT_GREEN  : 0.0;
    const purpleK = (p.rank >= 7) ? CFG.HINT_PURPLE : 0.0;

    // ベース色（青白）
    let rr = 206, gg = 232, bb = 255;

    // 地上の気配（緑）/ 遠層（紫）
    gg += greenK * 70;
    rr += purpleK * 55;
    bb -= purpleK * 60;

    // アルファ：呼吸 + 抜け中心 + 端減光
    let a = p.a * e * (0.62 + breathe * 0.30 + boost * 0.30) * (praying ? 1.02 : 1.0);

    // 白飽和対策：ソフトに上限圧縮
    a = exposureCap(a, CFG.LIGHT_ALPHA_CAP);

    // さらに保険で完全上限
    a = clamp(a, 0, CFG.LIGHT_ALPHA_CAP + 40);

    g.fill(rr, gg, bb, a);
    g.circle(p.x, p.y, p.s);

    // 上位ランクだけ尾（滑らかさの増幅）
    if (p.rank >= CFG.TAIL_RANK) {
      g.fill(rr, gg, bb, a * 0.18);
      g.circle(p.x - p.vx * 3.0, p.y - p.vy * 3.0, p.s * 2.7);
    }
  }

  // 初見の“黒事故”を避ける最低限の微光（最初の数フレームだけ）
  if (frameCount < 20) {
    g.fill(225, 245, 255, 55);
    for (let i = 0; i < 18; i++) g.circle(random(w), random(h), random(1, 3));
  }

  g.pop();
}

/**
 * spawnParticlesAround: タップ地点に粒子を追加（体感UP）
 */
function spawnParticlesAround(x, y, count) {
  const n = Math.max(0, count | 0);
  const j = CFG.TAP_SPAWN_JITTER;

  for (let i = 0; i < n; i++) {
    P.push(makeParticle(x + random(-j, j), y + random(-j, j)));
  }
  if (P.length > CFG.P_CAP) {
    P.splice(0, P.length - CFG.P_CAP);
  }
}
