import * as THREE from '/vendor/three/three.module.js';
import { GLTFLoader } from '/vendor/three/addons/loaders/GLTFLoader.js';

const host = document.getElementById('outside3d');
let renderer, scene, camera, avatar, entered = false;
let peers = new Map(), last = performance.now();
let cameraYaw = 0, cameraPitch = 0.35, cameraDistance = 8.2;
let dragPointer = null, dragLastX = 0, dragLastY = 0;
let smashBag = null, smashPulse = null, doorGlow = null;
let arenaTargets=[], arenaActive=false, arenaHits=0;

const col = (hex, roughness = .78, metalness = 0, emissive = null, emissiveIntensity = 0) =>
  new THREE.MeshStandardMaterial({ color: hex, roughness, metalness, ...(emissive ? { emissive, emissiveIntensity } : {}) });
const box = (w,h,d,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const sphere=(r,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,24,18),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const cyl=(r1,r2,h,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,24),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};


function makeTextTexture(text, bg='#fff0ce', fg='#493321', size=64, width=1024, height=256){
  const c=document.createElement('canvas'); c.width=width; c.height=height;
  const ctx=c.getContext('2d');
  ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(12,16,width-24,height-32,34); ctx.fill();
  ctx.font=`bold ${size}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=fg; ctx.fillText(String(text).slice(0,40), width/2, height/2, width-70);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace; return tex;
}
function textPlate3D(text, opts={}){
  const {
    bg='#fff0ce', fg='#493321', size=64, width=4.2, height=1.0, depth=.14,
    edge='#6d5139', frontScale=.9, back=true
  } = opts;
  const g = new THREE.Group();
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: edge, roughness:.72, metalness:.08 })
  );
  g.add(board);
  const tex = makeTextTexture(text, bg, fg, size);
  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(width*frontScale, height*.78),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true })
  );
  front.position.z = depth/2 + .003; g.add(front);
  if(back){
    const backPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(width*frontScale, height*.78),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    );
    backPlane.rotation.y = Math.PI; backPlane.position.z = -depth/2 - .003; g.add(backPlane);
  }
  g.userData.dispose = () => {
    tex.dispose();
    for(const child of g.children){
      if(child.material?.map) child.material.map.dispose?.();
      child.material?.dispose?.(); child.geometry?.dispose?.();
    }
  };
  return g;
}
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
function assignLabel(g,name){ if(g.userData.lastName===name)return; if(g.userData.label){ g.remove(g.userData.label); g.userData.label.userData?.dispose?.(); } const s=textPlate3D(name,{bg:'#fff4d9',fg:'#493321',size:54,width:1.9,height:.42,depth:.07,edge:'#6e5038',frontScale:.92}); s.position.y=2.62; s.scale.set(.82,.82,.82); g.userData.label=s; g.userData.lastName=name; g.add(s); }
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
// Shared authoring scale: character height ~2.1m, all GLB origins ground-center (Y=0), front = +Z.
const LOCATIONS={tree:fromGame(130,430),door:fromGame(600,420),smash:fromGame(220,640),arena:fromGame(980,640),desk:fromGame(1070,470)};

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
// Entire inner courtyard (-32.75..32.75, -27.25..27.25) uses ONE tiled mesh.
// Texture is generated in-browser. No grass is rendered inside the wall.
function buildGround(){
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle='#727b83';ctx.fillRect(0,0,512,512);
  const palette=['#a6afb6','#b9c1c7','#929da6','#c1c8ce','#aab5bc','#9da9b1'];
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){
    const x=c*128,y=r*128;
    ctx.fillStyle='#637078';ctx.fillRect(x,y,128,128);
    ctx.fillStyle=palette[(r*5+c*7)%palette.length];ctx.fillRect(x+4,y+4,120,120);
    ctx.fillStyle='rgba(255,255,255,.19)';ctx.fillRect(x+5,y+5,118,2);ctx.fillRect(x+5,y+5,2,118);
    ctx.fillStyle='rgba(30,36,44,.16)';ctx.fillRect(x+121,y+5,2,117);ctx.fillRect(x+5,y+121,116,2);
    for(let i=0;i<16;i++){
      const nx=x+7+((i*37+r*41+c*19)%109),ny=y+7+((i*51+c*27+r*13)%109);
      ctx.fillStyle=i%2?'rgba(255,255,255,.09)':'rgba(25,30,35,.09)';
      ctx.fillRect(nx,ny,2,2);
    }
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
  tex.repeat.set(10,9);
  tex.anisotropy=Math.min(4,renderer?.capabilities?.getMaxAnisotropy?.()||1);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(65.5,54.5),
    new THREE.MeshStandardMaterial({map:tex,roughness:.97,metalness:0}));
  floor.rotation.x=-Math.PI/2;floor.position.y=.025;floor.name='SAN_GACH_XAM_TOAN_BO_6_5';scene.add(floor);
  // A thin edge under the walls covers texture seams at every perimeter.
  const edge=col('#778088',.98);
  box(66,.065,.26,edge,0,.035,-27.26);box(66,.065,.26,edge,0,.035,27.26);
  box(.26,.065,54.5,edge,-32.76,.035,0);box(.26,.065,54.5,edge,32.76,.035,0);
}
function buildStressHouseFallback(){
  const pos = LOCATIONS.door;
  const g=new THREE.Group(); g.position.set(pos.x,0,pos.z-5.3); scene.add(g);
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
  const sign=textPlate3D('NHÀ XẢ STRESS',{bg:'#2e5b47',fg:'#fef1be',size:44,width:5.8,height:1.02,depth:.18,edge:'#1d3f31'}); sign.position.set(0,4.35,5.42); g.add(sign);
  doorGlow = ringMarker(LOCATIONS.door,'#fff2a0',1.1);
  return g;
}
function buildVentDeskFallback(){
  const pos=LOCATIONS.desk; const g=new THREE.Group(); g.position.set(pos.x,0,pos.z); scene.add(g);
  box(3.2,.2,1.4,col('#8b5a38'),0,1.18,0,g); for(const x of [-1.25,1.25]) for(const z of [-.45,.45]) box(.16,1.05,.16,col('#644328'),x,.53,z,g);
  box(1.9,.08,.7,col('#f0e4ba'),0,1.38,0,g); box(.7,.08,.08,col('#da7e58'),0,1.52,.2,g); const sign=textPlate3D('BÀN XẢ BỰC',{bg:'#71482d',fg:'#fff0c1',size:38,width:3.8,height:.82,depth:.14,edge:'#56341f'}); sign.position.set(0,3.0,.2); g.add(sign);
  ringMarker(pos,'#ffd98f',1.0);
}
function buildSmashZoneFallback(){
  const pos=LOCATIONS.smash; const g=new THREE.Group(); g.position.set(pos.x,0,pos.z); scene.add(g);
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,.12,32), new THREE.MeshStandardMaterial({color:'#cf7448',roughness:.84})); pad.position.y=.06; g.add(pad);
  smashBag = new THREE.Group(); smashBag.position.set(0,0,0); g.add(smashBag);
  cyl(.09,.09,2.7,col('#6c4a36'),0,2.2,0,smashBag); box(1.1,.12,.12,col('#6c4a36'),0,3.42,0,smashBag);
  const bag=cyl(.42,.48,1.55,col('#c7483c',.55,.05),0,1.55,0,smashBag); bag.name='bag'; box(.08,.22,.08,col('#deb87a'),0,2.4,0,smashBag);
  const sign=textPlate3D('KHU ĐẬP PHÁ',{bg:'#8a3e34',fg:'#fff1c9',size:38,width:3.8,height:.82,depth:.14,edge:'#6a2f28'}); sign.position.set(0,4.4,0); g.add(sign);
  box(.7,.7,.7,col('#9a7c61'),-1.1,.35,.8,g); box(.8,.4,.6,col('#b89574'),1.05,.2,.7,g); box(.4,.4,.4,col('#87705d'),.9,.2,-.9,g);
  smashPulse = ringMarker(pos,'#ffb067',1.1);
}
function buildDeadlineArena(){
  const pos=LOCATIONS.arena;
  const group=new THREE.Group(); group.position.set(pos.x,0,pos.z); scene.add(group);
  const base=col('#332946',.86),edge=col('#d4a8ff',.5,.08),glow=col('#a873f8',.36,.14,'#823cf3',.38);
  const platform=new THREE.Mesh(new THREE.CylinderGeometry(2.8,2.95,.27,48),base);
  platform.position.y=.12; group.add(platform);
  const lip=new THREE.Mesh(new THREE.TorusGeometry(2.74,.08,8,48),edge);
  lip.rotation.x=Math.PI/2; lip.position.y=.3;group.add(lip);
  const stand=box(.26,2.1,.26,col('#63507a'),0,1.25,-2.25,group);
  const title=textPlate3D('ĐẬP TAN DEADLINE',{bg:'#49305f',fg:'#ffedbb',size:38,width:4.5,height:.92,depth:.14,edge:'#342246'});title.position.set(0,3.2,-2.25);group.add(title);
  const labels=['DEADLINE','KPI','DRAMA','ÁP LỰC','MỆT MỎI'];
  arenaTargets=[];
  const geometries=[new THREE.IcosahedronGeometry(.65,1),new THREE.BoxGeometry(1.05,1.05,1.05),new THREE.DodecahedronGeometry(.61,0)];
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5, x=Math.cos(a)*1.55, z=Math.sin(a)*1.55;
    const pivot=new THREE.Group();pivot.position.set(x,1.38,z);group.add(pivot);
    const material=col(['#e98865','#ffc868','#bfa0fc','#80c7c0','#f095b2'][i],.43,.1);
    const mesh=new THREE.Mesh(geometries[i%3],material);pivot.add(mesh);
    const tag=textSprite(labels[i],'#fff1d9','#4f3550',37);
    tag.scale.set(1.7,.46,1);tag.position.y=.95;pivot.add(tag);
    const marker=sphere(.13,glow,0,-.94,0,pivot);
    arenaTargets.push({pivot,mesh,tag,marker,phase:i*1.23,hitUntil:0});
  }
  for(const x of [-2.25,2.25]){
    cyl(.085,.085,1.5,col('#65527b'),x,.77,2.0,group);
    sphere(.19,glow,x,1.6,2.0,group);
  }
  ringMarker(pos,'#c68eff',1.12);
}

function loadAsset(url, onSuccess, onError){
  const loader = new GLTFLoader();
  loader.load(url, gltf => {
    // Recompute bounding boxes to catch malformed or surprising dimensions.
    gltf.scene.updateMatrixWorld(true);
    onSuccess(gltf.scene);
  },undefined,err=>{console.warn('GLB load failed:', url,err);onError();});
}
function loadRecoveryHouse(){
  // House entry staircase is at local Z=+5.6, exactly where the interaction ring sits.
  const door=LOCATIONS.door;
  loadAsset('/assets/nha-hoi-phuc-3d.glb?v=6.4.0', model => {
    model.position.set(door.x,0,door.z-5.6); // align staircase to doorway trigger
    scene.add(model);
    const sign=textSprite('NHÀ HỒI PHỤC','#2e5b47','#fef1be',42);
    sign.scale.set(4.6,.86,1);
    sign.position.set(door.x,4.28,door.z-5.6+3.48);
    scene.add(sign);
    doorGlow = ringMarker(door,'#fff2a0',.95);
  }, ()=>{buildStressHouseFallback(); doorGlow ||= ringMarker(door,'#fff2a0',.95);});
}
function loadVentDeskModel(){
  const pos=LOCATIONS.desk;
  loadAsset('/assets/ban-xa-buc-3d.glb?v=6.4.0',model=>{
    // Shift the furniture slightly back: the ring is on the walkable side of the chair.
    model.position.set(pos.x,0,pos.z-.7);
    scene.add(model);
    const sign=textSprite('BÀN XẢ BỰC','#71482d','#fff0c1',34);
    sign.scale.set(3.0,.75,1); sign.position.set(pos.x,2.7,pos.z-.7);
    scene.add(sign);
    ringMarker(pos,'#ffd98f',.78);
  },()=>buildVentDeskFallback());
}
function loadSmashZoneModel(){
  const pos=LOCATIONS.smash;
  loadAsset('/assets/bao-cat-3d.glb?v=6.4.0',model=>{
    model.position.set(pos.x,0,pos.z); scene.add(model);
    // Only swing the punching bag itself, never the frame, mat, gloves or crates.
    const pivot=new THREE.Group(); pivot.position.set(0,2.42,0); model.add(pivot);
    const moving=[];
    model.traverse(obj=>{ if(obj.isMesh && /^(BagMain|BagTop|BagBottom)_/.test(obj.name)) moving.push(obj); });
    for(const mesh of moving) pivot.attach(mesh);
    smashBag=pivot;
    const sign=textSprite('KHU ĐẬP PHÁ','#8a3e34','#fff1c9',34);
    sign.scale.set(3.2,.77,1); sign.position.set(pos.x,3.88,pos.z);
    scene.add(sign);
    smashPulse=ringMarker(pos,'#ffb067',.9);
  },()=>buildSmashZoneFallback());
}

function buildPondAndRelax(){
  const water = new THREE.Mesh(new THREE.CircleGeometry(3.7,40), new THREE.MeshStandardMaterial({color:'#72b7c6', roughness:.32, metalness:.06})); water.rotation.x=-Math.PI/2; water.position.set(0,.04,9.1); scene.add(water);
  const rim = new THREE.Mesh(new THREE.RingGeometry(3.8,4.15,48), new THREE.MeshStandardMaterial({color:'#cab597', roughness:.92})); rim.rotation.x=-Math.PI/2; rim.position.set(0,.045,9.1); scene.add(rim);
  for(const [x,z] of [[-.7,8.6],[.8,9.9],[1.2,8.4]]){ sphere(.12,col('#e899b8'),x,.08,z); }
  bench(-4.8,9.5,.3); bench(4.8,9.5,-.3);

}
function buildDecor(){}
function loadKarmaTree(){
  const loader = new GLTFLoader();
  const pos = LOCATIONS.tree;
  loader.load('/assets/cay-khau-nghiep-3d.glb', gltf => {
    const model = gltf.scene;
    model.position.set(pos.x,0,pos.z);
    model.scale.set(.86,.86,.86);
    scene.add(model);
    const sign=textPlate3D('CÂY KHẨU NGHIỆP',{bg:'#6d321e',fg:'#ffefbf',size:40,width:4.4,height:.88,depth:.16,edge:'#512313'}); sign.position.set(pos.x,8.5,pos.z+.2); scene.add(sign);
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
  scene.fog = new THREE.Fog('#d7e5ec', 50, 110);
  camera = new THREE.PerspectiveCamera(64,1,.08,120);
  scene.add(new THREE.HemisphereLight('#fff6de','#61745e',2.6));
  const sun = new THREE.DirectionalLight('#fff0c7',3.2); sun.position.set(-12,18,10); scene.add(sun);
  buildGround(); buildBoundary(); loadRecoveryHouse(); loadVentDeskModel(); loadSmashZoneModel(); buildDeadlineArena(); buildPondAndRelax(); buildDecor(); loadKarmaTree();
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
  for(const t of arenaTargets){
    t.pivot.rotation.y += .011;
    t.pivot.position.y=1.42+Math.sin(now*.002+t.phase)*.16;
    const timeLeft=Math.max(0,t.hitUntil-now);
    const pulse=timeLeft>0?Math.abs(Math.sin(timeLeft*.023)):0;
    t.mesh.scale.setScalar(1+.38*pulse);
    t.mesh.rotation.x += timeLeft>0?.075:.006;
    t.mesh.material.emissive=new THREE.Color(timeLeft>0?'#e6b2ff':'#000000');
    t.mesh.material.emissiveIntensity=timeLeft>0?.55:0;
    t.tag.visible=timeLeft===0;
  }
  if(doorGlow){ doorGlow.material.opacity = .6 + Math.sin(now*0.003)*.12; }
}
function loop(now){ requestAnimationFrame(loop); if(!entered||!renderer) return; const dt=Math.min((now-last)/1000,.06); last=now;
  if(avatar?.userData?.body){ avatar.userData.walk += dt*7; const bob = Math.sin(avatar.userData.walk)*.03; avatar.userData.body.position.y = 1.02 + bob; }
  if(avatar?.userData?.label) avatar.userData.label.lookAt(camera.position);
  for(const peer of peers.values()){ peer.group.userData.walk += dt*7; const bob = peer.moving ? Math.sin(peer.group.userData.walk)*.04 : 0; peer.group.userData.body.position.y = 1.02 + bob; if(peer.group.userData.label) peer.group.userData.label.lookAt(camera.position); }
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
  arenaStart(){arenaActive=true;arenaHits=0;},
  arenaHit(combo=1){
    if(!arenaTargets.length)return;
    const i=arenaHits++ % arenaTargets.length;
    arenaTargets[i].hitUntil=performance.now()+480;
  },
  arenaEnd(){arenaActive=false;},
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
