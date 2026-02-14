// utils.js
(function(){
  const U = {};
  U.clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  U.lerp = (a,b,t)=>a+(b-a)*t;
  U.smoothstep = (a,b,t)=>{
    t=U.clamp((t-a)/(b-a),0,1); return t*t*(3-2*t);
  };
  U.fract = (x)=>x-Math.floor(x);

  // Deterministic hash -> [0,1)
  U.hash = (x,y)=>{
    const s = Math.sin(x*127.1 + y*311.7)*43758.5453123;
    return U.fract(s);
  };

  // Value noise (cheap)
  U.vnoise = (x,y)=>{
    const xi=Math.floor(x), yi=Math.floor(y);
    const xf=x-xi, yf=y-yi;
    const u=xf*xf*(3-2*xf), v=yf*yf*(3-2*yf);
    const a=U.hash(xi,yi);
    const b=U.hash(xi+1,yi);
    const c=U.hash(xi,yi+1);
    const d=U.hash(xi+1,yi+1);
    const ab=U.lerp(a,b,u);
    const cd=U.lerp(c,d,u);
    return U.lerp(ab,cd,v);
  };

  // fbm
  U.fbm = (x,y,oct=4)=>{
    let f=0, amp=0.5, freq=1;
    for(let i=0;i<oct;i++){
      f += amp*(U.vnoise(x*freq,y*freq)*2-1);
      freq*=2; amp*=0.5;
    }
    return f;
  };

  U.rand = (a=1)=>Math.random()*a;
  U.randRange=(a,b)=>a+(b-a)*Math.random();

  U.pickSize = ()=>{
    // 0.0-0.78 tiny, 0.78-0.96 mid, 0.96-1.0 big
    const r=Math.random();
    const R=(lohi)=>U.randRange(lohi[0],lohi[1]);
    if(r<0.78) return R(CFG.SIZE_TINY);
    if(r<0.96) return R(CFG.SIZE_MID);
    return R(CFG.SIZE_BIG);
  };

  // safe rAF time step
  U.now = ()=>performance.now();

  window.U = U;
})();
