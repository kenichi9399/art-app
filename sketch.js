// sketch.js
(() => {
  const U = window.U;
  const CFG = window.CFG;
  const INPUT = window.INPUT;

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

  const P = new window.Particles();
  const field = new window.Field();
  const voidShadow = new window.VoidShadow();
  const R = new window.Renderer();

  let W = 0, H = 0;
  let lastT = U.now();

  // 2〜3個の核 → 合体して1つへ
  const cores = [];

  function resetCores() {
    cores.length = 0;
    const n = CFG.CORE_COUNT_INIT;
    for (let i = 0; i < n; i++) {
      cores.push({
        x: W * (0.40 + 0.20 * Math.random()),
        y: H * (0.34 + 0.25 * Math.random()),
        vx: U.randf(-0.15, 0.15),
        vy: U.randf(-0.15, 0.15),
        radius: U.randf(10, 18),
        mass: U.randf(0.9, 1.2),
        energy: 0.0,
      });
    }
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(CFG.DPR_CAP, window.devicePixelRatio || 1);

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    field.resize(W, H);
    voidShadow.resize(W, H);

    P.seed();
    resetCores();
  }

  // 入力を確実に有効化
  INPUT.attach(canvas);

  // Resetボタン
  document.getElementById("btnReset").addEventListener("click", () => {
    field.reset();
    P.reset();
    resetCores();
  }, { passive: true });

  window.addEventListener("resize", resize);
  resize();

  function mergeCores() {
    for (let i = cores.length - 1; i >= 0; i--) {
      for (let j = i - 1; j >= 0; j--) {
        const a = cores[i], b = cores[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d = Math.hypot(dx, dy);

        if (d < CFG.CORE_MERGE_DIST) {
          const m1 = a.mass, m2 = b.mass;
          const m = m1 + m2;

          b.x = (a.x*m1 + b.x*m2) / m;
          b.y = (a.y*m1 + b.y*m2) / m;
          b.vx = (a.vx*m1 + b.vx*m2) / m;
          b.vy = (a.vy*m1 + b.vy*m2) / m;

          b.mass = m;
          b.radius = Math.min(28, b.radius + a.radius * 0.38);
          b.energy = Math.max(b.energy, a.energy) + 0.12;

          cores.splice(i, 1);
          break;
        }
      }
    }
  }

  // ✅ タップを「確実に視覚変化」に変換する（白飛びしない範囲）
  function applyTapImpulse() {
    if (INPUT.tapImpulse !== 1) return;

    const tx = INPUT.tapPos.x;
    const ty = INPUT.tapPos.y;

    // 1) 核に「息」：近い核ほどエネルギーが少し上がる
    for (const c of cores) {
      const d = Math.hypot(c.x - tx, c.y - ty);
      const k = Math.exp(-d * 0.02); // 近いほど強い
      c.energy = U.clamp(c.energy + k * 0.35, 0, 1);
      c.vx += (c.x - tx) * 0.0006 * k; // ほんの少し揺らす
      c.vy += (c.y - ty) * 0.0006 * k;
    }

    // 2) 粒子に小さな波（“何も起きない”を回避）
    //    ※白飛びしないよう、速度だけを動かす（描画強度はrender側で制御）
    for (let i = 0; i < P.n; i++) {
      const x = P.x[i], y = P.y[i];
      const dx = x - tx;
      const dy = y - ty;
      const d = Math.hypot(dx, dy);
      if (d < 220) {
        const k = Math.exp(-d * 0.028) * 0.9;
        P.vx[i] += dx * 0.0016 * k;
        P.vy[i] += dy * 0.0016 * k;
      }
    }

    // 3) タップの“痕”として場を少しだけ刻む（層）
    //    fieldに直接書くのは重いので、近接セルだけ軽く
    //    （Field側はdrag用の設計だが、ここでは“残留感”を足すだけ）
    const cx = (tx / field.s) | 0;
    const cy = (ty / field.s) | 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const x = cx + ox;
        const y = cy + oy;
        if (x < 0 || y < 0 || x >= field.cols || y >= field.rows) continue;
        const id = y * field.cols + x;
        field.carve[id] = U.clamp(field.carve[id] + 0.18, 0, 1);
      }
    }

    // ✅ 消費
    INPUT.consumeTap();
  }

  function stepCores(dt) {
    for (const c of cores) {
      // ゆっくり漂う
      c.vx += U.randf(-1, 1) * CFG.CORE_DRIFT;
      c.vy += U.randf(-1, 1) * CFG.CORE_DRIFT;

      // 長押し：集める
      if (INPUT.down && INPUT.longPress) {
        const dx = INPUT.p.x - c.x;
        const dy = INPUT.p.y - c.y;
        c.vx += dx * 0.0012;
        c.vy += dy * 0.0012;
        c.energy = U.clamp(c.energy + 0.02, 0, 1);
      }

      // 減衰
      c.energy *= 0.96;

      // 位置更新
      c.x += c.vx;
      c.y += c.vy;
      c.vx *= 0.985;
      c.vy *= 0.985;

      // 画面内
      if (c.x < 40) { c.x = 40; c.vx *= -0.6; }
      if (c.x > W-40) { c.x = W-40; c.vx *= -0.6; }
      if (c.y < 40) { c.y = 40; c.vy *= -0.6; }
      if (c.y > H-40) { c.y = H-40; c.vy *= -0.6; }
    }

    mergeCores();
  }

  function stepParticles(dt) {
    for (let i = 0; i < P.n; i++) {
      let x = P.x[i], y = P.y[i];
      let vx = P.vx[i], vy = P.vy[i];

      // 彫られた流れ
      const f = field.sample(x, y);
      vx += f.x * 0.32;
      vy += f.y * 0.32;

      // 核の引力＋渦
      for (const c of cores) {
        const dx = c.x - x;
        const dy = c.y - y;
        const d2 = dx*dx + dy*dy + 90;
        const inv = 1.0 / d2;

        const pull = CFG.CORE_PULL * c.mass;
        vx += dx * inv * pull;
        vy += dy * inv * pull;

        const swirl = (0.0009 + c.energy * 0.0016) * c.mass;
        vx += -dy * inv * swirl;
        vy +=  dx * inv * swirl;
      }

      // 更新
      x += vx;
      y += vy;

      // 摩擦（カクつき軽減）
      vx *= 0.985;
      vy *= 0.985;

      // 外に出たら戻す
      if (x < -40 || x > W + 40 || y < -40 || y > H + 40) {
        x = U.randf(0, W);
        y = U.randf(0, H);
        vx = U.randf(-0.05, 0.05);
        vy = U.randf(-0.05, 0.05);
      }

      P.x[i] = x; P.y[i] = y;
      P.vx[i] = vx; P.vy[i] = vy;
    }
  }

  function frame() {
    const t = U.now();
    const dt = Math.min(33, t - lastT);
    lastT = t;

    // 入力→場
    field.step(INPUT);

    // ✅ ここでタップを確実に反映（フレーム跨ぎで拾う）
    applyTapImpulse();

    // 進行
    stepCores(dt);
    stepParticles(dt);

    // 描画
    R.clear(ctx, W, H);
    R.drawParticles(ctx, P, field, cores);
    R.drawCores(ctx, cores);
    voidShadow.draw(ctx, W, H);

    // 後処理
    INPUT.tick();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
