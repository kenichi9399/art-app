// field.js
// フローフィールド：fbm + curl 的な回転を生成

(function(){
  const { fbm2 } = window.U;

  function fieldAngle(x, y, t){
    const s = CFG.FIELD.SCALE;
    const d = CFG.FIELD.DRIFT;

    // fbm を2系統で作り、角度にする
    const n1 = fbm2(x*s + t*d, y*s - t*d, CFG.FIELD.FBM_OCT, CFG.FIELD.FBM_LAC, CFG.FIELD.FBM_GAIN);
    const n2 = fbm2(x*s - t*d, y*s + t*d, CFG.FIELD.FBM_OCT, CFG.FIELD.FBM_LAC, CFG.FIELD.FBM_GAIN);

    // 角度（-pi..pi）
    return (n1 * 2.2 + n2 * 1.3) * Math.PI;
  }

  // curl っぽく：角度からベクトルを作り、周囲差分で回転強化
  function sample(x, y, t){
    const a = fieldAngle(x, y, t);
    let vx = Math.cos(a);
    let vy = Math.sin(a);

    // curl近似（差分）
    const e = 18;
    const a1 = fieldAngle(x+e, y, t);
    const a2 = fieldAngle(x, y+e, t);
    const cx = Math.cos(a1) - Math.cos(a);
    const cy = Math.sin(a2) - Math.sin(a);

    vx += -cy * CFG.FIELD.CURL;
    vy +=  cx * CFG.FIELD.CURL;

    const l = Math.hypot(vx, vy) || 1;
    return [vx/l, vy/l];
  }

  window.Field = { sample };
})();
