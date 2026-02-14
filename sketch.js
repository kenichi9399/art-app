// sketch.js
(function(){
  const canvas = document.getElementById('c');
  const resetBtn = document.getElementById('resetBtn');

  const renderer = new Renderer(canvas);
  const field = new Field();
  const bg = new VoidShadow();
  const input = new Input(canvas);

  let system = null;

  function resize(){
    const w = window.innerWidth;
    const h = window.innerHeight;

    const dpr = Math.min(window.devicePixelRatio || 1, CFG.DPR_CAP);

    renderer.resize(w,h,dpr);
    bg.resize(w,h,dpr);

    if(!system) system = new ParticleSystem(w,h);
    system.resize(w,h);
  }

  function reset(){
    if(system) system.reset();
  }

  resetBtn.addEventListener('click', (e)=>{
    e.preventDefault();
    reset();
  }, {passive:false});

  // iOS Safari: orientationchange timing is tricky
  window.addEventListener('resize', ()=>setTimeout(resize, 50));
  window.addEventListener('orientationchange', ()=>setTimeout(resize, 120));

  resize();

  let last = U.now();
  function loop(){
    const now = U.now();
    let dt = now - last;
    last = now;

    // cap dt to avoid huge jumps when tab returns
    dt = Math.min(dt, 40);

    field.step(dt);
    if(system){
      system.step(dt, field, input);
      renderer.draw(system, bg);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
