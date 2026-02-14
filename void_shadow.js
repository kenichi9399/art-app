// void_shadow.js
(function(){
  class VoidShadow {
    constructor(){
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this.w = 0; this.h = 0; this.dpr = 1;
    }
    resize(w,h,dpr){
      this.w=w; this.h=h; this.dpr=dpr;
      this.canvas.width = Math.floor(w*dpr);
      this.canvas.height = Math.floor(h*dpr);
      this.redraw();
    }
    redraw(){
      const ctx=this.ctx;
      const W=this.canvas.width, H=this.canvas.height;
      ctx.clearRect(0,0,W,H);

      // vignette
      const g = ctx.createRadialGradient(W*0.5,H*0.45,Math.min(W,H)*0.08, W*0.5,H*0.5, Math.max(W,H)*0.62);
      g.addColorStop(0,'rgba(0,0,0,0)');
      g.addColorStop(1,'rgba(0,0,0,0.72)');
      ctx.fillStyle=g;
      ctx.fillRect(0,0,W,H);

      // grain (subtle)
      const img = ctx.getImageData(0,0,W,H);
      const d = img.data;
      const a = CFG.BG_GRAIN;
      for(let i=0;i<d.length;i+=4){
        const r = (Math.random()-0.5)*255*a;
        d[i]+=r; d[i+1]+=r; d[i+2]+=r;
        d[i+3]=U.clamp(d[i+3],0,255);
      }
      ctx.putImageData(img,0,0);
    }
    drawTo(ctx,w,h){
      // draw in CSS pixel space
      ctx.save();
      ctx.globalCompositeOperation='source-over';
      ctx.globalAlpha=1;
      ctx.drawImage(this.canvas,0,0,this.canvas.width,this.canvas.height,0,0,w,h);
      ctx.restore();
    }
  }
  window.VoidShadow = VoidShadow;
})();
