// cfg.js
const CFG = (() => {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return {
    UI: {
      showSave: false,           // iPhone Safariは保存が不安定なのでデフォルト非表示
    },

    RENDER: {
      // iPhoneでカクつく原因はDPR過剰が多いので上限をかける
      dprMax: isMobile ? 1.75 : 2.25,
      // さらに軽量化したいなら 0.85〜0.95
      internalScale: isMobile ? 0.92 : 1.0,
      background: "#05070d",
      blend: "lighter",
      softAlpha: 0.09,          // 残像（深み）
      vignette: 0.75,
      grain: 0.18,
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
      // 粒子数：端末で自動調整
      countMobile: 1400,
      countDesktop: 2400,

      // サイズ分布（混在：中心は硬い粒/周縁は霧）
      rMin: 0.35,
      rMax: 2.6,
      rFogMin: 0.22,
      rFogMax: 1.3,

      // 速度・粘性
      damp: 0.985,
      jitter: 0.035,        // 微細な揺らぎ
      maxV: 1.9,

      // 光量
      glow: 1.0,
      coreGlow: 1.25,

      // 核（Core）
      coreBaseMass: 1.0,
      coreAttract: 0.85,     // 常時の“引力”
      coreOrbit: 0.18,       // 常時の“回転”
      coreGatherBoost: 3.0,  // 長押し中の引力増幅
      coreMergeRadius: 0.028,// 合体距離（正規化座標）
      coreMergeGain: 0.20,   // 合体時の質量移譲

      // タッチの影響
      tapImpulse: 1.25,
      dragImpulse: 0.95,
      pressGatherSeconds: 0.38, // 長押し判定
    },

    PERF: {
      fpsTarget: 60,
      // 自動軽量化の閾値
      degradeBelowFps: 46,
      improveAboveFps: 57,
      checkIntervalMs: 1200,
      maxDegradeSteps: 4,
    }
  };
})();
