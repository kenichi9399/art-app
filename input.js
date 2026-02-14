// input.js
(function(){
  class Input {
    constructor(canvas){
      this.c = canvas;

      this.active = false;
      this.x = 0; this.y = 0;

      this.mode = 'none'; // tap / drag / hold
      this._down = false;
      this._moved = false;
      this._downAt = 0;
      this._lastX = 0; this._lastY = 0;

      this.fx = 0; this.fy = 0;

      this._holdTimer = null;

      this._bind();
    }

    _bind(){
      // iOS Safari: passive:false to allow preventDefault
      const opts = { passive:false };

      const onDown = (e)=>{
        e.preventDefault();
        const p = this._point(e);
        this._down = true;
        this.active = true;
        this._moved = false;
        this.mode = 'tap';
        this.x = p.x; this.y = p.y;
        this._lastX = p.x; this._lastY = p.y;
        this._downAt = U.now();
        this.fx = 0; this.fy = 0;

        if(this._holdTimer) clearTimeout(this._holdTimer);
        this._holdTimer = setTimeout(()=>{
          if(this._down && !this._moved){
            this.mode = 'hold';
          }
        }, CFG.LONGPRESS_TIME_MS);
      };

      const onMove = (e)=>{
        if(!this._down) return;
        e.preventDefault();
        const p = this._point(e);
        const dx = p.x - this._lastX;
        const dy = p.y - this._lastY;

        // if moved enough -> drag
        if(Math.hypot(p.x-this.x, p.y-this.y) > 6){
          this._moved = true;
          if(this.mode !== 'hold') this.mode = 'drag';
        }

        this._lastX = p.x; this._lastY = p.y;
        this.x = p.x; this.y = p.y;

        // store “gesture force”
        this.fx = dx;
        this.fy = dy;
      };

      const onUp = (e)=>{
        if(this._holdTimer) clearTimeout(this._holdTimer);
        this._holdTimer = null;

        if(!this._down) return;
        e.preventDefault();

        // keep a short impulse for tap
        if(this.mode === 'tap'){
          // tap remains active briefly to create response
          const t0 = U.now();
          const sx = this.x, sy = this.y;
          this.active = true;
          this._down = false;
          this.fx = 0; this.fy = 0;
          setTimeout(()=>{
            // stop tap effect after short time
            if(U.now()-t0>80 && this.x===sx && this.y===sy){
              this.active = false;
              this.mode = 'none';
            }
          }, 90);
          return;
        }

        this._down = false;
        this.active = false;
        this.mode = 'none';
        this.fx = 0; this.fy = 0;
      };

      // PointerEvents first
      this.c.addEventListener('pointerdown', onDown, opts);
      window.addEventListener('pointermove', onMove, opts);
      window.addEventListener('pointerup', onUp, opts);
      window.addEventListener('pointercancel', onUp, opts);

      // Fallback for older iOS (just in case)
      this.c.addEventListener('touchstart', onDown, opts);
      window.addEventListener('touchmove', onMove, opts);
      window.addEventListener('touchend', onUp, opts);
      window.addEventListener('touchcancel', onUp, opts);

      this.c.addEventListener('mousedown', onDown, opts);
      window.addEventListener('mousemove', onMove, opts);
      window.addEventListener('mouseup', onUp, opts);
    }

    _point(e){
      const rect = this.c.getBoundingClientRect();
      const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
      const clientX = t ? t.clientX : e.clientX;
      const clientY = t ? t.clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (this.c.width/rect.width) / (this.c.width/rect.width) + 0, // keep css pixels
        y: (clientY - rect.top) * (this.c.height/rect.height) / (this.c.height/rect.height) + 0
      };
    }

    force(){
      // decay gesture force so it feels smooth
      this.fx *= 0.82;
      this.fy *= 0.82;
      return {
        active: this.active,
        x: this.x,
        y: this.y,
        mode: this.mode,
        fx: this.fx,
        fy: this.fy
      };
    }
  }

  window.Input = Input;
})();
