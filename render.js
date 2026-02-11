// render.js
// ------------------------------------------------------------
// Render (v1.1)
// 目的：
// - “白飛び”を抑え、発光を「芯→縁の色→闇への減衰」で見せる
// - 残像(フェード)は黒で消すのではなく、深い群青で“呼吸”させる
// - 紙感/粒子は「沈殿」として薄く（散らかり防止）
// API:
//   Render.init(p5)
//   Render.resize(w,h)
//   Render.beginFrame()
//   Render.fade()            // 残像を少し消す
//   Render.drawBaseGradient()
//   Render.bloomStamp(x,y,r,alpha, tint?)
//   Render.paperDust()       // 軽い紙感
//   Render.endFrame()
// ------------------------------------------------------------

(function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;

  const Render = {
    p: null,
    w: 0,
    h: 0,

    // offscreen buffers
    gBase: null,   // base scene (particles + void + shadow)
    gLight: null,  // light pass (bloom / halos)

    // runtime state
    t: 0,
    perfScale: 1.0,
  };

  function ensureGraphics(p, w, h) {
    const s = Render.perfScale;
    const ww = Math.max(2, (w * s) | 0);
    const hh = Math.max(2, (h * s) | 0);

    if (!Render.gBase || Render.gBase.width !== ww || Render.gBase.height !== hh) {
      Render.gBase = p.createGraphics(ww, hh);
      Render.gBase.pixelDensity(1);
      Render.gBase.noSmooth();
    }
    if (!Render.gLight || Render.gLight.width !== ww || Render.gLight.height !== hh) {
      Render.gLight = p.createGraphics(ww, hh);
      Render.gLight.pixelDensity(1);
      Render.gLight.noSmooth();
    }

    Render.w = w;
    Render.h = h;
  }

  // ------------------------------------------------------------
  // Init / Resize
  // ------------------------------------------------------------
  Render.init = function (p) {
    this.p = p;
    this.perfScale = clamp((CFG && CFG.PERF_SCALE_MAX) || 1.0, 0.55, 1.0);
    ensureGraphics(p, p.width, p.height);
  };

  Render.resize = function (w, h) {
    if (!this.p) return;
    ensureGraphics(this.p, w, h);
  };

  // ------------------------------------------------------------
  // Frame lifecycle
  // ------------------------------------------------------------
  Render.beginFrame = function () {
    const p = this.p;
    if (!p) return;

    this.t += 1;

    // perf auto scale (任意：重いときに落とす)
    if (CFG && CFG.PERF_CHECK_EVERY && (this.t % CFG.PERF_CHECK_EVERY === 0)) {
      // p.deltaTime は ms
      const dt = p.deltaTime || 16.6;
      const target = CFG.PERF_TARGET_MS || 16.6;
      const downTh = CFG.PERF_DOWN_TH || 1.2;
      const upTh = CFG.PERF_UP_TH || 0.82;

      if (dt > target * downTh) {
        this.perfScale = clamp(this.perfScale * (CFG.PERF_DOWN_RATE || 0.92),
                               CFG.PERF_SCALE_MIN || 0.55,
                               CFG.PERF_SCALE_MAX || 1.0);
        ensureGraphics(p, p.width, p.height);
      } else if (dt < target * upTh) {
        this.perfScale = clamp(this.perfScale * (CFG.PERF_UP_RATE || 1.04),
                               CFG.PERF_SCALE_MIN || 0.55,
                               CFG.PERF_SCALE_MAX || 1.0);
        ensureGraphics(p, p.width, p.height);
      }
    }
  };

  // 余白（空の抜け）を “黒”で消さない。深い群青で薄く呼吸させる。
  Render.fade = function () {
    const p = this.p;
    const g = this.gBase;
    if (!p || !g) return;

    const breathe = 0.008 + 0.010 * (0.5 + 0.5 * Math.sin(this.t * 0.012));
    const a = 0.06 + breathe; // 残像の消え具合（小さいほど残る）

    // 深い群青〜黒緑
    g.noStroke();
    g.fill(5, 7, 13, a * 255);
    g.rect(0, 0, g.width, g.height);

    // light pass も薄く消す（白飛びの蓄積防止）
    const gl = this.gLight;
    gl.noStroke();
    gl.fill(0, 0, 0, 0.22 * 255);
    gl.rect(0, 0, gl.width, gl.height);
  };

  // ------------------------------------------------------------
  // Background / paper
  // ------------------------------------------------------------
  Render.drawBaseGradient = function () {
    const p = this.p;
    const g = this.gBase;
    if (!p || !g) return;

    // すでに fade で塗っている前提なので、ここでは極薄のグラデ“だけ”
    // 余白を「暗い板」ではなく「空気」にする
    const ww = g.width, hh = g.height;

    g.push();
    g.noStroke();

    // 上左にわずかに明度、下右にわずかに紫
    // （白は増やさず、温度差を作る）
    for (let y = 0; y < hh; y += 4) {
      const t = y / hh;
      const r = lerp(6, 9, t);
      const gg = lerp(9, 10, t);
      const b = lerp(18, 24, t);
      const a = 12; // 超薄い
      g.fill(r, gg, b, a);
      g.rect(0, y, ww, 4);
    }

    // 斜めの紫の気配
    g.fill(160, 120, 255, 6);
    g.ellipse(ww * 0.75, hh * 0.72, ww * 0.92, hh * 0.78);

    g.pop();
  };

  // 紙感（粒）は “散らかり”になりやすいので、数を絞り、アルファも低めに
  Render.paperDust = function () {
    const p = this.p;
    const g = this.gBase;
    if (!p || !g) return;

    const strongN = (CFG && CFG.PAPER_DOTS_STRONG) || 320;
    const softN = (CFG && CFG.PAPER_DOTS_SOFT) || 130;

    g.push();
    g.noStroke();

    // 強い粒（少数）
    for (let i = 0; i < strongN; i++) {
      const x = p.random(g.width);
      const y = p.random(g.height);
      const a = p.random((CFG && CFG.PAPER_DOT_ALPHA_MIN) || 7, (CFG && CFG.PAPER_DOT_ALPHA_MAX) || 18);
      // 緑/紫の沈殿をほんの少しだけ混ぜる
      const t = p.random();
      if (t < ((CFG && CFG.HINT_GREEN) || 0.14)) {
        g.fill(90, 255, 170, a * 0.55);
      } else if (t < (((CFG && CFG.HINT_GREEN) || 0.14) + ((CFG && CFG.HINT_PURPLE) || 0.11))) {
        g.fill(170, 120, 255, a * 0.55);
      } else {
        g.fill(245, 248, 255, a * 0.45);
      }
      g.circle(x, y, p.random(0.5, 1.2));
    }

    // さらに薄い粒（極少数）
    for (let i = 0; i < softN; i++) {
      const x = p.random(g.width);
      const y = p.random(g.height);
      const a = p.random(4, 9);
      g.fill(240, 245, 255, a * 0.22);
      g.circle(x, y, p.random(0.4, 0.9));
    }

    g.pop();
  };

  // ------------------------------------------------------------
  // Bloom / Halo stamping (white blowout prevention)
  // ------------------------------------------------------------
  Render.bloomStamp = function (x, y, r, alpha, tint) {
    const p = this.p;
    const g = this.gLight;
    if (!p || !g) return;

    // scale to buffer coords
    const s = this.perfScale;
    const xx = x * s;
    const yy = y * s;

    // 白飛び防止：alphaの上限
    const cap = (CFG && CFG.LIGHT_ALPHA_CAP) || 95;
    const a0 = clamp(alpha, 0, cap);

    // 半径も上限（巨大化しすぎると“白玉”に見える）
    const rr = clamp(r, 6, 220) * s;

    // 色：芯は白に寄せつつ、縁に薄紫/薄緑を混ぜる
    const useTint = tint || null;
    const purp = [170, 120, 255];
    const green = [90, 255, 170];

    // 3層：core / mid / rim
    g.push();
    g.noStroke();
    g.blendMode(p.ADD); // light pass は加算（ただし上限で制御）

    // rim（紫）
    g.fill(purp[0], purp[1], purp[2], a0 * 0.22);
    g.circle(xx, yy, rr * 1.25);

    // rim2（緑は控えめ）
    g.fill(green[0], green[1], green[2], a0 * 0.14);
    g.circle(xx, yy, rr * 1.05);

    // mid（白に近いが、真っ白にしない）
    g.fill(245, 248, 255, a0 * 0.28);
    g.circle(xx, yy, rr * 0.78);

    // core（芯：白を抑える）
    g.fill(242, 246, 252, a0 * 0.32);
    g.circle(xx, yy, rr * 0.46);

    g.pop();
  };

  // ------------------------------------------------------------
  // Composite to main canvas
  // ------------------------------------------------------------
  Render.endFrame = function () {
    const p = this.p;
    if (!p) return;

    // main canvas に描画
    p.push();
    p.noSmooth();
    p.background(0);

    // base
    p.image(this.gBase, 0, 0, p.width, p.height);

    // light pass：screen で合成（ADDより白飛びしにくい）
    p.blendMode(p.SCREEN);
    p.image(this.gLight, 0, 0, p.width, p.height);
    p.blendMode(p.BLEND);

    p.pop();
  };

  // ------------------------------------------------------------
  // Accessors for other modules
  // ------------------------------------------------------------
  Render.base = function () { return this.gBase; };
  Render.light = function () { return this.gLight; };
  Render.scale = function () { return this.perfScale; };

  window.Render = Render;
})();
