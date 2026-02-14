// render.js
const Render = (() => {
  let ctx, W=1, H=1, dpr=1;
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
    bctx.globalCompositeOperation = "source-over";
    bctx.fillStyle = `rgba(5,7,13,${CFG.RENDER.softAlpha})`;
    bctx.fillRect(0,0,bw,bh);
  };

  const _drawParticle = (p, scale, hard=false) => {
    const x = p.x * bw;
    const y = p.y * bh;

    const rr = p.r * scale;
    const a = p.a;

    // ※ 白飛び対策：中心のαを落として、密集しても真っ白になりにくくする
    const coreA = hard ? (0.42 * a * CFG.P.glow) : (0.18 * a * CFG.P.glow);
    const midA  = hard ? (0.16 * a * CFG.P.glow) : (0.06 * a * CFG.P.glow);

    const g = bctx.createRadialGradient(x,y,0, x,y, rr*3.0);
    g.addColorStop(0.0, `rgba(255,255,255,${coreA})`);
    g.addColorStop(0.22, `rgba(255,255,255,${midA})`);
    g.addColorStop(1.0, `rgba(255,255,255,0)`);

    bctx.fillStyle = g;
    bctx.beginPath();
    bctx.arc(x,y, rr*3.0, 0, U.TAU);
    bctx.fill();
  };

  const draw = (data) => {
    _clear();

    const { P, Fog, clumps, core } = data;

    // 発光合成（白飛びしにくい）
    bctx.globalCompositeOperation = CFG.RENDER.blend;

    // 霧
    for (const p of Fog) _drawParticle(p, 0.95, false);

    // clumps（塊の芯）
    for (const c of clumps) {
      const fake = { x:c.x, y:c.y, r: 1.8 + c.mass*1.4, a: 0.55 + c.heat*0.25 };
      _drawParticle(fake, 1.05, true);
    }

    // 主粒子
    for (const p of P) _drawParticle(p, 1.0, true);

    // core glow（核）
    const cx = core.x * bw, cy = core.y * bh;
    const cr = (12 + core.gather*18);
    const cg = bctx.createRadialGradient(cx,cy,0, cx,cy, cr*3.0);

    // 白飛びしにくい青白
    const gA0 = (0.18 + core.gather*0.12) * CFG.P.coreGlow;
    const gA1 = (0.08 + core.gather*0.10) * CFG.P.coreGlow;

    cg.addColorStop(0,   `rgba(200,210,255,${gA0})`);
    cg.addColorStop(0.2, `rgba(190,200,255,${gA1})`);
    cg.addColorStop(1,   `rgba(190,200,255,0)`);

    bctx.fillStyle = cg;
    bctx.beginPath();
    bctx.arc(cx,cy, cr*3.0, 0, U.TAU);
    bctx.fill();

    // 画面へ転送（exposureで頭打ち）
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = CFG.RENDER.background;
    ctx.fillRect(0,0,W,H);

    ctx.globalAlpha = CFG.RENDER.exposure;  // ←露出を抑える（白飛び防止）
    ctx.drawImage(b, 0,0,bw,bh, 0,0,W,H);
    ctx.globalAlpha = 1;

    // 影・粒状
