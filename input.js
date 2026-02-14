// input.js
const Input = (() => {
  const s = {
    down: false,
    id: null,
    x: 0, y: 0,
    px: 0, py: 0,
    vx: 0, vy: 0,
    tDown: 0,
    isPress: false,    // 長押し状態
    moved: false,
    lastTap: 0,
  };

  let canvas = null;

  const _xyFromEvent = (ev) => {
    const r = canvas.getBoundingClientRect();
    const cx = (ev.clientX - r.left) / r.width;
    const cy = (ev.clientY - r.top)  / r.height;
    return { x: U.clamp(cx, 0, 1), y: U.clamp(cy, 0, 1) };
  };

  const _onDown = (ev) => {
    // iOS Safari: preventDefaultを効かせるために passive:false + ここでpreventDefault
    ev.preventDefault?.();

    const p = _xyFromEvent(ev);
    s.down = true;
    s.id = ev.pointerId ?? null;
    s.x = s.px = p.x;
    s.y = s.py = p.y;
    s.vx = s.vy = 0;
    s.tDown = U.now();
    s.isPress = false;
    s.moved = false;
  };

  const _onMove = (ev) => {
    if (!s.down) return;
    if (s.id != null && ev.pointerId != null && ev.pointerId !== s.id) return;

    ev.preventDefault?.();

    const p = _xyFromEvent(ev);
    const dx = p.x - s.x;
    const dy = p.y - s.y;

    s.vx = dx;
    s.vy = dy;

    s.px = s.x; s.py = s.y;
    s.x = p.x;  s.y = p.y;

    if (Math.abs(dx) + Math.abs(dy) > 0.002) s.moved = true;
  };

  const _onUp = (ev) => {
    if (!s.down) return;
    if (s.id != null && ev.pointerId != null && ev.pointerId !== s.id) return;

    ev.preventDefault?.();

    const t = U.now();
    const held = (t - s.tDown) / 1000;

    // “短いタップ”だけtap扱い
    s.tap = (!s.moved && held < CFG.P.pressGatherSeconds);

    s.down = false;
    s.id = null;
    s.isPress = false;
  };

  const _onCancel = () => {
    s.down = false;
    s.id = null;
    s.isPress = false;
  };

  const bind = (c) => {
    canvas = c;

    // pointer events
    canvas.addEventListener("pointerdown", _onDown, { passive:false });
    window.addEventListener("pointermove", _onMove, { passive:false });
    window.addEventListener("pointerup", _onUp, { passive:false });
    window.addEventListener("pointercancel", _onCancel, { passive:true });

    // iOS保険：touchmoveでスクロール阻止（pointerが効かない環境もある）
    canvas.addEventListener("touchstart", (e)=>e.preventDefault(), { passive:false });
    canvas.addEventListener("touchmove",  (e)=>e.preventDefault(), { passive:false });

    // ページのダブルタップズーム抑制
    let lastTouchEnd = 0;
    document.addEventListener("touchend", (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    }, { passive:false });
  };

  const step = () => {
    s.tap = false;
    if (!s.down) return;

    const t = U.now();
    const held = (t - s.tDown) / 1000;

    // 長押し判定
    if (!s.isPress && held >= CFG.P.pressGatherSeconds) {
      s.isPress = true;
      U.toast("gather", 650);
    }
  };

  const state = () => s;

  return { bind, step, state };
})();
