// render.js
const Render = (() => {
  let ctx, W=1, H=1;
  let b, bctx, bw=1, bh=1;

  const _makeBuffer = () => {
    const dpr = U.getDpr();
    const s = (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) ? 0.92 : 1.0;

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

    _makeBuffer();
  };

  // 残像（深み）：溜まりすぎると白飛びするので少し強めに消す
  const _clear = () => {
    bctx.globalCompositeOperation = "source-over";
    bctx.fillStyle = "rgba(5,7,13,0.14)";
    bctx.fillRect(0,0,bw,bh);
  };

  const _drawParticle = (p, scale, hard=false) => {
    const x = p.x * bw, y = p.y * bh;
    const rr = p.r * scale;

    // 白飛び防止：中心αを抑える（密集しても白になりにくい）
    const a = p.a;
    const coreA = hard ? (0.20 * a) : (0.08 * a);
    const midA  = hard ? (0.10 * a) : (0.04 * a);

    const g = bctx.createRadialGradient(x,y,0, x,y, rr*3.1);
    g.addColorStop(0.0, `rgba(255,255,255,${coreA})`);
    g.addColorStop(0.22, `rgba(255,255,255,${midA})`);
    g.addColorStop(1.0, `rgba(255,255,255,0)`);

    bctx.fillStyle = g;
    bctx.beginPath();
    bctx.arc(x,y, rr*3.1, 0, U.TAU);
    bctx.fill();
  };

  // 生物的“膜”：核まわりの薄い輪郭
  const _drawMembrane = (core, clumps) => {
    const cx = core.x * bw, cy = core.y * bh;

    // 変形量：粒子密度 + 集め具合 + 脈動
    const deform = core.deform;
    const k = core.gather;
    const pulse = core.pulse;

    const base = 26 + core.mass * 10;
    const amp = (8 + 18*deform + 10*k + 14*pulse);

    // 2色（ごく薄く）：生物×抽象
    const c1 = { r: 160, g: 220, b: 190 }; // green-ish
    const c2 = { r: 185, g: 150, b: 255 }; // purple-ish

    // 外膜（青白）
    bctx.globalCompositeOperation = "screen";

    for (let layer = 0; layer < 3; layer++) {
      const t = (layer / 2);
      const rad = base + t * 18;
      const a = 0.10 + (0.06 * k) + (0.04 * pulse);

      const grad = bctx.createRadialGradient(cx,cy, rad*0.2, cx,cy, rad*2.2);
      grad.addColorStop(0.0, `rgba(200,210,255,${0.00})`);
      grad.addColorStop(0.35, `rgba(200,210,255,${0.06*a})`);
      grad.addColorStop(0.65, `rgba(200,210,255,${0.12*a})`);
      grad.addColorStop(1.0, `rgba(200,210,255,0)`);

      bctx.fillStyle = grad;
      bctx.beginPath();
      bctx.arc(cx,cy, rad*2.2, 0, U.TAU);
      bctx.fill();
    }

    // 膜の“色味の偏り”（中心に寄りすぎず、抽象として漂う）
    const wob1 = U.fbm2(core.phase*0.22, 3.7, 3, 2.0, 0.5);
    const wob2 = U.fbm2(7.1, core.phase*0.22, 3, 2.0, 0.5);

    const px1 = cx + wob1 * 120;
    const py1 = cy + wob2 * 90;
    const px2 = cx - wob2 * 110;
    const py2 = cy + wob1 * 80;

    const tint = (col, x, y, strength) => {
      const g = bctx.createRadialGradient(x,y,0, x,y, base*5.0);
      g.addColorStop(0.0, `rgba(${col.r},${col.g},${col.b},${0.10*strength})`);
      g.addColorStop(0.35, `rgba(${col.r},${col.g},${col.b},${0.05*strength})`);
      g.addColorStop(1.0, `rgba(${col.r},${col.g},${col.b},0)`);
      bctx.fillStyle = g;
      bctx.beginPath();
      bctx.arc(x,y, base*5.0, 0, U.TAU);
      bctx.fill();
    };

    tint(c1, px1, py1, 0.9 + 0.8*deform);
    tint(c2, px2, py2, 0.8 + 0.9*k);

    // 黒い“空洞”（C要素）：中心に吸い込みの影を置く
    bctx.globalCompositeOperation = "multiply";
    const holeR = (10 + 16*deform + 12*k);
    const hole = bctx.createRadialGradient(cx,cy,0, cx,cy, holeR*3.0);
    hole.addColorStop(0.0, `rgba(0,0,0,${0.55})`);
    hole.addColorStop(0.40, `rgba(0,0,0,${0.28})`);
    hole.addColorStop(1.0, `rgba(0,0,0,0)`);
    bctx.fillStyle = hole;
    bctx.beginPath();
    bctx.arc(cx,cy, holeR*3.0, 0, U.TAU);
    bctx.fill();

    // clumpsにも薄い膜をのせる（合体の“核感”）
    bctx.globalCompositeOperation = "screen";
    for (const c of clumps) {
      const x = c.x * bw, y = c.y * bh;
      const r = 10 + c.mass * 22;

      const g = bctx.createRadialGradient(x,y,0, x,y, r*2.7);
      g.addColorStop(0.0, `rgba(210,220,255,${0.06 + 0.08*c.heat})`);
      g.addColorStop(0.3, `rgba(200,210,255,${0.04 + 0.05*c.heat})`);
      g.addColorStop(1.0, `rgba(200,210,255,0)`);
      bctx.fillStyle = g;
      bctx.beginPath();
      bctx.arc(x,y, r*2.7, 0, U.TAU);
      bctx.fill();
    }

    // 仕上げ：白飛びを“頭打ち”にする薄膜（ここが決定打）
    // screenで増えた光を、最後にsource-overの暗い膜で抑える
    bctx.globalCompositeOperation = "source-over";
    bctx.fillStyle = `rgba(5,7,13,${0.06 + 0.10*k + 0.06*deform})`;
    bctx.fillRect(0,0,bw,bh);
  };

  const draw = (data) => {
    _clear();

    const { P, Fog, clumps, core } = data;

    // 粒子の合成
    bctx.globalCompositeOperation = "screen";

    // 霧
    for (const p of Fog) _drawParticle(p, 0.95, false);

    // clumps（芯）
    for (const c of clumps) {
      const fake = { x:c.x, y:c.y, r: 1.0 + c.mass*1.1, a: 0.55 + c.heat*0.25 };
      _drawParticle(fake, 1.1, true);
    }

    // 主粒子（硬い）
    for (const p of P) _drawParticle(p, 1.0, true);

    // 生物的膜＋空洞
    _drawMembrane(core, clumps);

    // main canvasへ
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#05070d";
    ctx.fillRect(0,0,W,H);

    // “露出”を少し抑える（白飛び抑制）
    ctx.globalAlpha = 0.86;
    ctx.drawImage(b, 0,0,bw,bh, 0,0,W,H);
    ctx.globalAlpha = 1;

    // vignette + grain（深み）
    VoidShadow.draw(ctx, W, H, core.gather);
  };

  return { resize, draw };
})();
