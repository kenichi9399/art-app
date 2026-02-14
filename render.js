// render.js (with touch indicator)

const Render = (() => {
  let canvas, ctx;
  let w = 0, h = 0, dpr = 1;

  let glowC, glowX;

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(CFG.DPR_MAX, window.devicePixelRatio || 1);

    w = Math.max(1, Math.floor(r.width * dpr));
    h = Math.max(1, Math.floor(r.height * dpr));

    canvas.width = w;
    canvas.height = h;

    if (!glowC) {
      glowC = document.createElement("canvas");
      glowX = glowC.getContext("2d", { alpha: true });
    }
    glowC.width = w;
    glowC.height = h;

    Particles.setNormScale(Math.max(w, h));
  };

  const init = (c) => {
    canvas = c;
    ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    if (!ctx) throw new Error("Canvas 2D context not available.");
    resize();
    window.addEventListener("resize", resize);
  };

  const px = (nx, ny) => ({ x: nx * w, y: ny * h });

  const drawCore = (t, corePx, core) => {
    glowX.clearRect(0, 0, w, h);
    glowX.save();
    glowX.globalCompositeOperation = "lighter";

    const pulse = 1 + Math.sin(t * core.pulseSpeed) * core.pulseAmp;

    const cx = corePx.x, cy = corePx.y;
    const baseR = core.baseRadius * dpr * pulse;
    const glowR = core.glowRadius * dpr * pulse;

    const g0 = glowX.createRadialGradient(cx, cy, 0, cx, cy, baseR * 2.2);
    g0.addColorStop(0.0, "rgba(255,255,255,0.95)");
    g0.addColorStop(0.25, "rgba(235,245,255,0.70)");
    g0.addColorStop(1.0, "rgba(235,245,255,0.0)");
    glowX.fillStyle = g0;
    glowX.beginPath();
    glowX.arc(cx, cy, baseR * 2.2, 0, U.TAU);
    glowX.fill();

    for (let i = 0; i < 5; i++) {
      const rr = glowR * (0.22 + i * 0.16);
      const a = 0.055 - i * 0.008;
      const g = glowX.createRadialGradient(cx, cy, rr * 0.35, cx, cy, rr);
      g.addColorStop(0.0, `rgba(210,225,255,0)`);
      g.addColorStop(0.55, `rgba(210,225,255,${a})`);
      g.addColorStop(1.0, `rgba(210,225,255,0)`);
      glowX.fillStyle = g;
      glowX.beginPath();
      glowX.arc(cx, cy, rr, 0, U.TAU);
      glowX.fill();
    }

    const gb = glowX.createRadialGradient(cx, cy, 0, cx, cy, glowR * 0.75);
    gb.addColorStop(0.0, "rgba(120,160,255,0.08)");
    gb.addColorStop(1.0, "rgba(120,160,255,0.0)");
    glowX.fillStyle = gb;
    glowX.beginPath();
    glowX.arc(cx, cy, glowR * 0.75, 0, U.TAU);
    glowX.fill();

    glowX.restore();

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 1.0;
    ctx.drawImage(glowC, 0, 0);
    ctx.restore();
  };

  const drawParticles = (t, corePx, data) => {
    const { P, D } = data;

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < D.length; i++) {
      const p = D[i];
      const x = p.x * w;
      const y = p.y * h;
      const tw = Math.sin(p.tw * 0.8 + t * 0.7) * 0.5 + 0.5;

      const a = U.lerp(CFG.DUST.alphaMin, CFG.DUST.alphaMax, tw) * p.a;
      if (a < 0.003) continue;

      ctx.fillStyle = `rgba(230,240,255,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, p.r * dpr, 0, U.TAU);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const x = p.x * w;
      const y = p.y * h;

      const d = U.dist2(x, y, corePx.x, corePx.y);
      const dn = U.clamp(1 - d / (Math.min(w, h) * 0.45), 0, 1);

      const sp = (Math.sin(p.tw * (1.3 + p.sp)) * 0.5 + 0.5);
      const sparkle = 1 + sp * CFG.P.sparkle;

      const a = U.clamp(p.a * (0.12 + dn * 0.95) * sparkle, 0, 0.35);
      if (a < 0.004) continue;

      const b = 235 + dn * 20;
      const tintB = U.clamp(b, 220, 255);

      const rr = p.r * dpr;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 5.5);
      g.addColorStop(0.0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.25, `rgba(240,245,255,${a * 0.55})`);
      g.addColorStop(1.0, `rgba(200,220,${tintB},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rr * 5.5, 0, U.TAU);
      ctx.fill();
    }
    ctx.restore();
  };

  const drawTouchIndicator = (input) => {
    if (!input?.down) return;
    const p = px(input.x, input.y);

    ctx.save();
    ctx.globalCompositeOperation = "screen";

    const R = 70 * dpr;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    g.addColorStop(0.0, "rgba(180,210,255,0.20)");
    g.addColorStop(0.55, "rgba(180,210,255,0.06)");
    g.addColorStop(1.0, "rgba(180,210,255,0.0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, R, 0, U.TAU);
    ctx.fill();

    // thin ring
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = "rgba(220,240,255,0.35)";
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 28 * dpr, 0, U.TAU);
    ctx.stroke();

    ctx.restore();
  };

  const draw = (t, core, data, input) => {
    const corePx = px(core.x, core.y);

    VoidShadow.draw(ctx, w, h, corePx, t);
    drawParticles(t, corePx, data);
    drawCore(t, corePx, core);

    // show touch = input is working
    drawTouchIndicator(input);

    VoidShadow.grain(ctx, w, h);
  };

  const snapshot = (filename = CFG.SAVE.filename) => {
    try {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      U.toast("保存しました");
    } catch (e) {
      U.toast("保存できませんでした（iOS制限の可能性）");
    }
  };

  return { init, resize, draw, snapshot, px, get ctx(){ return ctx; }, get size(){ return { w, h, dpr }; } };
})();
