// render.js
(() => {
  const CFG = window.CFG, FIELD = window.FIELD, P = window.PARTICLES;

  const R = (window.RENDER = {
    w: 0, h: 0,
    glow: null,
    gctx: null
  });

  R.resize = function (w, h, dpr) {
    R.w = w; R.h = h;

    const c = document.createElement("canvas");
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
    const g = c.getContext("2d");
    g.setTransform(dpr,0,0,dpr,0,0);

    R.glow = c;
    R.gctx = g;
  };

  function drawCore(ctx, x, y, s) {
    // 中心白 + 青灰のハロー（白飛び抑制）
    ctx.save();
    const r0 = 2 * s;
    const r1 = 42 * s;

    const grd = ctx.createRadialGradient(x, y, r0, x, y, r1);
    grd.addColorStop(0.00, `rgba(255,255,255,${0.90 * CFG.EXPOSURE})`);
    grd.addColorStop(0.25, `rgba(210,220,255,${0.28 * CFG.EXPOSURE})`);
    grd.addColorStop(1.00, `rgba(180,190,220,0.0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(x, y, r1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  R.draw = function (ctx, w, h) {
    // 1) 背景：薄く黒を重ねて残像
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = `rgba(0,0,0,${CFG.BG_ALPHA})`;
    ctx.fillRect(0,0,w,h);
    ctx.restore();

    // 2) 粒子（まず通常合成）
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    const ps = P.ps;

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];

      // 小粒は淡く、硬い粒は少し強い
      const a = (0.06 + p.hard * 0.10) * p.a * CFG.EXPOSURE;
      ctx.fillStyle = `rgba(255,255,255,${a})`;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3) 核（合体していく“中心”）
    const main = FIELD.getMainCore();
    if (main) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      drawCore(ctx, main.x, main.y, 1.0);
      ctx.restore();
    }
  };
})();
