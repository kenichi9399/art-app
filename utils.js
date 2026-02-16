;(() => {
  const U = {};

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp  = (a, b, t) => a + (b - a) * t;

  U.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randi = (a, b) => (a + Math.floor(Math.random() * (b - a + 1)));

  U.v2 = (x = 0, y = 0) => ({ x, y });
  U.add = (p, q) => ({ x: p.x + q.x, y: p.y + q.y });
  U.sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y });
  U.mul = (p, s) => ({ x: p.x * s, y: p.y * s });
  U.len = (p) => Math.hypot(p.x, p.y);
  U.norm = (p) => {
    const l = U.len(p) || 1e-9;
    return { x: p.x / l, y: p.y / l };
  };

  U.smoothstep = (a, b, x) => {
    const t = U.clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  U.now = () => performance.now();

  // iOS Safariの“タップでスクロール/ズーム”を抑えたい箇所で使う
  U.noDefault = (ev) => {
    if (ev && ev.cancelable) ev.preventDefault();
  };

  window.U = U;
})();
