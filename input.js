// input.js
(() => {
  const U = (window.U = window.U || {});
  if (typeof U.v2 !== "function") U.v2 = (x = 0, y = 0) => ({ x, y });

  const CFG = window.CFG;

  const INPUT = (window.INPUT = {
    down: false,
    dragging: false,
    longPress: false,
    id: null,
    p: U.v2(0, 0),
    prev: U.v2(0, 0),
    v: U.v2(0, 0),
    tDown: 0,
    moved: 0,
  });

  function setPos(e, x, y) {
    INPUT.prev.x = INPUT.p.x;
    INPUT.prev.y = INPUT.p.y;
    INPUT.p.x = x;
    INPUT.p.y = y;
    INPUT.v.x = INPUT.p.x - INPUT.prev.x;
    INPUT.v.y = INPUT.p.y - INPUT.prev.y;
  }

  function onDown(e) {
    // iOS Safariのスクロール/ズーム抑止
    if (e.cancelable) e.preventDefault();

    const t = (e.touches && e.touches[0]) || e;
    INPUT.down = true;
    INPUT.dragging = false;
    INPUT.longPress = false;
    INPUT.id = t.identifier ?? "mouse";
    INPUT.tDown = U.now();
    INPUT.moved = 0;

    setPos(e, t.clientX, t.clientY);
  }

  function onMove(e) {
    if (!INPUT.down) return;
    if (e.cancelable) e.preventDefault();

    let t = null;
    if (e.touches) {
      for (let i = 0; i < e.touches.length; i++) {
        if ((e.touches[i].identifier ?? "mouse") === INPUT.id) {
          t = e.touches[i];
          break;
        }
      }
      if (!t) t = e.touches[0];
    } else {
      t = e;
    }

    const dx = t.clientX - INPUT.p.x;
    const dy = t.clientY - INPUT.p.y;
    INPUT.moved += Math.abs(dx) + Math.abs(dy);

    setPos(e, t.clientX, t.clientY);

    if (INPUT.moved > 6) INPUT.dragging = true;
  }

  function onUp(e) {
    if (e.cancelable) e.preventDefault();
    INPUT.down = false;
    INPUT.dragging = false;
    INPUT.longPress = false;
    INPUT.id = null;
  }

  // long press判定（毎フレーム呼ぶ）
  INPUT.tick = function () {
    if (!INPUT.down) return;
    const t = U.now() - INPUT.tDown;
    if (!INPUT.longPress && t > (CFG?.LONGPRESS_MS ?? 240) && !INPUT.dragging) {
      INPUT.longPress = true;
    }
  };

  const opt = { passive: false };

  window.addEventListener("touchstart", onDown, opt);
  window.addEventListener("touchmove", onMove, opt);
  window.addEventListener("touchend", onUp, opt);
  window.addEventListener("touchcancel", onUp, opt);

  window.addEventListener("mousedown", onDown, opt);
  window.addEventListener("mousemove", onMove, opt);
  window.addEventListener("mouseup", onUp, opt);
})();
