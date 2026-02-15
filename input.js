// input.js
(() => {
  class Input {
    constructor(canvas) {
      this.canvas = canvas;

      this.down = false;
      this.justTap = false;

      this.pos = U.v2(0, 0);
      this.prev = U.v2(0, 0);
      this.delta = U.v2(0, 0);
      this.vel = U.v2(0, 0);

      this.lastTime = performance.now();
      this.downTime = 0;

      this.longPress = false;
      this.longPressMs = 420; // 体感で気持ちいい閾値

      this.activeId = null;
      this._bind();
    }

    _rect() {
      return this.canvas.getBoundingClientRect();
    }

    _toCanvasXY(clientX, clientY) {
      const r = this._rect();
      const x = (clientX - r.left);
      const y = (clientY - r.top);
      return U.v2(x, y);
    }

    _bind() {
      // iOS Safari: まずcanvasがスクロール/ズームに奪われないようにする
      // （CSSの touch-action:none も併用）
      const opts = { passive: false };

      // Pointer events（対応していれば最優先）
      if (window.PointerEvent) {
        this.canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e), opts);
        this.canvas.addEventListener('pointermove', (e) => this._onPointerMove(e), opts);
        this.canvas.addEventListener('pointerup',   (e) => this._onPointerUp(e), opts);
        this.canvas.addEventListener('pointercancel', (e) => this._onPointerUp(e), opts);
      } else {
        // Touch fallback
        this.canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), opts);
        this.canvas.addEventListener('touchmove',  (e) => this._onTouchMove(e), opts);
        this.canvas.addEventListener('touchend',   (e) => this._onTouchEnd(e), opts);
        this.canvas.addEventListener('touchcancel',(e) => this._onTouchEnd(e), opts);

        // Mouse fallback
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e), opts);
        window.addEventListener('mousemove', (e) => this._onMouseMove(e), opts);
        window.addEventListener('mouseup', (e) => this._onMouseUp(e), opts);
      }
    }

    _startAt(p, id=null) {
      this.down = true;
      this.activeId = id;
      this.justTap = true;

      this.pos = p;
      this.prev = p;
      this.delta = U.v2(0,0);
      this.vel = U.v2(0,0);

      this.downTime = performance.now();
      this.longPress = false;
    }

    _moveTo(p) {
      const now = performance.now();
      const dt = Math.max(0.001, (now - this.lastTime) / 1000);
      this.lastTime = now;

      this.prev = this.pos;
      this.pos = p;
      this.delta = U.sub(this.pos, this.prev);

      // velocity (px/s)
      this.vel = U.mul(this.delta, 1/dt);

      // 長押し判定
      if (this.down && !this.longPress) {
        if ((now - this.downTime) >= this.longPressMs) {
          this.longPress = true;
        }
      }

      // タップ判定は「動いたら解除」
      if (U.len(this.delta) > 2.5) this.justTap = false;
    }

    _end() {
      this.down = false;
      this.activeId = null;
      this.longPress = false;
      this.justTap = false;
    }

    // Pointer
    _onPointerDown(e) {
      e.preventDefault();
      this.canvas.setPointerCapture?.(e.pointerId);
      const p = this._toCanvasXY(e.clientX, e.clientY);
      this._startAt(p, e.pointerId);
    }
    _onPointerMove(e) {
      if (!this.down) return;
      if (this.activeId !== null && e.pointerId !== this.activeId) return;
      e.preventDefault();
      const p = this._toCanvasXY(e.clientX, e.clientY);
      this._moveTo(p);
    }
    _onPointerUp(e) {
      if (this.activeId !== null && e.pointerId !== this.activeId) return;
      e.preventDefault();
      this._end();
    }

    // Touch
    _onTouchStart(e) {
      e.preventDefault();
      const t = e.changedTouches[0];
      const p = this._toCanvasXY(t.clientX, t.clientY);
      this._startAt(p, t.identifier);
    }
    _onTouchMove(e) {
      if (!this.down) return;
      e.preventDefault();
      const t = Array.from(e.changedTouches).find(t => t.identifier === this.activeId) || e.changedTouches[0];
      const p = this._toCanvasXY(t.clientX, t.clientY);
      this._moveTo(p);
    }
    _onTouchEnd(e) {
      e.preventDefault();
      this._end();
    }

    // Mouse
    _onMouseDown(e) {
      e.preventDefault();
      const p = this._toCanvasXY(e.clientX, e.clientY);
      this._startAt(p, 'mouse');
    }
    _onMouseMove(e) {
      if (!this.down) return;
      e.preventDefault();
      const p = this._toCanvasXY(e.clientX, e.clientY);
      this._moveTo(p);
    }
    _onMouseUp(e) {
      if (!this.down) return;
      e.preventDefault();
      this._end();
    }

    reset() {
      this.down = false;
      this.justTap = false;
      this.longPress = false;
      this.activeId = null;
    }
  }

  window.Input = Input;
})();
