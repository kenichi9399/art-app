// input.js
// iOS Safari friendly input handler.
// Exposes: window.Input

(() => {
  const U = window.U || {};

  // フォールバック（念のため）
  const v2 = U.v2 ? U.v2 : (x = 0, y = 0) => ({ x, y });
  const clamp = U.clamp ? U.clamp : (n, a, b) => (n < a ? a : n > b ? b : n);

  class Input {
    constructor(canvas) {
      this.canvas = canvas;

      // pointer state (CSS px coords in canvas space)
      this.pos = v2(0, 0);
      this.prev = v2(0, 0);
      this.delta = v2(0, 0);

      this.isDown = false;
      this.justDown = false;
      this.justUp = false;

      // interaction semantics
      this.tap = false;
      this.dragging = false;
      this.dragDist = 0;

      this.hold = false;        // long-press active
      this.holdTime = 0;        // seconds
      this.holdThreshold = 0.32;// seconds

      this.pointerId = null;

      // internal
      this._downPos = v2(0, 0);
      this._moved = 0;
      this._lastTS = performance.now();

      this._bind();
    }

    reset() {
      this.isDown = this.justDown = this.justUp = false;
      this.tap = this.dragging = false;
      this.dragDist = 0;
      this.hold = false;
      this.holdTime = 0;
      this.pointerId = null;
      this._moved = 0;
      this._lastTS = performance.now();
    }

    // optional if field/ps wants dt-driven update
    update(dt) {
      // one-frame flags reset here
      this.tap = false;
      this.justDown = false;
      this.justUp = false;

      if (this.isDown) {
        this.holdTime += dt;
        if (!this.hold && this.holdTime >= this.holdThreshold && !this.dragging) {
          this.hold = true;
        }
      } else {
        this.hold = false;
        this.holdTime = 0;
      }
    }

    _canvasToLocal(clientX, clientY) {
      const r = this.canvas.getBoundingClientRect();
      const x = clientX - r.left;
      const y = clientY - r.top;
      return v2(x, y);
    }

    _setPos(p) {
      this.prev.x = this.pos.x; this.prev.y = this.pos.y;
      this.pos.x = p.x; this.pos.y = p.y;
      this.delta.x = this.pos.x - this.prev.x;
      this.delta.y = this.pos.y - this.prev.y;
      this.dragDist += Math.sqrt(this.delta.x * this.delta.x + this.delta.y * this.delta.y);
    }

    _onDown(p, pointerId) {
      this.isDown = true;
      this.justDown = true;
      this.justUp = false;
      this.tap = false;

      this.dragging = false;
      this.dragDist = 0;

      this.hold = false;
      this.holdTime = 0;

      this.pointerId = pointerId ?? this.pointerId;

      this._downPos.x = p.x; this._downPos.y = p.y;
      this._moved = 0;
      this._setPos(p);
      this._lastTS = performance.now();
    }

    _onMove(p) {
      this._setPos(p);

      const dx = this.pos.x - this._downPos.x;
      const dy = this.pos.y - this._downPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this._moved = dist;

      // drag threshold (finger jitter tolerant)
      if (this.isDown && !this.dragging && dist >= 6) {
        this.dragging = true;
        this.hold = false; // drag優先
      }
    }

    _onUp(p) {
      // final move
      this._setPos(p);

      this.isDown = false;
      this.justUp = true;

      // tap 判定：ほぼ動いてない + holdしてない
      if (!this.dragging && !this.hold && this._moved < 8) {
        this.tap = true;
      }

      this.dragging = false;
      this.hold = false;
      this.holdTime = 0;
      this.pointerId = null;
    }

    _bind() {
      const c = this.canvas;

      // iOS: スクロール/ズームに取られないようにする
      // （index.htmlでも touch-action:none を入れているが二重で安全）
      c.style.touchAction = 'none';

      // pointer events if available
      const hasPointer = 'PointerEvent' in window;

      if (hasPointer) {
        c.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          c.setPointerCapture?.(e.pointerId);
          const p = this._canvasToLocal(e.clientX, e.clientY);
          this._onDown(p, e.pointerId);
        }, { passive: false });

        c.addEventListener('pointermove', (e) => {
          // capture中のみ追う
          if (!this.isDown) return;
          e.preventDefault();
          const p = this._canvasToLocal(e.clientX, e.clientY);
          this._onMove(p);
        }, { passive: false });

        c.addEventListener('pointerup', (e) => {
          e.preventDefault();
          const p = this._canvasToLocal(e.clientX, e.clientY);
          this._onUp(p);
        }, { passive: false });

        c.addEventListener('pointercancel', (e) => {
          e.preventDefault();
          const p = this._canvasToLocal(e.clientX, e.clientY);
          this._onUp(p);
        }, { passive: false });

      } else {
        // Touch fallback
        c.addEventListener('touchstart', (e) => {
          e.preventDefault();
          const t = e.changedTouches[0];
          const p = this._canvasToLocal(t.clientX, t.clientY);
          this._onDown(p, 'touch');
        }, { passive: false });

        c.addEventListener('touchmove', (e) => {
          if (!this.isDown) return;
          e.preventDefault();
          const t = e.changedTouches[0];
          const p = this._canvasToLocal(t.clientX, t.clientY);
          this._onMove(p);
        }, { passive: false });

        c.addEventListener('touchend', (e) => {
          e.preventDefault();
          const t = e.changedTouches[0];
          const p = this._canvasToLocal(t.clientX, t.clientY);
          this._onUp(p);
        }, { passive: false });

        c.addEventListener('touchcancel', (e) => {
          e.preventDefault();
          const t = e.changedTouches[0] || { clientX: 0, clientY: 0 };
          const p = this._canvasToLocal(t.clientX, t.clientY);
          this._onUp(p);
        }, { passive: false });

        // Mouse fallback
        c.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const p = this._canvasToLocal(e.clientX, e.clientY);
          this._onDown(p, 'mouse');
        }, { passive: false });

        window.addEventListener('mousemove', (e) => {
          if (!this.isDown) return;
          const p = this._canvasToLocal(e.clientX, e.clientY);
          this._onMove(p);
        }, { passive: true });

        window.addEventListener('mouseup', (e) => {
          if (!this.isDown) return;
          const p = this._canvasToLocal(e.clientX, e.clientY);
          this._onUp(p);
        }, { passive: true });
      }
    }
  }

  window.Input = Input;
})();
