// particles.js
const Particles = (() => {
  let W = 1, H = 1;
  let count = 1200;

  // --- Core (nucleus) ---
  const core = {
    x: 0.52, y: 0.46,
    vx: 0, vy: 0,
    gather: 0,        // 0..1 (long-press)
    pulse: 0,         // 0..1 (tap)
    phase: Math.random() * 1000,
    // “粒子量で変形”の係数
    deform: 0,        // 0..1
    // 合体で育つ（質量）
    mass: 1.0,
  };

  // --- Clumps (merged blobs near core) ---
  // {x,y,mass,heat}
  const clumps = [];

  // --- Particles ---
  const P = [];   // hard grains (center-ish)
  const Fog = []; // soft mist (periphery)

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const _pickCount = () => {
    // “汎用最適化”：端末差を吸収するため面積で軽くスケール
    const base = isMobile ? 1500 : 2600;
    const area = Math.min(1.25, Math.max(0.78, (W * H) / (390 * 844)));
    return Math.floor(base * area);
  };

  const resize = (w, h) => { W = w; H = h; };

  // --- Size distribution: small-dominant + rare large accents ---
  // returns radius
  const _radiusHard = () => {
    // 0..1 → 小粒が多い（指数を上げるほど小粒優勢）
    const u = Math.pow(Math.random(), 3.1);
    const rSmall = U.lerp(1.25, 0.18, u); // small dominant
    // たまにアクセント粒
    if (Math.random() < 0.06) return rSmall + (0.9 + Math.random() * 1.4);
    return rSmall;
  };

  const _radiusFog = () => {
    const u = Math.pow(Math.random(), 2.6);
    return U.lerp(0.75, 0.10, u);
  };

  const _spawn = (arr, n, kind) => {
    arr.length = 0;
    for (let i = 0; i < n; i++) {
      const bias = (kind === 0) ? 0.65 : 0.0;
      const x = (bias > 0) ? U.clamp(core.x + U.randn() * bias, 0, 1) : Math.random();
      const y = (bias > 0) ? U.clamp(core.y + U.randn() * bias, 0, 1) : Math.random();

      const r = (kind === 0) ? _radiusHard() : _radiusFog();
      const m = Math.max(0.02, r * r * (kind === 0 ? 0.16 : 0.08));

      arr.push({
        x, y,
        vx: 0, vy: 0,
        r, m,
        a: (kind === 0 ? (0.55 + Math.random() * 0.45) : (0.08 + Math.random() * 0.18)),
        kind, // 0 hard, 1 fog
      });
    }
  };

  const _initClumps = () => {
    clumps.length = 0;
    // 最初から“核の芽”を少数だけ用意（深み・核感）
    const n = 3;
    for (let i = 0; i < n; i++) {
      clumps.push({
        x: U.clamp(core.x + U.randn() * 0.08, 0.18, 0.82),
        y: U.clamp(core.y + U.randn() * 0.08, 0.18, 0.82),
        mass: 0.75 + Math.random() * 0.65,
        heat: 0.0,
      });
    }
  };

  const reset = () => {
    core.x = 0.52; core.y = 0.46;
    core.vx = core.vy = 0;
    core.gather = 0;
    core.pulse = 0;
    core.deform = 0;
    core.mass = 1.0;
    core.phase = Math.random() * 1000;

    count = _pickCount();
    _initClumps();

    _spawn(P, count, 0);
    _spawn(Fog, Math.floor(count * 0.75), 1);
  };

  const get = () => ({ P, Fog, clumps, core });

  const _wrapSoft = (p) => {
    const m = 0.02;
    if (p.x < -m) p.x = 1 + m;
    if (p.x > 1 + m) p.x = -m;
    if (p.y < -m) p.y = 1 + m;
    if (p.y > 1 + m) p.y = -m;
  };

  // --- Touch forces ---
  const _applyScatter = (p, inp, dt) => {
    // ドラッグ＝散らす（+渦）
    const dx = p.x - inp.x;
    const dy = p.y - inp.y;
    const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;

    const fall = Math.exp(-d * 22.0);
    const n = U.norm2(dx, dy);

    // outward
    const out = 1.25 * fall;
    p.vx += n.x * out * dt;
    p.vy += n.y * out * dt;

    // swirl（生物っぽい回転）
    const sw = 0.85 * fall;
    p.vx += (-n.y) * sw * dt;
    p.vy += ( n.x) * sw * dt;
  };

  const _applyGather = (p, dt, k) => {
    // 長押し＝集める（強すぎると白飛び要因→ここは“程よく”）
    const dx = core.x - p.x;
    const dy = core.y - p.y;
    const n = U.norm2(dx, dy);

    const pull = (0.85 + 2.0 * k);
    p.vx += n.x * pull * dt;
    p.vy += n.y * pull * dt;
  };

  // --- Merge into clumps ---
  const _mergeIntoClumps = (p, k) => {
    if (p.kind !== 0) return; // hard only
    // 合体距離：核が強いほど少し広がる
    const mr = 0.030 + 0.020 * k;

    let best = -1;
    let bestD = 1e9;
    for (let i = 0; i < clumps.length; i++) {
      const c = clumps[i];
      const d = U.dist2(p.x, p.y, c.x, c.y);
      if (d < bestD) { bestD = d; best = i; }
    }

    if (best >= 0 && bestD < mr) {
      const c = clumps[best];

      // “食われて白飛び”を避ける：吸収量に上限をつける
      const take = Math.min(p.m * 0.16 * (0.6 + 0.8 * k), 0.10);
      c.mass += take;
      c.heat = Math.min(1, c.heat + 0.18);

      // 粒子は完全消滅せず“霧化”する
      p.m = Math.max(0.02, p.m - take);
      p.r = Math.max(0.16, p.r * 0.92);
      p.a = Math.min(1, p.a + 0.06);

      // clump方向へ少し寄せる
      const dn = U.norm2(c.x - p.x, c.y - p.y);
      p.vx += dn.x * 0.22 * (1 + 0.6 * k);
      p.vy += dn.y * 0.22 * (1 + 0.6 * k);
    }
  };

  // clump同士の融合（“核が育つ”）
  const _mergeClumps = (dt, k) => {
    if (k < 0.4) return;

    for (let i = 0; i < clumps.length; i++) {
      for (let j = i + 1; j < clumps.length; j++) {
        const a = clumps[i], b = clumps[j];
        const d = U.dist2(a.x, a.y, b.x, b.y);

        // 近いほど融合
        const th = 0.055 + 0.03 * k;
        if (d < th) {
          const total = a.mass + b.mass;
          a.x = (a.x * a.mass + b.x * b.mass) / total;
          a.y = (a.y * a.mass + b.y * b.mass) / total;
          a.mass = total;
          a.heat = Math.max(a.heat, b.heat);

          clumps.splice(j, 1);
          j--;
        }
      }
    }

    // clumpが減りすぎたら芽を足す（“生き物感”を維持）
    if (clumps.length < 2) {
      clumps.push({
        x: U.clamp(core.x + U.randn() * 0.06, 0.18, 0.82),
        y: U.clamp(core.y + U.randn() * 0.06, 0.18, 0.82),
        mass: 0.55 + Math.random() * 0.45,
        heat: 0.0,
      });
    }
  };

  // “粒子量で変形”：核近傍の密度を測る
  const _estimateDensity = () => {
    const r = 0.12;
    let sum = 0;
    for (let i = 0; i < P.length; i += 3) { // 1/3 sampling for speed
      const p = P[i];
      const d = U.dist2(p.x, p.y, core.x, core.y);
      if (d < r) sum += 1;
    }
    // 0..1へ
    const dens = U.clamp(sum / 160, 0, 1);
    return dens;
  };

  const step = (dt, inp) => {
    // input modes
    const down = inp.down;
    const isPress = inp.isPress;
    const moved = inp.moved;

    // gather smoothing
    const targetGather = isPress ? 1 : 0;
    core.gather = U.lerp(core.gather, targetGather, 1 - Math.pow(0.001, dt));

    // tap pulse（短い脈動）
    if (inp.tap) core.pulse = 1.0;
    core.pulse *= Math.pow(0.02, dt);

    core.phase += dt * 0.55;

    // --- core drift: “ゆっくり漂う” ---
    // タッチ中は軽く追従、非タッチは微小に漂う
    if (down) {
      const k = isPress ? 0.08 : 0.05;
      core.x = U.lerp(core.x, inp.x, k);
      core.y = U.lerp(core.y, inp.y, k);
    } else {
      // very slow organic drift (noise-like)
      const dx = U.fbm2(core.phase * 0.22, 12.7, 3, 2.0, 0.5) * 0.00055;
      const dy = U.fbm2(18.3, core.phase * 0.22, 3, 2.0, 0.5) * 0.00045;
      core.x = U.clamp(core.x + dx, 0.18, 0.82);
      core.y = U.clamp(core.y + dy, 0.18, 0.82);
    }

    // --- deform by density ---
    const dens = _estimateDensity();
    core.deform = U.lerp(core.deform, dens, 1 - Math.pow(0.001, dt));

    // --- clumps orbit & pull to core ---
    const k = core.gather;
    for (const c of clumps) {
      const dn = U.norm2(core.x - c.x, core.y - c.y);
      const pull = (0.10 + 0.28 * k);
      const orbit = (0.05 + 0.14 * k);

      c.x += (dn.x * pull - dn.y * orbit) * dt;
      c.y += (dn.y * pull + dn.x * orbit) * dt;

      c.heat *= Math.pow(0.03, dt);
    }

    _mergeClumps(dt, k);

    // --- particles update ---
    const updateOne = (p) => {
      // flow field
      const f = Field.sample(p.x, p.y, dt, core);

      // micro jitter
      const j = (p.kind === 0 ? 1.0 : 0.6);
      p.vx += (f.x + U.randn() * 0.030 * j) * dt;
      p.vy += (f.y + U.randn() * 0.030 * j) * dt;

      // interaction
      if (down) {
        if (isPress) {
          _applyGather(p, dt, k);
        } else if (moved) {
          _applyScatter(p, inp, dt);
        } else {
          // tap holding (no move): gentle stir
          const dx = p.x - inp.x, dy = p.y - inp.y;
          const d = Math.sqrt(dx * dx + dy * dy) + 1e-6;
          const fall = Math.exp(-d * 18.0);
          const n = U.norm2(dx, dy);
          p.vx += (-n.y) * 0.55 * fall * dt;
          p.vy += ( n.x) * 0.55 * fall * dt;
        }
      }

      // merge while gathering
      if (k > 0.02) _mergeIntoClumps(p, k);

      // clamp speed (fog slower)
      const mv = (p.kind === 0) ? 1.9 : 1.25;
      const v = U.norm2(p.vx, p.vy);
      if (v.d > mv) { p.vx = v.x * mv; p.vy = v.y * mv; }

      // integrate
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // damping
      const damp = (p.kind === 0) ? 0.985 : 0.990;
      p.vx *= Math.pow(damp, dt * 60);
      p.vy *= Math.pow(damp, dt * 60);

      _wrapSoft(p);

      // alpha by distance to core (center hard, outer mist)
      const dcore = U.dist2(p.x, p.y, core.x, core.y);
      const t = U.clamp(dcore / 0.58, 0, 1);
      if (p.kind === 0) p.a = U.lerp(0.95, 0.45, t);
      else p.a = U.lerp(0.20, 0.05, t);
    };

    for (let i = 0; i < P.length; i++) updateOne(P[i]);
    for (let i = 0; i < Fog.length; i++) updateOne(Fog[i]);

    // --- core mass grows from clumps (slow) ---
    let cm = 0;
    for (const c of clumps) cm += c.mass;
    const targetMass = 1.0 + cm * 0.22;
    core.mass = U.lerp(core.mass, targetMass, 1 - Math.pow(0.001, dt));
  };

  return { resize, reset, step, get };
})();
