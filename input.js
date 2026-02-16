// input.js
(function () {
  "use strict";

  class Input {
    constructor(canvas, handlers) {
      this.canvas = canvas;
      this.h = handlers;

      this.isDown = false;
      this.isDragging = false;
      this.downT = 0;
      this.lastX = 0;
      this.lastY = 0;

      this.longPressFired = false;
      this.longPressTimer = null;

      this._bind();
    }

    _posFromTouch(t) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (t.clientX - rect.left),
        y: (t.clientY - rect.top)
      };
    }

    _bind() {
      // iOS Safari 安定優先：touchベースで組む（pointerは環境差がある）
      this.canvas.addEventListener("touchstart", (e) => this._onTouchStart(e), { passive: false });
      this.canvas.addEventListener("touchmove", (e) => this._onTouchMove(e), { passive: false });
      this.canvas.addEventListener("touchend", (e) => this._onTouchEnd(e), { passive: false });
      this.canvas.addEventListener("touchcancel", (e) => this._onTouchEnd(e), { passive: false });

      // デスクトップ用（任意）
      this.canvas.addEventListener("mousedown", (e) => this._onMouseDown(e));
      window.addEventListener("mousemove", (e) => this._onMouseMove(e));
      window.addEventListener("mouseup", (e) => this._onMouseUp(e));
    }

    _startPress(x, y) {
      this.isDown = true;
      this.isDragging = false;
      this.longPressFired = false;
      this.downT = performance.now();
      this.lastX = x;
      this.lastY = y;

      if (this.longPressTimer) clearTimeout(this.longPressTimer);
      this.longPressTimer = setTimeout(() => {
        if (!this.isDown) return;
        this.longPressFired = true;
        this.h.onLongPress?.(x, y);
      }, 380);
    }

    _movePress(x, y) {
      if (!this.isDown) return;

      const dx = x - this.lastX;
      const dy = y - this.lastY;

      // 小さすぎる揺れは無視（誤判定でタップが潰れるのを防ぐ）
      if (!this.isDragging) {
        const d2 = dx * dx + dy * dy;
        if (d2 > 10) this.isDragging = true;
      }

      this.h.onMove?.(x, y, dx, dy, this.isDragging);

      this.lastX = x;
      this.lastY = y;
    }

    _endPress(x, y) {
      if (this.longPressTimer) clearTimeout(this.longPressTimer);
      const now = performance.now();
      const dt = now - this.downT;

      const wasDragging = this.isDragging;
      const wasLong = this.longPressFired;

      this.isDown = false;
      this.isDragging = false;

      // long-press はすでに発火済み
      if (wasLong) {
        this.h.onUp?.(x, y);
        return;
      }

      // drag
      if (wasDragging) {
        this.h.onDragEnd?.(x, y);
        this.h.onUp?.(x, y);
        return;
      }

      // tap
      if (dt < 350) {
        this.h.onTap?.(x, y);
      }
      this.h.onUp?.(x, y);
    }

    _onTouchStart(e) {
      e.preventDefault();
      if (!e.touches || e.touches.length === 0) return;
      const p = this._posFromTouch(e.touches[0]);
      this._startPress(p.x, p.y);
    }

    _onTouchMove(e) {
      e.preventDefault();
      if (!e.touches || e.touches.length === 0) return;
      const p = this._posFromTouch(e.touches[0]);
      this._movePress(p.x, p.y);
    }

    _onTouchEnd(e) {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
      const x = t ? (t.clientX - rect.left) : this.lastX;
      const y = t ? (t.clientY - rect.top) : this.lastY;
      this._endPress(x, y);
    }

    _onMouseDown(e) {
      const rect = this.canvas.getBoundingClientRect();
      this._startPress(e.clientX - rect.left, e.clientY - rect.top);
    }
    _onMouseMove(e) {
      if (!this.isDown) return;
      const rect = this.canvas.getBoundingClientRect();
      this._movePress(e.clientX - rect.left, e.clientY - rect.top);
    }
    _onMouseUp(e) {
      if (!this.isDown) return;
      const rect = this.canvas.getBoundingClientRect();
      this._endPress(e.clientX - rect.left, e.clientY - rect.top);
    }
  }

  window.Input = Input;
})();
