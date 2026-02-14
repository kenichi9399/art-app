// cfg.js
const CFG = (() => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return {
    RENDER: {
      dprMax: isMobile ? 1.6 : 2.0,
      internalScale: isMobile ? 0.92 : 1.0,
      background: "#05070d",

      // 白飛びしにくい合成
      blend: "screen",          // ← lighter をやめる
      exposure: 0.82,           // ← 全体の露出（0.7〜0.95で調整）

      // 残像（深み）… 低すぎると光が溜まって白飛びする
      softAlpha: 0.14,          // ← 0.09→0.14（蓄積抑制）

      vignette: 0.78,
      grain: 0.16,
    },

    FIELD: {
      scale: 1.65,
      drift: 0.04,
      layers: 4,
      lacunarity: 2.0,
      gain: 0.55,
      curl: 1.0,
      speed: 1.0,
    },

    P: {
      countMobile: 1400,
      countDesktop: 2400,

      // ★ サイズを全体に小さく（「大きめしかない」対策）
      rMin: 0.18,
      rMax: 1.55,
      rFogMin: 0.10,
      rFogMax: 0.80,

      damp: 0.985,
      jitter: 0.035,
      maxV: 1.9,

      glow: 0.85,
      coreGlow: 0.95,          // 核も控えめに（白飛びしやすいので）

      coreBaseMass: 1.0,
      coreAttract: 0.85,
      coreOrbit: 0.18,
      coreGatherBoost: 3.0,
      coreMergeRadius: 0.028,
      coreMergeGain: 0.20,

      tapImpulse: 1.10,
      dragImpulse: 0.85,
      pressGatherSeconds: 0.38,
    },

    PERF: {
      fpsTarget: 60,
      degradeBelowFps: 46,
      improveAboveFps: 57,
      checkIntervalMs: 1200,
      maxDegradeSteps: 4,
    }
  };
})();
