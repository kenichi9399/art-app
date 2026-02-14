// field.js
(function(){
  class Field {
    constructor(){
      this.t = 0;
    }
    step(dt){
      this.t += dt*0.00035;
    }
    // returns velocity vector at (x,y) in screen coords
    sample(x,y,w,h){
      const s = CFG.FIELD_SCALE;
      // normalize to make behavior stable across sizes
      const nx = (x - w*0.5) * s;
      const ny = (y - h*0.5) * s;

      // fbm-based angle
      const a = U.fbm(nx + this.t*0.9, ny - this.t*0.7, 4);
      const b = U.fbm(nx - this.t*0.6, ny + this.t*0.8, 3);
      const ang = (a*2.4 + b*1.6);

      const vx = Math.cos(ang);
      const vy = Math.sin(ang);
      return {vx, vy};
    }
  }
  window.Field = Field;
})();
