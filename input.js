// input.js
(() => {
  const U = window.U;

  const INPUT = (window.INPUT = {
    ready: false,

    // pointer state
    down: false,
    justDown: false,
    justUp: false,
    dragging: false,

    id: null,
    p: U.v2(0, 0),
    prev: U.v2(0, 0),
    v: U.v2(0, 0),

    downAt: 0,
    longPress: false,

    carve: U.v2(0, 0),

    // ✅ タップを「フレーム跨ぎで保持」する
    tapImpulse: 0,           // 0 or 1
    tapPos: U.v2(0, 0),      // タップ確定位置
    tapTime: 0,              // タップ確定時刻（保険）

    canvas: null,
  });

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect();
    return U.v2(e.clientX - r.left, e.clientY - r.top);
  }

  function onDown(e) {
    const c = INPUT.canvas;
    if (!c) return;

    if (e.cancelable) e.preventDefault();

    INPUT.down = true;
    INPUT.justDown = true;
    INPUT.justUp = false;
    INPUT.dragging = false;

    INPUT.id = e.pointerId ?? "mouse";
    INPUT.downAt = U.now();
    INPUT.longPress = false;

    const pos = getPos(e, c);
    INPUT.p = pos;
    INPUT.prev = U.v2(pos.x, pos.y);
    INPUT.v = U.v2(0, 0);
    INPUT.carve = U.v2(0, 0);

    try { c.setPointerCapture?.(e.pointerId); } catch {}
  }

  function onMove(e) {
    const c = INPUT.canvas;
    if (!c) return;

    if (e.cancelable) e.preventDefault();

    const pos = getPos(e, c);

    if (INPUT.down) {
      const dx = pos.x - INPUT.p.x;
      const dy = pos.y - INPUT.p.y;

      INPUT.prev = U.v2(INPUT.p.x, INPUT.p.y);
      INPUT.p = pos;
      INPUT.v = U.v2(dx, dy);
      INPUT.carve = U.v2(dx, dy);

      if (!INPUT.dragging) {
        if ((dx * dx + dy * dy) > 3.0) INPUT.dragging = true;
      }
    } else {
      INPUT.prev = U.v2(INPUT.p.x, INPUT.p.y);
      INPUT.p = pos;
      INPUT.v = U.v2(0, 0);
      INPUT.carve = U.v2(0, 0);
    }
  }

  function onUp(e) {
    const c = INPUT.canvas;
    if (!c) return;

    if (e.cancelable) e.preventDefault();

    const wasDown = INPUT.down;
    INPUT.down = false;
    INPUT.justUp = true;

    if (wasDown) {
      const held = U.now() - INPUT.downAt;

      // down中の移動量（ドラッグ判定）
      // ※ drag中ならタップにしない
      if (held < 260 && !INPUT.dragging) {
        // ✅ “タップ確定”：次のフレームで必ず拾えるよう保持
        INPUT.tapImpulse = 1;
        INPUT.tapPos = U.v2(INPUT.p.x, INPUT.p.y);
        INPUT.tapTime = U.now();
      }
    }

    INPUT.dragging = false;
    INPUT.id = null;
  }

  INPUT.tick = function tick() {
    // 長押し判定
    if (INPUT.down) {
      const held = U.now() - INPUT.downAt;
      if (!INPUT.longPress && held >= window.CFG.LONG_PRESS_MS) {
        INPUT.longPress = true;
      }
    } else {
      INPUT.longPress = false;
    }

    // justDown/justUpは1フレームで落とす
    INPUT.justDown = false;
    INPUT.justUp = false;

    // ✅ tapImpulse はここで消さない（sketchが消費する）
  };

  INPUT.consumeTap = function consumeTap() {
    INPUT.tapImpulse = 0;
  };

  INPUT.attach = function attach(canvas) {
    INPUT.canvas = canvas;
    INPUT.ready = true;

    canvas.style.touchAction = "none";

    canvas.addEventListener("pointerdown", onDown, { passive: false });
    canvas.addEventListener("pointermove", onMove, { passive: false });
    canvas.addEventListener("pointerup", onUp, { passive: false });
    canvas.addEventListener("pointercancel", onUp, { passive: false });

    // ページ側のスクロール奪取を抑止（保険）
    document.addEventListener(
      "touchmove",
      (e) => { if (e.cancelable) e.preventDefault(); },
      { passive: false }
    );
  };
})();
