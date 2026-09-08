// Ala Spatial — GLSL for the hero wireframe background.
// Loaded before script.js as a plain <script>; no build step, no imports.
// Exposed on window.ALA_SHADERS = { vertex, fragment }.

window.ALA_SHADERS = (function () {

  // 3D simplex noise (Ashima Arts / Stefan Gustavson, MIT). Used for the ambient "breathing".
  const NOISE = /* glsl */`
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);

      vec3 g  = step(x0.yzx, x0.xyz);
      vec3 l  = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289(i);
      vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
              + i.y + vec4(0.0, i1.y, i2.y, 1.0))
              + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;

      vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);

      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }
  `;

  // Vertex: displace along the normal by (a) a slow simplex "breathing" field and
  // (b) a cursor-proximity ripple with a smoothstep falloff and a travelling wave.
  // Positions are non-indexed but displacement depends only on (position, normal, time,
  // mouse), so shared vertices land in the same place and the wireframe stays sealed.
  const vertex = /* glsl */`
    uniform float uTime;
    uniform vec3  uMouse;       // cursor hit point on the surface, in mesh-local space
    uniform float uMouseForce;  // 0..1, eased in JS; 0 when the pointer is idle/absent
    uniform float uRadius;      // ripple falloff radius, world units
    uniform float uBreath;      // ambient displacement amplitude
    uniform float uMotion;      // 1 = full ambient motion, 0 = frozen

    varying float vDisp;

    ${NOISE}

    void main() {
      vec3 n = normalize(normal);

      // (a) ambient breathing
      float breath = snoise(position * 0.6 + vec3(0.0, uTime * 0.11, uTime * 0.07));

      // (b) cursor ripple — proximity bulge plus a concentric wave moving outward
      float d    = distance(position, uMouse);
      float prox = 1.0 - smoothstep(0.0, uRadius, d);
      float wave = sin(d * 5.0 - uTime * 4.0);
      float ripple = (prox * 0.22 + prox * prox * wave * 0.45) * uMouseForce;

      float disp = breath * uBreath * uMotion + ripple;
      vDisp = abs(disp);

      vec3 displaced = position + n * disp;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
    }
  `;

  // Fragment: graphite at rest → signal red at peak displacement, via the vDisp varying.
  const fragment = /* glsl */`
    uniform vec3  uColorRest;
    uniform vec3  uColorPeak;
    uniform float uPeak;      // displacement magnitude that reads as "fully red"
    uniform float uOpacity;

    varying float vDisp;

    void main() {
      float t = smoothstep(0.03, uPeak, vDisp);
      vec3 color = mix(uColorRest, uColorPeak, t);
      gl_FragColor = vec4(color, uOpacity);
    }
  `;

  return { vertex, fragment };
})();
