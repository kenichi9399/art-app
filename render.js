// render.js
(function(){
  class Renderer {
    constructor(canvas){
      this.c = canvas;
      this.ctx = canvas.getContext('2d', { alpha:true, desynchronized:true });
      this.w=0; this.h=0; this.dpr=1;

      // offscreen for soft dot sprite
      this.dot = document.createElement('canvas');
      this.dotCtx = this.dot.getContext('2d');

      // accumulation buffer (reduces flicker and prevents white-out)
      this.acc = document.createElement('canvas');
      this.accCtx = this.acc.getContext('2d', { alpha:true });

      this._buildDot();
    }

    resize(w,h,dpr){
      this.w=w; this.h=h; this.dpr=dpr;
      this.c.width = Math.floor(w*dpr);
      this.c.height = Math.floor(h*dpr);
      this.acc.width = this.c.width;
      this.acc.height = this.c.height;

      this.ctx.setTransform(dpr,0,0,dpr,0,0);
      this.accCtx.setTransform(dpr,0,0,dpr,0,0);
    }

    clearFade(){
      // fade previous frame in accumulation
      const ctx=this.accCtx;
      ctx.save();
      ctx.globalCompositeOperation='source-over';
      ctx.fillStyle=`rgba(0,0,0,${CFG.FADE})`;
      ctx.fillRect(0,0,this.w,this.h);
      ctx.restore();
    }

    _buildDot(){
      const s=64;
      this.dot.width=s; this.dot.height=s;
      const g=this.dotCtx.createRadialGradient(s/2,s/2,0, s/2,s/2,s/2);
      // soft center (avoid harsh white)
      g.addColorStop(0,'rgba(255,255,255,0.92)');
      g.addColorStop(0.35,'rgba(255,255,255,0.24)');
      g.addColorStop(1,'rgba(255,255,255,0)');
      this.dotCtx.clearRect(0,0,s,s);
      this.dotCtx.fillStyle=g;
      this.dotCtx.fillRect(0,0,s,s);
    }

    draw(system, bg){
      const ctx=this.accCtx;

      // 1) fade old
      this.clearFade();

      // 2) subtle background + vignette
      // draw background into acc each frame lightly (keeps depth)
      ctx.save();
      ctx.globalCompositeOperation='source-over';
      ctx.globalAlpha=0.25;
      bg.drawTo(ctx,this.w,this.h);
      ctx.restore();

      const core=system.core;

      // 3) draw particles
      ctx.save();
      ctx.globalCompositeOperation='lighter';
      // lower alpha prevents white out
      ctx.globalAlpha = CFG.ADDITIVE_ALPHA;

      const p=system.p;
      for(let i=0;i<p.length;i++){
        const a=p[i];

        // size scale with subtle breathing
        const b = 0.85 + 0.15*Math.sin(a.life*2.2);
        const r = a.s * b;

        // alpha: smaller dots slightly dimmer; near core slightly brighter
        const dx=a.x-core.x, dy=a.y-core.y;
        const dist=Math.hypot(dx,dy);
        const near = Math.exp(-dist/220);
        let alpha = CFG.DOT_ALPHA * (0.55 + 0.45*near);
        alpha *= U.clamp(0.55 + (r/6.2)*0.65, 0.55, 1);

        // exposure clamp
        alpha = Math.min(alpha, CFG.MAX_EXPOSURE);

        const s = r*10; // sprite scale
        ctx.globalAlpha = alpha * CFG.ADDITIVE_ALPHA;
        ctx.drawImage(this.dot, a.x - s*0.5, a.y - s*0.5, s, s);
      }
      ctx.restore();

      // 4) core (nucleus)
      ctx.save();
      ctx.globalCompositeOperation='lighter';

      const breathe = 1 + Math.sin(U.now()*0.0012 + core.phase)*CFG.CORE_BREATHE;
      const R = (18 + core.energy*26) * breathe;
      const S = (90 + core.energy*120) * breathe;

      // inner core
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.fillStyle='rgba(210,225,255,1)';
      ctx.arc(core.x, core.y, R, 0, Math.PI*2);
      ctx.fill();

      // outer aura gradient
      const g = ctx.createRadialGradient(core.x,core.y, R*0.4, core.x,core.y, S);
      g.addColorStop(0,'rgba(210,225,255,0.26)');
      g.addColorStop(0.4,'rgba(210,225,255,0.10)');
      g.addColorStop(1,'rgba(210,225,255,0)');
      ctx.globalAlpha = 0.35;
      ctx.fillStyle=g;
      ctx.beginPath();
      ctx.arc(core.x, core.y, S, 0, Math.PI*2);
      ctx.fill();

      ctx.restore();

      // 5) present acc -> visible canvas
      this.ctx.save();
      this.ctx.globalCompositeOperation='source-over';
      this.ctx.globalAlpha=1;
      this.ctx.clearRect(0,0,this.w,this.h);
      this.ctx.drawImage(this.acc,0,0,this.acc.width,this.acc.height,0,0,this.w,this.h);
      this.ctx.restore();
    }
  }

  window.Renderer = Renderer;
})();
