document.getElementById('year').textContent = new Date().getFullYear();

// --- Coordinate HUD (spec §2.3): must always report a real value. ---
// X/Y = cursor position in CSS px (zero-padded to 0000.0), Z = page scroll progress 0.000–1.000.
// Wireframe gray at rest; flips to signal cyan while the pointer is moving (see .hud.is-active).
(function () {
  const hud = document.getElementById('void-hud');
  if (!hud) return;
  const outX = hud.querySelector('[data-hud="x"]');
  const outY = hud.querySelector('[data-hud="y"]');
  const outZ = hud.querySelector('[data-hud="z"]');
  const pad = (v) => Math.max(0, v).toFixed(1).padStart(6, '0');
  let idleTimer = 0;

  function updateZ() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const z = max > 0 ? window.scrollY / max : 0;
    outZ.textContent = Math.min(1, Math.max(0, z)).toFixed(3);
  }

  function onPointer(e) {
    outX.textContent = pad(e.clientX);
    outY.textContent = pad(e.clientY);
    hud.classList.add('is-active');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => hud.classList.remove('is-active'), 400);
  }

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('scroll', updateZ, { passive: true });
  window.addEventListener('resize', updateZ);
  updateZ();
})();


// --- Hero background: fluid wireframe icosahedron (custom GLSL) + GSAP ScrollTrigger fly-through ---
// Fixed <canvas id="bg-canvas"> behind all content. Shaders live in shaders.js (window.ALA_SHADERS).
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined' || !window.ALA_SHADERS) return;

  // ---- Tunables -------------------------------------------------------------
  const GROUND = 0xFFFFFF;   // matches --bg in style.css
  const RADIUS = 3.4;
  const DETAIL = 3;          // IcosahedronGeometry detail: 1,280 faces / ~1,920 edges — see summary
  const RIPPLE_RADIUS = 2.2; // world units; smoothstep falloff distance from the cursor hit point
  const IDLE_DECAY_MS = 400; // pointer considered idle after this — ripple force eases back to 0

  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = reduceQuery.matches;

  // ---- Renderer / scene / camera ------------------------------------------------
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (err) {
    return; // no WebGL — the CSS white background stands in
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(GROUND, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

  // Camera path: far at the top of the page, close at the bottom. Distances scale with
  // aspect so the form still fits inside a portrait (mobile) viewport.
  const cam = { zStart: 11, zEnd: 8 };
  function fitCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const fitZ = (RADIUS * 1.15) / (halfTan * Math.min(aspect, 1));
    cam.zStart = Math.max(11, fitZ);
    cam.zEnd = cam.zStart * 0.72;

    // Wide screens: park the form right of centre so it sits beside the hero copy rather
    // than under it. Narrow screens: keep it centred but quieter, for legibility.
    const wide = aspect > 1.2;
    mesh.position.x = wide ? 2.0 : 0;
    hitSphere.center.copy(mesh.position);
    uniforms.uOpacity.value = wide ? 0.55 : 0.35;
  }

  // ---- Mesh: single icosahedron, wireframe ShaderMaterial ----------------------------
  const geometry = new THREE.IcosahedronGeometry(RADIUS, DETAIL);
  const uniforms = {
    uTime:       { value: 0 },
    uMouse:      { value: new THREE.Vector3(0, 0, RADIUS) },
    uMouseForce: { value: 0 },
    uRadius:     { value: RIPPLE_RADIUS },
    uBreath:     { value: 0.18 },
    uMotion:     { value: 1 },
    uColorRest:  { value: new THREE.Color(0x3A3F4B) }, // graphite line at rest
    uColorPeak:  { value: new THREE.Color(0xE31B23) }, // signal red at peak displacement (--accent)
    uPeak:       { value: 0.6 },
    uOpacity:    { value: 0.55 }
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: window.ALA_SHADERS.vertex,
    fragmentShader: window.ALA_SHADERS.fragment,
    uniforms,
    wireframe: true,     // GL_LINES over the triangle edges — keeps normals for displacement
    transparent: true,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // ---- Pointer → point on the mesh surface (mesh-local space) -------------------------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2(0, 0);
  const hitSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), RADIUS);
  const hitWorld = new THREE.Vector3();
  const targetLocal = new THREE.Vector3(0, 0, RADIUS);
  const invMatrix = new THREE.Matrix4();
  fitCamera();
  camera.position.z = cam.zStart;
  let pointerActive = false;
  let pointerIdleTimer = 0;

  function onPointerMove(e) {
    if (reduceMotion) return;
    ndc.x = (e.clientX / window.innerWidth) * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    pointerActive = true;
    clearTimeout(pointerIdleTimer);
    pointerIdleTimer = setTimeout(() => { pointerActive = false; }, IDLE_DECAY_MS);
  }
  function onPointerEnd() {
    // Touch lift / pointer leaving the window: release immediately so no stale bulge is left behind.
    pointerActive = false;
    clearTimeout(pointerIdleTimer);
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerup', onPointerEnd, { passive: true });
  window.addEventListener('pointercancel', onPointerEnd, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerEnd);
  window.addEventListener('blur', onPointerEnd);

  // Recomputed every frame the ripple is visible (camera moves, mesh rotates), so the
  // cursor-to-surface distance in the shader is always consistent with what is on screen.
  function updatePointerTarget() {
    raycaster.setFromCamera(ndc, camera);
    const ray = raycaster.ray;
    if (!ray.intersectSphere(hitSphere, hitWorld)) {
      // Missed the form: use the closest point on the ray, pushed onto the surface.
      ray.closestPointToPoint(hitSphere.center, hitWorld)
        .sub(hitSphere.center).setLength(RADIUS).add(hitSphere.center);
    }
    invMatrix.copy(mesh.matrixWorld).invert();
    targetLocal.copy(hitWorld).applyMatrix4(invMatrix);
  }

  // ---- Scroll: one ScrollTrigger, scrubbed, feeding one progress value ------------------
  const scroll = { progress: 0 };
  let scrollTween = null;

  function setupScroll() {
    if (reduceMotion || scrollTween) return;
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);
    scrollTween = gsap.to(scroll, {
      progress: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: document.body,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,             // locked to scroll position, no easing lag
        invalidateOnRefresh: true
      }
    });
  }
  function teardownScroll() {
    if (!scrollTween) return;
    if (scrollTween.scrollTrigger) scrollTween.scrollTrigger.kill();
    scrollTween.kill();
    scrollTween = null;
    scroll.progress = 0;
  }
  setupScroll();

  // ---- Render loop ------------------------------------------------------------------
  const clock = new THREE.Clock();
  const idle = { x: 0, y: 0 };
  let mouseForce = 0;
  let rafId = 0;
  let running = false;
  let contextLost = false;

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);

    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const p = scroll.progress;

    // Ambient motion eases out over the final stretch of the page so the form is still
    // by the time the contact section is on screen. Reduced motion: frozen, slow drift only.
    const motion = reduceMotion ? 0 : 1 - THREE.MathUtils.smoothstep(p, 0.7, 1.0);
    const spin = reduceMotion ? 0.03 : 0.16 * (0.25 + 0.75 * motion);
    idle.y += spin * dt;
    idle.x += spin * 0.55 * dt;

    // Scroll-driven transform is additive to the idle rotation.
    mesh.rotation.set(idle.x + p * 0.9, idle.y + p * 1.6, 0);
    camera.position.z = THREE.MathUtils.lerp(cam.zStart, cam.zEnd, p);
    camera.lookAt(0, 0, 0);
    mesh.updateMatrixWorld();

    // Ripple force eases in while the pointer moves, decays after it stops.
    const targetForce = (pointerActive && !reduceMotion) ? 1 : 0;
    mouseForce += (targetForce - mouseForce) * (targetForce ? 0.12 : 0.06);
    if (mouseForce > 0.002) {
      updatePointerTarget();
      uniforms.uMouse.value.lerp(targetLocal, 0.25);
    }

    uniforms.uMouseForce.value = mouseForce;
    uniforms.uTime.value = t;
    uniforms.uMotion.value = motion;

    renderer.render(scene, camera);
  }

  function start() {
    if (running || contextLost) return;
    running = true;
    clock.getDelta(); // swallow the pause so the first frame after resume isn't a jump
    frame();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  // ---- Resize (debounced 150ms) -------------------------------------------------------
  let resizeTimer = 0;
  function onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    fitCamera();
    if (scrollTween && typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 150);
  });

  // ---- Reduced motion (initial + live changes) ------------------------------------------
  function onReduceChange(e) {
    reduceMotion = e.matches;
    pointerActive = false;
    if (reduceMotion) teardownScroll(); else setupScroll();
  }
  if (reduceQuery.addEventListener) reduceQuery.addEventListener('change', onReduceChange);
  else if (reduceQuery.addListener) reduceQuery.addListener(onReduceChange);

  // ---- WebGL context loss (mobile GPU resets, laptop GPU switching) ----------------------
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); // allows the browser to restore the context
    contextLost = true;
    stop();
  }, false);
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false;
    start();
  }, false);

  // Pause when the tab is hidden; resume on return.
  document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });

  start();
})();
