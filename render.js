;(() => {
  class Renderer {
    constructor() {}

    clear(ctx, w, h) {
      // “層”を残しつつ、白飛びしないように控えめにクリア
      ctx.fillStyle = `rgba(${CFG.BG[0]},${CFG.BG[1]},${CFG.BG[2]},${CFG.CLEAR_ALPHA})`;
      ctx.fillRect(0, 0, w, h);
    }

    drawCores(ctx, cores) {
      for (const c of cores) {
        if (!c.alive) continue;

        const r = c.r;
        const e = c.energy;

        // 二層グロー：中心の核＋外側の膜
        const g1 = ctx.createRadialGradient(c.p.x, c.p.y, 0, c.p.x, c.p.y, r * 2.2);
        const guard = CFG.WHITE_CLIP_GUARD;

        g1.addColorStop(0, `rgba(255,255,255,${0.70 * guard})`);
        g1.addColorStop(0.15, `rgba(210,220,255,${0.30 * guard})`);
        g1.addColorStop(0.55, `rgba(160,170,210,${0.10 * guard})`);
        g1.addColorStop(1, "rgba(0,0,0,0)");

        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.arc(c.p.x, c.p.y, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // 中心の“核”を出す（白飛びさせない）
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.75 + 0.20 * e;
        ctx.fillStyle = "rgba(245,248,255,0.8)";
        ctx.beginPath();
        ctx.arc(c.p.x, c.p.y, r * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    }

    drawParticles(ctx, ps) {
      // 粒：screen寄りにして光の膜を作る（白飛びガード）
      ctx.globalCompositeOperation = "screen";

      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];

        // 小粒は霧っぽく、大粒は硬い点に
        const rr = p.r;
        const alpha = p.a * CFG.WHITE_CLIP_GUARD;

        if (rr < 0.9) {
          ctx.fillStyle = `rgba(220,230,255,${alpha * 0.75})`;
          ctx.fillRect(p.p.x, p.p.y, 1, 1);
        } else {
          // ふわっとした点（軽いグロー）
          const g = ctx.createRadialGradient(p.p.x, p.p.y, 0, p.p.x, p.p.y, rr * 2.2);
          g.addColorStop(0, `rgba(255,255,255,${alpha})`);
          g.addColorStop(0.35, `rgba(200,210,255,${alpha * 0.55})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.p.x, p.p.y, rr * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation = "source-over";
    }
  }

  window.Renderer = Renderer;
})();
