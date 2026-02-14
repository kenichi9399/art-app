// sketch.js (entry)

(() => {
  const canvas = document.getElementById("c");
  const btnReset = document.getElementById("btnReset");
  const btnSave  = document.getElementById("btnSave");

  // core state (normalized coords)
  const core = {
    x: CFG.CORE.x,
    y: CFG.CORE.y,
    baseRadius: CFG.CORE.baseRadius,
    glowRadius: CFG.CORE.glowRadius,
    pulseAmp: CFG.CORE.pulseAmp,
    pulseSpeed: CFG.CORE.pulseSpeed,
  };

  // perf adaptation
  let avgMs = 16.6;
  let lastPerfT = U.now();
  let frames = 0;

  // dynamic counts
  let countP = CFG.PARTICLES_BASE;
  let countD = CFG.DUST_BASE;

  const recomputeCounts = () => {
    // if slow, reduce; if fast, increase gently
    if (!CFG.PERF_ADAPT) return;

    // avgMs target around 16.6
    const slow = avgMs > 21.0;
    const fast = avgMs < 15.5;

    if (slow) {
      countP = Math.max(CFG.PARTICLES_MIN, Math.floor(countP * 0.90));
      countD = Math.max(CFG.DUST_MIN, Math.floor(countD * 0.90));
    } else if (fast) {
      countP = Math.min(CFG.PARTICLES_MAX, Math.floor(countP * 1.05));
      countD = Math.min(CFG.DUST_MAX, Math.floor(countD * 1.05));
    }
  };

  const hardReset = () => {
    Field.reset();
    const s = Render.size;
    // keep core slightly above center on tall screens
    core.x = CFG.CORE.x;
    core.y = CFG.CORE.y;
    Particles.reset(core, countP, countD);
    U.toast("Reset");
  };

  const bindUI = () => {
    // Reset must always work
    btnReset?.addEventListener("click", (e) => {
      e.preventDefault();
      hardReset();
    });

    // Save is optional
    if (CFG.SAVE.enabled) {
      btnSave?.addEventListener("click", (e) => {
        e.preventDefault();
        Render.snapshot(CFG.SAVE.filename);
      });
    } else {
      if (btnSave) btnSave.style.display = "none";
    }
  };

  const start = () => {
    Render.init(canvas);
    Input.attach(canvas);

    bindUI();

    Particles.init(core, countP, countD);

    let last = U.now();
    let t = 0;

    const loop = () => {
      const now = U.now();
      let dt = (now - last) / 1000;
      last = now;

      // clamp dt for stability
      dt = U.clamp(dt, 1/120, 1/20);
      t += dt;

      // animate core breathing + slight drift toward touch when holding
      const inp = Input.get();
      if (inp.down) {
        const k = inp.longPress ? 0.020 : 0.010;
        core.x = U.lerp(core.x, inp.x, k);
        core.y = U.lerp(core.y, inp.y, k);
      } else {
        core.x = U.lerp(core.x, CFG.CORE.x, 0.006);
        core.y = U.lerp(core.y, CFG.CORE.y, 0.006);
      }

      const stamp0 = U.now();

      // simulate
      Particles.step(dt, core, inp);

      // render
      Render.draw(t, core, Particles.data());

      const ms = U.now() - stamp0;

      // perf stats
      avgMs = U.lerp(avgMs, ms, 0.06);
      frames++;

      const perfSec = (U.now() - lastPerfT) / 1000;
      if (perfSec >= CFG.PERF_SAMPLE_SEC) {
        recomputeCounts();
        // if counts changed, soft reset to avoid density collapse
        Particles.reset(core, countP, countD);
        lastPerfT = U.now();
        frames = 0;
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  };

  // Safety: handle unexpected errors with toast
  window.addEventListener("error", (e) => {
    U.toast("JavaScript error: " + (e?.message || "unknown"));
  });

  start();
})();
