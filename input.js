// input.js  (Pointer + Touch fallback, iOS friendly)

const Input = (() => {
  const state = {
    down: false,
    x: 0, y: 0,
    px: 0, py: 0,
    vx: 0, vy: 0,
    tDown: 0,
    longPress: false,
    id: null,
    // debug
    source: "none", // "pointer" | "touch"
  };

  let canvas = null;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  const getXYFromClient = (clientX, clientY) => {
    const r = canvas.getBoundingClientRect();
    const x = (clientX - r.left) / r.width;
    const y = (clientY - r.top) / r.height;
    return { x: clamp01(x), y: clamp01(y) };
  };

  const setDown = (x, y, source) => {
    state.down = true;
    state.longPress = false;
    state.tDown = U.now();
    state.source = source;

    state.px = state.x = x;
    state.py = state.y = y;
    state.vx = state.vy = 0;
  };

  const setMove = (x, y) => {
    const sx = CFG.INPUT.dragSmoothing;
    const nx = U.lerp(state.x, x, 1 - sx);
    const ny = U.lerp(state.y, y, 1 - sx);

    state.vx = nx - state.x;
    state.vy = ny - state.y;

    state.px = state.x;
    state.py = state.y;
    state.x = nx;
    state.y = ny;

    const held = (U.now() - state.tDown);
    state.longPress = held >= CFG.INPUT.longPressMs;
  };

  const setUp = () => {
    state.down = false;
    state.longPress = false;
    state.id = null;
    state.source = "none";
  };

  const attach = (c) => {
    canvas = c;

    // ===== Pointer Events (primary) =====
    const onPointerDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      state.id = e.pointerId;
      canvas.setPointerCapture?.(e.pointerId);

      const p = getXYFromClient(e.clientX, e.clientY);
      setDown(p.x, p.y, "pointer");

      e.preventDefault();
      e.stopPropagation();
    };

    const onPointerMove = (e) => {
      if (!state.down) return;
      if (state.id != null && e.pointerId !== state.id) return;

      const p = getXYFromClient(e.clientX, e.clientY);
      setMove(p.x, p.y);

      e.preventDefault();
      e.stopPropagation();
    };

    const onPointerUp = (e) => {
      if (state.id != null && e.pointerId !== state.id) return;
      setUp();
      e.preventDefault();
      e.stopPropagation();
    };

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", onPointerUp, { passive: false });
    canvas.addEventListener("pointercancel", onPointerUp, { passive: false });

    // ===== Touch Events (fallback) =====
    const onTouchStart = (e) => {
      // if pointer events already active, ignore touch to avoid double
      if (state.down && state.source === "pointer") return;

      const t = e.changedTouches[0];
      if (!t) return;
      const p = getXYFromClient(t.clientX, t.clientY);
      setDown(p.x, p.y, "touch");

      e.preventDefault();
      e.stopPropagation();
    };

    const onTouchMove = (e) => {
      if (!state.down) return;
      if (state.source !== "touch") return;

      const t = e.changedTouches[0];
      if (!t) return;
      const p = getXYFromClient(t.clientX, t.clientY);
      setMove(p.x, p.y);

      e.preventDefault();
      e.stopPropagation();
    };

    const onTouchEnd = (e) => {
      if (state.source !== "touch") return;
      setUp();
      e.preventDefault();
      e.stopPropagation();
    };

    canvas.addEventListener("touchstart", onTouchStart, { passive: false });
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchend", onTouchEnd, { passive: false });
    canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });

    // extra: keep page from scrolling/zooming while interacting
    // (canvas only, not whole document)
    canvas.style.touchAction = "none";
  };

  const get = () => state;

  return { attach, get };
})();
