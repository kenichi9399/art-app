// void_shadow.js
const VoidShadow = (() => {
  const draw = (ctx, W, H, gather=0) => {
    // vignette
    const g = ctx.createRadialGradient(W*0.5, H*0.45, 0, W*0.5, H*0.45, Math.max(W,H)*0.72);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.65, `rgba(0,0,0,${0.10 + gather*0.08})`);
    g.addColorStop(1.0, `rgba(0,0,0,${CFG.RENDER.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,W,H);

    // subtle grain（軽量）
    const a = CFG.RENDER.grain * (0.9 + gather*0.35);
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = "overlay";
    const step = 2;
    for (let y=0;y<H;y+=step){
      for (let x=0;x<W;x+=step){
        const v = (Math.random()*2-1)*0.10;
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, v)})`;
        ctx.fillRect(x,y,1,1);
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  return { draw };
})();
