// input.js
// iOS Safari でも確実に反応する入力層（pointer/touch 両対応）
// 依存: none（ただし window.__toast があれば通知に使う）

(function () {
  const toast = (msg) => (window.__toast ? window.__toast(msg) : console.log(msg));

  // 共有入力状態（他ファイルが参照できるように window.INPUT に置く）
  const INPUT = {
    down: false,
    moved: false,
    longPress: false,

    // 正規化座標 [0..1]
    x: 0.5,
    y: 0.5,

    // 速度（正規化）
    vx: 0,
    vy: 0,

    // 画素座標
    px: 0,
    py: 0,

    // canvas情報
    cw: 0,
    ch: 0,
    dpr: 1,

    // gesture
    pinch: false,
    pinchScale: 1,
    pinchCenterX: 0.5,
    pinchCenterY: 0.5,

    // internal
    _lastT: 0,
    _lastX: 0.5,
    _lastY: 0.5,
    _lpTimer: null,
    _activeId: null,
  };

  window.INPUT = INPUT;

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function setFromClient(canvas, clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const nx = (clientX - r.left) / Math.max(1, r.width);
    const ny = (clientY - r.top) / Math.max(1, r.height);
    INPUT.x = clamp(nx, 0, 1);
    INPUT.y = clamp(ny, 0, 1);

    INPUT.cw = r.width;
    INPUT.ch = r.height;
    INPUT.px = INPUT.x * r.width;
    INPUT.py = INPUT.y * r.height;
  }

  function updateVelocity(now) {
    const dt = Math.max(1 / 240, Math.min(1 / 15, (now - INPUT._lastT) / 1000 || 1 / 60));
    INPUT.vx = (INPUT.x - INPUT._lastX) / dt;
    INPUT.vy = (INPUT.y - INPUT._lastY) / dt;

    INPUT._lastX = INPUT.x;
    INPUT._lastY = INPUT.y;
    INPUT._lastT = now;
  }

  function startLongPress() {
    clearTimeout(INPUT._lpTimer);
    INPUT.longPress = false;
    INPUT._lpTimer = setTimeout(() => {
      if (INPUT.down && !INPUT.moved) {
        INPUT.longPress = true;
        // 長押し開始を通知（任意で反応に使える）
        window.dispatchEvent(new CustomEvent("app:longpress", { detail: { x: INPUT.x, y: INPUT.y } }));
      }
    }, 320);
  }

  function endLongPress() {
    clearTimeout(INPUT._lpTimer);
    INPUT._lpTimer = null;
    INPUT.longPress = false;
  }

  function fire(kind) {
    // kind: "down" | "move" | "up"
    window.dispatchEvent(
      new CustomEvent("app:pointer", {
        detail: {
          kind,
          down: INPUT.down,
          moved: INPUT.moved,
          longPress: INPUT.longPress,
          x: INPUT.x,
          y: INPUT.y,
          vx: INPUT.vx,
          vy: INPUT.vy,
          px: INPUT.px,
          py: INPUT.py,
          pinch: INPUT.pinch,
          pinchScale: INPUT.pinchScale,
          pinchCenterX: INPUT.pinchCenterX,
          pinchCenterY: INPUT.pinchCenterY,
        },
      })
    );
  }

  function attach(canvas) {
    if (!canvas) throw new Error("canvas not found");
    // iOS向け：これが無いとスクロール扱いになったりする
    canvas.style.touchAction = "none";

    // pointer events（対応ブラウザ優先）
    const hasPointer = "PointerEvent" in window;

    function onDownPointer(e) {
      if (INPUT._activeId !== null) return;
      INPUT._activeId = e.pointerId ?? "p";
      INPUT.down = true;
      INPUT.moved = false;

      setFromClient(canvas, e.clientX, e.clientY);
      const now = performance.now();
      INPUT._lastT = now;
      INPUT._lastX = INPUT.x;
      INPUT._lastY = INPUT.y;
      updateVelocity(now);

      startLongPress();
      fire("down");

      // iOS Safariでのゴースト挙動防止
      try { e.preventDefault(); } catch {}
    }

    function onMovePointer(e) {
      if (INPUT._activeId !== (e.pointerId ?? "p")) return;
      if (!INPUT.down) return;

      setFromClient(canvas, e.clientX, e.clientY);
      const now = performance.now();
      updateVelocity(now);

      // 少しでも動いたら長押し解除扱い
      if (Math.abs(INPUT.vx) + Math.abs(INPUT.vy) > 0.5) INPUT.moved = true;
      if (INPUT.moved) INPUT.longPress = false;

      fire("move");
      try { e.preventDefault(); } catch {}
    }

    function onUpPointer(e) {
      if (INPUT._activeId !== (e.pointerId ?? "p")) return;
      INPUT.down = false;
      INPUT._activeId = null;
      endLongPress();
      fire("up");
      try { e.preventDefault(); } catch {}
    }

    // touch fallback（Safariでpointerが微妙な時の保険）
    function dist(t1, t2) {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    }
    let pinchStartD = 0;

    function onTouchStart(e) {
      if (!e.touches || e.touches.length === 0) return;
      INPUT.down = true;
      INPUT.moved = false;

      if (e.touches.length === 1) {
        const t = e.touches[0];
        setFromClient(canvas, t.clientX, t.clientY);
        const now = performance.now();
        INPUT._lastT = now;
        INPUT._lastX = INPUT.x;
        INPUT._lastY = INPUT.y;
        updateVelocity(now);

        INPUT.pinch = false;
        INPUT.pinchScale = 1;
        startLongPress();
        fire("down");
      } else if (e.touches.length >= 2) {
        // pinch
        INPUT.pinch = true;
        pinchStartD = dist(e.touches[0], e.touches[1]) || 1;
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setFromClient(canvas, cx, cy);
        INPUT.pinchCenterX = INPUT.x;
        INPUT.pinchCenterY = INPUT.y;
        INPUT.pinchScale = 1;
        endLongPress();
        fire("down");
      }

      e.preventDefault();
    }

    function onTouchMove(e) {
      if (!e.touches || e.touches.length === 0) return;

      if (e.touches.length === 1) {
        const t = e.touches[0];
        setFromClient(canvas, t.clientX, t.clientY);
        const now = performance.now();
        updateVelocity(now);

        if (Math.abs(INPUT.vx) + Math.abs(INPUT.vy) > 0.5) INPUT.moved = true;
        if (INPUT.moved) INPUT.longPress = false;

        INPUT.pinch = false;
        INPUT.pinchScale = 1;
        fire("move");
      } else if (e.touches.length >= 2) {
        INPUT.pinch = true;
        const d = dist(e.touches[0], e.touches[1]) || 1;
        INPUT.pinchScale = clamp(d / (pinchStartD || d), 0.6, 2.2);

        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        setFromClient(canvas, cx, cy);
        INPUT.pinchCenterX = INPUT.x;
        INPUT.pinchCenterY = INPUT.y;

        fire("move");
      }

      e.preventDefault();
    }

    function onTouchEnd(e) {
      if (e.touches && e.touches.length > 0) {
        // まだ残ってる指がある
        return;
      }
      INPUT.down = false;
      INPUT.pinch = false;
      INPUT.pinchScale = 1;
      endLongPress();
      fire("up");
      e.preventDefault();
    }

    // 登録（重要：passive:false）
    if (hasPointer) {
      canvas.addEventListener("pointerdown", onDownPointer, { passive: false });
      window.addEventListener("pointermove", onMovePointer, { passive: false });
      window.addEventListener("pointerup", onUpPointer, { passive: false });
      window.addEventListener("pointercancel", onUpPointer, { passive: false });
    }

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });

    // デバッグ用：入力が生きてるか
    toast("input: attached");

    return function detach() {
      if (hasPointer) {
        canvas.removeEventListener("pointerdown", onDownPointer);
        window.removeEventListener("pointermove", onMovePointer);
        window.removeEventListener("pointerup", onUpPointer);
        window.removeEventListener("pointercancel", onUpPointer);
      }
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
      canvas.removeEventListener("touchcancel", onTouchEnd);
    };
  }

  // 既存コードが createApp を期待してそうなので、互換の入口を用意
  // - sketch.js 側が createApp() を呼ばない構造でも、ここで自動attachします
  function createApp() {
    const canvas = document.getElementById("c");
    attach(canvas);
    return { INPUT };
  }

  window.createApp = window.createApp || createApp;

  // 自動起動（既存の起動順に依存しない）
  // sketch.js が後から来ても、INPUT は常に更新され続けます。
  window.addEventListener("DOMContentLoaded", () => {
    try {
      const canvas = document.getElementById("c");
      if (canvas) attach(canvas);
    } catch (e) {
      toast("input attach failed: " + (e?.message || e));
    }
  });
})();
