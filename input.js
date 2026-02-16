;(() => {
  class Input {
    constructor(canvas) {
      this.canvas = canvas;

      this.hasPointer = !!window.PointerEvent;

      this.pos = U.v2(0, 0);
      this.prev = U.v2(0, 0);
      this.delta = U.v2(0, 0);

      this.down = false;
      this.justTapped = false;

      this.longPress = false;
      this._pressT = 0;
      this._pressArmed = false;

      this._bind();
    }

    _bind() {
      const c = this.canvas;

      // 重要：iOSでtouchmoveを拾うには passive:false が必要
      const opt = { passive: false };

      const getXY = (ev) => {
        const r = c.getBoundingClientRect();
        let x, y;

        if (ev.touches && ev.touches.length) {
          x = ev.touches[0].clientX;
          y = ev.touches[0].clientY;
        } else {
          x = ev.clientX;
          y = ev.clientY;
        }
        return U.v2(x - r.left, y - r.top);
      };

      const onDown = (ev) => {
        U.noDefault(ev);

        const p = getXY(ev);
        this.down = true;
        this.justTapped = true;

        this.prev = p;
        this.pos = p;
        this.delta = U.v2(0, 0);

        this._pressT = 0;
        this._pressArmed = true;
        this.longPress = false;
      };

      const onMove = (ev) => {
        U.noDefault(ev);
        const p = getXY(ev);

        this.pos = p;
        this.delta = U.sub(this.pos, this.prev);
        this.prev = this.pos;
      };

      const onUp = (ev) => {
        U.noDefault(ev);
        this.down = false;
        this._pressArmed = false;
        this.longPress = false;
      };

      if (this.hasPointer) {
        c.addEventListener("pointerdown", onDown, opt);
        window.addEventListener("pointermove", onMove, opt);
        window.addEventListener("pointerup", onUp, opt);
        window.addEventListener("pointercancel", onUp, opt);
      } else {
        c.addEventListener("touchstart", onDown, opt);
        window.addEventListener("touchmove", onMove, opt);
        window.addEventListener("touchend", onUp, opt);
        window.addEventListener("touchcancel", onUp, opt);

        c.addEventListener("mousedown", onDown, opt);
        window.addEventListener("mousemove", onMove, opt);
        window.addEventListener("mouseup", onUp, opt);
      }

      // 画面スクロール/ダブルタップズームを抑制（iOS）
      c.addEventListener("gesturestart", U.noDefault, opt);
      c.addEventListener("gesturechange", U.noDefault, opt);
      c.addEventListener("gestureend", U.noDefault, opt);
    }

    update(dt) {
      this.justTapped = false; // 毎フレームで消す（tapはdown時にだけ立つ）

      // long-press 判定
      if (this.down && this._pressArmed) {
        this._pressT += dt;
        if (!this.longPress && this._pressT > 0.32) {
          this.longPress = true;
        }
      }
      if (!this.down) {
        this._pressT = 0;
        this._pressArmed = false;
        this.longPress = false;
      }
    }
  }

  window.Input = Input;
})();
