// particles.js
(() => {
  const U = window.U, CFG = window.CFG, INPUT = window.INPUT, FIELD = window.FIELD;

  const P = (window.PARTICLES = {
    ps: [],
    w: 0, h: 0
  });

  function pickRadius() {
    // 小粒多め・中粒普通・大粒ごく少数
    const r = Math.random();
    if (r < 0.72) return U.randf(CFG.R_SMALL[0], CFG.R_SMALL[1]);
    if (r < 0.96) return U.randf(CFG.R_MID[0], CFG.R_MID[1]);
    return U.randf(CFG.R_BIG[0], CFG.R_BIG[1]);
  }

  function spawnOne() {
    const x = U.randf(0, P.w);
    const y = U.randf(0, P.h);
    const rad = pickRadius();
    return {
      x, y,
      vx: U.randf(-0.25, 0.25),
      vy: U.randf(-0.25, 0.25),
      r: rad,
      // “霧/硬さ”の混在：小さいほど霧寄り
      hard: U.clamp((rad - 0.35) / (5.0 - 0.35), 0, 1),
      a: U.randf(0.2, 0.9)
    };
  }

  P.resize = function (w, h) {
    P.w = w; P.h = h;
    P.reset();
  };

  P.reset = function () {
    P.ps = [];

    const base = CFG.P_BASE;
    // 画面が大きいほど増やすが上限あり
    const scale = Math.sqrt((P.w * P.h) / (390 * 844));
    let n = Math.floor(base * U.clamp(scale, 0.8, 1.55));
    n = Math.min(n, CFG.P_MAX);

    for (let i = 0; i < n; i++) P.ps.push(spawnOne());
  };

  P.update = function (dt) {
    const ps = P.ps;
    const main = FIELD.getMainCore();
    if (!main) return;

    // 入力影響
    const tx = INPUT?.p.x ?? 0;
    const ty = INPUT?.p.y ?? 0;

    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];

      // flow field
      const [fx, fy] = FIELD.sampleFlow(p.x, p.y);
      p.vx += fx * 0.35 * dt;
      p.vy += fy * 0.35 * dt;

      // core attract（中心の“核感”）
      const dx = main.x - p.x;
      const dy = main.y - p.y;
      const d2 = dx * dx + dy * dy + 80;
      const inv = 1.0 / Math.sqrt(d2);
      // 小粒ほど流されやすい、硬い粒ほど核へ
      const k = (0.85 + p.hard * 1.15);
      p.vx += dx * inv * (0.85 * k) * dt;
      p.vy += dy * inv * (0.85 * k) * dt;

      // swirl（複雑さ）
      p.vx += (-dy * inv) * CFG.SWIRL * (0.35 + p.hard) * dt;
      p.vy += ( dx * inv) * CFG.SWIRL * (0.35 + p.hard) * dt;

      // touch: tap/longpress で「集まる/ほどける」の差
      if (INPUT?.down) {
        const txd = p.x - tx;
        const tyd = p.y - ty;
        const td = Math.hypot(txd, tyd);

        if (td < CFG.TOUCH_RADIUS) {
          const t = 1 - td / CFG.TOUCH_RADIUS;

          if (INPUT.longPress) {
            // 長押し：寄せる（核へ同調）
            p.vx += (main.x - p.x) * 0.0022 * t;
            p.vy += (main.y - p.y) * 0.0022 * t;
          } else if (INPUT.dragging) {
            // ドラッグ：流れが優先（ここでは軽く拡散）
            p.vx += txd * 0.0008 * (1 - p.hard) * t;
            p.vy += tyd * 0.0008 * (1 - p.hard) * t;
          } else {
            // タップ：軽い脈動（白飛びさせない）
            p.vx += (-tyd) * 0.0011 * t;
            p.vy += ( txd) * 0.0011 * t;
          }
        }
      }

      // friction + integrate
      p.vx *= CFG.FRICTION;
      p.vy *= CFG.FRICTION;

      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;

      // wrap（端で消えずに巡回）
      if (p.x < -20) p.x += P.w + 40;
      if (p.x > P.w + 20) p.x -= P.w + 40;
      if (p.y < -20) p.y += P.h + 40;
      if (p.y > P.h + 20) p.y -= P.h + 40;
    }
  };
})();
