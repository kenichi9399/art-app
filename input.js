// input.js
(() => {
  "use strict";

  function createApp() {
    const canvas = document.getElementById("c");
    if (!canvas) throw new Error("canvas #c not found (index.htmlが壊れている可能性)");

    const ctx = U.getCtx2D(canvas);
    if (!ctx) throw new Error("2D context not available (Safariの設定/メモリ/読み込み順を確認)");

    const app = new Sketch(canvas, ctx);

    // Buttons
    const btnSave = document.getElementById("btnSave");
    const btnReset = document.getElementById("btnReset");

    btnSave?.addEventListener("click", () => {
      U.downloadPNG(canvas, "touching-light.png", CFG.saveScale);
      U.toast("Saved");
    });

    btnReset?.addEventListener("click", () => {
      app.reset();
      U.toast("Reset");
    });

    // Resize
    window.addEventListener("resize", () => app.reset(), { passive: true });
    window.addEventListener("orientationchange", () => setTimeout(() => app.reset(), 60), { passive: true });

    // Pointer events
    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const p = (e.touches && e.touches[0]) ? e.touches[0] : e;
      return {
        x: (p.clientX - rect.left),
        y: (p.clientY - rect.top)
      };
    };

    const onDown = (e) => {
      e.preventDefault();
      const p = getPos(e);
      app.pointer.down = true;
      app.pointer.x = p.x;
      app.pointer.y = p.y;
      app.pointer.lastX = p.x;
      app.pointer.lastY = p.y;
      app.pointer.downAt = U.now();
      app.pointer.longFired = false;
    };

    const onMove = (e) => {
      if (!app.pointer.down) return;
      e.preventDefault();
      const p = getPos(e);
      app.pointer.x = p.x;
      app.pointer.y = p.y;
    };

    const onUp = (e) => {
      e.preventDefault();
      app.pointer.down = false;
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // iOS Safari sometimes prefers touch listeners too
    canvas.addEventListener("touchstart", onDown, { passive: false });
    canvas.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp, { passive: false });

    // RAF loop
    function loop() {
      try {
        app.step();
        requestAnimationFrame(loop);
      } catch (err) {
        U.showError(err);
        // stop the loop to avoid spamming
      }
    }
    requestAnimationFrame(loop);

    return app;
  }

  // global error trap (shows nice panel)
  window.addEventListener("error", (e) => {
    try { U.showError(e.error || e.message || e); } catch {}
  });

  window.addEventListener("unhandledrejection", (e) => {
    try { U.showError(e.reason || e); } catch {}
  });

  window.addEventListener("DOMContentLoaded", () => {
    try {
      createApp();
    } catch (err) {
      U.showError(err);
    }
  });
})();
