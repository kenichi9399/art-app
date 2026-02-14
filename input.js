// input.js
// iOS Safariで「ボタンが押せない/Resetが効かない」系を避けるため、
// pointer-events / touch-action と合わせて、イベントの取り回しを明示

(function(){
  const { clamp } = window.U;

  function Input(canvas){
    this.canvas = canvas;

    this.down = false;
    this.press = 0;          // 0..1（長押し）
    this._pressT = 0;

    this.x = 0; this.y = 0;
    this.vx = 0; this.vy = 0;
    this._px = 0; this._py = 0;

    this.onSave = null;
    this.onReset = null;

    this._bind();
  }

  Input.prototype._bind = function(){
    const c = this.canvas;

    const onDown = (e) => {
      this.down = true;
      const p = this._pos(e);
      this._px = this.x = p.x;
      this._py = this.y = p.y;
      this.vx = this.vy = 0;
      this._pressT = 0;
      // 重要：Safariでスクロール/ズーム干渉を止める
      e.preventDefault?.();
    };

    const onMove = (e) => {
      if(!this.down) return;
      const p = this._pos(e);
      this.vx = p.x - this._px;
      this.vy = p.y - this._py;
      this._px = this.x = p.x;
      this._py = this.y = p.y;
      e.preventDefault?.();
    };

    const onUp = (e) => {
      this.down = false;
      this.press = 0;
      this._pressT = 0;
      this.vx = this.vy = 0;
      e.preventDefault?.();
    };

    // pointer events（iOSもだいたいOK）
    c.addEventListener("pointerdown", onDown, { passive:false });
    c.addEventListener("pointermove", onMove, { passive:false });
    window.addEventListener("pointerup", onUp, { passive:false });
    window.addEventListener("pointercancel", onUp, { passive:false });

    // ボタン
    const btnSave = document.getElementById("btnSave");
    const btnReset = document.getElementById("btnReset");

    // iOSで “クリックがcanvasに吸われる” 時があるので stopPropagation も入れる
    const stop = (e)=>{ e.preventDefault?.(); e.stopPropagation?.(); };

    btnSave?.addEventListener("click", (e)=>{ stop(e); this.onSave?.(); }, { passive:false });
    btnSave?.addEventListener("touchend", (e)=>{ stop(e); this.onSave?.(); }, { passive:false });

    btnReset?.addEventListener("click", (e)=>{ stop(e); this.onReset?.(); }, { passive:false });
    btnReset?.addEventListener("touchend", (e)=>{ stop(e); this.onReset?.(); }, { passive:false });
  };

  Input.prototype._pos = function(e){
    const r = this.canvas.getBoundingClientRect();
    const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
    return {
      x: (p.clientX - r.left) * (this.canvas.width / r.width),
      y: (p.clientY - r.top)  * (this.canvas.height / r.height)
    };
  };

  Input.prototype.update = function(dt){
    // 長押し判定（0..1）
    if(this.down){
      this._pressT += dt;
      this.press = clamp(this._pressT / 0.42, 0, 1); // 0.42sで最大
    }else{
      this.press = 0;
      this._pressT = 0;
    }
  };

  window.Input = Input;
})();
