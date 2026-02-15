// input.js  (canvas専用・ボタンを潰さない・iOS Safari安定版)
(() => {
  const U = (window.U = window.U || {});
  if (typeof U.v2 !== "function") U.v2 = (x = 0, y = 0) => ({ x, y });

  const CFG = window.CFG || {};

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

  const canvas = document.getElementById("c");

  function setPos(x, y) {
    INPUT.prev.x = INPUT.p.x;
    INPUT.prev.y = INPUT.p.y;
    INPUT.p.x = x;
    INPUT.p.y = y;
    INPUT.v.x = INPUT.p.x - INPUT.prev.x;
    INPUT.v.y = INPUT.p.y - INPUT.prev.y;
  }

  function getTouchById(touches) {
    if (!touches || touches.length === 0) return null;
    if (INPUT.id == null) return touches[0];
    for (let i = 0; i < touches.length; i++) {
      const id = touches[i].identifier ?? "mouse";
      if (id === INPUT.id) return touches[i];
    }
    return touches[0];
  }

  function onDown(e) {
    // ✅ canvas上の入力だけ扱う（ボタン/パネルを潰さない）
    // （canvasにしかリスナー付けてないが、保険）
    if (e.target !== canvas) return;

    if (e.cancelable) e.preventDefault();

    const t = (e.touches && e.touches[0]) || e;
    INPUT.down = true;
    INPUT.dragging = false;
    INPUT.longPress = false;
    INPUT.id = t.identifier ?? "mouse";
    INPUT.tDown = U.now();
    INPUT.moved = 0;

    setPos(t.clientX, t.clientY);
  }

  function onMove(e) {
    if (!INPUT.down) return;
    if (e.target !== canvas) return;

    if (e.cancelable) e.preventDefault();

    let t = null;
    if (e.touches) t = getTouchById(e.touches);
    else t = e;

    const dx = t.clientX - INPUT.p.x;
    const dy = t.clientY - INPUT.p.y;
    INPUT.moved += Math.abs(dx) + Math.abs(dy);

    setPos(t.clientX, t.clientY);

    if (INPUT.moved > 6) INPUT.dragging = true;
  }

  function onUp(e) {
    if (e.target !== canvas) return;
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
    if (!INPUT.longPress && t > (CFG.LONGPRESS_MS ?? 240) && !INPUT.dragging) {
      INPUT.longPress = true;
    }
  };

  // ✅ iOS Safari: passive:false で preventDefault を有効に
  const opt = { passive: false };

  // ✅ canvasにだけ付ける（windowには付けない）
  canvas.addEventListener("touchstart", onDown, opt);
  canvas.addEventListener("touchmove", onMove, opt);
  canvas.addEventListener("touchend", onUp, opt);
  canvas.addEventListener("touchcancel", onUp, opt);

  canvas.addEventListener("mousedown", onDown, opt);
  window.addEventListener("mousemove", onMove, opt); // マウスは画面外に出るのでwindowで追う
  window.addEventListener("mouseup", onUp, opt);
})();
