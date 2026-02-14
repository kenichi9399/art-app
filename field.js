// field.js

const Field = (() => {
  let t = 0;

  const sample = (x, y, dt, core) => {
    // x,y in [0..1]
    t += dt;

    const sc = CFG.FIELD.scale;
    const ox = x * 2 - 1;
    const oy = y * 2 - 1;

    // drift by time
    const tx = ox + t * CFG.FIELD.drift;
    const ty = oy - t * CFG.FIELD.drift * 0.6;

    // curl from fbm
    const eps = 0.0025;
    const c = U.curl2(tx * sc, ty * sc, eps, CFG.FIELD.layers, CFG.FIELD.lacunarity, CFG.FIELD.gain);

    // normalize-ish and apply speed
    const n = U.norm2(c.x, c.y);
    const fx = n.x * CFG.FIELD.curl;
    const fy = n.y * CFG.FIELD.curl;

    // gentle pull to core to keep "核" present
    const dx = (core.x - x);
    const dy = (core.y - y);
    const dn = U.norm2(dx, dy);
    const pull = CFG.P.coreAttract;

    // orbit component around core
    const orbit = CFG.P.coreOrbit;
    const oxv = -dn.y * orbit;
    const oyv = dn.x * orbit;

    return {
      x: (fx + dn.x * pull + oxv) * CFG.FIELD.speed,
      y: (fy + dn.y * pull + oyv) * CFG.FIELD.speed,
    };
  };

  const reset = () => { t = 0; };

  return { sample, reset };
})();
