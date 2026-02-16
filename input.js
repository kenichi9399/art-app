// input.js
(() => {
  "use strict";

  class Input {
    constructor(canvas) {
      this.canvas = canvas;

      // state
      this.down = false;
      this.id = null;
      this.x = 0; this.y = 0;
      this.px = 0; this.py = 0;
      this.vx = 0; this.vy = 0;

      this.tap = false;
      this.dragging = false;
      this.long = false;

      this._tDown = 0;
      this._lastMove = 0;

      // iOS Safari: prevent scroll/zoom interfering
      canvas.style.touchAction = "none";

      this._bind();
    }

    _bind() {
      const el = this.canvas;

      const getXY = (e) => {
        const r = el.getBoundingClientRect();
        const cx = (e.clientX - r.left);
        const cy = (e.clientY - r.top);
        return { cx, cy };
      };

      const onDown = (e) => {
        // ignore multi-touch extra
        if (this.down) return;

        // allow buttons overlay to work
        // (canvas only receives events when touching canvas)
        e.preventDefault();

        const p = getXY(e);
        this.down = true;
        this.id = e.pointerId ?? "mouse";
        this.x = this.px = p.cx;
        this.y = this.py = p.cy;
        this.vx = this.vy = 0;
        this.tap = true;
        this.dragging = false;
        this.long = false;
        this._tDown = U.now();
        this._lastMove = this._tDown;

        try { el.setPointerCapture?.(this.id); } catch (_) {}
      };

      const onMove = (e) => {
        if (!this.down) return;
        if (e.pointerId != null && this.id != null && e.pointerId !== this.id) return;

        e.preventDefault();

        const p = getXY(e);
        const nx = p.cx, ny = p.cy;

        const now = U.now();
        const dt = Math.max(1, now - this._lastMove);
        this._lastMove = now;

        this.vx = (nx - this.x) / dt;
        this.vy = (ny - this.y) / dt;

        this.px = this.x; this.py = this.y;
        this.x = nx; this.y = ny;

        const moved = Math.hypot(this.x - this.px, this.y - this.py);
        if (moved > 1.2) {
          this.tap = false;
          this.dragging = true;
        }

        // long press check
        if (!this.long && !this.dragging) {
          if (now - this._tDown >= CFG.LONGPRESS_MS) {
            this.long = true;
            this.tap = false;
          }
        }
      };

      const onUp = (e) => {
        if (!this.down) return;
        if (e.pointerId != null && this.id != null && e.pointerId !== this.id) return;

        e.preventDefault();

        // release
        this.down = false;
        this.id = null;

        // keep tap flag for one frame only (handled in consume())
      };

      // Pointer events (modern iOS Safari OK)
      el.addEventListener("pointerdown", onDown, { passive: false });
      el.addEventListener("pointermove", onMove, { passive: false });
      el.addEventListener("pointerup", onUp, { passive: false });
      el.addEventListener("pointercancel", onUp, { passive: false });

      // Fallback touch (older / weird cases)
      el.addEventListener("touchstart", (ev) => {
        if (this.down) return;
        const t = ev.changedTouches[0];
        onDown({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => ev.preventDefault() });
      }, { passive: false });

      el.addEventListener("touchmove", (ev) => {
        if (!this.down) return;
        const t = ev.changedTouches[0];
        onMove({ clientX: t.clientX, clientY: t.clientY, preventDefault: () => ev.preventDefault() });
      }, { passive: false });

      el.addEventListener("touchend", (ev) => {
        if (!this.down) return;
        ev.preventDefault();
        onUp({ preventDefault: () => ev.preventDefault() });
      }, { passive: false });

      el.addEventListener("touchcancel", (ev) => {
        if (!this.down) return;
        ev.preventDefault();
        onUp({ preventDefault: () => ev.preventDefault() });
      }, { passive: false });
    }

    // 1フレームだけtap/long開始を通知したい時に使う
    consume() {
      const out = {
        down: this.down,
        x: this.x, y: this.y,
        px: this.px, py: this.py,
        vx: this.vx, vy: this.vy,
        tap: this.tap,
        dragging: this.dragging,
        long: this.long,
      };
      // tapは“発火したら消す”
      this.tap = false;
      return out;
    }
  }

  window.Input = Input;
})();
