import * as THREE from "three";

/* ============================================================
   TCM CINEMATIC — Living Portrait
   Foto 2D + depth map → potret fake-3D yang bergerak:
   kepala & tubuh mengikuti kursor, plus napas idle halus.
   Jika assets/portrait.jpg belum ada, dipakai potret
   prosedural (digambar via canvas) sebagai placeholder.
   ============================================================ */

const ASSET_PORTRAIT = "assets/portrait.jpg";
const ASSET_DEPTH = "assets/portrait-depth.jpg";

/* ---------- Shader: parallax depth displacement ---------- */
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uTexture;
  uniform sampler2D uDepth;
  uniform vec2 uMouse;      // -1..1, sudah di-smooth
  uniform float uTime;
  uniform float uStrength;  // besar pergeseran parallax
  uniform float uReveal;    // 0..1 intro fade
  varying vec2 vUv;

  void main() {
    // Napas idle: kepala tetap bergerak pelan walau kursor diam
    vec2 idle = vec2(
      sin(uTime * 0.55) * 0.16 + sin(uTime * 0.23) * 0.08,
      cos(uTime * 0.41) * 0.12
    );
    vec2 look = uMouse + idle;

    float depth = texture2D(uDepth, vUv).r;
    // Piksel dekat (depth terang) bergeser searah kursor,
    // piksel jauh bergeser berlawanan → efek kepala menoleh.
    vec2 offset = look * uStrength * (depth - 0.5);
    vec3 color = texture2D(uTexture, vUv + offset).rgb;

    // Vignette sinematik
    float vig = smoothstep(1.0, 0.4, distance(vUv, vec2(0.5)));
    color *= mix(0.78, 1.0, vig);

    gl_FragColor = vec4(color * uReveal, 1.0);
  }
`;

/* ---------- Placeholder prosedural (dipakai sebelum ada aset AI) ---------- */
function drawProceduralPortrait() {
  const W = 1024, H = 1366;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#101018");
  bg.addColorStop(1, "#05050a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Kabut belakang
  const haze = ctx.createRadialGradient(W * 0.5, H * 0.42, 80, W * 0.5, H * 0.42, 620);
  haze.addColorStop(0, "rgba(201,160,90,0.38)");
  haze.addColorStop(1, "rgba(201,160,90,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, W, H);

  // Bahu / tubuh
  const body = ctx.createLinearGradient(0, H * 0.55, 0, H);
  body.addColorStop(0, "#4a4a5c");
  body.addColorStop(1, "#20202c");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(W * 0.12, H);
  ctx.bezierCurveTo(W * 0.16, H * 0.66, W * 0.36, H * 0.56, W * 0.5, H * 0.55);
  ctx.bezierCurveTo(W * 0.64, H * 0.56, W * 0.84, H * 0.66, W * 0.88, H);
  ctx.closePath();
  ctx.fill();

  // Leher
  ctx.fillStyle = "#565668";
  ctx.fillRect(W * 0.45, H * 0.46, W * 0.1, H * 0.12);

  // Kepala
  const head = ctx.createRadialGradient(W * 0.46, H * 0.33, 40, W * 0.5, H * 0.36, 240);
  head.addColorStop(0, "#7d7d94");
  head.addColorStop(1, "#3a3a4a");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.36, 175, 225, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rim light emas di sisi kanan kepala & bahu
  ctx.strokeStyle = "rgba(201,160,90,0.85)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.36, 175, 225, 0, -0.5, 1.25);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W * 0.62, H * 0.585);
  ctx.bezierCurveTo(W * 0.78, H * 0.65, W * 0.85, H * 0.78, W * 0.87, H * 0.98);
  ctx.stroke();

  // Partikel debu
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(233,228,218,${Math.random() * 0.35})`;
    const r = Math.random() * 2.2;
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

function drawProceduralDepth() {
  const W = 1024, H = 1366;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");

  // Latar = jauh (hitam)
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Tubuh = jarak menengah
  ctx.fillStyle = "#5a5a5a";
  ctx.beginPath();
  ctx.moveTo(W * 0.12, H);
  ctx.bezierCurveTo(W * 0.16, H * 0.66, W * 0.36, H * 0.56, W * 0.5, H * 0.55);
  ctx.bezierCurveTo(W * 0.64, H * 0.56, W * 0.84, H * 0.66, W * 0.88, H);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#6e6e6e";
  ctx.fillRect(W * 0.45, H * 0.46, W * 0.1, H * 0.12);

  // Kepala = dekat, hidung paling dekat (paling terang)
  const head = ctx.createRadialGradient(W * 0.5, H * 0.36, 20, W * 0.5, H * 0.36, 230);
  head.addColorStop(0, "#f2f2f2");
  head.addColorStop(0.55, "#b4b4b4");
  head.addColorStop(1, "#7a7a7a");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.36, 175, 225, 0, 0, Math.PI * 2);
  ctx.fill();

  // Blur ringan supaya transisi depth halus (hindari sobekan piksel)
  ctx.filter = "blur(14px)";
  ctx.drawImage(c, 0, 0);
  ctx.filter = "none";
  return c;
}

/* ---------- Loader tekstur: coba file asli, fallback prosedural ---------- */
function loadTexturePair(srcColor, srcDepth) {
  const loader = new THREE.TextureLoader();
  const tryLoad = (url) =>
    new Promise((resolve) => {
      loader.load(url, (t) => resolve(t), undefined, () => resolve(null));
    });

  return Promise.all([tryLoad(srcColor), tryLoad(srcDepth)]).then(([color, depth]) => {
    if (!color || !depth) {
      color = new THREE.CanvasTexture(drawProceduralPortrait());
      depth = new THREE.CanvasTexture(drawProceduralDepth());
    }
    color.colorSpace = THREE.SRGBColorSpace;
    return { color, depth };
  });
}

/* ---------- Potret dengan material depth-parallax ---------- */
function makePortraitMaterial(color, depth, strength) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTexture: { value: color },
      uDepth: { value: depth },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uTime: { value: 0 },
      uStrength: { value: strength },
      uReveal: { value: 0 },
    },
  });
}

/* ---------- Kursor dengan pegas (gerakan halus sinematik) ---------- */
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
function bindPointer() {
  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = -((e.clientY / window.innerHeight) * 2 - 1);
  });
  window.addEventListener(
    "touchmove",
    (e) => {
      const t = e.touches[0];
      if (!t) return;
      pointer.tx = (t.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = -((t.clientY / window.innerHeight) * 2 - 1);
    },
    { passive: true }
  );
}
function updatePointer(dt) {
  const k = 1 - Math.pow(0.001, dt); // smoothing framerate-independent
  pointer.x += (pointer.tx - pointer.x) * k;
  pointer.y += (pointer.ty - pointer.y) * k;
}

/* ---------- Scene utama (hero) ---------- */
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x07070a);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x07070a, 0.055);

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 10);

/* Debu sinematik melayang */
function makeDust() {
  const N = 350;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 24;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 2] = Math.random() * 8 - 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xc9a05a,
    size: 0.035,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  return new THREE.Points(geo, mat);
}
const dust = makeDust();
scene.add(dust);

let heroMesh = null;
let heroMat = null;

function fitHeroMesh() {
  if (!heroMesh) return;
  // Potret rasio 3:4, tinggi ~85% viewport pada z=0
  const dist = camera.position.z;
  const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const h = viewH * 0.85;
  const w = h * 0.75;
  heroMesh.scale.set(w, h, 1);
  const viewW = viewH * camera.aspect;
  // Di layar lebar potret geser ke kanan, teks hero di kiri
  heroMesh.position.x = camera.aspect > 1 ? viewW * 0.18 : 0;
}

/* ---------- Galeri: renderer kecil per slot ---------- */
const galleryScenes = [];
function initGalleryItem(fig) {
  const slot = fig.querySelector(".gallery__canvas-slot");
  const cnv = document.createElement("canvas");
  slot.appendChild(cnv);

  const r = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const s = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
  cam.position.z = 1;

  const item = { renderer: r, scene: s, camera: cam, mat: null, visible: false, el: slot };
  galleryScenes.push(item);

  loadTexturePair(fig.dataset.portrait, fig.dataset.depth).then(({ color, depth }) => {
    item.mat = makePortraitMaterial(color, depth, 0.045);
    item.mat.uniforms.uReveal.value = 1;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), item.mat);
    s.add(mesh);
  });

  const io = new IntersectionObserver(([entry]) => (item.visible = entry.isIntersecting), {
    threshold: 0.1,
  });
  io.observe(slot);
  return item;
}

function resizeGallery() {
  for (const g of galleryScenes) {
    const rect = g.el.getBoundingClientRect();
    if (rect.width > 0) g.renderer.setSize(rect.width, rect.height, false);
  }
}

/* ---------- Resize ---------- */
function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  fitHeroMesh();
  resizeGallery();
}
window.addEventListener("resize", onResize);

/* ---------- Animasi scroll (GSAP) ---------- */
function initScrollCinema() {
  if (typeof gsap === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);

  document.querySelectorAll(".reveal").forEach((el) => {
    gsap.fromTo(
      el,
      { y: 48, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 1.1,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      }
    );
  });

  // Potret hero: menjauh & meredup saat masuk babak cerita
  if (heroMesh) {
    const st = { z: 0, fade: 1 };
    gsap.to(st, {
      z: -4.5,
      fade: 0,
      ease: "none",
      scrollTrigger: {
        trigger: "#story",
        start: "top bottom",
        end: "bottom top",
        scrub: 1.2,
      },
      onUpdate: () => {
        heroMesh.position.z = st.z;
        if (heroMat) heroMat.uniforms.uReveal.value = Math.max(st.fade, 0);
      },
    });
  }
}

/* ---------- Loop utama ---------- */
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  updatePointer(dt);

  if (heroMat) {
    heroMat.uniforms.uTime.value = t;
    heroMat.uniforms.uMouse.value.set(pointer.x, pointer.y);
  }
  if (heroMesh) {
    // Tubuh ikut miring pelan ke arah kursor
    heroMesh.rotation.y = pointer.x * 0.08;
    heroMesh.rotation.x = -pointer.y * 0.05;
  }

  // Kamera drift sinematik + parallax kursor
  camera.position.x = pointer.x * 0.5 + Math.sin(t * 0.12) * 0.15;
  camera.position.y = pointer.y * 0.3 + Math.cos(t * 0.1) * 0.1;
  camera.lookAt(heroMesh ? heroMesh.position : scene.position);

  dust.rotation.y = t * 0.015;
  dust.position.y = Math.sin(t * 0.2) * 0.2;

  renderer.render(scene, camera);

  for (const g of galleryScenes) {
    if (!g.visible || !g.mat) continue;
    g.mat.uniforms.uTime.value = t;
    g.mat.uniforms.uMouse.value.set(pointer.x, pointer.y);
    g.renderer.render(g.scene, g.camera);
  }
  requestAnimationFrame(tick);
}

/* ---------- Bootstrap ---------- */
bindPointer();
document.querySelectorAll(".gallery__item").forEach(initGalleryItem);

loadTexturePair(ASSET_PORTRAIT, ASSET_DEPTH).then(({ color, depth }) => {
  heroMat = makePortraitMaterial(color, depth, 0.06);
  heroMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), heroMat);
  scene.add(heroMesh);
  fitHeroMesh();
  resizeGallery();

  // Intro: buka letterbox, fade-in potret
  document.getElementById("loader").classList.add("is-done");
  document.body.classList.add("is-ready");
  if (typeof gsap !== "undefined") {
    gsap.to(heroMat.uniforms.uReveal, { value: 1, duration: 2.4, ease: "power2.out", delay: 0.3 });
  } else {
    heroMat.uniforms.uReveal.value = 1;
  }

  initScrollCinema();
  tick();
});
