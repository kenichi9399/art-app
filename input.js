// input.js
// ------------------------------------------------------------
// Input (v1.1)
// 目的：
// - タップ/ドラッグ/長押しで体験が明確に変わる
// - iOS Safari で確実に拾える（pointer/touch両対応）
// - “触れた痕跡”をシステムへ渡す（x,y,dx,dy,down,held,mode,intensity）
//
// 公開API:
//   Input.init(canvasElement?)
//   Input.resize(w,h)     // 任意（座標正規化に使う）
//   Input.step(dt)        // 内部の減衰（毎フレ）
//   Input.state()         // 現在状態を返す（ParticlesやFieldへ渡す）
//   Input.consumeTap()    // タップイベント（1回だけ欲しい場合）
//
// モード（2本指タップで循環）:
//   0: calm   - 静（撫でると鎮まる）
//   1: pulse  - 脈（タップで波が立つ）
//   2: shear  - 裂（長押しで密度/影が深くなる想定）
// ------------------------------------------------------------

(function () {
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  const S = {
    w: 1, h: 1,

    // pointer state
    x: 0, y: 0,
    px: 0, py: 0,
    dx: 0, dy: 0,
    vx: 0, vy: 0,

    down: false,
    held: false,

    // multi-touch
    touches: 0,

    // mode
    mode: 0, // 0 calm, 1 pulse, 2 shear

    // tap
    tap: false,
    tapX: 0,
    tapY: 0,

    // intensity (0..1)
    intensity: 0,

    // timers
    downMs: 0,
    lastTs: 0,

    // smoothing
    smooth: 0.38,

    // decay
    decayVel: 0.88,
    decayIntensity: 0.92,
  };

  function nowMs() { return (typeof performance !== "undefined" ? performance.now() : Date.now()); }

  function setPosFromEvent(e) {
    // iOS/モバイルで座標ズレを避ける
    const rect = (e.target && e.target.getBoundingClientRect) ? e.target.getBoundingClientRect() : null;

    let clientX, clientY;

    if (e.touches && e.touches.length) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      S.touches = e.touches.length;
    } else if (e.changedTouches && e.changedTouches.length) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
      S.touches = e.changedTouches.length;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
      S.touches = 1;
    }

    if (rect) {
      S.x = clamp(clientX - rect.left, 0, rect.width);
      S.y = clamp(clientY - rect.top, 0, rect.height);
    } else {
      S.x = clientX;
      S.y = clientY;
    }

    // 作品座標系（canvasがCSS拡大されている場合に備える）
    // width/height が設定されているなら正規化して戻す
    const rw = rect ? rect.width : S.w;
    const rh = rect ? rect.height : S.h;

    if (rw > 0 && rh > 0) {
      S.x = S.x * (S.w / rw);
      S.y = S.y * (S.h / rh);
    }
  }

  function updateDelta() {
    const dx = S.x - S.px;
    const dy = S.y - S.py;

    // smoothing（カクつき防止）
    S.dx = S.dx * (1 - S.smooth) + dx * S.smooth;
    S.dy = S.dy * (1 - S.smooth) + dy * S.smooth;

    // velocity（触感の勢い）
    S.vx = S.vx * (1 - S.smooth) + (S.dx) * S.smooth;
    S.vy = S.vy * (1 - S.smooth) + (S.dy) * S.smooth;

    S.px = S.x;
    S.py = S.y;
  }

  function setDown(flag) {
    if (flag && !S.down) {
      // down開始
      S.down = true;
      S.held = false;
      S.downMs = 0;
      // 初期化
      S.dx = 0; S.dy = 0; S.vx = 0; S.vy = 0;
      S.px = S.x; S.py = S.y;
      S.intensity = 0.22; // 触った瞬間に少し立ち上げ
    }
    if (!flag && S.down) {
      // up
      S.down = false;
      S.held = false;
      S.downMs = 0;
    }
  }

  // 2本指タップでモード循環
  function maybeToggleModeOnTwoFingerTap(e) {
    // touchstartで2本以上なら切り替え
    const touches = (e.touches && e.touches.length) ? e.touches.length : 0;
    if (touches >= 2) {
      S.mode = (S.mode + 1) % 3;
      // タップとしては扱わない（誤爆防止）
      S.tap = false;
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  function init(canvasEl) {
    // どれでも拾えるように window にもつけるが、基本は canvas に付ける
    const target = canvasEl || document.body;

    // iOSでスクロールを止める（重要）
    // canvas 側に CSS: touch-action:none があるとさらに良い
    const opt = { passive: false };

    // Touch
    target.addEventListener("touchstart", (e) => {
      if (maybeToggleModeOnTwoFingerTap(e)) { e.preventDefault(); return; }
      setPosFromEvent(e);
      setDown(true);
      // タップ候補
      S.tap = true;
      S.tapX = S.x; S.tapY = S.y;
      updateDelta();
      e.preventDefault();
    }, opt);

    target.addEventListener("touchmove", (e) => {
      setPosFromEvent(e);
      updateDelta();
      // 動いたらタップ候補を外す（誤タップ防止）
      const d = Math.hypot(S.dx, S.dy);
      if (d > 7) S.tap = false;
      e.preventDefault();
    }, opt);

    target.addEventListener("touchend", (e) => {
      // touchendは changedTouches で座標を拾う
      setPosFromEvent(e);
      updateDelta();
      setDown(false);
      e.preventDefault();
    }, opt);

    target.addEventListener("touchcancel", (e) => {
      setDown(false);
      e.preventDefault();
    }, opt);

    // Pointer (fallback for desktop)
    target.addEventListener("pointerdown", (e) => {
      setPosFromEvent(e);
      setDown(true);
      S.tap = true;
      S.tapX = S.x; S.tapY = S.y;
      updateDelta();
      e.preventDefault();
    }, opt);

    target.addEventListener("pointermove", (e) => {
      setPosFromEvent(e);
      updateDelta();
      const d = Math.hypot(S.dx, S.dy);
      if (d > 7) S.tap = false;
      e.preventDefault();
    }, opt);

    target.addEventListener("pointerup", (e) => {
      setPosFromEvent(e);
      updateDelta();
      setDown(false);
      e.preventDefault();
    }, opt);

    target.addEventListener("pointercancel", () => {
      setDown(false);
    }, opt);
  }

  // ------------------------------------------------------------
  // Step
  // ------------------------------------------------------------
  function step(dt) {
    const t = nowMs();
    if (!S.lastTs) S.lastTs = t;

    // dt（フレーム）補正
    const dtn = dt ? clamp(dt, 0.5, 2.5) : clamp((t - S.lastTs) / 16.6, 0.5, 2.5);
    S.lastTs = t;

    if (S.down) {
      S.downMs += 16.6 * dtn;

      // 長押し判定
      const holdMs = (window.CFG && CFG.HOLD_MS) || 900;
      if (!S.held && S.downMs >= holdMs) {
        S.held = true;
        // 長押しで強度を上げる（静かな“祈り”）
        S.intensity = clamp(S.intensity + 0.25, 0, 1);
      }

      // 触り続けている間は強度を緩く上げる
      const moveMag = clamp(Math.hypot(S.dx, S.dy) / 28, 0, 1);
      const add = (0.06 + 0.18 * moveMag) * dtn;

      // モード別：calm は上げすぎない、pulse は上がりやすい
      const m = S.mode;
      const k = (m === 0) ? 0.75 : (m === 1) ? 1.10 : 0.95;
      S.intensity = clamp(S.intensity + add * k, 0, 1);
    } else {
      // 離したら減衰（痕跡は残す）
      S.intensity *= Math.pow(S.decayIntensity, dtn);
    }

    // 速度はゆっくり減衰（余韻）
    S.vx *= Math.pow(S.decayVel, dtn);
    S.vy *= Math.pow(S.decayVel, dtn);
    S.dx *= Math.pow(0.86, dtn);
    S.dy *= Math.pow(0.86, dtn);
  }

  function state() {
    // mode を名前にして渡す（他側で扱いやすい）
    const modeName = (S.mode === 0) ? "calm" : (S.mode === 1) ? "pulse" : "shear";

    return {
      x: S.x,
      y: S.y,
      px: S.px,
      py: S.py,
      dx: S.dx,
      dy: S.dy,
      vx: S.vx,
      vy: S.vy,
      down: S.down,
      held: S.held,
      touches: S.touches,
      mode: modeName,
      intensity: S.intensity,
      // 長押し時間（必要なら）
      downMs: S.downMs,
    };
  }

  // タップを「1回だけ」取り出したい場合
  function consumeTap() {
    if (!S.tap) return null;
    // down→up の間に動かなかったものだけをタップとして確定
    // （touchend 直後は down=false なので、呼ぶ側はフレーム内で拾える）
    // ※より厳密にしたいなら、touchendでフラグ立てる設計でもOK
    const out = { x: S.tapX, y: S.tapY, mode: S.mode };
    S.tap = false;
    return out;
  }

  function resize(w, h) {
    S.w = Math.max(1, w);
    S.h = Math.max(1, h);
  }

  // ------------------------------------------------------------
  // Public
  // ------------------------------------------------------------
  window.Input = {
    init,
    resize,
    step,
    state,
    consumeTap,
    _S: S,
  };
})();
