// render.js

(function(){
  const { clamp, lerp } = window.U;

  function Renderer(ctx){
    this.ctx = ctx;
    this.w = 0;
    this.h = 0;
  }

  Renderer.prototype.resize = function(w, h){
    this.w = w; this.h = h;
  };

  Renderer.prototype.clear = function(){
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(5,7,13,${CFG.RENDER.CLEAR_ALPHA})`;
    ctx.fillRect(0,0,this.w,this.h);
    ctx.restore();
  };

  function dot(ctx, x, y, r, a, soft){
    // “点”を柔らかく：radial gradient
    const rr = Math.max(0.6, r);
    const g = ctx.createRadialGradient(x, y, 0, x, y, rr * (1.8 + soft*1.6));
    g.addColorStop(0.0, `rgba(245,248,255,${a})`);
    g.addColorStop(0.35, `rgba(245,248,255,${a*0.55})`);
    g.addColorStop(1.0, `rgba(245,248,255,0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rr * (1.8 + soft*1.6), 0, Math.PI*2);
    ctx.fill();
  }

  Renderer.prototype.draw = function(particles){
    const ctx = this.ctx;

    ctx.save();
    ctx.globalCompositeOperation = CFG.RENDER.ADDITIVE ? "lighter" : "source-over";

    const baseA = CFG.RENDER.DOT_ALPHA;
    const soft = CFG.RENDER.DOT_SOFT;

    for(let i=0;i<particles.p.length;i++){
      const o = particles.p[i];

      // サイズが大きい粒ほど少し明るい（核）
      const a = clamp(baseA * (0.35 + o.a*0.65) * (0.85 + o.r*0.06), 0, 0.95);

      dot(ctx, o.x, o.y, o.r, a, soft);

      // 微細粒の“きらめき”を少しだけ（負荷が軽い）
      if(o.r < 1.0 && (i % 13 === 0)){
        dot(ctx, o.x + (Math.random()*2-1)*1.2, o.y + (Math.random()*2-1)*1.2, 0.65, a*0.35, 0.9);
      }
    }

    ctx.restore();
  };

  window.Renderer = Renderer;
})();
