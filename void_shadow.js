// void_shadow.js
// ------------------------------------------------------------
// Void + Long Shadow (v1.1)
// 目的：
// - “円”を主役にしない：光の抜け＝空の余白の形としてVoidを作る
// - 長い影：地上に落ちるが、人ではなく「何か分からない」存在感
// - 筆致：にじみ/かすれ/欠けた輪郭、層としての影
//
// 依存：CFG（cfg.js） / Render（render.js）※あれば bloomStamp を呼ぶ
//
// API:
//   VoidShadow.init(w,h)
//   VoidShadow.resize(w,h)
//   VoidShadow.step(dt)
//   VoidShadow.draw(gBase, gLight?)   // gLight は任意
//   VoidShadow.getCenter()            // {x,y,r}
//
// ------------------------------------------------------------

(function () {
  const TAU = Math.PI * 2;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // lightweight hash noise
  const fract = (x) => x - Math.floor(x);
  const hash = (x) => fract(Math.sin(x) * 43758.5453123);
  const hash2 = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);

  const vnoise2 = (x, y) => {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = x0 + 1, y1 = y0 + 1;
    const sx = x - x0, sy = y - y0;

    const n00 = hash2(x0, y0);
    const n10 = hash2(x1, y0);
    const n01 = hash2(x0, y1);
    const n11 = hash2(x1, y1);

    const ux = sx * sx * (3 - 2 * sx);
    const uy = sy * sy * (3 - 2 * sy);

    const ix0 = lerp(n00, n10, ux);
    const ix1 = lerp(n01, n11, ux);
    return lerp(ix0, ix1, uy);
  };

  // ------------------------------------------------------------
  // VoidShadow object
  // ------------------------------------------------------------
  function VS() {
    this.w = 0; this.h = 0;
    this.cx = 0; this.cy = 0;
    this.r = 130;

    this.t = 0;
    this.phase = 0;

    // cache for shape points
    this.pts = [];
    this.pts2 = [];
  }

  VS.prototype.init = function (w, h) {
    this.resize(w, h);
    this.t = 0;
    this.phase = hash(w * 0.001 + h * 0.002) * 1000;
  };

  VS.prototype.resize = function (w, h) {
    this.w = w; this.h = h;
    // “左上の白塊”が気になる → 中心は少しだけ左上寄り、ただし寄せすぎない
    this.cx = w * 0.46;
    this.cy = h * 0.37;

    const vr = (window.CFG && CFG.VOID_R) || 130;
    this.r = vr;
  };

  VS.prototype.step = function (dt) {
    const dtn = dt ? clamp(dt, 0.5, 2.0) : 1.0;
    this.t += 0.0105 * dtn;
  };

  // “円”ではなく「空の抜け」の輪郭を作る（ノイズで欠け/にじみ）
  VS.prototype._buildVoidContour = function (count, warp, warp2) {
    const pts = this.pts;
    const pts2 = this.pts2;
    pts.length = 0;
    pts2.length = 0;

    const r0 = this.r;
    const t = this.t + this.phase;

    // 輪郭の“欠け”を作る帯（=余白の抜け）
    const gapA = (t * 0.22) % TAU;
    const gapW = 0.55; // 欠け幅（ラジアン）
    const gapB = gapA + gapW;

    for (let i = 0; i < count; i++) {
      const a = (i / count) * TAU;

      // 欠け判定：完全に消すのではなく「薄くなる」→筆致っぽい
      let gap = 0.0;
      if (a > gapA && a < gapB) gap = 1.0;
      // wrap-around
      if (gapB > TAU && a < (gapB - TAU)) gap = 1.0;
      const gapSoft = smoothstep(1.0, 0.0, Math.abs((a - gapA) / gapW)); // 端ほど薄く

      // ノイズで輪郭を歪ませる（円をやめる）
      const n1 = vnoise2(Math.cos(a) * 1.7 + t * 0.8, Math.sin(a) * 1.7 + t * 0.8);
      const n2 = vnoise2(Math.cos(a) * 3.1 + 22.0 + t * 0.35, Math.sin(a) * 3.1 + 7.0 + t * 0.35);

      // 歪み量（強すぎると“怪物”になるので上品に）
      const bulge = (n1 - 0.5) * warp + (n2 - 0.5) * warp2;

      // 欠け帯では半径を減らし、さらにノイズで“薄膜”にする
      const gapPull = gap * (0.20 + 0.10 * (n2));
      const rr = r0 * (1 + bulge) * (1 - gapPull);

      const x = this.cx + Math.cos(a) * rr;
      const y = this.cy + Math.sin(a) * rr;

      pts.push([x, y, 1 - gap * 0.7 * (0.6 + 0.4 * gapSoft)]);

      // 内側のもう1輪郭（薄い膜）
      const rr2 = r0 * 0.72 * (1 + bulge * 0.7) * (1 - gapPull * 1.25);
      const x2 = this.cx + Math.cos(a) * rr2;
      const y2 = this.cy + Math.sin(a) * rr2;
      pts2.push([x2, y2, 1 - gap * 0.85]);
    }
  };

  // 長い影の“芯”となる方向（固定にせず、ゆっくり揺らす）
  VS.prototype._shadowDir = function () {
    const t = this.t + this.phase;
    // 下方向をベースに、少し右へ・時々左へ揺れる
    const ang = (Math.PI * 0.54) + Math.sin(t * 0.27) * 0.10 + Math.sin(t * 0.09) * 0.06;
    return { x: Math.cos(ang), y: Math.sin(ang) };
  };

  VS.prototype.draw = function (gBase, gLight) {
    const cfg = window.CFG || {};
    const t = this.t + this.phase;

    // 1) 輪郭生成（“空の抜け”）
    const warp = cfg.VOID_WARP ?? 0.13;
    const warp2 = (cfg.VOID_WARP ?? 0.13) * 0.65;
    const count = 96;
    this._buildVoidContour(count, warp, warp2);

    // 2) 空の抜け（中心の余白）を作る：暗い“穴”ではなく、微妙に明るい“空気”
    //    → 余白が「抜け」として見える
    const coreBreathe = (cfg.VOID_BREATHE ?? 0.16);
    const raise = (cfg.VOID_RAISE ?? 0.46);
    const breathe = 0.5 + 0.5 * Math.sin(t * 0.85);
    const lift = raise * (0.78 + 0.22 * breathe);

    gBase.push();
    gBase.noStroke();

    // 余白のベース：深い群青の“薄い明度”
    // これが「黒い穴」じゃなく「光が抜けた空」になる
    const baseA = 26 + lift * 40; // 26-66
    gBase.fill(12, 16, 34, baseA);
    this._fillShape(gBase, this.pts);

    // 余白の膜（内側）：さらに薄く
    gBase.fill(16, 20, 44, (baseA * 0.55));
    this._fillShape(gBase, this.pts2);

    gBase.pop();

    // 3) 輪郭の“筆致”（かすれ）：線を連続にしない
    gBase.push();
    gBase.noFill();
    gBase.strokeCap(gBase.ROUND);
    gBase.strokeJoin(gBase.ROUND);

    // 外縁：薄い白（真っ白にしない）
    gBase.stroke(242, 246, 252, 32);
    gBase.strokeWeight(1.2);
    this._strokeSketchy(gBase, this.pts, 0.18);

    // 内縁：さらに薄い
    gBase.stroke(235, 240, 250, 22);
    gBase.strokeWeight(0.9);
    this._strokeSketchy(gBase, this.pts2, 0.22);

    gBase.pop();

    // 4) 長い影（地上）：中心“そのもの”からではなく、輪郭の一部から伸びる
    //    → 「何かわからないもの」の影になる
    const dir = this._shadowDir();
    const shLen = (cfg.SH_LEN ?? 0.92);
    const maxLen = Math.min(this.h * shLen, this.h * 0.98);

    // 影の始点を “欠け帯の反対側” に寄せる（祈り/抜けの反対に重み）
    const anchorA = ((t * 0.22) % TAU) + Math.PI; // 欠けの反対
    const ax = this.cx + Math.cos(anchorA) * (this.r * 0.86);
    const ay = this.cy + Math.sin(anchorA) * (this.r * 0.86);

    // 影は層で描く：芯→周縁→かすれ
    const layers = cfg.VOID_LAYERS ?? 12;
    const alphaBase = (cfg.SH_ALPHA ?? 84);

    gBase.push();
    gBase.noFill();
    gBase.strokeCap(gBase.ROUND);
    gBase.strokeJoin(gBase.ROUND);

    for (let k = 0; k < layers; k++) {
      const kk = k / Math.max(1, layers - 1);

      // 影の幅：上は太く、下へ細る（でも不明瞭）
      const w0 = (cfg.SH_W0 ?? 280);
      const w1 = (cfg.SH_W1 ?? 56);
      const sw = lerp(w0, w1, kk) * (0.85 + 0.30 * (vnoise2(kk * 3.0 + t, 2.7)));

      // 影の濃さ：芯は少し濃いが、全体は上品に
      const a = alphaBase * (1 - kk) * (0.55 + 0.45 * (vnoise2(kk * 2.0 + 9.0, t * 0.3)));

      // 影の位置：ゆらぎ（にじみ/剥離）
      const bend = (vnoise2(kk * 2.8 + t * 0.8, 11.0) - 0.5) * 0.38;
      const ddx = dir.x * maxLen * kk + (-dir.y) * bend * 120;
      const ddy = dir.y * maxLen * kk + ( dir.x) * bend * 120;

      // “筋”を作りすぎず、帯として不確かに
      gBase.stroke(0, 0, 0, a);
      gBase.strokeWeight(Math.max(1.0, sw * 0.028));

      // 一筆のように描く（でもところどころ途切れる）
      this._shadowStroke(gBase, ax, ay, ax + ddx, ay + ddy, sw, a, kk, t);
    }

    gBase.pop();

    // 5) Light pass（発光）：Render があれば bloomStamp を使う（白飛び防止）
    if (window.Render && typeof Render.bloomStamp === "function") {
      const r = this.r * 0.55; // “白塊”を小さめに
      const alpha = 88 * (0.70 + 0.30 * breathe);
      Render.bloomStamp(this.cx, this.cy, r, alpha);
    } else if (gLight) {
      // fallback：light buffer に薄く描く
      gLight.push();
      gLight.noStroke();
      gLight.fill(245, 248, 255, 18);
      gLight.circle(this.cx, this.cy, this.r * 0.55);
      gLight.pop();
    }
  };

  // shape fill with per-vertex alpha (aFactor) by splitting into bands
  VS.prototype._fillShape = function (g, pts) {
    // まとめて塗りたいが alpha が点ごとに違うため、ここでは単一塗り。
    // aFactor は輪郭の“欠け”用。欠け部分は stroke 側で薄くするので fill は一定。
    g.beginShape();
    for (let i = 0; i < pts.length; i++) {
      g.vertex(pts[i][0], pts[i][1]);
    }
    g.endShape(g.CLOSE);
  };

  // sketchy stroke: 不完全な輪郭（かすれ/欠け）
  VS.prototype._strokeSketchy = function (g, pts, skipProb) {
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i];
      const p1 = pts[(i + 1) % n];

      // 欠け帯ではスキップ率を上げる
      const aFactor = p0[2] ?? 1;
      const sp = skipProb + (1 - aFactor) * 0.38;

      if (Math.random() < sp) continue;

      // わずかに“手ぶれ”
      const jx = (Math.random() - 0.5) * 0.8;
      const jy = (Math.random() - 0.5) * 0.8;

      g.line(p0[0] + jx, p0[1] + jy, p1[0] - jx, p1[1] - jy);
    }
  };

  // shadow stroke: 帯としての影（端がはっきりしない）
  VS.prototype._shadowStroke = function (g, x0, y0, x1, y1, width, a, kk, t) {
    const segs = 10;
    let px = x0, py = y0;

    for (let s = 1; s <= segs; s++) {
      const u = s / segs;

      // 中心線
      let x = lerp(x0, x1, u);
      let y = lerp(y0, y1, u);

      // 影の揺らぎ（にじみ）
      const n = vnoise2(u * 3.0 + 20.0, t * 0.2 + kk * 5.0);
      const side = (n - 0.5) * width * 0.10;

      // 方向に直交した揺らぎ
      const dx = x1 - x0, dy = y1 - y0;
      const d = Math.hypot(dx, dy) + 1e-6;
      const nx = -dy / d;
      const ny = dx / d;

      x += nx * side;
      y += ny * side;

      // 途切れ（“何かわからない影”）
      const gap = (vnoise2(u * 7.0 + kk * 3.0, t * 0.35) > 0.72);
      if (!gap) {
        g.line(px, py, x, y);
      }

      px = x; py = y;
    }
  };

  VS.prototype.getCenter = function () {
    return { x: this.cx, y: this.cy, r: this.r };
  };

  // ------------------------------------------------------------
  // Public
  // ------------------------------------------------------------
  const inst = new VS();

  window.VoidShadow = {
    init: (w, h) => inst.init(w, h),
    resize: (w, h) => inst.resize(w, h),
    step: (dt) => inst.step(dt),
    draw: (gBase, gLight) => inst.draw(gBase, gLight),
    getCenter: () => inst.getCenter(),
    _inst: inst,
  };
})();
