// void_shadow.js

(function(){
  function apply(ctx, w, h){
    const vign = CFG.RENDER.VIGNETTE;
    if(vign <= 0) return;

    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    // vignette
    const g = ctx.createRadialGradient(
      w*0.5, h*0.48, Math.min(w,h)*0.18,
      w*0.5, h*0.52, Math.max(w,h)*0.70
    );
    g.addColorStop(0.0, "rgba(0,0,0,0)");
    g.addColorStop(1.0, `rgba(0,0,0,${0.65*vign})`);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // grain
    const gr = CFG.RENDER.GRAIN;
    if(gr > 0){
      ctx.globalAlpha = gr;
      const n = 1400;
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      for(let i=0;i<n;i++){
        const x = Math.random()*w;
        const y = Math.random()*h;
        const s = Math.random()<0.7 ? 1 : 2;
        ctx.fillRect(x,y,s,s);
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  window.VoidShadow = { apply };
})();
