// utils.js
export {};

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t){ return a + (b - a) * t; }
function smoothstep(t){ return t * t * (3 - 2 * t); }

function rand(a=1, b=0){
  const r = Math.random();
  return b ? (a + (b - a) * r) : (a * r);
}

// ハッシュ→疑似乱数（安定ノイズ用）
function hash2i(x, y){
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >> 13)) | 0;
  n = (n * 1274126177) | 0;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function valueNoise2(x, y){
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;

  const u = smoothstep(xf), v = smoothstep(yf);

  const n00 = hash2i(xi, yi);
  const n10 = hash2i(xi+1, yi);
  const n01 = hash2i(xi, yi+1);
  const n11 = hash2i(xi+1, yi+1);

  const nx0 = lerp(n00, n10, u);
  const nx1 = lerp(n01, n11, u);
  return lerp(nx0, nx1, v);
}

function fbm2(x, y, oct=4, lac=2.0, gain=0.5){
  let amp = 0.5;
  let sum = 0;
  let freq = 1.0;
  for(let i=0;i<oct;i++){
    sum += amp * (valueNoise2(x*freq, y*freq) * 2 - 1);
    freq *= lac;
    amp *= gain;
  }
  return sum;
}

// 2Dベクトル
function vlen(x,y){ return Math.hypot(x,y); }
function vnorm(x,y){
  const l = Math.hypot(x,y) || 1;
  return [x/l, y/l];
}

window.U = {
  clamp, lerp, smoothstep,
  rand, hash2i, valueNoise2, fbm2,
  vlen, vnorm
};
