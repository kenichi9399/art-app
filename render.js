// render.js
const Render = (() => {
  let ctx, W=1, H=1, dpr=1;

  // 内部バッファ（軽量化 & 深み）
  let b, bctx, bw=1, bh=1;

  const _makeBuffer = () => {
    dpr = U.getDpr();
    const s = CFG.RENDER.internalScale;

    bw = Math.max(2, Math.floor(W * dpr * s));
    bh = Math.max(2, Math.floor(H * dpr * s));

    b = document.createElement("canvas");
    b.width = bw; b.height = bh;
    bctx = b.getContext("2d", { alpha:false, desynchronized:true });
    bctx.imageSmoothingEnabled = true;
  };

  const resize = (c, w, h) => {
    ctx = c.getContext("2d", { alpha:false, desynchronized:true });
    W = w; H = h;

    const d = U.getDpr();
    c.width = Math.floor(w * d);
    c.height = Math.floor(h * d);
    ctx.setTransform(d,0,0,d,0,0);
    ctx.imageSmoothingEnabled = true;

    _makeBuffer();
  };

  const _clear = () => {
    // 残像をうっすら残す（深み）
    bctx.globalCompositeOperation = "source-over";
    bctx.fillStyle = `rgba(5,7,13,${CFG.RENDER.softAlpha})`;
    bctx.fillRect(0,0,bw,bh);
  };

  const _drawParticle = (p, scale, hard=false) => {
    const x = p.x * bw;
    const y = p.y * bh;

    const rr = p.r * scale;
    const a = p.a;

    // 中心硬め、外側柔らかめ
    const g = bctx.createRadialGradient(x,y,0, x,y, rr*3.2);
    if (hard) {
      g.addColorStop(0.0, `rgba(255,255,255,${0.85*a})`);
      g.addColorStop(0.22, `rgba(255,255,255,${0.42*a})`);
      g.addColorStop(1.0, `rgba(255,255,255,0)`);
    } else {
      g.addColorStop(0.0, `rgba(255,255,255,${0.35*a})`);
      g.addColorStop(1.0, `rgba(255,255,255,0)`);
    }

    bctx.fillStyle = g;
    bctx.beginPath();
    bctx.arc(x,y, rr*3.2, 0, U.TAU);
    bctx.fill();
  };

  const draw = (data) => {
    _clear();

    const { P, Fog, clumps, core } = data;

    // additiveで光を重ねる
    bctx.globalCompositeOperation = CFG.RENDER.blend;

    // 霧（軽い）
    for (const p of Fog) _drawParticle(p, 0.9, false);

    // clumps（塊の芯）
    for (const c of clumps) {
      const fake = { x:c.x, y:c.y, r: 2.0 + c.mass*1.8, a: 0.85 + c.heat*0.35 };
      _drawParticle(fake, 1.2, true);
    }

    // 主粒子
    for (const p of P) _drawParticle(p, 1.0, true);

    // core（核の光）
    const cx = core.x * bw, cy = core.y * bh;
    const cr = (14 + core.gather*22);
    const cg = bctx.createRadialGradient(cx,cy,0, cx,cy, cr*3.2);
    cg.addColorStop(0, `rgba(210,220,255,${0.45 + core.gather*0.25})`);
    cg.addColorStop(0.22, `rgba(190,200,255,${0.18 + core.gather*0.22})`);
    cg.addColorStop(1, `rgba(190,200,255,0)`);
    bctx.fillStyle = cg;
    bctx.beginPath();
    bctx.arc(cx,cy, cr*3.2, 0, U.TAU);
    bctx.fill();

    // 仕上げ：画面へ転送（アップスケール）
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = CFG.RENDER.background;
    ctx.fillRect(0,0,W,H);
    ctx.drawImage(b, 0,0,bw,bh, 0,0,W,H);

    // 影と粒状感
    VoidShadow.draw(ctx, W, H, core.gather);
  };

  return { resize, draw };
})();
