/* ============================================================
   TAFOLLI GLASS — WebGL scenes
   1) Hero    : drifting sheets of real refractive glass
   2) Glazing : interactive, exploded triple-glazed unit with
                heat / cold / sound flow visualisation
   ============================================================ */
import * as THREE from "../vendor/three.module.min.js";

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const CYAN = 0x04a9de, BLUE = 0x005fa0, NAVY = 0x0a182a;

/* ---------- shared helpers ---------- */
function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) { return false; }
}

/** A soft studio environment built from a canvas gradient — gives the
 *  glass something worth reflecting without loading an HDR file. */
function makeEnv(renderer) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d");

  const sky = g.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0.00, "#9fd9f7");
  sky.addColorStop(0.38, "#2d6f9e");
  sky.addColorStop(0.52, "#0d2237");
  sky.addColorStop(1.00, "#060f1b");
  g.fillStyle = sky; g.fillRect(0, 0, 512, 256);

  // two bright strip lights — the highlight that reads as "glass"
  const strip = (x, w, a) => {
    const lg = g.createLinearGradient(x, 0, x + w, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)");
    lg.addColorStop(0.5, `rgba(255,255,255,${a})`);
    lg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = lg; g.fillRect(x, 10, w, 92);
  };
  strip(40, 150, 0.95);
  strip(300, 110, 0.55);

  const lg2 = g.createLinearGradient(0, 150, 0, 256);
  lg2.addColorStop(0, "rgba(4,169,222,0.30)");
  lg2.addColorStop(1, "rgba(4,169,222,0)");
  g.fillStyle = lg2; g.fillRect(0, 150, 512, 106);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose(); tex.dispose();
  return env;
}

/** Deep blue backdrop with two light shafts — this is what the glass refracts. */
function makeBackdrop() {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 640;
  const g = c.getContext("2d");

  const base = g.createLinearGradient(0, 0, 0, 640);
  base.addColorStop(0, "#0d2a45");
  base.addColorStop(0.55, "#0a1c30");
  base.addColorStop(1, "#060f1b");
  g.fillStyle = base; g.fillRect(0, 0, 1024, 640);

  const glow = (x, y, r, col, a) => {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${col},${a})`);
    rg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = rg; g.fillRect(0, 0, 1024, 640);
  };
  glow(250, 150, 420, "4,169,222", 0.55);
  glow(820, 480, 460, "0,95,160", 0.5);
  glow(540, 90, 300, "160,230,255", 0.3);

  // light shafts, like sun through a factory window
  g.save();
  g.translate(640, 0); g.rotate(0.38);
  for (let i = 0; i < 4; i++) {
    const w = 26 + i * 16;
    const lg = g.createLinearGradient(0, 0, 0, 700);
    lg.addColorStop(0, "rgba(190,235,255,0.22)");
    lg.addColorStop(1, "rgba(190,235,255,0)");
    g.fillStyle = lg; g.fillRect(i * 150 - 300, 0, w, 700);
  }
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(48, 30),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })
  );
  mesh.position.z = -14;
  return mesh;
}

function makeRenderer(canvas, alpha) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: !!alpha, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.08;
  return r;
}

/** Runs the loop only while the canvas is on screen and the tab is visible. */
function visibilityLoop(el, tick) {
  let on = false, raf = 0, last = performance.now();
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    tick(dt, now / 1000);
  };
  const start = () => { if (on || document.hidden) return; on = true; last = performance.now(); raf = requestAnimationFrame(frame); };
  const stop  = () => { on = false; cancelAnimationFrame(raf); };
  new IntersectionObserver((es) => { es[0].isIntersecting ? start() : stop(); }, { threshold: 0.01 }).observe(el);
  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : start(); });
  return stop;
}

function fitRenderer(renderer, camera, canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return false;
  if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  return true;
}

/* ============================================================
   1) HERO — sheets of glass drifting through light
   ============================================================ */
function initHero() {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  if (!hasWebGL()) { canvas.style.display = "none"; return; }

  const renderer = makeRenderer(canvas, true);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  scene.environment = makeEnv(renderer);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // A lit backdrop far behind the panes. Without something to bend, the
  // transmission material has nothing to show and the glass reads as grey card.
  scene.add(makeBackdrop());

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-6, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(CYAN, 2.6);
  rim.position.set(7, -3, -5); scene.add(rim);

  const glassMat = () => new THREE.MeshPhysicalMaterial({
    color: 0xd8f2ff,
    metalness: 0, roughness: 0.045,
    transmission: 1, thickness: 1.1, ior: 1.52,
    transparent: true, opacity: 1,
    envMapIntensity: 1.5,
    clearcoat: 1, clearcoatRoughness: 0.03,
    iridescence: 0.45, iridescenceIOR: 1.35,
    side: THREE.DoubleSide
  });

  // Thin, tall panes — the shape of the product itself
  const sheets = [];
  const COUNT = window.innerWidth < 760 ? 5 : 8;
  const geo = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);

  for (let i = 0; i < COUNT; i++) {
    const m = new THREE.Mesh(geo, glassMat());
    const w = 1.5 + Math.random() * 2.6;
    m.scale.set(w, w * (1.1 + Math.random() * 1.1), 0.055 + Math.random() * 0.05);
    m.position.set(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 9,
      -7 + Math.random() * 9
    );
    m.rotation.set((Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.5);
    m.userData = {
      spin: (Math.random() - 0.5) * 0.09,
      bob: 0.12 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      y0: m.position.y
    };
    scene.add(m); sheets.push(m);
  }

  // a few bright motes to give the air some depth
  const moteGeo = new THREE.BufferGeometry();
  const N = 220, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3]     = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 13;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 2;
  }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
    color: 0x9fe2ff, size: 0.035, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  scene.add(motes);

  // pointer parallax
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  let scrollY = 0;
  window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });

  canvas.classList.add("is-ready");

  visibilityLoop(canvas, (dt, t) => {
    if (!fitRenderer(renderer, camera, canvas)) return;
    cur.x += (target.x - cur.x) * 0.04;
    cur.y += (target.y - cur.y) * 0.04;
    camera.position.x = cur.x * 1.1;
    camera.position.y = -cur.y * 0.75 + scrollY * 0.0016;
    camera.lookAt(0, scrollY * 0.0012, 0);

    if (!REDUCED) {
      for (const s of sheets) {
        s.rotation.y += s.userData.spin * dt;
        s.rotation.x += s.userData.spin * 0.35 * dt;
        s.position.y = s.userData.y0 + Math.sin(t * 0.35 + s.userData.phase) * s.userData.bob;
      }
      motes.rotation.y = t * 0.012;
    }
    renderer.render(scene, camera);
  });
}

/* ============================================================
   2) GLAZING — the interactive triple-glazed unit
   ============================================================ */
const SPECS = {
  3: { ug: "0,5",  rw: "42–47", g: "0,50", th: "44", w: "30" },
  2: { ug: "1,0",  rw: "32–37", g: "0,62", th: "24", w: "20" }
};
// decimal comma for sq/de/fr, point for en
function localiseNum(v, lang) { return lang === "en" ? v.replace(",", ".") : v; }

function initGlazing() {
  const canvas = document.getElementById("glaze-canvas");
  const stage = canvas && canvas.parentElement;
  const loading = document.getElementById("glazeLoading");
  if (!canvas) return;

  const state = { panes: 3, flow: "heat", explode: 0, explodeTarget: 0, spin: true, active: 0 };

  /* --- spec table is useful even without WebGL --- */
  function writeSpecs() {
    const lang = (window.TG && window.TG.getLang()) || "sq";
    const s = SPECS[state.panes];
    const put = (id, val, unit) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = localiseNum(val, lang);
      if (unit) { const b = document.createElement("b"); b.textContent = unit; el.appendChild(b); }
    };
    put("specUg", s.ug, "W/m²K");
    put("specRw", s.rw, "dB");
    put("specG",  s.g,  "");
    put("specTh", s.th, "mm");
    put("specW",  s.w,  "kg");
  }
  writeSpecs();
  document.addEventListener("tg:lang", writeSpecs);

  /* --- layer list ↔ model --- */
  const layerBtns = Array.prototype.slice.call(document.querySelectorAll(".layer"));
  function setActive(i) {
    state.active = i;
    layerBtns.forEach((b) => b.classList.toggle("is-active", +b.dataset.layer === i));
  }
  layerBtns.forEach((b) => b.addEventListener("click", () => setActive(+b.dataset.layer)));

  function syncPaneUI() {
    document.querySelectorAll("[data-panes]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.panes === state.panes)));
    // the middle pane only exists on a triple unit
    layerBtns.forEach((b) => {
      if (b.hasAttribute("data-tripleonly")) b.classList.toggle("is-dim", state.panes !== 3);
    });
    if (state.panes !== 3 && state.active === 3) setActive(0);
    writeSpecs();
  }

  document.querySelectorAll("[data-panes]").forEach((b) => b.addEventListener("click", () => {
    state.panes = +b.dataset.panes; syncPaneUI(); if (api.rebuild) api.rebuild();
  }));
  document.querySelectorAll("[data-flow]").forEach((b) => b.addEventListener("click", () => {
    state.flow = b.dataset.flow;
    document.querySelectorAll("[data-flow]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    if (api.setFlow) api.setFlow(state.flow);
  }));
  const expT = document.getElementById("explodeToggle");
  if (expT) expT.addEventListener("change", () => { state.explodeTarget = expT.checked ? 1 : 0; });
  const spinT = document.getElementById("spinToggle");
  if (spinT) spinT.addEventListener("change", () => { state.spin = spinT.checked; });

  syncPaneUI();

  const api = {};
  if (!hasWebGL()) {
    if (loading) loading.classList.add("is-done");
    stage.style.background = "linear-gradient(150deg,rgba(4,169,222,.2),rgba(0,95,160,.08))";
    return;
  }

  /* ---------------- scene ---------------- */
  const renderer = makeRenderer(canvas, true);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(2.15, 1.05, 3.45);

  scene.environment = makeEnv(renderer);
  const bd = makeBackdrop(); bd.position.z = -7; bd.scale.setScalar(0.38); scene.add(bd);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const l1 = new THREE.DirectionalLight(0xffffff, 2.3); l1.position.set(-5, 6, 5); scene.add(l1);
  const l2 = new THREE.DirectionalLight(CYAN, 2.2);     l2.position.set(6, -2, -4); scene.add(l2);

  const root = new THREE.Group();
  // -z is the outdoor face, +z the indoor face. This base angle puts the
  // outdoor side on the left of the stage, where the label sits.
  const BASE_Y = -0.58;
  let baseY = BASE_Y;
  root.rotation.y = baseY; root.rotation.x = 0.12;
  scene.add(root);

  const unit = new THREE.Group();
  root.add(unit);

  const W = 2.5, H = 1.75, PANE_T = 0.045, GAP = 0.3;

  const paneMat = () => new THREE.MeshPhysicalMaterial({
    color: 0xcdeeff, metalness: 0, roughness: 0.03,
    transmission: 1, thickness: 0.5, ior: 1.52,
    envMapIntensity: 1.6, clearcoat: 1, clearcoatRoughness: 0.02,
    transparent: true, side: THREE.DoubleSide
  });

  // Low-E coating: a faint, warm-tinted film sitting on a pane face
  const lowEMat = () => new THREE.MeshBasicMaterial({
    color: 0x7fe4ff, transparent: true, opacity: 0.14,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });

  const spacerMat = new THREE.MeshStandardMaterial({ color: 0x27384a, roughness: 0.55, metalness: 0.25 });
  const sealMat   = new THREE.MeshStandardMaterial({ color: 0x11202e, roughness: 0.85 });

  /** rectangular ring = the spacer bar running round the edge */
  function ringGeo(w, h, t, depth) {
    const s = new THREE.Shape();
    s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-w / 2 + t, -h / 2 + t); hole.lineTo(w / 2 - t, -h / 2 + t);
    hole.lineTo(w / 2 - t, h / 2 - t);   hole.lineTo(-w / 2 + t, h / 2 - t); hole.closePath();
    s.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, -depth / 2);
    return g;
  }

  let parts = { panes: [], coatings: [], spacers: [], gas: [] };

  function clearUnit() {
    for (let i = unit.children.length - 1; i >= 0; i--) {
      const c = unit.children[i];
      unit.remove(c);
      c.traverse?.((o) => { o.geometry?.dispose?.(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
    }
    parts = { panes: [], coatings: [], spacers: [], gas: [] };
  }

  const paneGeo = new THREE.BoxGeometry(W, H, PANE_T);

  function build() {
    clearUnit();
    const n = state.panes;
    // z of each pane, centred on 0; -z is outside, +z is inside
    const span = (n - 1) * GAP;
    const zs = [];
    for (let i = 0; i < n; i++) zs.push(-span / 2 + i * GAP);

    zs.forEach((z, i) => {
      const m = new THREE.Mesh(paneGeo, paneMat());
      m.position.z = z;
      m.userData.baseZ = z;
      m.userData.spread = (z === 0 && n === 3) ? 0 : (z < 0 ? -1 : 1) * (n === 3 ? 1 : 0.9);
      unit.add(m); parts.panes.push(m);

      // crisp edge outline — glass reads better with a lit edge
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(paneGeo),
        new THREE.LineBasicMaterial({ color: 0x8fe5ff, transparent: true, opacity: 0.34 })
      );
      m.add(edge);
    });

    // Low-E coatings face the cavities (surface #2 and, on a triple, #5)
    const coatZ = n === 3 ? [zs[0] + PANE_T * 0.9, zs[2] - PANE_T * 0.9] : [zs[0] + PANE_T * 0.9];
    coatZ.forEach((z, i) => {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.985, H * 0.985), lowEMat());
      c.position.z = z;
      c.userData.baseZ = z;
      c.userData.spread = z < 0 ? -1 : 1;
      unit.add(c); parts.coatings.push(c);
    });

    // spacers + gas, one set per cavity
    for (let i = 0; i < n - 1; i++) {
      const z0 = zs[i], z1 = zs[i + 1], zc = (z0 + z1) / 2, depth = GAP - PANE_T;

      const sp = new THREE.Mesh(ringGeo(W * 0.955, H * 0.94, 0.085, depth * 0.78), spacerMat);
      sp.position.z = zc; sp.userData.baseZ = zc;
      sp.userData.spread = (n === 3) ? (i === 0 ? -0.55 : 0.55) : (i === 0 ? -0.5 : 0.5);
      unit.add(sp); parts.spacers.push(sp);

      const seal = new THREE.Mesh(ringGeo(W, H, 0.045, depth * 0.96), sealMat);
      seal.position.z = zc; seal.userData.baseZ = zc; seal.userData.spread = sp.userData.spread;
      unit.add(seal); parts.spacers.push(seal);

      // argon molecules drifting inside the cavity
      const CNT = 150, p = new Float32Array(CNT * 3), seed = [];
      for (let k = 0; k < CNT; k++) {
        p[k * 3]     = (Math.random() - 0.5) * W * 0.9;
        p[k * 3 + 1] = (Math.random() - 0.5) * H * 0.86;
        p[k * 3 + 2] = zc + (Math.random() - 0.5) * depth * 0.72;
        seed.push(Math.random() * Math.PI * 2);
      }
      const gg = new THREE.BufferGeometry();
      gg.setAttribute("position", new THREE.BufferAttribute(p, 3));
      const gas = new THREE.Points(gg, new THREE.PointsMaterial({
        color: 0x6fd8ff, size: 0.028, transparent: true, opacity: 0.62,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
      gas.userData = { baseZ: zc, spread: sp.userData.spread, seed, home: p.slice(0) };
      unit.add(gas); parts.gas.push(gas);
    }
  }
  api.rebuild = build;
  build();

  /* ---------------- flow visualisation ---------------- */
  const flows = new THREE.Group();
  root.add(flows);

  // Heat: warm motes pushing out from the inside, cold ones pushing in
  const HEAT_N = 60;
  const heatGeo = new THREE.SphereGeometry(0.035, 8, 8);
  const heatMatWarm = new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const heatMatCold = new THREE.MeshBasicMaterial({ color: 0x5fd0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const warm = new THREE.InstancedMesh(heatGeo, heatMatWarm, HEAT_N);
  const cold = new THREE.InstancedMesh(heatGeo, heatMatCold, HEAT_N);
  warm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cold.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  flows.add(warm, cold);

  const parcels = { warm: [], cold: [] };
  function seedParcels() {
    parcels.warm.length = 0; parcels.cold.length = 0;
    for (let i = 0; i < HEAT_N; i++) {
      parcels.warm.push({ x: (Math.random() - 0.5) * W * 0.9, y: (Math.random() - 0.5) * H * 0.85, z: 0.95 + Math.random() * 0.75, v: -(0.34 + Math.random() * 0.26), life: Math.random() });
      parcels.cold.push({ x: (Math.random() - 0.5) * W * 0.9, y: (Math.random() - 0.5) * H * 0.85, z: -0.95 - Math.random() * 0.75, v: (0.34 + Math.random() * 0.26), life: Math.random() });
    }
  }
  seedParcels();

  // Sound: wavefronts coming from outside, each pane knocks them down
  const RINGS = 5;
  const soundRings = [];
  for (let i = 0; i < RINGS; i++) {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.019, 8, 72),
      new THREE.MeshBasicMaterial({ color: 0xa8ecff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    m.rotation.y = Math.PI / 2;      // face along z
    m.userData.p = i / RINGS;
    flows.add(m); soundRings.push(m);
  }

  function setFlow(mode) {
    const heatOn = mode === "heat", soundOn = mode === "sound";
    warm.visible = cold.visible = heatOn;
    soundRings.forEach((r) => { r.visible = soundOn; });
  }
  api.setFlow = setFlow;
  setFlow(state.flow);

  /* ---------------- interaction ---------------- */
  let drag = false, px = 0, py = 0, velY = 0, velX = 0;
  const hint = document.getElementById("glazeHint");
  const down = (e) => { drag = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture?.(e.pointerId); hint?.classList.add("is-hidden"); };
  const move = (e) => {
    if (!drag) return;
    velY = (e.clientX - px) * 0.006;
    velX = (e.clientY - py) * 0.004;
    baseY += velY;
    root.rotation.x = Math.max(-0.65, Math.min(0.65, root.rotation.x + velX));
    px = e.clientX; py = e.clientY;
  };
  const up = () => { drag = false; };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("pointerleave", up);

  if (loading) setTimeout(() => loading.classList.add("is-done"), 420);
  if (hint) setTimeout(() => hint.classList.add("is-hidden"), 7000);

  /* ---------------- loop ---------------- */
  const dummy = new THREE.Object3D();
  const EXPLODE_DIST = 0.62;

  const CAM_DIR = new THREE.Vector3(2.15, 1.05, 3.45).normalize();
  visibilityLoop(canvas, (dt, t) => {
    if (!fitRenderer(renderer, camera, canvas)) return;
    // pull back on narrow canvases so the unit never clips at the edges
    const aspect = camera.aspect;
    const dist = 4.25 * (aspect < 1.25 ? 1 + (1.25 - aspect) * 0.75 : 1);
    camera.position.copy(CAM_DIR).multiplyScalar(dist);
    camera.lookAt(0, 0, 0);

    // ease the exploded state
    state.explode += (state.explodeTarget - state.explode) * Math.min(1, dt * 4.5);
    const ex = state.explode * EXPLODE_DIST;

    const place = (o) => { o.position.z = o.userData.baseZ + (o.userData.spread || 0) * ex; };
    parts.panes.forEach(place);
    parts.coatings.forEach(place);
    parts.spacers.forEach(place);

    // highlight whichever layer the reader has selected
    const a = state.active;
    parts.panes.forEach((p, i) => {
      // layer list index of each pane: outer / middle / inner
      const map = state.panes === 3 ? [0, 3, 5] : [0, 5];
      const wanted = map[i] === a || (a === 1 && i === 0);
      const to = wanted ? 1.0 : 0.0;
      p.userData.hl = (p.userData.hl || 0) + (to - (p.userData.hl || 0)) * Math.min(1, dt * 6);
      p.material.color.setHSL(0.55, 0.45 + p.userData.hl * 0.35, 0.86 + p.userData.hl * 0.07);
    });
    parts.coatings.forEach((c) => {
      const want = a === 1 ? 0.42 : 0.14;
      c.material.opacity += (want - c.material.opacity) * Math.min(1, dt * 6);
    });
    { // warm-edge highlight
      const want = a === 4 ? 0.55 : 0.0;
      spacerMat.userData.hl = (spacerMat.userData.hl || 0) + (want - (spacerMat.userData.hl || 0)) * Math.min(1, dt * 6);
      spacerMat.color.setRGB(0.153 + spacerMat.userData.hl * 0.25, 0.22 + spacerMat.userData.hl * 0.45, 0.29 + spacerMat.userData.hl * 0.6);
    }

    // gas drift
    parts.gas.forEach((g) => {
      g.position.z = (g.userData.baseZ + g.userData.spread * ex) - g.userData.baseZ;
      const arr = g.geometry.attributes.position.array, home = g.userData.home, seed = g.userData.seed;
      if (!REDUCED) {
        for (let k = 0; k < seed.length; k++) {
          arr[k * 3]     = home[k * 3]     + Math.sin(t * 0.8 + seed[k]) * 0.05;
          arr[k * 3 + 1] = home[k * 3 + 1] + Math.cos(t * 0.7 + seed[k] * 1.3) * 0.05;
        }
        g.geometry.attributes.position.needsUpdate = true;
      }
      g.material.opacity = 0.35 + 0.3 * Math.sin(t * 1.4) * 0.5 + (a === 2 ? 0.35 : 0);
    });

    // --- heat / cold parcels ---------------------------------
    if (warm.visible) {
      const zs = parts.panes.map((p) => p.position.z);
      const outerZ = Math.min.apply(null, zs), innerZ = Math.max.apply(null, zs);
      const step = (list, mesh, fromInside) => {
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          p.z += p.v * dt;
          // the Low-E coating turns the parcel around — that is the whole point
          const wall = fromInside ? innerZ - 0.02 : outerZ + 0.02;
          const hit = fromInside ? p.z <= wall : p.z >= wall;
          if (hit) { p.v = -p.v * 0.72; p.life = 1; }
          p.life -= dt * 0.42;
          if (p.life <= 0) {
            p.z = fromInside ? 0.95 + Math.random() * 0.75 : -0.95 - Math.random() * 0.75;
            p.v = fromInside ? -(0.34 + Math.random() * 0.26) : (0.34 + Math.random() * 0.26);
            p.x = (Math.random() - 0.5) * W * 0.9;
            p.y = (Math.random() - 0.5) * H * 0.85;
            p.life = 1;
          }
          const s = 0.45 + Math.max(0, p.life) * 0.8;
          dummy.position.set(p.x, p.y, p.z);
          dummy.scale.setScalar(s);
          dummy.updateMatrix();
          mesh.setMatrixAt(i, dummy.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      };
      step(parcels.warm, warm, true);
      step(parcels.cold, cold, false);
      warm.material.opacity = 0.85; cold.material.opacity = 0.7;
    }

    // --- sound wavefronts ------------------------------------
    if (soundRings[0].visible) {
      const zs = parts.panes.map((p) => p.position.z);
      const start = Math.min.apply(null, zs) - 1.25, end = Math.max.apply(null, zs) + 0.8;
      soundRings.forEach((r) => {
        r.userData.p += dt * 0.26;
        if (r.userData.p > 1) r.userData.p -= 1;
        const p = r.userData.p;
        const z = start + (end - start) * p;
        r.position.z = z;
        // each pane crossed takes a bite out of the amplitude
        let crossed = 0;
        for (const pz of zs) if (z > pz) crossed++;
        const damp = Math.pow(0.42, crossed);
        const grow = 0.55 + p * 1.5;
        r.scale.setScalar(grow * (0.6 + damp * 0.6));
        r.material.opacity = (0.95 * damp + 0.06) * Math.min(1, (1 - p) * 3.2) * (a === 5 ? 1.35 : 1);
      });
    }

    // Sway rather than spin, so "outside" stays on the outside.
    if (!drag) { baseY += velY; velY *= 0.9; }
    root.rotation.y = baseY + ((state.spin && !REDUCED) ? Math.sin(t * 0.26) * 0.42 : 0);

    renderer.render(scene, camera);
  });
}

/* ---------------- boot ---------------- */
function boot() { initHero(); initGlazing(); }
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
