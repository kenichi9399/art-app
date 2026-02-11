// render.js
// -------------------------------------------------------
// Touching Light — Quiet Luxury / Rendering Pipeline
// 目的：
// - “黒が物質になる”紙/地上/影/光の多層合成
// - 文字で「余白」「影」と書くのではなく、レイヤーとして反映させる
// - 端末差で破綻しにくい（自動軽量化と適度なフェード）
// レイヤー：
// 1) gPaper  : 紙/壁/フレスコの質感（黒の物質感）
// 2) gGround : 地上の沈殿（緑の気配）
// 3) gInk    : 筆致/擦れ（線の観察痕）
// 4) gShadow : 長い影（意味）
// 5) gLight  : 粒子/抜け/ブルーム（息）
// -------------------------------------------------------

let gPaper, gInk, gLight, gShadow, gGround, gUI;
let blooms = [];

/**
 * initLayers
 */
function initLayers(w, h) {
  gPaper  = createGraphics(w, h);
  gInk    = createGraphics(w, h);
  gLight  = createGraphics(w, h);
  gShadow = createGraphics(w, h);
  gGround = createGraphics(w, h);
  gUI     = createGraphics(w, h);

  for (const g of [gPaper, gInk, gLight, gShadow, gGround, gUI]) {
    g.pixelDensity(CFG.PD);
    g.clear();
  }
}

/**
 * paintPaper
 * - 紙/土壁の“黒の物質感”
 * - 強め(初回)と、弱め(時々更新)の2モード
 */
function paintPaper(w, h, strong) {
  gPaper.noStroke();

  const a = strong ? CFG.PAPER_STRONG_ALPHA : CFG.PAPER_SOFT_ALPHA;

  // 大きめの濃淡グラデ（黒がただの黒にならない）
  for (let k = 0; k < 20; k++) {
    const y = (k / 20) * h;
    const n = noise(k * 0.23, frameCount * 0.0018, 0.0001);
    const v = 10 + n * 26;
    gPaper.fill(v * 0.55, v * 0.75, v + 22, a);
    gPaper.rect(0, y, w, h / 20 + 1);
  }

  // 微細な粒（紙の繊維）
  const dots = strong ? CFG.PAPER_DOTS_STRONG : CFG.PAPER_DOTS_SOFT;
  for (let i = 0; i < dots; i++) {
    const x = random(w), y = random(h);
    const n = noise(x * 0.01, y * 0.01, frameCount * 0.01);
    const aa = (CFG.PAPER_DOT_ALPHA_MIN + n * (CFG.PAPER_DOT_ALPHA_MAX - CFG.PAPER_DOT_ALPHA_MIN)) * (strong ? 1.0 : 0.7);
    gPaper.fill(255, 255, 255, aa);
    gPaper.rect(x, y, 1, 1);
  }

  // 擦過痕（円弧の断片）— “資料感/拓本感”を薄く
  if (random() < 0.45) {
    gPaper.push();
    gPaper.translate(w * random(0.12, 0.88), h * random(0.12, 0.88));
    gPaper.rotate(random(-0.55, 0.55));
    gPaper.noFill();
    gPaper.stroke(255, 255, 255, strong ? 10 : 6);
    gPaper.strokeWeight(2);
    for (let i = 0; i < 6; i++) {
      gPaper.arc(0, 0, random(240, 640), random(50, 160), random(-1.0, 0.4), random(0.2, 1.5));
    }
    gPaper.pop();
  }
}

/**
 * drawGround
 * - 影が落ちる“地上”を沈殿として描く
 * - 緑は「生命の主張」ではなく「地上の気配」
 */
function drawGround(w, h, breathe, praying) {
  gGround.push();
  gGround.blendMode(BLEND);

  const len = h * CFG.SH_LEN * 0.96;
  const step = CFG.GROUND_STEP;

  for (let i = 0; i < len; i += step) {
    const k = i / len;

    const x = shadowRoot.x + (-sin(shadowRoot.ang)) * i;
    const y = shadowRoot.y + ( cos(shadowRoot.ang)) * i;

    // VOIDに近いほど地上も薄れる（上へ抜ける）
    const er = Math.max(0, 1 - dist(x, y, hole.x, hole.y) / (hole.r * 1.25));
    const keep = 1 - er * 0.78;
    if (keep <= 0.05) continue;

    const green = 18 + 26 * noise(k * 3.0, frameCount * 0.01);
    const a = CFG.GROUND_ALPHA * (1 - k) * (0.75 + breathe * 0.25) * keep * (praying ? 0.82 : 1.0);

    const ww = lerp(240, 70, k) * (0.8 + noise(k * 5.0, frameCount * 0.01) * 0.45);
    const hh = 10 + noise(k * 7.0, frameCount * 0.012) * 26;

    const sx = (noise(k * 9.0, frameCount * 0.01) - 0.5) * 36;
    const sy = (noise(k * 9.0 + 8.2, frameCount * 0.01) - 0.5) * 18;

    gGround.noStroke();
    gGround.fill(12, 18 + green, 18, a);
    gGround.ellipse(x + sx, y + sy, ww, hh);
  }

  gGround.pop();
}

/**
 * drawSparseInk
 * - 粒子の流れから “観察痕としての線” を薄く生成
 * - 祈り中は出しすぎない（澄みを優先）
 */
function drawSparseInk(w, h, breathe) {
  gInk.push();
  gInk.blendMode(BLEND);

  // perfScaleに応じて数を調整
  const n = Math.floor(140 * perfScale);

  for (let i = 0; i < n; i++) {
    const p = P[(random(P.length) | 0)];
    if (!p) continue;

    const f = sampleField(p.x, p.y);
    let vx = p.vx + f.vx * 0.7;
    let vy = p.vy + f.vy * 0.7;

    const sp2 = vx * vx + vy * vy;
    if (sp2 < 0.02) continue;

    const sp = Math.sqrt(sp2) + 1e-6;
    vx /= sp; vy /= sp;

    const L = 18 * (0.85 + breathe * 0.6);

    // 完璧な直線にならないよう、微揺れを入れる
    const x1 = p.x + (noise(p.n, frameCount * 0.02) - 0.5) * 6;
    const y1 = p.y + (noise(p.n + 3.3, frameCount * 0.02) - 0.5) * 6;
    const x2 = x1 - vx * L;
    const y2 = y1 - vy * L;

    gInk.stroke(10, 12, 18, 22);
    gInk.strokeWeight(1.5);
    gInk.line(x1, y1, x2, y2);
  }

  gInk.pop();
}

/**
 * spawnBloom
 * - タップ反応：光の“にじみ”を追加
 */
function spawnBloom(x, y, power) {
  blooms.push({
    x, y,
    t: 0,
    life: CFG.BLOOM_LIFE,
    r: CFG.BLOOM_R_BASE + power * CFG.BLOOM_R_GAIN,
    p: power
  });

  if (blooms.length > CFG.BLOOM_CAP) blooms.shift();
}

/**
 * drawBlooms
 * - 光レイヤーにブルームを描く
 */
function drawBlooms(w, h, breathe, praying) {
  gLight.push();
  gLight.blendMode(SCREEN);

  for (let i = blooms.length - 1; i >= 0; i--) {
    const b = blooms[i];
    b.t += 1;

    const k = b.t / b.life;
    const edge = Math.min(b.x, w - b.x, b.y, h - b.y);
    const edgeFade = clamp(edge / 140, 0.28, 1);

    let a = CFG.BLOOM_ALPHA_BASE * (1 - k) * (0.70 + b.p * 0.7) * (0.85 + breathe * 0.25) * edgeFade * (praying ? 1.05 : 1.0);
    a = exposureCap(a, CFG.LIGHT_ALPHA_CAP);

    const rr = b.r * (0.45 + 1.1 * k);

    gLight.noStroke();
    for (let j = 12; j >= 1; j--) {
      const u = j / 12;
      gLight.fill(230, 245, 255, a * (1 - u));
      gLight.ellipse(b.x, b.y, rr * u, rr * u * 1.05);
    }

    if (k >= 1) blooms.splice(i, 1);
  }

  gLight.pop();
}

/**
 * renderFrame
 * 1フレーム分の合成
 */
function renderFrame(w, h, breathe, praying, pCount) {
  // たまに紙を更新（物質感が“生きる”）
  if (frameCount % (60 * 7) === 3) paintPaper(w, h, false);

  // インク/光のフェード（蓄積しすぎると濁る）
  gInk.noStroke();
  gInk.fill(0, 0, 0, 10);
  gInk.rect(0, 0, w, h);

  gLight.noStroke();
  gLight.fill(0, 0, 0, praying ? 12 : 16);
  gLight.rect(0, 0, w, h);

  // 影・地上は毎フレーム作り直す
  gShadow.clear();
  gGround.clear();
  gUI.clear();

  // 地上・影・抜け・粒子
  drawGround(w, h, breathe, praying);
  drawShadow(gShadow, w, h, breathe, praying);
  drawVoid(gLight, w, h, breathe, praying);

  if (!praying && random() < 0.30) drawSparseInk(w, h, breathe);

  drawParticles(gLight, w, h, hole, breathe, praying, pCount);
  drawBlooms(w, h, breathe, praying);

  // ---- 合成順：黒の物質→地上→筆致→影→光 ----
  image(gPaper, 0, 0);
  image(gGround, 0, 0);
  image(gInk, 0, 0);
  image(gShadow, 0, 0);

  blendMode(SCREEN);
  image(gLight, 0, 0);
  blendMode(BLEND);

  // デバッグ表示（必要時）
  if (CFG.SHOW_DEBUG) {
    gUI.clear();
    gUI.noStroke();
    gUI.fill(255, 255, 255, 120);
    gUI.textSize(12);
    gUI.text(`perfScale:${perfScale.toFixed(2)}  particles:${pCount}/${P.length}`, 12, 20);
    image(gUI, 0, 0);
  }
}
