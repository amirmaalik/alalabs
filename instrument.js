// Ala Spatial — "Try it" interactive demo stage (§3.4 / §4.3 of the design spec).
// Independent Three.js scene bound to #instrument-canvas. Reuses window.ALA_SHADERS
// (shaders.js) and the same displacement technique as the hero, but driven by the
// visible controls instead of scroll: shape, detail (re-tessellation), and motion.
// Loaded after script.js — depends on THREE, window.ALA_SHADERS, and (optionally) gsap.

(function () {
  const canvas = document.getElementById('instrument-canvas');
  const stage = document.querySelector('.stage');
  const hud = document.querySelector('.stage__hud');
  const note = document.querySelector('.stage__note');
  const placeholder = document.querySelector('[data-placeholder]');
  if (!canvas || !stage || !hud || typeof THREE === 'undefined' || !window.ALA_SHADERS) return;

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = reduceQuery.matches;

  // ---- Renderer / scene / camera ---------------------------------------------------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    return; // no WebGL — the static placeholder wireframe stands in
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xFFFFFF, 1); // matches --bg

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);

  function sizeToStage() {
    const r = canvas.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  sizeToStage();

  function fitCameraToRadius(radius) {
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z = Math.max(4, (radius * 1.45) / halfTan);
  }

  // ---- Motion presets: "Calm" (laminar) vs "Lively" (turbulent) ---------------------
  // Same shader, different amplitude and time scale — cheaper than a second shader path.
  const MOTION = {
    laminar:   { breath: 0.10, timeScale: 0.55 },
    turbulent: { breath: 0.30, timeScale: 1.7 }
  };

  const state = { mesh: 'icosa', resolution: 3, field: 'laminar' };

  // ---- Geometry: built on demand, cached by "type:resolution" ------------------------
  // Re-tessellation, not a shader trick — a real new geometry per §4.3, but cached so
  // toggling back to a previous setting doesn't stutter.
  const geoCache = Object.create(null);
  function buildGeometry(type, res) {
    switch (type) {
      case 'torus':
        return new THREE.TorusGeometry(1.5, 0.55, 6 + res * 4, 10 + res * 10);
      case 'plane':
        return new THREE.PlaneGeometry(3.4, 3.4, 3 + res * 5, 3 + res * 5);
      case 'icosa':
      default:
        return new THREE.IcosahedronGeometry(1.6, Math.max(0, res - 1));
    }
  }
  function getGeometry(type, res) {
    const key = type + ':' + res;
    if (!geoCache[key]) {
      const g = buildGeometry(type, res);
      g.computeBoundingSphere();
      geoCache[key] = g;
    }
    return geoCache[key];
  }

  // ---- Material: same shaders as the hero — graphite at rest, red at peak -----------
  function makeMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader: window.ALA_SHADERS.vertex,
      fragmentShader: window.ALA_SHADERS.fragment,
      uniforms: {
        uTime:       { value: 0 },
        uMouse:      { value: new THREE.Vector3(0, 0, 0) },
        uMouseForce: { value: 0 },
        uRadius:     { value: 2 },
        uBreath:     { value: MOTION.laminar.breath },
        uMotion:     { value: 1 },
        uColorRest:  { value: new THREE.Color(0x3A3F4B) },
        uColorPeak:  { value: new THREE.Color(0xE31B23) }, // --accent
        uPeak:       { value: 0.6 },
        uOpacity:    { value: 0 }
      },
      wireframe: true,
      transparent: true,
      depthWrite: false
    });
  }

  // Two meshes so a shape/detail change can cross-fade (§4.3) instead of popping.
  // "A" is always the settled, currently-displayed form; "B" fades in during a swap
  // and its state is folded back into "A" when the fade completes.
  const materialA = makeMaterial();
  const materialB = makeMaterial();
  const meshA = new THREE.Mesh(getGeometry(state.mesh, state.resolution), materialA);
  const meshB = new THREE.Mesh(new THREE.BufferGeometry(), materialB);
  meshB.visible = false;
  materialA.uniforms.uOpacity.value = 0.62;
  scene.add(meshA, meshB);

  let activeRadius = meshA.geometry.boundingSphere.radius;
  fitCameraToRadius(activeRadius);

  function swapTo(type, res) {
    const geo = getGeometry(type, res);
    meshB.geometry = geo;
    meshB.rotation.copy(meshA.rotation);
    meshB.visible = true;
    activeRadius = geo.boundingSphere.radius;
    fitCameraToRadius(activeRadius);

    const dur = reduceMotion ? 0 : 0.3;
    if (window.gsap) {
      gsap.killTweensOf(materialA.uniforms.uOpacity);
      gsap.killTweensOf(materialB.uniforms.uOpacity);
    }
    if (window.gsap && dur > 0) {
      gsap.to(materialA.uniforms.uOpacity, { value: 0, duration: dur, ease: 'power1.out' });
      gsap.to(materialB.uniforms.uOpacity, { value: 0.62, duration: dur, ease: 'power1.out', onComplete: finishSwap });
    } else {
      materialA.uniforms.uOpacity.value = 0;
      materialB.uniforms.uOpacity.value = 0.62;
      finishSwap();
    }
  }
  function finishSwap() {
    meshA.geometry = meshB.geometry;
    materialA.uniforms.uOpacity.value = 0.62;
    materialB.uniforms.uOpacity.value = 0;
    meshB.visible = false;
  }

  // ---- Pointer → point on the shape's surface (canvas-local, not window-wide) --------
  // "Mouse acts as a local force emitter into the field regardless of settings" (§3.4).
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(0, 0);
  const hitSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 2);
  const hitPoint = new THREE.Vector3();
  let pointerActive = false;
  let pointerIdleTimer = 0;
  const IDLE_DECAY_MS = 400;

  function ndcFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }
  function onPointerMove(e) {
    if (reduceMotion) return;
    ndcFromEvent(e);
    pointerActive = true;
    clearTimeout(pointerIdleTimer);
    pointerIdleTimer = setTimeout(() => { pointerActive = false; }, IDLE_DECAY_MS);
  }
  function onPointerEnd() {
    pointerActive = false;
    clearTimeout(pointerIdleTimer);
  }
  canvas.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerleave', onPointerEnd, { passive: true });
  canvas.addEventListener('pointerup', onPointerEnd, { passive: true });
  canvas.addEventListener('pointercancel', onPointerEnd, { passive: true });

  function updateHitPoint() {
    hitSphere.radius = activeRadius;
    raycaster.setFromCamera(ndc, camera);
    const ray = raycaster.ray;
    if (!ray.intersectSphere(hitSphere, hitPoint)) {
      ray.closestPointToPoint(hitSphere.center, hitPoint).setLength(activeRadius);
    }
  }

  // ---- Controls: shape / detail / motion / reset -------------------------------------
  function setPressed(group, value) {
    hud.querySelectorAll('button[data-ctl="' + group + '"]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.value === value));
    });
  }
  function flash() {
    stage.classList.remove('stage--flash');
    // eslint-disable-next-line no-unused-expressions
    stage.offsetWidth; // restart the CSS transition
    stage.classList.add('stage--flash');
  }
  hud.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-ctl]');
    if (!btn) return;
    const ctl = btn.dataset.ctl;

    if (ctl === 'reset') {
      state.mesh = 'icosa'; state.resolution = 3; state.field = 'laminar';
      setPressed('mesh', 'icosa');
      setPressed('resolution', '3');
      setPressed('field', 'laminar');
      swapTo(state.mesh, state.resolution);
      flash();
      return;
    }

    const value = btn.dataset.value;
    setPressed(ctl, value);

    if (ctl === 'mesh') { state.mesh = value; swapTo(state.mesh, state.resolution); }
    else if (ctl === 'resolution') { state.resolution = Number(value); swapTo(state.mesh, state.resolution); }
    else if (ctl === 'field') { state.field = value; }
  });

  // ---- Render loop (paused off-screen and on hidden tabs) ---------------------------
  const clock = new THREE.Clock();
  let idleX = 0, idleY = 0, mouseForce = 0;
  let rafId = 0, running = false, contextLost = false;

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);

    const dt = Math.min(clock.getDelta(), 0.05);
    const preset = MOTION[state.field] || MOTION.laminar;

    const spin = reduceMotion ? 0.015 : 0.22;
    idleY += spin * dt;
    idleX += spin * 0.5 * dt;
    meshA.rotation.set(idleX, idleY, 0);
    meshB.rotation.set(idleX, idleY, 0);

    const targetForce = (pointerActive && !reduceMotion) ? 1 : 0;
    mouseForce += (targetForce - mouseForce) * (targetForce ? 0.15 : 0.08);
    if (mouseForce > 0.002) {
      updateHitPoint();
      materialA.uniforms.uMouse.value.lerp(hitPoint, 0.25);
      materialB.uniforms.uMouse.value.copy(materialA.uniforms.uMouse.value);
    }

    const t = clock.elapsedTime * preset.timeScale;
    for (const mat of [materialA, materialB]) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uBreath.value = preset.breath;
      mat.uniforms.uMotion.value = reduceMotion ? 0 : 1;
      mat.uniforms.uMouseForce.value = mouseForce;
      mat.uniforms.uRadius.value = activeRadius * 1.3;
    }

    renderer.render(scene, camera);
  }
  function start() {
    if (running || contextLost) return;
    running = true;
    clock.getDelta();
    frame();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // ---- Only run while the stage is actually on screen and the tab is visible --------
  let inView = false;
  function syncRunning() { (inView && !document.hidden) ? start() : stop(); }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { inView = entry.isIntersecting; });
      syncRunning();
    }, { threshold: 0.05 });
    io.observe(stage);
  } else {
    inView = true;
    syncRunning();
  }
  document.addEventListener('visibilitychange', syncRunning);

  // ---- Resize (debounced 150ms) ------------------------------------------------------
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { sizeToStage(); fitCameraToRadius(activeRadius); }, 150);
  });

  // ---- Reduced motion (live changes) --------------------------------------------------
  function onReduceChange(e) { reduceMotion = e.matches; pointerActive = false; }
  if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onReduceChange);
  else if (reduceQuery.addListener) reduceQuery.addListener(onReduceChange);

  // ---- WebGL context loss -------------------------------------------------------------
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); contextLost = true; stop(); }, false);
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; syncRunning(); }, false);

  // ---- We're live: drop the static placeholder, update the note -----------------------
  if (placeholder) placeholder.remove();
  if (note) note.textContent = '// live — move your cursor over it.';
  hud.dataset.state = 'live';
})();
