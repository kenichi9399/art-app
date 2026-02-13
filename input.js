// input.js
(() => {
  function Input(app) {
    this.app = app;

    const t = {
      down: false,
      x: 0.5,
      y: 0.6,
      px: 0.5,
      py: 0.6,
      impulse: 0,
      trail: [],
      longPressTimer: null,
      longPressed: false,
    };
    app.touch = t;

    this.bind();
  }

  Input.prototype.bind = function () {
    const a = this.app;
    const c = a.canvas;

    const toNorm = (ev) => {
      const rect = c.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / rect.width;
      const y = (ev.clientY - rect.top) / rect.height;
      return { x: U.clamp(x, 0, 1), y: U.clamp(y, 0, 1) };
    };

    const onDown = (ev) => {
      ev.preventDefault();
      const p = toNorm(ev);
      a.touch.down = true;
      a.touch.px = a.touch.x = p.x;
      a.touch.py = a.touch.y = p.y;
      a.touch.impulse = CFG.TOUCH_IMPULSE;
      a.touch.trail.length = 0;
      a.touch.longPressed = false;

      // long press -> save
      clearTimeout(a.touch.longPressTimer);
      a.touch.longPressTimer = setTimeout(() => {
        a.touch.longPressed = true;
        a.capture();
      }, 650);
    };

    const onMove = (ev) => {
      if (!a.touch.down) return;
      ev.preventDefault();
      const p = toNorm(ev);
      a.touch.px = a.touch.x;
      a.touch.py = a.touch.y;
      a.touch.x = p.x;
      a.touch.y = p.y;

      // store trail
      a.touch.trail.push({ x: p.x, y: p.y });
      if (a.touch.trail.length > 18) a.touch.trail.shift();

      // cancel long press if moved
      const dx = a.touch.x - a.touch.px;
      const dy = a.touch.y - a.touch.py;
      if (dx * dx + dy * dy > 0.00025) clearTimeout(a.touch.longPressTimer);
    };

    const onUp = (ev) => {
      ev.preventDefault();
      a.touch.down = false;
      clearTimeout(a.touch.longPressTimer);
    };

    // pointer events (best)
    c.addEventListener("pointerdown", onDown, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp, { passive: false });
    window.addEventListener("pointercancel", onUp, { passive: false });

    // iOS Safari sometimes needs touch-action none already; keep.
  };

  window.Input = Input;
})();
