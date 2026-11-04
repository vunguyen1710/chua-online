// Chùa Online 3.7 — WebGL shrine with rotatable camera, meditation pads and floating virtue gain popups.
import * as THREE from '/vendor/three/three.module.js';

const host = document.getElementById('inside3d');
const txt = document.getElementById('inside3dHint');
let renderer, scene, camera, avatar, ritualLight, entered = false, available = true;
let peers = new Map(), elapsed = 0, last = performance.now(), incense = [], virtuePopups = [];
let cameraYaw = 0, cameraPitch = 0.38, cameraDistance = 12.2;
let dragPointer = null, dragLastX = 0, dragLastY = 0;
const sceneData = { padGlows: [], padAuras: [] };

const col = (hex, roughness = .72, metalness = 0) => new THREE.MeshStandardMaterial({ color: hex, roughness, metalness });
const wood = col('#622617'), darkWood = col('#36160f'), gold = col('#d2a34c', .31, .6), paleGold = col('#f6d88c', .45, .22);
const red = col('#961f20'), ivory = col('#f8e9c9');
const floorMat = col('#9e563f');

const box = (w, h, d, m, x, y, z, parent = scene) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const sphere = (r, m, x, y, z, parent = scene) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16), m);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const cyl = (r1, r2, h, m, x, y, z, parent = scene) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 28), m);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};

function textSprite(text, bg = '#fff0ce', fg = '#493321', size = 64) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 192;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(10, 12, 748, 168, 28); ctx.fill();
  ctx.font = `bold ${size}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = fg; ctx.fillText(String(text).slice(0, 32), 384, 96, 700);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  sprite.scale.set(3.2, .8, 1);
  return sprite;
}

function pillar(x, z) {
  cyl(.46, .48, 5.5, red, x, 2.75, z); cyl(.61, .61, .26, gold, x, .26, z); cyl(.6, .6, .23, gold, x, 5.43, z);
}
function makeLotus(x, y, z, s = .7) {
  const mat = col('#ea88a8', .55);
  const center = sphere(.26 * s, paleGold, x, y, z);
  for (let j = 0; j < 9; j++) {
    const a = j * Math.PI * 2 / 9;
    const p = sphere(.3 * s, mat, x + Math.cos(a) * .29 * s, y - .08 * s, z + Math.sin(a) * .29 * s);
    p.scale.set(.65, 1.3, .85);
  }
  return center;
}
function makeStatue() {
  const g = new THREE.Group(); g.position.set(0, 3.55, -13.6); scene.add(g);
  cyl(1.16, 1.22, .38, gold, 0, 0, 0, g); makeLotus(0, .37, 0, 2.7);
  const body = cyl(.46, .88, 1.75, ivory, 0, 1.42, 0, g); body.rotation.z = .02;
  sphere(.51, ivory, 0, 2.37, 0, g).scale.set(.75, 1.15, .72);
  const hair = col('#1d211e'); sphere(.39, hair, 0, 2.74, -.05, g).scale.set(.91, .52, .9);
  cyl(.2, .3, .26, gold, 0, 3.08, 0, g); sphere(.14, paleGold, 0, 3.29, 0, g);
  for (const side of [-1, 1]) {
    const arm = cyl(.14, .2, 1.08, ivory, side * .48, 1.73, .15, g); arm.rotation.z = side * .65;
    sphere(.17, ivory, side * .81, 1.25, .31, g);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.9, .09, 12, 66), new THREE.MeshStandardMaterial({ color: '#ffe3a4', emissive: '#ce922e', emissiveIntensity: 1.6, metalness: .5 }));
  halo.position.set(0, 2.45, -.32); g.add(halo);
  const light = new THREE.PointLight('#eec977', 16, 10); light.position.set(0, 2.7, -.2); g.add(light);
  return g;
}
function createAuraRing() {
  const aura = new THREE.Mesh(new THREE.TorusGeometry(.8, .05, 10, 48), new THREE.MeshBasicMaterial({ color: '#ffe4a0', transparent: true, opacity: 0 }));
  aura.rotation.x = -Math.PI / 2; aura.position.y = .19;
  return aura;
}
function makePerson(color = '#83a8a4') {
  const g = new THREE.Group(); g.userData.walk = 0; g.userData.sitT = 0; g.userData.meditating = false;
  const cloth = col(color), skin = col('#f0c39d'), black = col('#2a2b2c');
  const body = cyl(.42, .5, 1.08, cloth, 0, 1.02, 0, g); body.scale.set(1, .98, 1);
  const head = sphere(.38, skin, 0, 1.88, 0, g);
  const hair = sphere(.39, black, 0, 2.08, -.03, g); hair.scale.set(1, .45, 1);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.52, .52, .12, 28), new THREE.MeshStandardMaterial({ color: '#7b5a3f', roughness: .9 }));
  base.position.set(0, .08, 0); g.add(base);
  const aura = createAuraRing(); g.add(aura);
  const label = textSprite('Khách'); label.position.y = 2.75; g.add(label); g.userData.label = label;
  const bubble = textSprite(''); bubble.position.y = 3.45; bubble.visible = false; g.add(bubble);
  g.userData.bubble = bubble; g.userData.bubbleText = ''; g.userData.base = base; g.userData.body = body; g.userData.head = head; g.userData.hair = hair; g.userData.aura = aura;
  return g;
}
function assignLabel(g, name) { g.remove(g.userData.label); const s = textSprite(name); s.position.y = 2.85; g.userData.label = s; g.add(s); }
function assignBubble(g, text) {
  if (g.userData.bubbleText === text) return;
  g.remove(g.userData.bubble);
  const s = textSprite(text, '#fff9df', '#503a25', 43); s.position.y = 3.55; s.visible = !!text;
  g.add(s); g.userData.bubble = s; g.userData.bubbleText = text;
}
function assignLabelIfChanged(g, name) { if (g.userData.lastName === name) return; g.userData.lastName = name; assignLabel(g, name); }
function mapPosition(p) { return { x: THREE.MathUtils.clamp((p.x - 600) / 46, -11.8, 11.8), z: THREE.MathUtils.clamp((p.y - 570) / 21, -7.6, 9.2) }; }

const meditationPads2D = [
  { x: 450, y: 626 }, { x: 600, y: 626 }, { x: 750, y: 626 },
  { x: 520, y: 566 }, { x: 680, y: 566 }, { x: 600, y: 506 }
];
const meditationPads3D = meditationPads2D.map(mapPosition);

function setupCameraControls() {
  if (!host || host.dataset.controlsBound === '1') return;
  host.dataset.controlsBound = '1';
  host.addEventListener('pointerdown', e => {
    if (!entered) return;
    dragPointer = e.pointerId; dragLastX = e.clientX; dragLastY = e.clientY;
    host.setPointerCapture?.(e.pointerId);
  });
  host.addEventListener('pointermove', e => {
    if (dragPointer !== e.pointerId || !entered) return;
    const dx = e.clientX - dragLastX, dy = e.clientY - dragLastY;
    dragLastX = e.clientX; dragLastY = e.clientY;
    cameraYaw -= dx * 0.008;
    cameraPitch = THREE.MathUtils.clamp(cameraPitch - dy * 0.0035, 0.18, 0.72);
  });
  const end = e => { if (dragPointer === e.pointerId) dragPointer = null; };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end); host.addEventListener('lostpointercapture', end);
  host.addEventListener('wheel', e => {
    if (!entered) return;
    e.preventDefault();
    cameraDistance = THREE.MathUtils.clamp(cameraDistance + Math.sign(e.deltaY) * .6, 8.8, 17);
  }, { passive: false });
}

function setup() {
  try { renderer = new THREE.WebGLRenderer({ antialias: !matchMedia('(pointer:coarse)').matches, alpha: false, powerPreference: 'default' }); }
  catch (_) { available = false; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(pointer:coarse)').matches ? 1.4 : 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
  renderer.domElement.setAttribute('aria-label', 'Điện Quan Âm không gian ba chiều'); host.appendChild(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color('#221818'); scene.fog = new THREE.Fog('#34251f', 13, 32); scene.userData = sceneData;
  camera = new THREE.PerspectiveCamera(64, 1, .08, 90);
  scene.add(new THREE.HemisphereLight('#fff1cc', '#533126', 3));
  const sun = new THREE.DirectionalLight('#ffe2a7', 4); sun.position.set(-5, 12, 6); scene.add(sun);

  box(30, .16, 34, floorMat, 0, -.09, -3.5);
  for (let x = -15; x <= 15; x += 1.5) box(.025, .013, 34, col('#754234'), x, .015, -3.5);
  for (let z = -20; z < 14; z += 1.5) box(30, .014, .025, col('#754234'), 0, .018, z);
  box(30, 7, .5, darkWood, 0, 3.5, -20); box(.4, 7, 34, darkWood, -15, 3.5, -3.5); box(.4, 7, 34, darkWood, 15, 3.5, -3.5);
  box(30, .43, 34, darkWood, 0, 6.8, -3.5);
  const loader = new THREE.TextureLoader();
  loader.load('/assets/dien-quan-am.png', tex => { tex.colorSpace = THREE.SRGBColorSpace; const m = new THREE.MeshBasicMaterial({ map: tex }); box(12, 5.7, .08, m, 0, 3.7, -19.62); }, undefined, () => {});
  for (const x of [-12, -8, -4, 4, 8, 12]) { pillar(x, -16); pillar(x, 8); }
  for (const z of [-16, 8]) { box(24, .24, .5, gold, 0, 5.55, z); box(24, .18, .6, wood, 0, 6.15, z); }

  box(9, 1.1, 2.6, wood, 0, 1.05, -12.8); box(9.6, .22, 3, gold, 0, 1.65, -12.8);
  for (const x of [-3.7, 3.7]) { box(.18, 1.1, 2.4, paleGold, x, 1.12, -12.8); makeLotus(x, 2, -12.6, 1.2); }
  cyl(.65, .8, .57, gold, 0, 1.98, -11.8); cyl(.72, .72, .18, darkWood, 0, 1.66, -11.8);
  for (let i = -3; i <= 3; i++) { const stick = cyl(.019, .019, .8, red, i * .15, 2.65, -11.8); stick.rotation.z = .035 * i; }
  const altarGlow = new THREE.PointLight('#efb04d', 12, 12); altarGlow.position.set(0, 3, -11.5); scene.add(altarGlow);
  for (const x of [-2.5, 2.5]) { cyl(.09, .09, 1.1, gold, x, 2.35, -10.2); sphere(.19, new THREE.MeshStandardMaterial({ color: '#ffc76e', emissive: '#ea9c39', emissiveIntensity: 2 }), x, 2.97, -10.2); }
  makeStatue();

  const ring = new THREE.Mesh(new THREE.TorusGeometry(.9, .06, 8, 60), new THREE.MeshBasicMaterial({ color: '#ffd17e', transparent: true, opacity: .7 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, .04, -6.6); scene.add(ring); ritualLight = ring;

  meditationPads3D.forEach((spot, i) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .08, 28), new THREE.MeshStandardMaterial({ color: i < 3 ? '#a7623c' : '#b8794c', roughness: .92 }));
    base.position.set(spot.x, .05, spot.z); scene.add(base);
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, .17, 28), new THREE.MeshStandardMaterial({ color: i < 3 ? '#d6a15f' : '#d8b57b', roughness: .76 }));
    cushion.position.set(spot.x, .17, spot.z); scene.add(cushion);
    const glow = new THREE.Mesh(new THREE.TorusGeometry(1.02, .045, 8, 48), new THREE.MeshBasicMaterial({ color: '#ffe4a0', transparent: true, opacity: .24 }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(spot.x, .11, spot.z); glow.userData.phase = i; scene.add(glow); sceneData.padGlows.push(glow);
  });

  avatar = makePerson('#d7a85f'); scene.add(avatar); assignLabel(avatar, 'Bạn');
  const smokeMat = new THREE.MeshBasicMaterial({ color: '#ffefdc', transparent: true, opacity: .15, depthWrite: false }); incense = [];
  for (let i = 0; i < 12; i++) {
    const puff = sphere(.2, smokeMat.clone(), 0, 2.7, -11.7);
    puff.position.x = (i % 4 - 1.5) * .16; puff.position.y = 2.6 + (i / 12) * 2; incense.push(puff);
  }
  setupCameraControls();
  window.addEventListener('resize', resize); resize(); loop(performance.now());
}

function resize() {
  if (!renderer || !camera) return;
  const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 78 : 64; camera.updateProjectionMatrix();
}

function updateGroupPose(group, isMeditating, dt, timeSeed = 0) {
  const data = group.userData;
  data.sitT = THREE.MathUtils.damp(data.sitT || 0, isMeditating ? 1 : 0, 6, dt);
  const sit = data.sitT;
  const breathe = Math.sin(elapsed * 2.2 + timeSeed) * .03;
  group.position.y = group.position.y * 0 + sit * .08;
  if (data.base) data.base.position.y = .08 - sit * .045 + (isMeditating ? Math.sin(elapsed * 2 + timeSeed) * .005 : 0);
  if (data.body) {
    data.body.position.y = 1.02 - sit * .42 + breathe * sit;
    data.body.scale.y = .98 - sit * .22;
    data.body.rotation.z = Math.sin(elapsed * 1.15 + timeSeed) * .02 * sit;
  }
  if (data.head) data.head.position.y = 1.88 - sit * .48 + breathe * sit;
  if (data.hair) data.hair.position.y = 2.08 - sit * .48 + breathe * sit;
  if (data.aura) {
    data.aura.material.opacity = .28 * sit;
    data.aura.rotation.z += dt * (isMeditating ? .8 : .25);
    data.aura.scale.setScalar(1 + Math.sin(elapsed * 2 + timeSeed) * .04 * sit);
  }
}

function spawnVirtuePopup(amount = 1) {
  if (!avatar || !scene) return;
  for (let i = 0; i < amount; i++) {
    const sprite = textSprite('+1 tích đức', '#fff7cd', '#6f5b1d', 44);
    sprite.position.set(avatar.position.x, 3.25, avatar.position.z);
    sprite.scale.set(2.5, .65, 1);
    scene.add(sprite);
    virtuePopups.push({ sprite, life: 0, startX: avatar.position.x + (Math.random() - .5) * .35, startZ: avatar.position.z });
  }
}

function updateCamera(playerPos) {
  const yaw = cameraYaw, pitch = cameraPitch;
  const radiusXZ = cameraDistance * Math.cos(pitch);
  const offset = new THREE.Vector3(Math.sin(yaw) * radiusXZ, cameraDistance * Math.sin(pitch) + 1.6, Math.cos(yaw) * radiusXZ);
  const target = new THREE.Vector3(playerPos.x, 1.95, playerPos.z - .3);
  const desired = target.clone().add(offset);
  camera.position.lerp(desired, .095);
  camera.lookAt(target);
}

function loop(now) {
  requestAnimationFrame(loop);
  if (!entered || !renderer) return;
  const dt = Math.min((now - last) / 1000, .06); last = now; elapsed += dt;
  ritualLight.material.opacity = .45 + .25 * Math.sin(elapsed * 2);
  for (let i = 0; i < incense.length; i++) {
    const p = incense[i], t = (elapsed * .24 + i / 12) % 1;
    p.position.y = 2.6 + t * 2.5; p.position.x = Math.sin(elapsed + i) * (.1 + t * .48); p.scale.setScalar(.7 + t * 2); p.material.opacity = (1 - t) * .09;
  }
  for (const glow of sceneData.padGlows) glow.material.opacity = .2 + .12 * Math.sin(elapsed * 2 + (glow.userData.phase || 0));
  updateGroupPose(avatar, avatar.userData.meditating === true, dt, .3);
  for (const p of peers.values()) updateGroupPose(p.group, p.meditating === true, dt, p.group.position.x || 0);
  for (let i = virtuePopups.length - 1; i >= 0; i--) {
    const pop = virtuePopups[i]; pop.life += dt;
    const t = pop.life / 1.25;
    if (t >= 1) { scene.remove(pop.sprite); virtuePopups.splice(i, 1); continue; }
    pop.sprite.position.set(pop.startX, 3.2 + t * 1.7, pop.startZ - t * .35);
    pop.sprite.material.opacity = 1 - t;
    const s = 2.5 + Math.sin(t * Math.PI) * .45; pop.sprite.scale.set(s, .65 + Math.sin(t * Math.PI) * .12, 1);
  }
  renderer.render(scene, camera);
}

window.temple3D = {
  enter() {
    if (!renderer && available) setup();
    if (!renderer) { host.classList.add('hidden'); txt?.classList.remove('hidden'); if (txt) txt.textContent = 'Thiết bị chưa hỗ trợ WebGL, đang dùng cảnh 2D dự phòng cho nội điện.'; return false; }
    host.classList.remove('hidden'); host.style.pointerEvents = 'auto'; entered = true; last = performance.now(); resize(); return true;
  },
  exit() {
    host.classList.add('hidden'); host.style.pointerEvents = 'none'; entered = false; peers.forEach(x => scene.remove(x.group)); peers.clear();
    for (const p of virtuePopups) scene.remove(p.sprite); virtuePopups = [];
  },
  sync({ player, others, name, bubble }) {
    if (!entered || !scene || !avatar) return;
    const pos = mapPosition(player);
    avatar.position.x = pos.x; avatar.position.z = pos.z; avatar.userData.meditating = player.meditating === true;
    assignLabelIfChanged(avatar, name || 'Bạn'); assignBubble(avatar, bubble || '');
    updateCamera(pos);
    const seen = new Set();
    for (const p of others || []) {
      if (p.scene !== 'inside') continue;
      seen.add(p.id);
      let o = peers.get(p.id);
      if (!o) { const group = makePerson(p.color || '#88a8a5'); scene.add(group); o = { group, meditating: false }; peers.set(p.id, o); }
      const pp = mapPosition(p);
      o.group.position.x = pp.x; o.group.position.z = pp.z; o.meditating = p.meditating === true; o.group.userData.meditating = o.meditating;
      assignLabelIfChanged(o.group, p.name || 'Khách'); assignBubble(o.group, p.chat || '');
    }
    for (const [id, o] of peers) if (!seen.has(id)) { scene.remove(o.group); peers.delete(id); }
  },
  virtueGain(amount = 1) { if (entered) spawnVirtuePopup(amount); }
};
