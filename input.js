// input.js
// Touch / Drag / Long-press input manager (iPhone Safari safe)
// - Does NOT depend on utils.js load order
// - Provides window.U and U.v2 fallback to avoid "U.v2 is undefined" crashes

(() => {
  // ---------- Safe global namespace ----------
  const G = (typeof window !== "undefined") ? window : globalThis;
  G.U = G.U || {};

  // v2 fallback (do NOT trust existing U.v2 unless it's a function)
  const v2 = (typeof G.U.v2 === "function")
    ? G.U.v2
    : function (x = 0, y = 0) { return { x, y }; };

  // expose fallback back to U so other modules can rely on it
  if (typeof G.U.v2 !== "function") G.U.v2 = v2;

  // small helpers (local, no dependency)
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const now = () => (G.performance && performance.now) ? performance.now() : Date.now();

  // ---------- Input State ----------
  const state = {
    // normalized pointer (canvas space set later)
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,

    // flags
    down: false,
    moved: false,
    longPress: false,

    // timing
    tDown: 0,
    tLast: 0,

    // gesture interpretation
    // tap: short press without much move
    // drag: down + move
    // longPress: hold > threshold
    isTap: false,

    // smoothing
    _lastX: 0,
    _lastY: 0,

    // device/canvas mapping
    _canvas: null,
    _rect: null,
    _dpr: 1,

    // config
    LONG_MS: 320,
    TAP_MAX_MS: 220,
    MOVE_PX: 8, // in CSS pixels
  };

  function setCanvas(canvas, dpr = 1) {
    state._canvas = canvas;
    state._dpr = dpr || 1;
    refreshRect();
  }

  function refreshRect() {
    if (!state._canvas) return;
    state._rect = state._canvas.getBoundingClientRect();
  }

  // Convert client coords -> canvas coords (pixel space)
  function toCanvasXY(clientX, clientY) {
    const r = state._rect || (state._canvas ? state._canvas.getBoundingClientRect() : { left: 0, top: 0 });
    const x = (clientX - r.left) * state._dpr;
    const y = (clientY - r.top) * state._dpr;
    return v2(x, y);
  }

  function onDown(clientX, clientY) {
    if (!state._canvas) return;

    refreshRect();
    const p = toCanvasXY(clientX, clientY);

    state.down = true;
    state.moved = false;
    state.longPress = false;
    state.isTap = false;

    state.tDown = now();
    state.tLast = state.tDown;

    state._lastX = p.x;
    state._lastY = p.y;

    state.x = p.x;
    state.y = p.y;
    state.dx = 0;
    state.dy = 0;
  }

  function onMove(clientX, clientY) {
    if (!state._canvas) return;

    refreshRect();
    const p = toCanvasXY(clientX, clientY);

    const ddx = p.x - state._lastX;
    const ddy = p.y - state._lastY;

    // movement threshold in CSS px -> convert to canvas px by *dpr
    const moveThresh = state.MOVE_PX * state._dpr;
    if (!state.moved && (Math.abs(p.x - state.x) + Math.abs(p.y - state.y)) > moveThresh) {
      state.moved = true;
    }

    state._lastX = p.x;
    state._lastY = p.y;

    state.dx = ddx;
    state.dy = ddy;
    state.x = p.x;
    state.y = p.y;
    state.tLast = now();
  }

  function onUp() {
    if (!state._canvas) return;

    const tUp = now();
    const held = tUp - state.tDown;

    // tap = short + not moved
    state.isTap = (held <= state.TAP_MAX_MS) && (!state.moved);

    state.down = false;
    state.longPress = false;
    state.tLast = tUp;
  }

  // long-press detection (call each frame)
  function update() {
    if (!state.down) return;
    const t = now();
    if (!state.longPress && (t - state.tDown) >= state.LONG_MS && !state.moved) {
      state.longPress = true;
    }
  }

  function reset() {
    state.down = false;
    state.moved = false;
    state.longPress = false;
    state.isTap = false;
    state.dx = 0;
    state.dy = 0;
  }

  // ---------- DOM Event wiring ----------
  function bind(canvas) {
    setCanvas(canvas, state._dpr || 1);

    // IMPORTANT: iOS Safari needs {passive:false} if we call preventDefault()
    const opts = { passive: false };

    // pointer events (best) + touch fallback
    const hasPointer = "PointerEvent" in G;

    const stop = (e) => {
      // prevent scroll / rubber-band while interacting with canvas
      if (e && typeof e.preventDefault === "function") e.preventDefault();
    };

    const getPrimary = (e) => {
      if (e.touches && e.touches.length) return e.touches[0];
      if (e.changedTouches && e.changedTouches.length) return e.changedTouches[0];
      return e;
    };

    if (hasPointer) {
      canvas.addEventListener("pointerdown", (e) => {
        stop(e);
        canvas.setPointerCapture?.(e.pointerId);
        onDown(e.clientX, e.clientY);
      }, opts);

      canvas.addEventListener("pointermove", (e) => {
        if (!state.down) return;
        stop(e);
        onMove(e.clientX, e.clientY);
      }, opts);

      canvas.addEventListener("pointerup", (e) => {
        stop(e);
        onUp();
      }, opts);

      canvas.addEventListener("pointercancel", (e) => {
        stop(e);
        onUp();
      }, opts);
    } else {
      // touch fallback
      canvas.addEventListener("touchstart", (e) => {
        stop(e);
        const p = getPrimary(e);
        onDown(p.clientX, p.clientY);
      }, opts);

      canvas.addEventListener("touchmove", (e) => {
        stop(e);
        if (!state.down) return;
        const p = getPrimary(e);
        onMove(p.clientX, p.clientY);
      }, opts);

      canvas.addEventListener("touchend", (e) => {
        stop(e);
        onUp();
      }, opts);

      canvas.addEventListener("touchcancel", (e) => {
        stop(e);
        onUp();
      }, opts);

      // mouse (desktop)
      canvas.addEventListener("mousedown", (e) => onDown(e.clientX, e.clientY));
      G.addEventListener("mousemove", (e) => { if (state.down) onMove(e.clientX, e.clientY); });
      G.addEventListener("mouseup", () => onUp());
    }

    // keep rect fresh
    G.addEventListener("resize", () => refreshRect(), { passive: true });
    G.addEventListener("scroll", () => refreshRect(), { passive: true });
  }

  // ---------- Export ----------
  G.Input = {
    state,
    bind,
    setCanvas,
    refreshRect,
    update,
    reset,
  };
})();
