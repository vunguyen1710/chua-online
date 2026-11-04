import * as THREE from '/vendor/three/three.module.js';
import { GLTFLoader } from '/vendor/three/addons/loaders/GLTFLoader.js';

const host = document.getElementById('outside3d');
let renderer, scene, camera, avatar, entered = false;
let peers = new Map(), last = performance.now();
let cameraYaw = 0, cameraPitch = 0.35, cameraDistance = 8.2;
let dragPointer = null, dragLastX = 0, dragLastY = 0;
let smashBag = null, screamNeon = null, smashPulse = null, screamPulse = null, doorGlow = null;

const col = (hex, roughness = .78, metalness = 0, emissive = null, emissiveIntensity = 0) =>
  new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, ...(emissive ? { emissive, emissiveIntensity } : {}) });
const box = (w,h,d,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const sphere=(r,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,24,18),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const cyl=(r1,r2,h,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,24),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};

function textSprite(text, bg='#fff0ce', fg='#493321', size=64){
  const c=document.createElement('canvas'); c.width=1024; c.height=256;
  const ctx=c.getContext('2d');
  ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(12,16,1000,224,34); ctx.fill();
  ctx.font=`bold ${size}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=fg; ctx.fillText(String(text).slice(0,40), 512, 128, 950);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  sprite.scale.set(4.2,1.02,1); return sprite;
}
function assignLabel(g,name){ if(g.userData.lastName===name)return; if(g.userData.label){g.remove(g.userData.label);g.userData.label.material.map?.dispose();g.userData.label.material.dispose();} const s=textSprite(name); s.position.y=2.85; g.userData.label=s;g.userData.lastName=name; g.add(s); }
function assignBubble(g,text){
  if(g.userData.bubbleText===text) return;
  if(g.userData.bubble){g.remove(g.userData.bubble);g.userData.bubble.material.map?.dispose();g.userData.bubble.material.dispose();}
  const s=textSprite(text,'#fff9df','#503a25',43); s.position.y=3.58; s.visible=!!text; g.add(s); g.userData.bubble=s; g.userData.bubbleText=text;
}
function makePerson(color='#83a8a4'){
  const g=new THREE.Group(); g.userData.walk=0;
  const cloth=col(color), skin=col('#f0c39d'), black=col('#2a2b2c');
  const body=cyl(.42,.5,1.08,cloth,0,1.02,0,g);
  sphere(.38,skin,0,1.88,0,g); const hair=sphere(.39,black,0,2.08,-.03,g); hair.scale.set(1,.45,1);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.52,.52,.12,28), new THREE.MeshStandardMaterial({color:'#7b5a3f',roughness:.9})); base.position.set(0,.08,0); g.add(base);
  g.userData.body=body; g.userData.base=base;
  assignLabel(g,'Khách'); assignBubble(g,'');
  return g;
}
function mapPosition(p){
  const x = (p.x - 600) / 32.5;
  const z = (p.y - 560) / 15.4;
  return { x: THREE.MathUtils.clamp(x, -19.4, 19.4), z: THREE.MathUtils.clamp(z, -10.8, 11.6) };
}
function fromGame(x,y){ return mapPosition({x,y}); }

function treeCluster(x,z,scale=1){
  const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  cyl(.36*scale,.52*scale,3.2*scale,col('#6b4128'),0,1.6*scale,0,g);
  const leafMat=col('#4d8d48'), leafMat2=col('#6aa05a');
  for(const item of [[0,3.9,0,2.2],[1.1,3.7,.2,1.45],[-1.15,3.75,-.1,1.55],[.4,3.1,1.15,1.38],[-.4,3.15,-1.2,1.42],[.2,4.8,.35,1.18]]) sphere(item[3]*scale, Math.random()>.5?leafMat:leafMat2, item[0]*scale,item[1]*scale,item[2]*scale,g);
  return g;
}
function shrub(x,z,scale=.7){ const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g); sphere(.55*scale,col('#5a9248'),0,.3,0,g); sphere(.45*scale,col('#78aa61'),.5,.28,.15,g); sphere(.45*scale,col('#4a8542'),-.48,.28,-.1,g); return g; }
function bench(x,z,rot=0){
  const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rot; scene.add(g);
  box(2.5,.15,.55,col('#8f6540'),0,.92,0,g); box(2.3,.12,.2,col('#9f7550'),0,1.45,-.18,g); box(.12,.9,.12,col('#644730'),-1,.45,.18,g); box(.12,.9,.12,col('#644730'),1,.45,.18,g); box(.12,.9,.12,col('#644730'),-1,.45,-.18,g); box(.12,.9,.12,col('#644730'),1,.45,-.18,g);
}
function ringMarker(pos, color='#ffd78a', radius=.8){
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius*.72, radius, 36), new THREE.MeshBasicMaterial({color, transparent:true, opacity:.8, side:THREE.DoubleSide}));
  ring.rotation.x=-Math.PI/2; ring.position.set(pos.x,.04,pos.z); scene.add(ring); return ring;
}

function buildBoundary(){
  const wall=col('#f3f0e8',.92), roof=col('#ce7a43',.72,.08), red=col('#c74439',.68,.04), cap=col('#c8beb0',.86,.02);
  function wallRun(width,x,z,rot=0,gate=false){
    const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=rot; scene.add(g);
    if(!gate){
      box(width,3.5,.42,wall,0,1.75,0,g); box(width,.18,.52,cap,0,3.6,0,g); box(width,.24,.72,roof,0,3.9,0,g);
      const count=Math.floor((width-2.5)/3.7); const off=-((count-1)*3.7)/2;
      for(let i=0;i<count;i++){ const px=off+i*3.7; box(.92,1.02,.05,red,px,2.0,.23,g); box(.82,.92,.03,col('#fcfaf6'),px,2.0,.255,g); }
    }else{
      const side=(width-8)/2; box(side,3.5,.42,wall,-(4+side/2),1.75,0,g); box(side,3.5,.42,wall,(4+side/2),1.75,0,g);
      box(side,.18,.52,cap,-(4+side/2),3.6,0,g); box(side,.18,.52,cap,(4+side/2),3.6,0,g); box(side,.24,.72,roof,-(4+side/2),3.9,0,g); box(side,.24,.72,roof,(4+side/2),3.9,0,g);
      box(9.5,.28,.82,roof,0,4.25,0,g);
    }
  }
  wallRun(66,0,-27.5,0,false); wallRun(66,0,27.5,0,true); wallRun(54,-33,0,Math.PI/2,false); wallRun(54,33,0,Math.PI/2,false);
}
function buildGround(){
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(72,64), new THREE.MeshStandardMaterial({color:'#7e9f63', roughness:.98})); grass.rotation.x=-Math.PI/2; scene.add(grass);
  const base = new THREE.Mesh(new THREE.BoxGeometry(39.5,.12,23.5), new THREE.MeshStandardMaterial({color:'#8f959b', roughness:.98})); base.position.set(0,.06,1.5); scene.add(base);
  const mats=[col('#9ea4aa',.97), col('#adb3b9',.97), col('#8f959b',.97), col('#a6acb1',.97)];
  for(let ix=0;ix<22;ix++) for(let iz=0;iz<13;iz++){
    const tile=new THREE.Mesh(new THREE.BoxGeometry(1.6,.05,1.6), mats[(ix+iz)%mats.length]);
    tile.position.set(-17.2+ix*1.64,.1,-8.3+iz*1.7); tile.rotation.y=((ix*3+iz*5)%3)*0.015; scene.add(tile);
  }
  for(let ix=0;ix<=22;ix++) box(.05,.02,22.5,col('#767d83',1),-17.98+ix*1.64,.095,1.5);
  for(let iz=0;iz<=13;iz++) box(38.2,.02,.05,col('#767d83',1),0,.095,-9.15+iz*1.7);
}
function buildStressHouseFallback(){
  const pos = fromGame(600,360);
  const g=new THREE.Group(); g.position.set(pos.x,0,pos.z-1.2); scene.add(g);
  const body=col('#f5efe5',.85), accent=col('#88ab95',.55,.08), wood=col('#8b6140',.76), glass=col('#9ed0dc',.25,.1), roof=col('#55656f',.78), trim=col('#d2a85f',.35,.25);
  box(15.2,4.9,9.8,body,0,2.45,0,g); box(16.0,.22,10.4,accent,0,5.0,0,g);
  // front porch
  box(8.4,.28,2.2,col('#d7ccbc',.86),0,.28,5.65,g); for(const x of [-3,-1,1,3]) box(.18,1.2,.18,trim,x,.7,5.2,g);
  box(7.8,.18,.22,trim,0,1.26,5.65,g);
  // main door
  box(4.2,3.4,.16,wood,0,2.02,4.95,g); box(1.85,3.0,.08,col('#6b4630'),-1.02,2.02,5.04,g); box(1.85,3.0,.08,col('#6b4630'),1.02,2.02,5.04,g);
  for(const x of [-1.02,1.02]) for(const y of [1.1,2.02,2.95]) box(1.56,.05,.04,trim,x,y,5.08,g);
  // windows
  for(const x of [-5.1,5.1]){ box(2.45,2.05,.15,wood,x,2.45,4.98,g); box(2.15,1.75,.05,glass,x,2.45,5.05,g); }
  for(const x of [-5.8,5.8]){ box(.15,2.4,2.75,wood,x,2.5,-1.1,g); box(.05,2.1,2.35,glass,x+.04,2.5,-1.1,g); }
  // roof
  const leftRoof = new THREE.Mesh(new THREE.BoxGeometry(8.8,.28,11.4), roof); leftRoof.position.set(-2.2,6.08,-.1); leftRoof.rotation.z=.28; g.add(leftRoof);
  const rightRoof = new THREE.Mesh(new THREE.BoxGeometry(8.8,.28,11.4), roof); rightRoof.position.set(2.2,6.08,-.1); rightRoof.rotation.z=-.28; g.add(rightRoof);
  box(1.0,.25,11.0,trim,0,6.82,-.1,g);
  // side pergola to look more welcoming
  box(4.8,2.6,4.4,body,-8.1,1.8,-1.8,g); const awn=new THREE.Mesh(new THREE.BoxGeometry(4.9,.22,5.1), roof); awn.position.set(-8.1,3.35,-1.8); awn.rotation.z=.15; g.add(awn);
  box(4.8,2.6,4.4,body,8.1,1.8,-1.8,g); const awn2=new THREE.Mesh(new THREE.BoxGeometry(4.9,.22,5.1), roof); awn2.position.set(8.1,3.35,-1.8); awn2.rotation.z=-.15; g.add(awn2);
  // sign
  const sign=textSprite('NHÀ XẢ STRESS','#2e5b47','#fef1be',42); sign.scale.set(5.6,1,1); sign.position.set(0,4.35,5.42); g.add(sign);
  doorGlow = ringMarker(fromGame(600,401),'#fff2a0',1.1);
  return g;
}
function buildVentDeskFallback(){
  const pos=fromGame(926,493); const g=new THREE.Group(); g.position.set(pos.x,0,pos.z); scene.add(g);
  box(3.2,.2,1.4,col('#8b5a38'),0,1.18,0,g); for(const x of [-1.25,1.25]) for(const z of [-.45,.45]) box(.16,1.05,.16,col('#644328'),x,.53,z,g);
  box(1.9,.08,.7,col('#f0e4ba'),0,1.38,0,g); box(.7,.08,.08,col('#da7e58'),0,1.52,.2,g); const sign=textSprite('BÀN XẢ BỰC', '#71482d', '#fff0c1', 36); sign.scale.set(3.6,.82,1); sign.position.set(0,3.0,.2); g.add(sign);
  ringMarker(pos,'#ffd98f',1.0);
}
function buildSmashZoneFallback(){
  const pos=fromGame(390,508); const g=new THREE.Group(); g.position.set(pos.x,0,pos.z); scene.add(g);
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,.12,32), new THREE.MeshStandardMaterial({color:'#cf7448',roughness:.84})); pad.position.y=.06; g.add(pad);
  smashBag = new THREE.Group(); smashBag.position.set(0,0,0); g.add(smashBag);
  cyl(.09,.09,2.7,col('#6c4a36'),0,2.2,0,smashBag); box(1.1,.12,.12,col('#6c4a36'),0,3.42,0,smashBag);
  const bag=cyl(.42,.48,1.55,col('#c7483c',.55,.05),0,1.55,0,smashBag); bag.name='bag'; box(.08,.22,.08,col('#deb87a'),0,2.4,0,smashBag);
  const sign=textSprite('KHU ĐẬP PHÁ', '#8a3e34', '#fff1c9', 36); sign.scale.set(3.6,.82,1); sign.position.set(0,4.4,0); g.add(sign);
  box(.7,.7,.7,col('#9a7c61'),-1.1,.35,.8,g); box(.8,.4,.6,col('#b89574'),1.05,.2,.7,g); box(.4,.4,.4,col('#87705d'),.9,.2,-.9,g);
  smashPulse = ringMarker(pos,'#ffb067',1.1);
}
function buildScreamBooth(){
  const pos=fromGame(760,508); const g=new THREE.Group(); g.position.set(pos.x,0,pos.z); scene.add(g);
  box(2.2,3.0,2.0,col('#6d95a0'),0,1.5,0,g); box(1.75,2.45,1.65,col('#a5c6d2'),0,1.55,.12,g); box(1.3,1.75,.08,col('#24434f'),0,1.85,1.02,g);
  screamNeon = textSprite('PHÒNG HÉT', '#53355f', '#ffd2ff', 36); screamNeon.scale.set(3.1,.84,1); screamNeon.position.set(0,3.95,.2); g.add(screamNeon);
  const bubble = new THREE.Mesh(new THREE.SphereGeometry(.42,18,14), new THREE.MeshStandardMaterial({color:'#f6f0ff', emissive:'#bb7cff', emissiveIntensity:.5, roughness:.45})); bubble.position.set(0,4.7,0); g.add(bubble);
  screamPulse = ringMarker(pos,'#c28cff',1.0);
}

function loadRecoveryHouse(){
  const pos = fromGame(600,360);
  const loader = new GLTFLoader();
  loader.load('/assets/nha-hoi-phuc-3d.glb', gltf => {
    const model = gltf.scene;
    model.position.set(pos.x,0,pos.z-1.2);
    model.scale.set(1,1,1);
    model.traverse(obj=>{ if(obj.isMesh){ obj.castShadow=false; obj.receiveShadow=false; } });
    scene.add(model);
    const sign=textSprite('NHÀ HỒI PHỤC','#2e5b47','#fef1be',42); sign.scale.set(5.4,.96,1); sign.position.set(pos.x,4.55,pos.z+4.3); scene.add(sign);
    doorGlow = ringMarker(fromGame(600,401),'#fff2a0',1.1);
  }, undefined, err => { console.warn('Không tải được nha-hoi-phuc-3d.glb, dùng mô hình dự phòng', err); buildStressHouseFallback(); });
}

function loadVentDeskModel(){
  const pos = fromGame(926,493);
  const loader = new GLTFLoader();
  loader.load('/assets/ban-xa-buc-3d.glb', gltf => {
    const model = gltf.scene;
    model.position.set(pos.x,0,pos.z);
    model.scale.set(1,1,1);
    scene.add(model);
    const sign=textSprite('BÀN XẢ BỰC', '#71482d', '#fff0c1', 36); sign.scale.set(3.6,.82,1); sign.position.set(pos.x,3.0,pos.z+.2); scene.add(sign);
    ringMarker(pos,'#ffd98f',1.0);
  }, undefined, err => { console.warn('Không tải được ban-xa-buc-3d.glb, dùng mô hình dự phòng', err); buildVentDeskFallback(); });
}

function loadSmashZoneModel(){
  const pos = fromGame(390,508);
  const loader = new GLTFLoader();
  loader.load('/assets/bao-cat-3d.glb', gltf => {
    const model = gltf.scene;
    model.position.set(pos.x,0,pos.z);
    model.scale.set(1,1,1);
    scene.add(model);
    smashBag = model;
    const sign=textSprite('KHU ĐẬP PHÁ', '#8a3e34', '#fff1c9', 36); sign.scale.set(3.6,.82,1); sign.position.set(pos.x,4.4,pos.z); scene.add(sign);
    smashPulse = ringMarker(pos,'#ffb067',1.1);
  }, undefined, err => { console.warn('Không tải được bao-cat-3d.glb, dùng mô hình dự phòng', err); buildSmashZoneFallback(); });
}

function buildPondAndRelax(){
  const water = new THREE.Mesh(new THREE.CircleGeometry(3.7,40), new THREE.MeshStandardMaterial({color:'#72b7c6', roughness:.32, metalness:.06})); water.rotation.x=-Math.PI/2; water.position.set(0,.04,9.1); scene.add(water);
  const rim = new THREE.Mesh(new THREE.RingGeometry(3.8,4.15,48), new THREE.MeshStandardMaterial({color:'#cab597', roughness:.92})); rim.rotation.x=-Math.PI/2; rim.position.set(0,.045,9.1); scene.add(rim);
  for(const [x,z] of [[-.7,8.6],[.8,9.9],[1.2,8.4]]){ sphere(.12,col('#e899b8'),x,.08,z); }
  bench(-4.8,9.5,.3); bench(4.8,9.5,-.3);
  for(const x of [-6.8,-3.4,3.4,6.8]) shrub(x,8.2,.8);
}
function buildDecor(){
  for(const [x,z,s] of [[-14,-4,.92],[14,-4,.92],[-16,6,.95],[16,6,.95],[-10,13,.85],[10,13,.85],[-22,12,.95],[22,12,.95]]) treeCluster(x,z,s);
  for(const [x,z,s] of [[-12,2,.8],[-8,12,.74],[-2,14,.7],[2,14,.7],[8,12,.74],[12,2,.8],[-20,2,.8],[20,2,.8]]) shrub(x,z,s);
}
function loadKarmaTree(){
  const loader = new GLTFLoader();
  const pos = fromGame(190,442);
  loader.load('/assets/cay-khau-nghiep-3d.glb', gltf => {
    const model = gltf.scene;
    model.position.set(pos.x,0,pos.z);
    model.scale.set(1.65,1.65,1.65);
    scene.add(model);
    const sign=textSprite('CÂY KHẨU NGHIỆP','#6d321e','#ffefbf',38); sign.scale.set(4.2,.9,1); sign.position.set(pos.x,9.25,pos.z+.2); scene.add(sign);
    ringMarker(pos,'#ffdb92',1.15);
  }, undefined, () => {
    // fallback simple tree
    const g=new THREE.Group(); g.position.set(pos.x,0,pos.z); scene.add(g);
    cyl(.7,.9,6.2,col('#6d4429'),0,3.1,0,g);
    for(const item of [[0,8.1,0,3.1],[2.4,7.2,.4,2.05],[-2.5,7.0,-.1,2.15],[.7,6.5,2.0,1.7],[-.8,6.3,-2.1,1.8]]) sphere(item[3], col('#5b8d4a'), item[0],item[1],item[2],g);
    ringMarker(pos,'#ffdb92',1.15);
  });
}

function buildScene(){
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#cfe0ea');
  scene.fog = new THREE.Fog('#d7e5ec', 22, 58);
  camera = new THREE.PerspectiveCamera(64,1,.08,120);
  scene.add(new THREE.HemisphereLight('#fff6de','#61745e',2.6));
  const sun = new THREE.DirectionalLight('#fff0c7',3.2); sun.position.set(-12,18,10); scene.add(sun);
  buildGround(); buildBoundary(); loadRecoveryHouse(); loadVentDeskModel(); loadSmashZoneModel(); buildScreamBooth(); buildPondAndRelax(); buildDecor(); loadKarmaTree();
  avatar = makePerson('#d7a85f'); scene.add(avatar); assignLabel(avatar,'Bạn');
}

function setupControls(){
  if(!host || host.dataset.bound==='1') return; host.dataset.bound='1';
  host.addEventListener('pointerdown', e=>{ if(!entered) return; dragPointer=e.pointerId; dragLastX=e.clientX; dragLastY=e.clientY; host.setPointerCapture?.(e.pointerId); });
  host.addEventListener('pointermove', e=>{ if(dragPointer!==e.pointerId||!entered) return; const dx=e.clientX-dragLastX, dy=e.clientY-dragLastY; dragLastX=e.clientX; dragLastY=e.clientY; cameraYaw -= dx*0.0075; cameraPitch = THREE.MathUtils.clamp(cameraPitch - dy*0.0028, .24, .58); });
  const end = e=>{ if(dragPointer===e.pointerId) dragPointer=null; };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end); host.addEventListener('lostpointercapture', end);
}
function resize(){ if(!renderer||!camera) return; const w=Math.max(1,host.clientWidth), h=Math.max(1,host.clientHeight); renderer.setSize(w,h,false); camera.aspect=w/h; camera.fov=w<h?78:62; camera.updateProjectionMatrix(); }
function updateCamera(playerPos){
  const radiusXZ = cameraDistance*Math.cos(cameraPitch);
  const target = new THREE.Vector3(playerPos.x, 1.95, playerPos.z + .9);
  const desired = target.clone().add(new THREE.Vector3(Math.sin(cameraYaw)*radiusXZ, cameraDistance*Math.sin(cameraPitch)+1.1, Math.cos(cameraYaw)*radiusXZ));
  camera.position.lerp(desired,.08); camera.lookAt(target);
}
function animateFeedback(now){
  if(smashBag){
    const t = smashBag.userData.hitUntil ? Math.max(0, smashBag.userData.hitUntil - now) : 0;
    smashBag.rotation.z = t>0 ? Math.sin((smashBag.userData.hitUntil-now)*0.03)*0.18 : smashBag.rotation.z*0.85;
  }
  if(smashPulse){ const active = smashPulse.userData.flashUntil && smashPulse.userData.flashUntil>now; smashPulse.material.opacity = active ? .95 : .58; smashPulse.scale.setScalar(active ? 1.18 : 1); }
  if(screamNeon){ const active = screamNeon.userData.flashUntil && screamNeon.userData.flashUntil>now; screamNeon.material.opacity = active ? 1 : .92; screamNeon.scale.set(active?3.35:3.1, active?.92:.84,1); }
  if(screamPulse){ const active = screamPulse.userData.flashUntil && screamPulse.userData.flashUntil>now; screamPulse.material.opacity = active ? .98 : .6; screamPulse.scale.setScalar(active ? 1.16 : 1); }
  if(doorGlow){ doorGlow.material.opacity = .6 + Math.sin(now*0.003)*.12; }
}
function loop(now){ requestAnimationFrame(loop); if(!entered||!renderer) return; const dt=Math.min((now-last)/1000,.06); last=now;
  if(avatar?.userData?.body){ avatar.userData.walk += dt*7; const bob = Math.sin(avatar.userData.walk)*.03; avatar.userData.body.position.y = 1.02 + bob; }
  for(const peer of peers.values()){ peer.group.userData.walk += dt*7; const bob = peer.moving ? Math.sin(peer.group.userData.walk)*.04 : 0; peer.group.userData.body.position.y = 1.02 + bob; }
  animateFeedback(now); renderer.render(scene,camera);
}
function setup(){
  try { renderer = new THREE.WebGLRenderer({ antialias: !matchMedia('(pointer:coarse)').matches, alpha:false, powerPreference:'default' }); }
  catch(_){ return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, matchMedia('(pointer:coarse)').matches?1.45:1.8));
  renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.16;
  renderer.domElement.style.width='100%'; renderer.domElement.style.height='100%'; host.appendChild(renderer.domElement);
  buildScene(); setupControls(); window.addEventListener('resize', resize); resize(); loop(performance.now()); return true;
}

window.courtyard3D = {
  enter(){ if(!renderer){ if(!setup()) return false; } host.classList.remove('hidden'); host.style.pointerEvents='auto'; entered=true; last=performance.now(); resize(); return true; },
  exit(){ host.classList.add('hidden'); host.style.pointerEvents='none'; entered=false; },
  getCameraYaw(){ return cameraYaw; },
  flashSmash(){ if(smashBag) smashBag.userData.hitUntil = performance.now()+750; if(smashPulse) smashPulse.userData.flashUntil = performance.now()+700; },
  flashScream(){ if(screamNeon) screamNeon.userData.flashUntil = performance.now()+900; if(screamPulse) screamPulse.userData.flashUntil = performance.now()+900; },
  sync({ player, others, name, bubble }){
    if(!entered || !scene || !avatar) return;
    const pos = mapPosition(player); avatar.position.x=pos.x; avatar.position.z=pos.z; assignLabel(avatar, name||'Bạn'); assignBubble(avatar, bubble||''); updateCamera(pos);
    const seen=new Set();
    for(const p of others||[]){
      if(p.scene!=='temple') continue;
      seen.add(p.id);
      let o=peers.get(p.id);
      if(!o){ const group=makePerson(p.color||'#88a8a5'); scene.add(group); o={group}; peers.set(p.id,o); }
      const pp=mapPosition(p); o.group.position.x=pp.x; o.group.position.z=pp.z; o.moving=p.moving; assignLabel(o.group,p.name||'Khách'); assignBubble(o.group,p.chat||'');
    }
    for(const [id,o] of peers){ if(!seen.has(id)){ scene.remove(o.group); peers.delete(id); } }
  }
};
window.dispatchEvent(new Event('courtyard3d-ready'));
