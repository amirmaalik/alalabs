# Ala Spatial Design Studios
## Web Design Specification, Interaction Blueprint & Design System
**Prepared for:** Design & Development Team
**Document type:** Technical Design Spec (v1.0)
**Scope:** Full marketing/portfolio site — single-page scroll architecture with modular section builds

---

> **A note before the spec:** this document pushes the brand's conceptual voice (Ifá binary logic, Obatala's architectural purity) further than the current live MVP at alaspatial.com, which was intentionally kept plain for launch. Treat this as the **target creative direction** — either for a v2 rebuild, or as the reference system to grow the live site into section by section. Flag with the studio before retiring the current simpler copy.

---

## 1. Brand Foundation

**Positioning:** Ala Spatial sits at the intersection of three systems of order — Ifá's binary divination logic (patterns built from two states, endlessly recombined), Obatala's architectural purity (clarity, whiteness, the molding of raw form into precise structure), and computational spatial design (parametric geometry, fluid simulation, procedural form-finding).

**The felt experience:** a visitor should feel like they've opened a **live instrument**, not a brochure — something that responds to their presence the way a wind tunnel visualization responds to airspeed, or a Grasshopper canvas responds to a slider. Precision first, ornament never. Every animated element should look like it is *computing something real*, even when it's decorative.

**Design principle hierarchy** (in order of priority when principles conflict):
1. Clarity of structure over visual complexity
2. Responsiveness to input over ambient looping animation
3. Restraint in color over expressiveness in motion
4. Performance/frame-rate stability over shader fidelity

---

## 2. Design System & Tokens

### 2.1 Color

| Token | Hex | Usage |
|---|---|---|
| `--color-ivory` | `#FBFBF9` | Primary background (light mode sections), primary text on dark |
| `--color-obsidian` | `#0F1115` | Primary background (dark mode / hero), primary text on light |
| `--color-wireframe` | `#2A2E37` | Structural lines, grid overlays, disabled states, borders |
| `--color-wireframe-faint` | `#2A2E37` at 24% opacity | Background grid meshes, non-focal geometry |
| `--color-signal` | `#3DFAFF` (Ionized Cyan) | The **single** interactive/glow accent — cursor proximity, active states, CFD particle hot-path, focus rings |
| `--color-signal-dim` | `#3DFAFF` at 12% opacity | Ambient glow falloff, shadow bloom under signal-colored elements |

Rule: **one accent, everywhere.** No secondary accent color is introduced at any point in the system. Emphasis is created through opacity, glow intensity, and motion — never a second hue. This is the single hardest rule to enforce during build and the most important one for the brand to read as "instrument," not "website."

### 2.2 Typography

| Role | Family | Fallback stack | Notes |
|---|---|---|---|
| Display / Headlines | **General Sans** (or Cabinet Grotesk) | `'General Sans', 'Neue Haas Grotesk', Helvetica, sans-serif` | Geometric, architectural, slightly condensed at large sizes for structural tension |
| Body | **General Sans** (Regular/Book weight) | same stack | Keep body and display in the same family — one sculptural sans, weight does the work |
| Technical / HUD / Labels / Coordinates | **JetBrains Mono** (or IBM Plex Mono) | `'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace` | Used exclusively for: coordinate readouts, section numbering, metadata, button micro-labels, code-like annotations |

Type scale (base 16px, ratio 1.333 major third, capped at display):

```
--text-xs:    12px / 1.4   (mono, HUD labels)
--text-sm:    14px / 1.5   (mono, captions)
--text-base:  16px / 1.6   (body)
--text-lg:    21px / 1.5   (lede paragraphs)
--text-xl:    28px / 1.3   (section intros)
--text-2xl:   38px / 1.2   (subheads)
--text-3xl:   64px / 1.05  (section headlines)
--text-4xl:   clamp(72px, 9vw, 140px) / 0.95  (hero headline)
```

### 2.3 Grid & Spatial System

- **Base unit:** 8px
- **Architectural module:** 64px (8 × 8) — all section paddings, major gaps, and the wireframe background grid pitch are multiples of this module
- **Column grid:** 12-column, 64px gutter on desktop (≥1440px), collapsing to 6-column / 32px gutter at tablet, 4-column / 16px gutter at mobile
- **Coordinate overlay convention:** every full-bleed canvas section carries a live coordinate readout in the corner (mono type, `--color-wireframe` at rest, `--color-signal` on interaction) — e.g. `X 0412.8 / Y 0091.2 / Z 1.000` tracking cursor or scroll position. This is a signature device, not decoration — it should always report a real value.

### 2.4 Line Weights

| Token | Value | Usage |
|---|---|---|
| `--line-hairline` | 0.5px | Background grid meshes, non-focal wireframe |
| `--line-standard` | 1px | UI borders, dividers, primary wireframe geometry |
| `--line-emphasis` | 1.5px | Active/hovered wireframe edges, focus states |
| `--line-signal` | 2px + 4px blur glow | Signal-colored interactive edges only |

---

## 3. Site Architecture & Storyboard

Single continuous scroll, five acts. Each section owns one WebGL behavior — no section shares a canvas with another, for performance isolation and clean scroll-trigger boundaries.

### 3.1 Hero — "The Void"

**Copy direction:**
> Headline: **"Form finds its order."**
> Subhead: *"Ala Spatial is a studio for computational spatial design — where fluid dynamics, parametric geometry, and architectural clarity converge into structure."*
> CTA: `[ ENTER SYSTEM ]` (mono, bracketed like a terminal command)

**Visual:** Full-viewport obsidian canvas. A single parametric wireframe form (icosahedron or geodesic subdivision) sits centered, slowly breathing (baseline rotation). A sparse coordinate HUD sits bottom-left. The form is not alone — a **CFD-adjacent vector field** of faint streamline particles drifts through the scene, bending almost imperceptibly around the wireframe's bounding volume, as if the mesh were an obstacle in a flow.

**Interaction:** Cursor position perturbs the flow field locally (see §4.1). Scroll begins the transition into Act 2 — see §4.2.

### 3.2 Parametric Showcase — "The Grammar"

**Purpose:** Demonstrate 3–5 real or representative project outputs as procedurally-generated forms, not static images.

**Layout:** Horizontal-scroll-within-vertical-scroll gallery (pinned section, GSAP ScrollTrigger horizontal pan). Each "card" is a live low-poly parametric mesh rendered in its own small WebGL viewport (instanced, shared renderer, separate scenes) with a mono-type caption block beside it: project name, one-line method note, a small parameter readout (e.g. `SUBDIVISIONS: 3 / SEED: 0.42 / SYMMETRY: RADIAL`).

**Interaction:** Hovering a card increases its mesh's wireframe opacity and subdivision level by one step (live re-tessellation, not a swap) — this is the "parametric resolution toggle" feature, demonstrated as a hover affordance rather than an explicit UI control here.

### 3.3 Method / Systems — "The Logic"

**Purpose:** Explain the studio's process (three pillars: parametric design, computational dynamics, architectural clarity) as a triptych.

**Layout:** Three-column blueprint-style layout on a visible faint grid mesh background (SVG or canvas, `--color-wireframe-faint`). Each column is annotated like a technical drawing: a small diagrammatic icon (line-drawn, animates its stroke on scroll-into-view — see §5.3), a mono-type index number (`01 / 02 / 03`), a short headline, and 2–3 sentences of body copy.

**Copy direction (per pillar):**
- **01 — Parametric Design:** *"Every form begins as a rule, not a shape. We build geometry the way an engineer builds a system: from constraints outward."*
- **02 — Computational Dynamics:** *"Space behaves like a fluid before it behaves like a building. We simulate before we finalize — pressure, flow, and force made visible."*
- **03 — Architectural Clarity:** *"Precision is not decoration. What we ship is exactly as complex as it needs to be, and no more."*

### 3.4 Interactive Playground — "The Instrument"

**Purpose:** The one section where the visitor is explicitly invited to operate the system, not just witness it. This is the technical centerpiece and the section most worth over-investing in.

**Layout:** Full-viewport canvas with a minimal control HUD docked bottom-right (mono type, bracketed toggle buttons):

```
[ MESH: ICOSA / TORUS / PLANE ]
[ RESOLUTION: 1 — 5 ]
[ FIELD: LAMINAR / TURBULENT ]
[ RESET ]
```

**Behavior:** User selects a base geometry and resolution; a live vector field (their choice of laminar/turbulent) flows across/through it, with the mesh deforming subtly along the field's streamlines (vertex displacement driven by curl-noise sampled at each vertex position, see §4.3). Mouse acts as a local force emitter into the field regardless of settings.

**Copy direction:** Minimal. Let the instrument speak. One mono-type line above the HUD: `// this is a live simulation, not a video.`

### 3.5 Contact / Inquiry — "The Convergence"

**Purpose:** Close on clarity and directness — the opposite of the density in Act 4, deliberately.

**Layout:** Return to the hero's obsidian void, but the wireframe form has fully resolved — no motion, no particles, hairline-only, perfectly still. This stillness is the payoff of the whole scroll journey: chaos/flow resolving into architecture.

**Copy direction:**
> Headline: **"Bring us the constraints."**
> Body: *"We start from what's fixed — site, budget, material, intent — and compute outward from there."*
> Form fields (mono-type labels): `NAME_`, `EMAIL_`, `PROJECT_TYPE_`, `MESSAGE_`
> Submit button: `[ TRANSMIT ]`

---

## 4. WebGL / Shader / Three.js Feature Specs

### 4.0 Baseline: critique of the provided starter

Your snippet is a correct, minimal skeleton — scene/camera/renderer, an `IcosahedronGeometry` wireframe, a `requestAnimationFrame` loop, and GSAP `ScrollTrigger` scrubbing rotation and camera Z. Two things to change before it's brand-accurate, and one architectural gap to close before it supports the rest of this spec:

1. **Renderer must be pixel-ratio-capped.** Add `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` — uncapped DPR on retina/4K displays will tank frame rate on the fluid/particle work in §4.1 and §4.3.
2. **`MeshBasicMaterial` wireframe can't glow.** The signal-cyan hover/focus states in §2.1 need emissive-capable rendering. Move to `MeshStandardMaterial` (with a cheap `EffectComposer` + `UnrealBloomPass` for the glow) or fake it cheaper with a `ShaderMaterial` that adds a fresnel-based rim glow — recommended for performance (see §4.4).
3. **There is no resize handler and no reduced-motion path** in the snippet — both required before this ships (see §4.5 and §6.3).

Everything below assumes this corrected baseline as the renderer/scene foundation, extended per section.

### 4.1 Hero — CFD-Adjacent Vector Field (GPU particles)

**Approach:** GPU-driven particle system, not CPU-updated `Points` — at the particle counts needed to read as a "flow" (8,000–20,000), CPU position updates will drop frames. Use a ping-pong `FBO` (framebuffer object) simulation:

- Two off-screen render targets hold particle position data encoded as RGBA float textures (`THREE.FloatType`, `RGBAFormat`).
- A simulation fragment shader advances each particle's position per frame by sampling a **curl noise field** (3D simplex noise, curl-derived for divergence-free flow — this is what makes it read as fluid rather than random jitter) plus a **local force term** from cursor position (inverse-square falloff, radius ~1.5 world units).
- A render pass reads the position texture and draws each particle as a soft additive-blended point sprite, colored `--color-wireframe-faint` at rest, shifting toward `--color-signal` in proportion to local velocity magnitude (fast-moving particles near the cursor "heat up" toward signal cyan — this is the CFD-visualization language: velocity-mapped color).

**Uniforms (simulation shader):**
```glsl
uniform float uTime;
uniform vec2  uMouse;       // NDC or world-space cursor position
uniform float uMouseForce;  // eases 0→1 on mousemove, decays to 0 after ~400ms idle
uniform float uCurlScale;   // noise frequency, ~0.6
uniform float uSpeed;       // global flow speed multiplier
```

**Fallback:** on `prefers-reduced-motion` or low-tier GPU (detect via a cheap frame-time probe in the first 30 frames), drop to a static noise-textured plane with no simulation — same color language, zero compute.

### 4.2 Hero → Showcase Scroll Transition — Wireframe Deformation

Extend the corrected baseline: instead of only rotating the mesh on scroll (as in the provided snippet), **displace each vertex along its normal** by an amount driven by a scroll-synced noise field, so the icosahedron appears to "unfold" or "dissolve into flow" as the user scrolls from Hero into the Showcase section.

```glsl
// vertex shader, simplified
uniform float uScrollProgress; // 0→1, driven by GSAP ScrollTrigger scrub
uniform float uTime;
varying vec3 vNormal;

void main() {
  vNormal = normal;
  float noise = curlNoise(position * 2.0 + uTime * 0.05);
  vec3 displaced = position + normal * noise * uScrollProgress * 0.6;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
```

Drive `uScrollProgress` from the same `ScrollTrigger` instance already scrubbing rotation in the provided snippet — do not create a second trigger; read one progress value into both the rotation tween and this shader uniform to keep them phase-locked.

### 4.3 Playground — Interactive Parametric Mesh + Field

- **Mesh swap:** on `[ MESH ]` toggle, cross-fade geometry via opacity (old mesh fades out over 300ms while new fades in) rather than a hard swap — avoids a visual pop.
- **Resolution toggle:** re-instantiate `IcosahedronGeometry(radius, detail)` where `detail` = the 1–5 slider value. This is a real re-tessellation (new geometry, new vertex count), not a shader trick — cache the five geometries on section entry to avoid a stutter on toggle.
- **Laminar/Turbulent toggle:** swap `uCurlScale` and `uSpeed` presets (laminar: low frequency, low speed, smooth; turbulent: high frequency curl octaves layered, higher speed) on the same particle system architecture from §4.1, reused here rather than rebuilt.
- **Vertex displacement:** identical technique to §4.2, but continuously driven by `uTime` and the live field rather than scroll — this section is the only one where the deformation runs as an idle ambient loop rather than being purely input-driven, per the priority hierarchy in §1 — justify the exception because the whole point of this section is "watch the simulation run."

### 4.4 Rim-Glow / Signal Material (used across hero, showcase, playground)

Cheaper than bloom post-processing and recommended as the default:

```glsl
// fragment shader — fresnel rim glow
uniform vec3 uBaseColor;   // wireframe gray
uniform vec3 uSignalColor; // ionized cyan
uniform float uGlowAmount; // 0 at rest, eases to 1 on hover/focus
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), 2.5);
  vec3 color = mix(uBaseColor, uSignalColor, fresnel * uGlowAmount);
  gl_FragColor = vec4(color, 1.0);
}
```

Reserve real `UnrealBloomPass` post-processing for the Playground section only (§3.4) — it's the one section where the extra render cost is justified by being the interaction centerpiece.

### 4.5 Cross-Cutting Technical Requirements

- **Resize:** every canvas needs `camera.aspect` + `renderer.setSize` on a debounced `resize` listener (150ms) — missing in the provided snippet.
- **Reduced motion:** check `window.matchMedia('(prefers-reduced-motion: reduce)')` at init. If true: disable all `ScrollTrigger` scrub animations (swap to instant/fade transitions), freeze particle simulations to a single static frame, keep only the cursor-proximity glow (it's an affordance, not a motion effect).
- **Performance budget:** target 60fps on M-series/mid-tier discrete GPU, graceful degrade to 30fps floor on integrated graphics via a runtime frame-time monitor that steps down particle count and disables bloom if average frame time exceeds 20ms over a rolling 60-frame window.
- **Context loss:** attach a `webglcontextlost` listener on every canvas; pause simulation loops and show a static fallback frame rather than a black canvas if the context is lost (common on laptop GPU switching).

---

## 5. Micro-Interactions & Motion System

### 5.1 Hover States
- Wireframe geometry: edges nearest the cursor brighten from `--color-wireframe` toward `--color-signal` with the fresnel glow material (§4.4), radius-limited (falloff over ~200px screen-space).
- Buttons/links (mono-type, bracketed): bracket characters `[` `]` animate apart by 4px on hover (200ms ease-out), signal-color underline draws in left-to-right beneath the label.

### 5.2 Modal / Panel Transitions
- Any overlay (project detail, inquiry confirmation) enters via a **clip-path wipe** synced to the coordinate-HUD aesthetic — a horizontal line sweeps across revealing the panel, rather than a fade or scale. 250ms, `power2.out`.

### 5.3 Line-Draw Animations
- All diagrammatic icons (§3.3) and section dividers are SVG strokes animated via `stroke-dashoffset` on scroll-into-view (IntersectionObserver-triggered, not scroll-scrubbed — these should complete once, cleanly, not tie to scroll position).
- Draw duration scales with path length (roughly 600–1000ms), always `power1.inOut`, never bouncy/elastic — bounce reads as playful, which conflicts with the clinical-precision principle.

### 5.4 Scroll Choreography
- Section transitions use GSAP `ScrollTrigger` with `scrub: 1` for anything tied to camera/geometry (matches the provided snippet's approach — keep this), but `scrub: false` with a `toggleActions` enter animation for text/copy reveals (copy should arrive decisively, not smear across scroll).

---

## 6. Copywriting Direction Summary

**Voice:** Declarative, short sentences, technical vocabulary used precisely (not decoratively — don't say "flux" if you mean "flow"). Every headline should sound like it could be a comment in source code or a line from a technical manual, but land emotionally anyway.

**Reference lines already drafted above:**
- "Form finds its order." (hero)
- "This is a live simulation, not a video." (playground)
- "Bring us the constraints." (contact)

**Things to avoid:** startup-generic language ("innovative," "cutting-edge," "seamless"), exclamation points, first-person-plural warmth ("we're so excited"). The brand is confident, not enthusiastic.

### 6.1–6.2 (reserved for full copy deck — see follow-up doc)

### 6.3 Accessibility Note on Copy
Every canvas-driven section needs a text-equivalent summary in an `sr-only` element (e.g., "Animated particle flow visualization responding to cursor movement") so the experience degrades gracefully for screen readers, independent of the `prefers-reduced-motion` visual fallback in §4.5.

---

## 7. Build Stack Recommendation

- **Three.js** r160+ (module import, not the CDN `<script>` global approach in the current live site — the shader/FBO work here needs `THREE.GLSL3` and `WebGLRenderTarget` features more cleanly available via the module API)
- **GSAP + ScrollTrigger** as specified in the provided snippet — correct choice, keep it
- **Post-processing:** `three/examples/jsm/postprocessing/EffectComposer` + `UnrealBloomPass`, Playground section only
- Consider **React Three Fiber** only if the broader site is being rebuilt in React; if it stays plain HTML/CSS/JS (current live setup), stay vanilla Three.js — don't introduce a framework solely for the WebGL layer

---

## 8. Phasing Recommendation

1. **Phase 1:** Corrected hero (fixed baseline + rim-glow material + resize/reduced-motion handling) — ships the single highest-impact visual improvement fastest.
2. **Phase 2:** CFD particle field (§4.1) added to hero.
3. **Phase 3:** Method/Systems section with line-draw diagrams (cheapest section to build, no WebGL).
4. **Phase 4:** Parametric Showcase (multi-canvas — most render-budget-sensitive, build after performance patterns are proven in Phase 1–2).
5. **Phase 5:** Interactive Playground — the centerpiece, built last once the underlying particle/deformation systems are battle-tested elsewhere.

---

*End of specification. Open questions for the studio before development starts: (1) confirm whether this richer conceptual direction should replace the current live copy, or exist as a v2 target; (2) confirm the signal-cyan accent against brand preference — an alternative would be a warmer "Obatala white-gold" glow instead of cyan, which would shift the CFD language from "cold fluid sim" to "molten/forming" — worth a quick gut check before committing it to every shader in the system.*
