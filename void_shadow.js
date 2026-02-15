// void_shadow.js
(() => {
  class VoidShadow {
    constructor(w, h) {
      this.resize(w,h);
    }

    resize(w,h) {
      this.w = w; this.h = h;
      this.noiseSeed = Math.random() * 9999;
    }

    draw(ctx) {
      const w = this.w, h = this.h;

      // vignette
      const g = ctx.createRadialGradient(
        w*0.5, h*0.48, Math.min(w,h)*0.08,
        w*0.5, h*0.52, Math.max(w,h)*0.72
      );
      const v = CFG.VIGNETTE;
      g.addColorStop(0.0, `rgba(0,0,0,${0.0})`);
      g.addColorStop(0.55, `rgba(0,0,0,${0.18*v})`);
      g.addColorStop(1.0, `rgba(0,0,0,${0.62*v})`);
      ctx.fillStyle = g;
      ctx.fillRect(0,0,w,h);

      // fog (subtle)
      ctx.globalAlpha = CFG.FOG;
      const g2 = ctx.createRadialGradient(
        w*0.55, h*0.52, Math.min(w,h)*0.12,
        w*0.55, h*0.52, Math.max(w,h)*0.95
      );
      g2.addColorStop(0.0, `rgba(80,90,120,0.10)`);
      g2.addColorStop(1.0, `rgba(0,0,0,0.00)`);
      ctx.fillStyle = g2;
      ctx.fillRect(0,0,w,h);
      ctx.globalAlpha = 1;

      // grain (cheap)
      const step = 8;
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = `rgba(255,255,255,1)`;
      for (let y=0; y<h; y+=step) {
        for (let x=0; x<w; x+=step) {
          const n = U.noise2((x+this.noiseSeed)*0.08, (y+this.noiseSeed)*0.08);
          if (n > 0.78) ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  window.VoidShadow = VoidShadow;
})();
