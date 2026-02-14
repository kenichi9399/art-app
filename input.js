// input.js

const Input = (() => {
  const state = {
    down: false,
    x: 0, y: 0,
    px: 0, py: 0,
    vx: 0, vy: 0,
    tDown: 0,
    longPress: false,
    id: null,
  };

  let canvas = null;

  const attach = (c) => {
    canvas = c;

    const getXY = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      return { x: U.clamp(x, 0, 1), y: U.clamp(y, 0, 1) };
    };

    const onDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      canvas.setPointerCapture?.(e.pointerId);
      state.id = e.pointerId;
      state.down = true;
      state.longPress = false;
      state.tDown = U.now();

      const p = getXY(e);
      state.px = state.x = p.x;
      state.py = state.y = p.y;
      state.vx = state.vy = 0;

      // iOS: prevent scroll/zoom
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!state.down) return;
      if (state.id != null && e.pointerId !== state.id) return;

      const p = getXY(e);
      const sx = CFG.INPUT.dragSmoothing;

      const nx = U.lerp(state.x, p.x, 1 - sx);
      const ny = U.lerp(state.y, p.y, 1 - sx);

      state.vx = nx - state.x;
      state.vy = ny - state.y;

      state.px = state.x;
      state.py = state.y;
      state.x = nx;
      state.y = ny;

      const held = (U.now() - state.tDown);
      state.longPress = held >= CFG.INPUT.longPressMs;

      e.preventDefault();
    };

    const onUp = (e) => {
      if (state.id != null && e.pointerId !== state.id) return;
      state.down = false;
      state.longPress = false;
      state.id = null;
      e.preventDefault();
    };

    canvas.addEventListener("pointerdown", onDown, { passive: false });
    canvas.addEventListener("pointermove", onMove, { passive: false });
    canvas.addEventListener("pointerup", onUp, { passive: false });
    canvas.addEventListener("pointercancel", onUp, { passive: false });

    // safety: iOS gesture
    canvas.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
  };

  const get = () => state;

  return { attach, get };
})();
