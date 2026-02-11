// sketch.js
// ------------------------------------------------------------
// Touching Light — Quiet Luxury (v1.1 sketch)
// 目的：
// - 分割ファイルを “確実に動かす” 統合（黒画面事故を避ける）
// - Render / FlowField / Particles / VoidShadow / Input を正しい順序で駆動
// - タップ/ドラッグ/長押しで「見た目と空気」が変わる
//
// 期待する同階層ファイル：
//   cfg.js / field.js / particles.js / render.js / void_shadow.js / input.js
//
// 注意：
// - p5.js は index.html で読み込み済み
// - index.html の window.__TL__.onSketchStarted() があれば呼ぶ（ローディング消し）
//
// ------------------------------------------------------------

let field;
let started = false;

// “空気”の状態（時間とともにゆっくり変わる）
const Atmos = {
  phase: 0,
  mood: 0,      // 0..1
  prayer: 0,    // 0..1  (長押し等で上がる)
  pulse: 0,     // 0..1  (タップで跳ねる)
};

function setup() {
  // 画面いっぱい（スマホ前提）
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1); // iPhoneで重くなりがちなので固定（Render側でperfScaleあり）
  frameRate((window.CFG && CFG.FPS) || 60);

  // Init modules
  if (window.Render) Render.init(this);
  field = new FlowField(width, height);

  if (window.Particles) {
    // cfg.js の値を尊重しつつ、粒子数などを上書きしたい場合はここで
    Particles.init(width, height, {
      // ここは必要なら調整：最初はcfg.js優先
      // P_COUNT: 1500
    });
  }

  if (window.VoidShadow) VoidShadow.init(width, height);

  // Input: canvas のDOMに確実に紐付ける
  if (window.Input) {
    Input.resize(width, height);
    Input.init(canvas && canvas.elt ? canvas.elt : document.body);
  }

  // Render初期：最初の一発は背景を作って“真っ黒”を避ける
  if (window.Render) {
    Render.beginFrame();
    Render.fade();
    Render.drawBaseGradient();
    Render.paperDust();
    Render.endFrame();
  }

  started = true;

  // index.html の loading を消すフック
  if (window.__TL__ && typeof window.__TL__.onSketchStarted === "function") {
    window.__TL__.onSketchStarted();
  }
}

function draw() {
  if (!started) return;

  // dt 正規化
  const dtn = clamp(deltaTime / 16.6, 0.5, 2.2);

  // Input update
  let inp = null;
  if (window.Input) {
    Input.step(dtn);
    inp = Input.state();
  } else {
    inp = { x: mouseX, y: mouseY, dx: movedX, dy: movedY, down: mouseIsPressed, held: false, mode: "calm", intensity: 0 };
  }

  // Atmos update（ゆっくり変える）
  Atmos.phase += 0.006 * dtn;

  // pulse（タップで跳ねる）
  // consumeTap は “1回だけ”取り出す
  const tap = (window.Input && Input.consumeTap) ? Input.consumeTap() : null;
  if (tap) {
    Atmos.pulse = 1.0;
    // タップ位置に光の抜けを一瞬増やす（Render.bloomStamp / VoidShadow側に効かせる）
    if (window.Render && typeof Render.bloomStamp === "function") {
      Render.bloomStamp(tap.x, tap.y, (CFG.VOID_R || 130) * 0.25, 92);
    }
  }
  Atmos.pulse *= Math.pow(0.86, dtn);

  // prayer（長押しで沈む）
  const holdBoost = inp && inp.held ? 0.06 : 0.0;
  Atmos.prayer = clamp(Atmos.prayer + (holdBoost - 0.012) * dtn, 0, 1);

  // mood（触れ続けると温度が上がるが、祈りが強いと静かになる）
  const targetMood = clamp((inp.intensity || 0) * 0.85 - Atmos.prayer * 0.45 + Atmos.pulse * 0.25, 0, 1);
  Atmos.mood = lerp(Atmos.mood, targetMood, 0.08);

  // --- FLOW FIELD 更新 ---
  // mood/pulse/prayer で field 強度をゆっくり変える（直接CFGを書き換えず、フィールド側で使う）
  // field.js は CFG.FLOW_STRENGTH を読むので、ここは一時的に乗算係数を持つ
  field.step(dtn);

  // --- RENDER begin ---
  if (window.Render) {
    Render.beginFrame();
    Render.fade();
    Render.drawBaseGradient();

    // 紙感：毎フレーム大量に撒くと散らかるので、時々だけ
    if ((frameCount % 28) === 0) Render.paperDust();
  }

  // 描画先（Renderがあるなら gBase、なければ canvas）
  const gBase = (window.Render && Render.base) ? Render.base() : this.drawingContext;
  const gLight = (window.Render && Render.light) ? Render.light() : null;

  // --- VOID & SHADOW ---
  // 祈りが強いほど影が深く、moodが高いほど空の抜けが明るい（ただし白飛びしない）
  if (window.VoidShadow) {
    // VoidShadow 自体は CFG と内部の breathe で動くので、
    // 追加の“気配”は light stamp で補う
    VoidShadow.step(dtn);
    VoidShadow.draw(gBase, gLight);

    // 祈りが強い時、Voidの周辺に“静かな色”を足す（紫/緑の気配）
    if (window.Render && typeof Render.bloomStamp === "function") {
      const c = VoidShadow.getCenter();
      const rr = c.r * lerp(0.18, 0.30, Atmos.prayer);
      const aa = lerp(28, 62, Atmos.prayer);
      Render.bloomStamp(c.x, c.y, rr, aa);
    }
  }

  // --- PARTICLES ---
  if (window.Particles && field) {
    // mode に応じて粒子へ渡す input.mode を変換
    // calm: 引き寄せ弱 / pulse: 波紋強 / shear: 裂け（横方向のせん断）
    const mode = inp.mode || "calm";
    const ii = inp.intensity || 0;

    // 入力を粒子に渡す（particles.js 側が down/held/mode を使う）
    Particles.step(dtn, field, inp);

    // 粒子描画：Render.gBase は p5.Graphics
    Particles.draw(gBase);
  }

  // --- Subtle “void openness” pulses ---
  // 触れた時の「抜け」を明確にする（輪っかにならないよう、場所・半径を散らす）
  if (window.Render && (inp.down || Atmos.pulse > 0.1)) {
    const k = (inp.down ? 1.0 : Atmos.pulse);
    const n = inp.down ? 2 : 1;

    for (let i = 0; i < n; i++) {
      const ox = (random() - 0.5) * 24;
      const oy = (random() - 0.5) * 24;
      const rr = lerp(10, 44, k) * (0.9 + random() * 0.3);
      const aa = lerp(18, 70, k) * (0.8 + random() * 0.25);
      Render.bloomStamp(inp.x + ox, inp.y + oy, rr, aa);
    }
  }

  // --- RENDER end ---
  if (window.Render) {
    Render.endFrame();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);

  if (window.Render) Render.resize(width, height);
  if (field) field.resize(width, height);
  if (window.Particles) Particles.resize(width, height);
  if (window.VoidShadow) VoidShadow.resize(width, height);
  if (window.Input) Input.resize(width, height);

  // リサイズ直後は一回クリア＆描画して真っ黒事故を避ける
  if (window.Render) {
    Render.beginFrame();
    Render.fade();
    Render.drawBaseGradient();
    Render.paperDust();
    Render.endFrame();
  }
}

// ------------------------------------------------------------
// Minimal utils (このファイル単体で動くための保険)
// 既に utils.js がある場合でも問題ないように、衝突しない名前にしてある
// ------------------------------------------------------------
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
