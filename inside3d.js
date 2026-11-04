// Chùa Online 4.0 — WebGL shrine with mobile audio, improved shrine, 3D sign, exit door, and 3D +1 virtue popups.
import * as THREE from '/vendor/three/three.module.js';

const host = document.getElementById('inside3d');
const txt = document.getElementById('inside3dHint');
let renderer, scene, camera, avatar, ritualLight, entered = false, available = true;
let peers = new Map(), elapsed = 0, last = performance.now(), incense = [], virtuePopups = [];
let cameraYaw = 0, cameraPitch = 0.38, cameraDistance = 12.2;
let dragPointer = null, dragLastX = 0, dragLastY = 0;
const sceneData = { padGlows: [], padAuras: [], occluders: [] };
const raycaster = new THREE.Raycaster();

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


function makeTextTexture(text, bg='#fff0ce', fg='#493321', size=64, width=1024, height=256){
  const c=document.createElement('canvas'); c.width=width; c.height=height;
  const ctx=c.getContext('2d');
  ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(12,16,width-24,height-32,34); ctx.fill();
  ctx.font=`bold ${size}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=fg; ctx.fillText(String(text).slice(0,40), width/2, height/2, width-70);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; return tex;
}
function textPlate3D(text, opts={}){
  const { bg='#fff0ce', fg='#493321', size=64, width=4.2, height=1.0, depth=.14, edge='#6d5139', frontScale=.9, back=true } = opts;
  const g=new THREE.Group();
  const board=new THREE.Mesh(new THREE.BoxGeometry(width,height,depth), new THREE.MeshStandardMaterial({color:edge, roughness:.72, metalness:.08}));
  g.add(board);
  const tex=makeTextTexture(text,bg,fg,size);
  const front=new THREE.Mesh(new THREE.PlaneGeometry(width*frontScale,height*.78), new THREE.MeshBasicMaterial({map:tex,transparent:true}));
  front.position.z=depth/2+.003; g.add(front);
  if(back){ const backPlane=new THREE.Mesh(new THREE.PlaneGeometry(width*frontScale,height*.78), new THREE.MeshBasicMaterial({map:tex,transparent:true})); backPlane.rotation.y=Math.PI; backPlane.position.z=-depth/2-.003; g.add(backPlane); }
  g.userData.dispose=()=>{ tex.dispose(); for(const child of g.children){ if(child.material?.map) child.material.map.dispose?.(); child.material?.dispose?.(); child.geometry?.dispose?.(); } };
  return g;
}
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

function makePlusOne3D() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffe27f', emissive: '#c99423', emissiveIntensity: .95, roughness: .28, metalness: .62, transparent: true, opacity: 1 });
  const edge = new THREE.MeshStandardMaterial({ color: '#fff6c6', emissive: '#f0c766', emissiveIntensity: .35, roughness: .2, metalness: .3, transparent: true, opacity: 1 });
  const parts=[];
  const addBox=(w,h,d,x,y,z,material=mat)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);g.add(m);parts.push(m);return m;};
  // plus sign
  addBox(.16,.62,.16,-.34,.05,0); addBox(.5,.16,.16,-.34,.05,0);
  // numeral 1
  addBox(.16,.78,.16,.16,.06,0); addBox(.36,.12,.16,.07,-.29,0); addBox(.24,.12,.16,.08,.46,0,edge);
  // soft glow disc
  const halo = new THREE.Mesh(new THREE.CylinderGeometry(.58,.58,.03,24), new THREE.MeshBasicMaterial({color:'#ffe794',transparent:true,opacity:.22}));
  halo.rotation.x = -Math.PI/2; halo.position.set(-.06,-.42,0); g.add(halo); parts.push(halo);
  g.userData.fadeParts=parts;
  return g;
}

function pillar(x, z) {
  const main=cyl(.46,.48,5.5,red.clone(),x,2.75,z);
  const bottom=cyl(.61,.61,.26,gold.clone(),x,.26,z);
  const top=cyl(.6,.6,.23,gold.clone(),x,5.43,z);
  for(const item of [main,bottom,top]){
    item.material.transparent=true;item.material.depthWrite=true;item.userData.occludeOpacity=1;
    sceneData.occluders.push(item);
  }
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
  const g = new THREE.Group(); g.position.set(0, 1.62, -13.55); scene.add(g);
  cyl(1.28, 1.42, .44, gold, 0, 0, 0, g); makeLotus(0, .45, 0, 2.9);
  const body = cyl(.58, .96, 2.05, ivory, 0, 1.72, 0, g); body.rotation.z = .02;
  sphere(.56, ivory, 0, 2.98, 0, g).scale.set(.78, 1.18, .74);
  const hair = col('#1d211e'); sphere(.42, hair, 0, 3.36, -.05, g).scale.set(.91, .56, .9);
  cyl(.2, .3, .28, gold, 0, 3.73, 0, g); sphere(.15, paleGold, 0, 3.95, 0, g);
  for (const side of [-1, 1]) {
    const arm = cyl(.14, .2, 1.16, ivory, side * .54, 2.1, .18, g); arm.rotation.z = side * .62;
    sphere(.17, ivory, side * .86, 1.58, .33, g);
  }
  const halo = new THREE.Mesh(new THREE.TorusGeometry(1.02, .1, 12, 66), new THREE.MeshStandardMaterial({ color: '#ffe3a4', emissive: '#ce922e', emissiveIntensity: 1.6, metalness: .5 }));
  halo.position.set(0, 3.02, -.34); g.add(halo);
  const light = new THREE.PointLight('#eec977', 18, 11); light.position.set(0, 3.25, -.2); g.add(light);
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
  const label = textPlate3D('Khách',{bg:'#fff4d9',fg:'#493321',size:54,width:1.9,height:.42,depth:.07,edge:'#6e5038',frontScale:.92}); label.position.y = 2.62; label.scale.set(.82,.82,.82); g.add(label); g.userData.label = label;
  const bubble = textSprite(''); bubble.position.y = 3.45; bubble.visible = false; g.add(bubble);
  g.userData.bubble = bubble; g.userData.bubbleText = ''; g.userData.base = base; g.userData.body = body; g.userData.head = head; g.userData.hair = hair; g.userData.aura = aura;
  return g;
}
function assignLabel(g, name) { if(g.userData.label){ g.remove(g.userData.label); g.userData.label.userData?.dispose?.(); } const s = textPlate3D(name,{bg:'#fff4d9',fg:'#493321',size:54,width:1.9,height:.42,depth:.07,edge:'#6e5038',frontScale:.92}); s.position.y = 2.62; s.scale.set(.82,.82,.82); g.userData.label = s; g.add(s); }
function assignBubble(g, text) {
  if (g.userData.bubbleText === text) return;
  g.remove(g.userData.bubble);
  const s = textSprite(text, '#fff9df', '#503a25', 43); s.position.y = 3.55; s.visible = !!text;
  g.add(s); g.userData.bubble = s; g.userData.bubbleText = text;
}
function assignLabelIfChanged(g, name) { if (g.userData.lastName === name) return; g.userData.lastName = name; assignLabel(g, name); }
function mapPosition(p) { return { x: THREE.MathUtils.clamp((p.x - 600) / 46, -11.8, 11.8), z: THREE.MathUtils.clamp((p.y - 570) / 21, -7.6, 9.2) }; }

const meditationPads2D = [{"x":255,"y":500},{"x":405,"y":500},{"x":795,"y":500},{"x":945,"y":500},{"x":255,"y":600},{"x":405,"y":600},{"x":795,"y":600},{"x":945,"y":600},{"x":255,"y":700},{"x":405,"y":700},{"x":795,"y":700},{"x":945,"y":700}];
const meditationPads3D = meditationPads2D.map(mapPosition);

// Detailed Vietnamese folk ornamental wall panels and open wooden lattice windows.
function makeFolkWalls() {
  const lacquer=col('#7e251e',.5), trim=col('#d6a859',.4,.35);
  const ink=col('#b77a35',.55), ceramic=col('#93acaa',.62), blue=col('#496e7d',.72);
  // Rear wall is a carved red/gold surface with decorative panels.
  for(let i=-6;i<=6;i++) {
    const x=i*2.15;
    if(Math.abs(x)<5.5)continue; // reserve central shrine mural
    box(1.85,4.9,.07,lacquer,x,3.18,-19.66);
    box(1.9,.08,.12,trim,x,5.55,-19.54);
    box(1.9,.08,.12,trim,x,1.05,-19.54);
    for(const j of [-.62,.62])box(.055,4.4,.12,ink,x+j,3.2,-19.52);
    const round=new THREE.Mesh(new THREE.TorusGeometry(.46,.065,7,12),trim);
    round.position.set(x,3.45,-19.47); scene.add(round);
    makeLotus(x,3.4,-19.4,.7);
  }
  // Side walls: carved panels separated by open-style lattice windows. Their geometry is
  // close to the edge and uses non-depth-writing transparent material to avoid blocking camera.
  for(const side of [-1,1]) {
    const x=side*14.82;
    for(const z of [-13,-5,3,11]) {
      const group=new THREE.Group();scene.add(group);
      const frame=col('#9d4a2d',.55), engraving=col('#e3b565',.5), stained=col('#a9c5b4',.7);
      stained.transparent=true;stained.opacity=.19;stained.depthWrite=false;stained.side=THREE.DoubleSide;
      // Wall segment between windows, decorative horizontal bands.
      const panelMat=lacquer.clone();panelMat.transparent=true;panelMat.opacity=.22;panelMat.depthWrite=false;panelMat.side=THREE.DoubleSide;
      box(.12,4.8,6.1,panelMat,x,3,z,group);
      box(.21,.13,6.25,engraving,x-side*.1,5.3,z,group);
      box(.21,.13,6.25,engraving,x-side*.1,.9,z,group);
      // Window inset; the window is visibly lighter than the wall.
      box(.24,2.55,3.15,stained,x-side*.16,3.25,z,group);
      for(const hz of [-1.6,1.6])box(.27,3.1,.17,frame,x-side*.18,3.25,z+hz,group);
      for(const hy of [1.68,4.82])box(.27,.15,3.3,frame,x-side*.18,hy,z,group);
      for(let j=-2;j<=2;j++)box(.28,2.9,.065,frame,x-side*.19,3.25,z+j*.49,group);
      for(const y of [2.5,3.3,4.1])box(.28,.065,3.1,frame,x-side*.19,y,z,group);
      // Gold diamond motifs centered on the window.
      for(const v of [-1,0,1]) {
        const square=box(.045,.33,.33,engraving,x-side*.23,3.25,z+v*.82,group);
        square.rotation.x=Math.PI/4;
      }
    }
  }
}
function decorateAltar() {
  const lacquer=col('#7c231d',.44), trim=col('#e3b45f',.29,.65), dark=col('#40180f',.58);
  const marble=col('#f1dfb9',.48), jade=col('#70a79a',.45), pink=col('#e9a9bd',.64);
  // A multi-level lacquered dais behind the existing offering table.
  box(10.4,.35,4.2,trim,0,.32,-15.25);
  box(10,.62,3.9,lacquer,0,.77,-15.25);
  box(8.9,.19,3.6,trim,0,1.14,-15.25);
  box(7.6,.95,3.2,dark,0,1.73,-15.25);
  box(7.9,.13,3.3,trim,0,2.24,-15.25);
  for(const side of [-1,1]){
    // Screen panels with gold frames and large lotus reliefs.
    const x=side*4.9;
    box(.3,5.2,2, lacquer,x,3.48,-16.8);
    box(.37,5.3,.12, trim,x,3.48,-15.9);
    makeLotus(x,3.8,-15.75,1.28);
    // Pair of ceremonial blue-and-white vases.
    const vx=side*3.28;
    cyl(.38,.53,1,marble,vx,2.85,-14.7);
    cyl(.42,.42,.10,jade,vx,3.37,-14.7);
    for(let k=0;k<5;k++){
      let a=k*Math.PI*2/5;
      const sx=vx+Math.sin(a)*.55, sz=-14.7+Math.cos(a)*.35;
      makeLotus(sx,4.05+Math.cos(k)*.23,sz,.63);
    }
    // Glowing oil lamps beside altar.
    const cx=side*4.35;
    cyl(.12,.22,1.15,trim,cx,2.28,-11.35);
    const flame=new THREE.Mesh(new THREE.ConeGeometry(.18,.42,12),new THREE.MeshBasicMaterial({color:'#ffe1a1'}));
    flame.position.set(cx,3.04,-11.35);scene.add(flame);
    scene.add(new THREE.PointLight('#ffb45e',2.8,5).translateX(cx).translateY(3.03).translateZ(-11.35));
  }
  // Ornamental lotus motifs on the front of altar.
  for(let x=-3.75;x<=3.76;x+=1.25){
    makeLotus(x,1.04,-11.2,.47);
    box(.08,.12,.12,trim,x,1.48,-11.2);
  }
  // Engraved red/gold horizontal bands and framed plaque placed higher so it does not cover the statue.
  box(10.6,.23,.19,trim,0,3.02,-18.7);
  const plaque=box(6.2,1.18,.42,lacquer,0,6.72,-18.92);
  box(6.55,.10,.47,trim,0,7.37,-18.74);
  box(6.55,.10,.47,trim,0,6.07,-18.74);
  box(.12,1.42,.18,trim,-2.6,6.72,-18.68);
  box(.12,1.42,.18,trim,2.6,6.72,-18.68);
  const title=textSprite('NHÀ HỒI PHỤC','#31523e','#f7efc7',44);
  title.scale.set(5.55,1.18,1);title.position.set(0,6.74,-18.66);scene.add(title);
}


function buildExitDoor() {
  const frame=col('#6c2c1d',.52), trim=col('#dfb35e',.28,.6), panel=col('#87462c',.58), brass=col('#ddb45f',.32,.55);
  // Front doorway looking back to the outer courtyard.
  box(7.8,.24,.42,trim,0,5.3,13.2);
  box(8.2,.32,.58,frame,0,5.55,13.15);
  box(.38,4.9,.52,frame,-3.9,2.65,13.1); box(.38,4.9,.52,frame,3.9,2.65,13.1);
  box(2.3,4.35,.16,panel,-1.42,2.35,13.0); box(2.3,4.35,.16,panel,1.42,2.35,13.0);
  for(const side of [-1,1]){
    for(let i=-2;i<=2;i++) box(.08,3.7,.04,trim,side*1.42,2.35,13.09+i*.42);
    for(const y of [1.1,2.35,3.6]) box(2.18,.07,.04,trim,side*1.42,y,13.09);
    sphere(.09, brass, side*.34, 2.35, 12.88);
  }
  // Doors opened outward leaving visible passage.
  const leafL = new THREE.Group(); scene.add(leafL); leafL.position.set(-1.2,0,12.82);
  const leafR = new THREE.Group(); scene.add(leafR); leafR.position.set(1.2,0,12.82);
  const dl=box(2.05,4.0,.13,panel,0,2.2,0,leafL); const dr=box(2.05,4.0,.13,panel,0,2.2,0,leafR);
  leafL.rotation.y = -0.95; leafR.rotation.y = 0.95;
  const exitText=textPlate3D('TRỞ RA KHU XẢ STRESS',{bg:'#31523e',fg:'#f7efc7',size:34,width:3.4,height:.76,depth:.14,edge:'#213a2c'}); exitText.position.set(0,4.88,13.02); scene.add(exitText);
}

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
  renderer.domElement.setAttribute('aria-label', 'Nhà Hồi Phục không gian ba chiều'); host.appendChild(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color('#221818'); scene.fog = new THREE.Fog('#34251f', 13, 32); scene.userData = sceneData;
  camera = new THREE.PerspectiveCamera(64, 1, .08, 90);
  scene.add(new THREE.HemisphereLight('#fff1cc', '#533126', 3));
  const sun = new THREE.DirectionalLight('#ffe2a7', 4); sun.position.set(-5, 12, 6); scene.add(sun);

  box(30, .16, 34, floorMat, 0, -.09, -3.5);
  for (let x = -15; x <= 15; x += 1.5) box(.025, .013, 34, col('#754234'), x, .015, -3.5);
  for (let z = -20; z < 14; z += 1.5) box(30, .014, .025, col('#754234'), 0, .018, z);
  box(30,7,.5,darkWood,0,3.5,-20);
  // Thin side walls remain almost transparent so orbiting camera never loses sight of the avatar.
  const glassWall=col('#6d3926');glassWall.transparent=true;glassWall.opacity=.10;glassWall.depthWrite=false;glassWall.side=THREE.DoubleSide;
  for(const x of [-15,15]){
    box(.15,5.5,34,glassWall,x,3,-3.5);
    for(const z of [-17,-10,-3,4,11]) box(.28,6,.35,wood,x,3,z);
    box(.3,.22,34,gold,x,5.75,-3.5);
  }
  // An open timber-beam ceiling replaces the opaque solid box above the camera.
  for(const z of [-17,-9,-1,7]) box(30,.32,.5,darkWood,0,6.5,z);
  for(const x of [-13,0,13]) box(.3,.28,33,wood,x,6.48,-3.5);

  const loader = new THREE.TextureLoader();
  loader.load('/assets/dien-quan-am.png', tex => { tex.colorSpace = THREE.SRGBColorSpace; const m = new THREE.MeshBasicMaterial({ map: tex }); box(12, 5.7, .08, m, 0, 3.7, -19.62); }, undefined, () => {});
  for (const x of [-12,-7,7,12]) { pillar(x,-16); pillar(x,9); }
  for (const z of [-16,9]) { box(24,.24,.5,gold,0,5.55,z); box(24,.18,.6,wood,0,6.15,z); }

  box(9, 1.1, 2.6, wood, 0, 1.05, -12.8); box(9.6, .22, 3, gold, 0, 1.65, -12.8);
  for (const x of [-3.7, 3.7]) { box(.18, 1.1, 2.4, paleGold, x, 1.12, -12.8); makeLotus(x, 2, -12.6, 1.2); }
  cyl(.65, .8, .57, gold, 0, 1.98, -11.8); cyl(.72, .72, .18, darkWood, 0, 1.66, -11.8);
  for (let i = -3; i <= 3; i++) { const stick = cyl(.019, .019, .8, red, i * .15, 2.65, -11.8); stick.rotation.z = .035 * i; }
  const altarGlow = new THREE.PointLight('#efb04d', 12, 12); altarGlow.position.set(0, 3, -11.5); scene.add(altarGlow);
  for (const x of [-2.5, 2.5]) { cyl(.09, .09, 1.1, gold, x, 2.35, -10.2); sphere(.19, new THREE.MeshStandardMaterial({ color: '#ffc76e', emissive: '#ea9c39', emissiveIntensity: 2 }), x, 2.97, -10.2); }
  decorateAltar();
  makeStatue();
  buildExitDoor();
  makeFolkWalls();
  decorateAltar();

  const ring = new THREE.Mesh(new THREE.TorusGeometry(.9, .06, 8, 60), new THREE.MeshBasicMaterial({ color: '#ffd17e', transparent: true, opacity: .7 }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(0, .04, -6.6); scene.add(ring); ritualLight = ring;

  // Vietnamese folk interior: red lacquered wall panels, bronze gong, wooden screen,
  // blue-and-white ceramic vases, hanging lanterns and warm amber lights, kept to the perimeter.
  const porcelain=col('#e6e3d4',.35), porcelainBlue=col('#315d84',.42), copper=col('#ae8149',.28,.56);
  const shade=col('#f1b75a',.38), tassel=col('#a93827');
  for(const side of [-1,1]){
    for(const z of [-12,-3,5]){
      const x=side*13.15;
      box(.18,3.2,2.6,wood,x,3,z);
      for(let j=-1;j<=1;j++) box(.22,2.4,.11,gold,x-side*.16,3,z+j*.72);
      cyl(.48,.35,.85,porcelain,x-side*.95,.47,z);
      cyl(.33,.34,.08,porcelainBlue,x-side*.95,.89,z);
    }
    for(const z of [-12,-4,4,11]){
      const lx=side*10.35;
      cyl(.32,.4,.72,shade,lx,4.65,z);
      cyl(.44,.44,.09,gold,lx,5.08,z);
      cyl(.44,.44,.09,gold,lx,4.23,z);
      cyl(.035,.035,.52,tassel,lx,3.91,z);
      const light=new THREE.PointLight('#eec47b',2.6,5);light.position.set(lx,4.5,z);scene.add(light);
    }
  }
  // Bronze gong and low ceremonial screens are along the walls, never between the camera and player.
  const gong=cyl(.95,.95,.12,copper,-12.95,2.65,-8.5);gong.rotation.z=Math.PI/2;
  box(.18,2.5,2.5,wood,-13.1,2.7,-8.5);
  for(const x of [-11.1,11.1]){
    for(let z=-10;z<6;z+=3.4){
      box(.23,1.45,1.45,wood,x,.8,z);
      box(.28,.1,1.45,gold,x,1.54,z);
    }
  }

  meditationPads3D.forEach((spot, i) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .08, 28), new THREE.MeshStandardMaterial({ color: i < 3 ? '#a7623c' : '#b8794c', roughness: .92 }));
    base.position.set(spot.x, .05, spot.z); scene.add(base);
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, .17, 28), new THREE.MeshStandardMaterial({ color: i < 3 ? '#d6a15f' : '#d8b57b', roughness: .76 }));
    cushion.position.set(spot.x, .17, spot.z); scene.add(cushion);
    const edge=new THREE.Mesh(new THREE.TorusGeometry(.78,.035,8,48),new THREE.MeshStandardMaterial({color:'#efd4a5',roughness:.8}));edge.rotation.x=-Math.PI/2;edge.position.set(spot.x,.25,spot.z);scene.add(edge);
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
    const popup = makePlusOne3D();
    popup.position.set(avatar.position.x + (Math.random() - .5) * .2, 3.1, avatar.position.z);
    popup.rotation.y = -cameraYaw;
    scene.add(popup);
    virtuePopups.push({ popup, life: 0, startX: popup.position.x, startZ: avatar.position.z });
  }
}

function updateCamera(playerPos) {
  const yaw = cameraYaw, pitch = cameraPitch;
  const radiusXZ = cameraDistance * Math.cos(pitch);
  const offset = new THREE.Vector3(Math.sin(yaw) * radiusXZ, cameraDistance * Math.sin(pitch) + 1.6, Math.cos(yaw) * radiusXZ);
  const target = new THREE.Vector3(playerPos.x, 1.95, playerPos.z - .3);
  const desired = target.clone().add(offset);
  // Camera stays inside the hall; walls and beams cannot intersect the viewport.
  desired.x=THREE.MathUtils.clamp(desired.x,-13.75,13.75);
  desired.z=THREE.MathUtils.clamp(desired.z,-18.3,12.8);
  desired.y=THREE.MathUtils.clamp(desired.y,2.6,6.0);
  // Fade any column between the camera and character rather than pushing the camera into it.
  const ray=target.clone().sub(desired), distance=ray.length();raycaster.set(desired,ray.normalize());raycaster.far=distance;
  const occluded=new Set(raycaster.intersectObjects(sceneData.occluders,false).map(hit=>hit.object));
  for(const mesh of sceneData.occluders){
    const wanted=occluded.has(mesh)?0.10:1;
    mesh.userData.occludeOpacity=THREE.MathUtils.lerp(mesh.userData.occludeOpacity??1,wanted,.2);
    mesh.material.opacity=mesh.userData.occludeOpacity;
    mesh.material.depthWrite=mesh.userData.occludeOpacity>.85;
  }
  camera.position.lerp(desired,.095);
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
  if(avatar?.userData?.label) avatar.userData.label.lookAt(camera.position);
  for (const p of peers.values()) { updateGroupPose(p.group, p.meditating === true, dt, p.group.position.x || 0); if(p.group.userData.label) p.group.userData.label.lookAt(camera.position); }
  for (let i = virtuePopups.length - 1; i >= 0; i--) {
    const pop = virtuePopups[i]; pop.life += dt;
    const t = pop.life / 1.2;
    if (t >= 1) { scene.remove(pop.popup); virtuePopups.splice(i, 1); continue; }
    pop.popup.position.set(pop.startX, 3.15 + t * 1.4, pop.startZ - t * .18);
    pop.popup.rotation.y = -cameraYaw;
    const s = 1 + Math.sin(t * Math.PI) * .18; pop.popup.scale.setScalar(s);
    for(const part of (pop.popup.userData.fadeParts||[])){ if(part.material) part.material.opacity = 1 - t; }
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
    for (const p of virtuePopups) scene.remove(p.popup); virtuePopups = [];
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
  virtueGain(amount = 1) { if (entered) spawnVirtuePopup(amount); },
  getCameraYaw(){return entered ? cameraYaw : 0;}
};
