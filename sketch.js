// sketch.js
// ------------------------------------------------------------
// App bootstrap + main loop
// ------------------------------------------------------------

function createApp() {
  const canvas = document.getElementById("c");
  if (!canvas) throw new Error("Canvas #c not found");

  // Init modules
  Render.init(canvas);
  Input.attach(canvas);

  // State
  const core = Core.create();
  let last = performance.now();

  function resize() {
    const dpr = CFG?.PD ?? Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);

    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    Render.resize(w, h, dpr);
    Particles.resize(w, h, dpr);
  }

  // Ensure initial sizing
  resize();
  window.addEventListener("resize", resize, { passive: true });

  // Main loop
  function frame(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
    last = now;

    // Read input snapshot for this frame
    const inp = Input.get();

    // Update sim
    Core.step(core, dt, inp);
    Particles.step(dt, core, inp);

    // ---- ここが「1行だけ変更」ポイント ----
    // Render.draw は (t, core, data, input) を想定しているため、inp を渡す
    Render.draw(now / 1000, core, Particles.data(), inp);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  // Buttons (optional): Reset / Save
  const btnReset = document.getElementById("btnReset");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      Core.reset(core);
      Particles.reset(core);
    });
  }

  const btnSave = document.getElementById("btnSave");
  if (btnSave) {
    btnSave.addEventListener("click", () => {
      try {
        const url = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = url;
        a.download = "untitled.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (e) {
        console.warn("Save failed:", e);
      }
    });
  }
}

// Boot
try {
  createApp();
} catch (e) {
  console.error(e);
  alert("JavaScript error\n" + (e?.message || e));
}
