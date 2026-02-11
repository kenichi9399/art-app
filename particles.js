// particles.js
// ------------------------------------------------------------
// Particles (v1.1)
// 目的：
// - “混ざりきらない層”を粒子側で作る（レイヤー別の運動/寿命/描画）
// - 中心(Void)の白飛びを抑えつつ、薄い膜・漂いを残す
// - スマホ向けに軽量（配列＋最小描画回数）
// API:
//   Particles.init(w, h, cfg?)
//   Particles.resize(w, h)
//   Particles.step(dt, field, input?)
//   Particles.draw(ctx)
// ------------------------------------------------------------

(function () {
  const TAU = Math.PI * 2;

  // ---- helpers ----
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  // lightweight RNG
  function RNG(seed) {
    this.s = seed >>> 0 || 1;
  }
  RNG.prototype.next = function () {
    // xorshift32
    let x = this.s;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.s = x >>> 0;
    return (this.s & 0xffffffff) / 0x100000000;
  };
  RNG.prototype.range = function (a, b) {
    return a + (b - a) * this.next();
  };
  RNG.prototype.pick = function (arr) {
    return arr[(arr.length * this.next()) | 0];
  };

  // ------------------------------------------------------------
  // Particle system
  // ------------------------------------------------------------
  function ParticleSystem() {
    this.w = 0;
    this.h = 0;
    this.cx = 0;
    this.cy = 0;

    this.cfg = null;
    this.rng = new RNG(1337);

    this.layers = [];
    this.total = 0;

    // packed arrays
    this.x = null;
    this.y = null;
    this.px = null;
    this.py = null;
    this.vx = null;
    this.vy = null;
    this.life = null;
    this.maxLife = null;
    this.layerId = null;

    // draw buffers (line segments)
    // render.js が別なら draw(ctx) だけで完結するように最小化
  }

  ParticleSystem.prototype._defaultCfg = function () {
    // 既存 CFG を尊重しつつ、無ければこの値
    const base = (window.CFG || {});
    return {
      // 粒子総数（スマホは控えめに）
      P_COUNT: base.P_COUNT ?? 1400,

      // 速度（fieldのmに掛ける）
      P_SPEED: base.P_SPEED ?? 1.0,

      // 摩擦（0.90-0.98くらい）
      P_DRAG: base.P_DRAG ?? 0.945,

      // “筆致”の長さ（線の追従）
      P_TRAIL: base.P_TRAIL ?? 0.72, // 0-1（高いほど残像）

      // 再生成（寿命）
      P_LIFE_MIN: base.P_LIFE_MIN ?? 80,
      P_LIFE_MAX: base.P_LIFE_MAX ?? 220,

      // Void（中心）
      VOID_R: base.VOID_R ?? 130,

      // 白飛び抑制（中心に近いほど描画を抑える）
      VOID_FADE: base.VOID_FADE ?? 0.75, // 0-1

      // タッチ影響（input が来る場合）
      TOUCH_POWER: base.TOUCH_POWER ?? 0.9,

      // レイヤー定義（“混ざりきらない層”の本体）
      // density（比率） / speedMul / alpha / width / lifeMul / jitter
      LAYERS: base.LAYERS ?? [
        // 低温：静か・太め・短い筆致（膜）
        { density: 0.36, speedMul: 0.75, alpha: 0.030, width: 1.25, lifeMul: 1.30, jitter: 0.12 },
        // 中温：主層
        { density: 0.44, speedMul: 1.00, alpha: 0.022, width: 0.95, lifeMul: 1.00, jitter: 0.18 },
        // 高温：微細・速い・光の粒
        { density: 0.20, speedMul: 1.35, alpha: 0.014, width: 0.70, lifeMul: 0.82, jitter: 0.24 },
      ],
    };
  };

  ParticleSystem.prototype.init = function (w, h, cfg) {
    this.cfg = Object.assign(this._defaultCfg(), cfg || {});
    this.resize(w, h);

    // layer allocations
    this.layers = this.cfg.LAYERS.slice();
    const targetN = this.cfg.P_COUNT | 0;
    this.total = Math.max(200, targetN);

    this.x = new Float32Array(this.total);
    this.y = new Float32Array(this.total);
    this.px = new Float32Array(this.total);
    this.py = new Float32Array(this.total);
    this.vx = new Float32Array(this.total);
    this.vy = new Float32Array(this.total);
    this.life = new Float32Array(this.total);
    this.maxLife = new Float32Array(this.total);
    this.layerId = new Uint8Array(this.total);

    // decide layer for each particle by density
    const cum = [];
    let s = 0;
    for (let i = 0; i < this.layers.length; i++) {
      s += this.layers[i].density;
      cum.push(s);
    }
    for (let i = 0; i < this.total; i++) {
      const r = this.rng.next() * s;
      let lid = 0;
      while (lid < cum.length && r > cum[lid]) lid++;
      lid = clamp(lid, 0, this.layers.length - 1);
      this.layerId[i] = lid;
      this._respawn(i, true);
    }
  };

  ParticleSystem.prototype.resize = function (w, h) {
    this.w = w;
    this.h = h;
    this.cx = w * 0.5;
    this.cy = h * 0.5;
  };

  ParticleSystem.prototype._respawn = function (i, hard) {
    const cfg = this.cfg;
    const lid = this.layerId[i];
    const L = this.layers[lid];

    // spawn は「外縁」or「Voidの縁（輪郭）」のどちらかに寄せる
    // → 層が“輪郭”として残りやすい
    const chooseRim = this.rng.next() < 0.55;
    let x, y;

    if (chooseRim) {
      // Void リム付近：静かな膜を作る（ただし中心白飛びを避ける）
      const r0 = cfg.VOID_R * this.rng.range(1.05, 1.55);
      const a = this.rng.range(0, TAU);
      x = this.cx + Math.cos(a) * r0 + this.rng.range(-18, 18);
      y = this.cy + Math.sin(a) * r0 + this.rng.range(-18, 18);
    } else {
      // edges
      const edge = (this.rng.next() * 4) | 0;
      if (edge === 0) { x = -10; y = this.rng.range(0, this.h); }
      else if (edge === 1) { x = this.w + 10; y = this.rng.range(0, this.h); }
      else if (edge === 2) { x = this.rng.range(0, this.w); y = -10; }
      else { x = this.rng.range(0, this.w); y = this.h + 10; }
    }

    // clamp to canvas area
    x = clamp(x, 0, this.w);
    y = clamp(y, 0, this.h);

    this.x[i] = x;
    this.y[i] = y;
    this.px[i] = x;
    this.py[i] = y;

    // velocities reset（hard respawn のときは完全初期化）
    if (hard) {
      this.vx[i] = this.rng.range(-0.3, 0.3);
      this.vy[i] = this.rng.range(-0.3, 0.3);
    } else {
      this.vx[i] *= 0.25;
      this.vy[i] *= 0.25;
    }

    const lifeBase = this.rng.range(cfg.P_LIFE_MIN, cfg.P_LIFE_MAX);
    const ml = lifeBase * (L.lifeMul || 1);
    this.maxLife[i] = ml;
    this.life[i] = ml * this.rng.range(0.35, 1.0);
  };

  ParticleSystem.prototype._voidFade = function (x, y) {
    // 中心に近いほど描画・速度を抑える（白飛び防止）
    const cfg = this.cfg;
    const dx = x - this.cx;
    const dy = y - this.cy;
    const d = Math.hypot(dx, dy);

    // r <= VOID_R は最も抑える、外へ行くほど回復
    const r0 = cfg.VOID_R * 0.85;
    const r1 = cfg.VOID_R * 2.0;
    const t = smoothstep(r0, r1, d);
    // t=0(中心寄り) -> 1(外側)
    return lerp(1 - cfg.VOID_FADE, 1.0, t);
  };

  ParticleSystem.prototype.step = function (dt, field, input) {
    const cfg = this.cfg;
    const drag = clamp(cfg.P_DRAG, 0.88, 0.99);
    const baseSpeed = cfg.P_SPEED;

    // input は任意（無ければ無視）
    // 想定: { x,y, dx,dy, down, mode } みたいな形でもOK。柔軟に扱う。
    const hasInput = input && isFinite(input.x) && isFinite(input.y);
    const ix = hasInput ? input.x : 0;
    const iy = hasInput ? input.y : 0;
    const idown = hasInput ? !!input.down : false;
    const idxx = hasInput && isFinite(input.dx) ? input.dx : 0;
    const idyy = hasInput && isFinite(input.dy) ? input.dy : 0;

    // dt（フレーム時間）をざっくり正規化
    const dtn = dt ? clamp(dt, 0.5, 2.0) : 1.0;

    for (let i = 0; i < this.total; i++) {
      let x = this.x[i];
      let y = this.y[i];
      let vx = this.vx[i];
      let vy = this.vy[i];

      // 寿命
      let life = this.life[i] - dtn;
      this.life[i] = life;

      if (life <= 0) {
        this._respawn(i, false);
        continue;
      }

      // 前位置（描画用）
      this.px[i] = x;
      this.py[i] = y;

      // flow
      const f = field.sample(x, y);
      const lid = this.layerId[i];
      const L = this.layers[lid];

      // “混ざりきらない”層：layer ごとに速度/ゆらぎ（jitter）を変える
      const jitter = (L.jitter || 0.0);
      const jx = (this.rng.next() - 0.5) * jitter;
      const jy = (this.rng.next() - 0.5) * jitter;

      // Void 付近フェード（中心での白飛び＆過密を抑える）
      const vfade = this._voidFade(x, y);

      // 速度合成：fieldベクトルを主に、前速度はdragで保持（筆致）
      const sp = baseSpeed * (L.speedMul || 1) * vfade;
      vx = vx * drag + (f.x + jx) * sp;
      vy = vy * drag + (f.y + jy) * sp;

      // 入力（触れ方によって“温度”が変わる）
      // - down しているとき、軽い「引き寄せ/押し出し」と、ドラッグ方向のスワールを付与
      if (hasInput && idown) {
        const dx = x - ix;
        const dy = y - iy;
        const d = Math.hypot(dx, dy) + 1e-6;
        const r = clamp(d / (cfg.VOID_R * 1.8), 0, 1);
        const att = (1 - r) * (cfg.TOUCH_POWER || 0.8);

        // radial（押し/引きは弱く）
        const rx = dx / d;
        const ry = dy / d;

        // tangential（ドラッグで方向性を出す）
        const tx = -ry;
        const ty = rx;

        // ドラッグ量が小さければ接線を抑える
        const dragMag = clamp(Math.hypot(idxx, idyy) / 18, 0, 1);

        const push = (input.mode === "push") ? 1 : -0.35; // デフォは“軽い吸い寄せ”
        vx += rx * att * push * 0.7;
        vy += ry * att * push * 0.7;

        vx += tx * att * (0.6 + 0.7 * dragMag) * (idxx >= 0 ? 1 : -1);
        vy += ty * att * (0.6 + 0.7 * dragMag) * (idxx >= 0 ? 1 : -1);
      }

      // 位置更新
      x += vx * dtn;
      y += vy * dtn;

      // 画面外→穏やかに再投入
      if (x < -40 || x > this.w + 40 || y < -40 || y > this.h + 40) {
        this._respawn(i, false);
        continue;
      }

      this.x[i] = x;
      this.y[i] = y;
      this.vx[i] = vx;
      this.vy[i] = vy;
    }
  };

  ParticleSystem.prototype.draw = function (ctx) {
    const cfg = this.cfg;

    // “残像”は render.js 側でフェード処理している可能性もあるので、
    // ここでは粒子線だけを薄く重ねる（過剰な加算で白飛びしないように）
    ctx.save();

    // ほんの少し明るくするが、基本は source-over
    // 作品の“膜”感を出したいときだけ screen を使う（alphaは低い）
    // render.js 側で合成しているなら、ここは source-over のままでもOK。
    ctx.globalCompositeOperation = "source-over";

    // レイヤー単位にまとめ描き（style切替コストを減らす）
    for (let lid = 0; lid < this.layers.length; lid++) {
      const L = this.layers[lid];
      const alpha = L.alpha ?? 0.02;
      const width = L.width ?? 1.0;

      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // 色は “白”固定だと白飛びしやすいので、薄い青白〜灰白で層を作る
      // ※色指定が嫌ならここを全部 "rgba(255,255,255,alpha)" にしてもOK
      let r = 240, g = 245, b = 255;         // base (cool)
      if (lid === 1) { r = 232; g = 238; b = 250; } // mid
      if (lid === 2) { r = 255; g = 255; b = 255; } // hot (but low alpha)

      ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;

      ctx.beginPath();

      for (let i = 0; i < this.total; i++) {
        if (this.layerId[i] !== lid) continue;

        const x0 = this.px[i];
        const y0 = this.py[i];
        const x1 = this.x[i];
        const y1 = this.y[i];

        // 線が短すぎるものは飛ばす（ノイズ過多防止）
        const dx = x1 - x0;
        const dy = y1 - y0;
        const d2 = dx * dx + dy * dy;
        if (d2 < 0.02) continue;

        // Void に近いほど描画をさらに抑える（中心白飛びの“最後の砦”）
        const vfade = this._voidFade(x1, y1);
        if (vfade < 0.38 && lid === 2) continue; // 高温層は中心を避ける

        // “筆致”：前位置から現在位置へ（render.js 側で残像を消してる想定）
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
      }

      ctx.stroke();

      // 膜っぽさが欲しい場合だけ、低温層をうっすら screen で重ねる
      if (lid === 0) {
        ctx.globalCompositeOperation = "screen";
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.55})`;
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }
    }

    ctx.restore();
  };

  // ------------------------------------------------------------
  // Public
  // ------------------------------------------------------------
  const sys = new ParticleSystem();

  window.Particles = {
    init: function (w, h, cfg) { sys.init(w, h, cfg); },
    resize: function (w, h) { sys.resize(w, h); },
    step: function (dt, field, input) { sys.step(dt, field, input); },
    draw: function (ctx) { sys.draw(ctx); },

    // もし外から調整したいとき用
    _sys: sys,
  };
})();
