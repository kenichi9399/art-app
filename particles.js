// particles.js
const Particles = (() => {
  let W = 1, H = 1;
  let count = 1000;

  // “核”
  const core = {
    x: 0.52, y: 0.43,
    vx: 0, vy: 0,
    mass: CFG.P.coreBaseMass,
    gather: 0,        // 0..1（長押しで上がる）
  };

  // 合体（クラスタ）… 少数の塊が育つ
  const clumps = []; // {x,y,mass,heat}

  const P = [];      // main particles
  const Fog = [];    // peripheral mist particles

  const _pickCount = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const base = isMobile ? CFG.P.countMobile : CFG.P.countDesktop;

    // 画面面積で少しスケール
    const area = Math.min(1.35, Math.max(0.75, (W*H) / (390*844)));
    return Math.floor(base * area);
  };

  const _initClumps = () => {
    clumps.length = 0;
    // 核の近くに“芽”を2〜3個用意（最初から深みを作る）
    const n = 3;
    for (let i=0;i<n;i++){
      clumps.push({
        x: U.clamp(core.x + U.randn()*0.06, 0.15, 0.85),
        y: U.clamp(core.y + U.randn()*0.06, 0.15, 0.85),
        mass: 0.8 + Math.random()*0.6,
        heat: 0.0
      });
    }
  };

  const _spawn = (arr, n, rMin, rMax, biasToCore=false) => {
    arr.length = 0;
    for (let i=0;i<n;i++){
      const b = biasToCore ? 0.62 : 0.35;
      const x = biasToCore ? U.clamp(core.x + U.randn()*b, 0, 1) : Math.random();
      const y = biasToCore ? U.clamp(core.y + U.randn()*b, 0, 1) : Math.random();

      // サイズ分布：小粒が多く、たまに大粒
      const t = Math.pow(Math.random(), 2.35);
      const r = U.lerp(rMax, rMin, t);

      arr.push({
        x, y, vx: 0, vy: 0,
        r,
        m: Math.max(0.08, r*r*0.18),
        a: 0.55 + Math.random()*0.45,
        kind: 0
      });
    }
  };

  const resize = (w, h) => {
    W = w; H = h;
  };

  const reset = () => {
    core.x = 0.52; core.y = 0.43;
    core.vx = core.vy = 0;
    core.mass = CFG.P.coreBaseMass;
    core.gather = 0;

    count = _pickCount();
    _initClumps();

    // 主粒子（中心寄り）
    _spawn(P, count, CFG.P.rMin, CFG.P.rMax, true);

    // 霧（周縁）
    _spawn(Fog, Math.floor(count*0.65), CFG.P.rFogMin, CFG.P.rFogMax, false);
    Fog.forEach(p => { p.a *= 0.35; p.kind = 1; });
  };

  const getCore = () => core;

  const _wrapSoft = (p) => {
    // 端で消えないように“柔らかく戻す”
    const m = 0.02;
    if (p.x < -m) p.x = 1+m;
    if (p.x > 1+m) p.x = -m;
    if (p.y < -m) p.y = 1+m;
    if (p.y > 1+m) p.y = -m;
  };

  const _applyTouch = (p, inp, strength) => {
    const dx = p.x - inp.x;
    const dy = p.y - inp.y;
    const d = Math.sqrt(dx*dx + dy*dy) + 1e-6;

    // 近いほど強い
    const fall = Math.exp(-d * 28.0);
    const n = U.norm2(dx, dy);

    p.vx += n.x * fall * strength;
    p.vy += n.y * fall * strength;
  };

  const _mergeIntoClumps = (p, gatherK) => {
    // 長押し中は合体が起きやすい
    const mergeR = CFG.P.coreMergeRadius * (1.0 + gatherK*1.7);

    // 最も近いclumpへ寄せる・吸収
    let best = -1;
    let bestD = 1e9;
    for (let i=0;i<clumps.length;i++){
      const c = clumps[i];
      const d = U.dist2(p.x, p.y, c.x, c.y);
      if (d < bestD){ bestD = d; best = i; }
    }

    if (best >= 0 && bestD < mergeR) {
      const c = clumps[best];
      const take = CFG.P.coreMergeGain * (0.6 + gatherK*0.8) * (p.m);
      c.mass += take;
      c.heat = Math.min(1, c.heat + 0.25);

      // 吸われた分、粒子を小さくして“霧化”させる（完全消滅しない）
      p.m = Math.max(0.02, p.m - take);
      p.r = Math.max(0.18, p.r * 0.92);
      p.a = Math.min(1, p.a + 0.08);

      // clumpへ軽く引っ張る
      const dn = U.norm2(c.x - p.x, c.y - p.y);
      p.vx += dn.x * 0.22 * (1+gatherK);
      p.vy += dn.y * 0.22 * (1+gatherK);
    }
  };

  const step = (dt, inp) => {
    // 入力状態
    const down = inp.down;
    const isPress = inp.isPress;

    // gather 0..1 を滑らかに
    const targetGather = isPress ? 1 : 0;
    core.gather = U.lerp(core.gather, targetGather, 1 - Math.pow(0.001, dt));
    const gatherK = core.gather;

    // 核位置：タッチ中は少しだけ追従（作品的に“手触り”を出す）
    if (down) {
      const k = isPress ? 0.10 : 0.06;
      core.x = U.lerp(core.x, inp.x, k);
      core.y = U.lerp(core.y, inp.y, k);
    } else {
      // 微小ドリフト
      core.x = U.clamp(core.x + U.randn()*0.00035, 0.18, 0.82);
      core.y = U.clamp(core.y + U.randn()*0.00025, 0.18, 0.82);
    }

    // clumpsは核の近くで“同化/回転”
    for (const c of clumps) {
      const dn = U.norm2(core.x - c.x, core.y - c.y);
      const pull = (0.10 + 0.26*gatherK);
      const orbit = (0.06 + 0.12*gatherK);
      c.x += (dn.x*pull - dn.y*orbit) * dt;
      c.y += (dn.y*pull + dn.x*orbit) * dt;
      c.heat *= Math.pow(0.02, dt);
    }

    const apply = (arr, touchStrength, isFog=false) => {
      for (const p of arr) {
        // field
        const f = Field.sample(p.x, p.y, dt, core);

        // 微細な揺らぎ
        p.vx += (f.x + U.randn()*CFG.P.jitter) * dt;
        p.vy += (f.y + U.randn()*CFG.P.jitter) * dt;

        // タッチで反応（tap/drag）
        if (down) _applyTouch(p, inp, touchStrength * dt);

        // 長押し中は核へ集める（吸い込み）
        if (gatherK > 0.001) {
          const dn = U.norm2(core.x - p.x, core.y - p.y);
          const pull = (0.35 + 1.4*gatherK) * CFG.P.coreGatherBoost;
          p.vx += dn.x * pull * dt;
          p.vy += dn.y * pull * dt;

          // 合体
          if (!isFog) _mergeIntoClumps(p, gatherK);
        }

        // clamp velocity
        const v = U.norm2(p.vx, p.vy);
        const mv = CFG.P.maxV * (isFog ? 0.8 : 1.0);
        if (v.d > mv) { p.vx = v.x*mv; p.vy = v.y*mv; }

        // integrate
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // damp
        p.vx *= Math.pow(CFG.P.damp, dt*60);
        p.vy *= Math.pow(CFG.P.damp, dt*60);

        _wrapSoft(p);

        // “硬い中心 / 霧の周縁”を維持するため、核距離でアルファ調整
        const dcore = U.dist2(p.x, p.y, core.x, core.y);
        const t = U.clamp(dcore / 0.55, 0, 1);
        if (!isFog) {
          p.a = U.lerp(0.9, 0.45, t);
        } else {
          p.a = U.lerp(0.22, 0.06, t);
        }
      }
    };

    // tap なら impulse強め（1フレームだけ）
    const tapBoost = inp.tap ? (CFG.P.tapImpulse * 2.0) : 1.0;

    apply(P, CFG.P.dragImpulse * tapBoost, false);
    apply(Fog, CFG.P.dragImpulse * 0.55, true);
  };

  const get = () => ({ P, Fog, clumps, core });

  return { resize, reset, step, getCore, get };
})();
