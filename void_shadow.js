// void_shadow.js
(() => {
  const U = window.U, FIELD = window.FIELD;

  const V = (window.VOID = {
    vignette: null,
    w: 0, h: 0
  });

  V.resize = function (w, h, dpr) {
    V.w = w; V.h = h;

    // vignette生成
    const c = document.createElement("canvas");
    c.width = Math.floor(w * dpr);
    c.height = Math.floor(h * dpr);
    const g = c.getContext("2d");

    g.clearRect(0,0,c.width,c.height);

    const cx = c.width * 0.52;
    const cy = c.height * 0.46;
    const r0 = Math.min(c.width, c.height) * 0.15;
    const r1 = Math.min(c.width, c.height) * 0.72;

    const grd = g.createRadialGradient(cx, cy, r0, cx, cy, r1);
    grd.addColorStop(0.0, "rgba(0,0,0,0.0)");
    grd.addColorStop(0.65, "rgba(0,0,0,0.30)");
    grd.addColorStop(1.0, "rgba(0,0,0,0.78)");
    g.fillStyle = grd;
    g.fillRect(0,0,c.width,c.height);

    V.vignette = c;
  };

  V.draw = function (ctx, w, h) {
    // vignette
    if (V.vignette) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 1.0;
      ctx.drawImage(V.vignette, 0, 0, w, h);
      ctx.restore();
    }

    // 核の周りに“影の膜”を薄く
    const core = FIELD.getMainCore();
    if (core) {
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      const r = Math.min(w, h) * 0.20;
      const grd = ctx.createRadialGradient(core.x, core.y, r*0.05, core.x, core.y, r);
      grd.addColorStop(0, "rgba(0,0,0,0.0)");
      grd.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  };
})();
