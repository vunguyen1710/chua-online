import * as THREE from '/vendor/three/three.module.js';

const host = document.getElementById('outside3d');
let renderer, scene, camera, avatar, entered = false;
let peers = new Map(), last = performance.now(), elapsed = 0;
let cameraYaw = 0, cameraPitch = 0.42, cameraDistance = 14.5;
let dragPointer = null, dragLastX = 0, dragLastY = 0;

const col = (hex, roughness = .78, metalness = 0) => new THREE.MeshStandardMaterial({ color: hex, roughness, metalness });
const box = (w,h,d,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const sphere=(r,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,22,16),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const cyl=(r1,r2,h,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,22),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};

function textSprite(text, bg='#fff0ce', fg='#493321', size=64){
  const c=document.createElement('canvas'); c.width=768; c.height=192;
  const ctx=c.getContext('2d');
  ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(10,12,748,168,28); ctx.fill();
  ctx.font=`bold ${size}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=fg; ctx.fillText(String(text).slice(0,32), 384, 96, 700);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  sprite.scale.set(3.2,.8,1); return sprite;
}
function assignLabel(g,name){ if(g.userData.label) g.remove(g.userData.label); const s=textSprite(name); s.position.y=2.8; g.userData.label=s; g.add(s); }
function assignBubble(g,text){
  if(g.userData.bubbleText===text) return;
  if(g.userData.bubble) g.remove(g.userData.bubble);
  const s=textSprite(text,'#fff9df','#503a25',43); s.position.y=3.52; s.visible=!!text; g.add(s); g.userData.bubble=s; g.userData.bubbleText=text;
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
function mapPosition(p){ return { x: THREE.MathUtils.clamp((p.x-600)/50, -11.8, 11.8), z: THREE.MathUtils.clamp((p.y-560)/30, -8.2, 8.2) }; }

function treeAt(x,z,scale=1){
  const g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  cyl(.28*scale,.35*scale,2.5*scale,col('#6b4128'),0,1.25*scale,0,g);
  for(const item of [[0,3,0,1.6],[.9,2.8,.2,1.1],[-.8,2.9,-.1,1.15],[.2,2.4,.8,1.0],[-.2,2.45,-.9,1.05]]) sphere(item[3]*scale,col('#4d8d48'),item[0]*scale,item[1]*scale,item[2]*scale,g);
  return g;
}
function lantern(x,z){ cyl(.08,.08,1.8,col('#67412a'),x,.9,z); const light=new THREE.Mesh(new THREE.SphereGeometry(.18,16,12), new THREE.MeshStandardMaterial({color:'#ffcc78', emissive:'#d68f2f', emissiveIntensity:1.3})); light.position.set(x,1.95,z); scene.add(light); }

function buildScene(){
  scene = new THREE.Scene(); scene.background = new THREE.Color('#b7d9f1'); scene.fog = new THREE.Fog('#bdd8e7', 18, 40);
  camera = new THREE.PerspectiveCamera(64,1,.08,100);
  scene.add(new THREE.HemisphereLight('#fff4dc','#5b6b52',2.4));
  const sun = new THREE.DirectionalLight('#fff0c2',3.4); sun.position.set(-7,12,10); scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(38,34), new THREE.MeshStandardMaterial({color:'#65884e', roughness:.96})); ground.rotation.x=-Math.PI/2; scene.add(ground);
  // Courtyard stone yard
  const courtyard = new THREE.Mesh(new THREE.PlaneGeometry(18,14), new THREE.MeshStandardMaterial({color:'#c09f77', roughness:.95})); courtyard.rotation.x=-Math.PI/2; courtyard.position.set(0,.01,2.4); scene.add(courtyard);
  for(let x=-8.5;x<=8.5;x+=1.5) box(.04,.01,14,col('#9a7b58'),x,.02,2.4);
  for(let z=-4.5;z<=9.3;z+=1.5) box(18,.01,.04,col('#9a7b58'),0,.02,z);

  // Temple facade
  const wall = col('#a8472f'), trim = col('#deb163', .32, .4), roof = col('#3d2417'), wood = col('#69311f');
  box(18,.5,.5,trim,0,5.95,-7.2); box(19,4.4,.6,wall,0,3.5,-7.8);
  box(19,.3,2.2,roof,0,6.2,-7.2); box(20,.2,1.6,trim,0,5.95,-6.2);
  for(const x of [-7.2,-4.8,-2.4,2.4,4.8,7.2]) cyl(.28,.3,4.9,col('#8c2d23'),x,2.45,-6.85);
  // Door gate to shrine
  box(4.6,4.2,.35,wood,0,2.1,-7.45);
  box(1.8,3.5,.15,col('#87462c'),-1.05,1.82,-7.25); box(1.8,3.5,.15,col('#87462c'),1.05,1.82,-7.25);
  const sign = textSprite('ĐIỆN QUAN ÂM','#6a281d','#ffe6a1',44); sign.scale.set(5.5,1.15,1); sign.position.set(0,5.2,-7.0); scene.add(sign);
  lantern(-5.8,-5.6); lantern(5.8,-5.6);

  // Pond
  const pond = new THREE.Mesh(new THREE.CircleGeometry(3.25,40), new THREE.MeshStandardMaterial({color:'#4ea2ba', roughness:.32, metalness:.08})); pond.rotation.x=-Math.PI/2; pond.position.set(-8.2,.03,7.2); scene.add(pond);
  for(const [x,z,s] of [[-8.6,7.6,.55],[-7.2,6.4,.45],[-9.1,8.4,.5],[-7.5,8.4,.38]]){
    const lotus = new THREE.Group(); lotus.position.set(x,.06,z); scene.add(lotus); sphere(.12,paleGold(),0,.05,0,lotus); for(let i=0;i<8;i++){ const a=i*Math.PI*2/8; const p=sphere(.14*s,col('#e48ca9'),Math.cos(a)*.2*s,.03,Math.sin(a)*.2*s,lotus); p.scale.set(.7,1.1,.9);} }
  function paleGold(){ return col('#edd08b', .4, .15); }

  // Wish tree and desk
  treeAt(-10.2,0.5,1.45); treeAt(-12.4,3.4,0.9); const wish=textSprite('CÂY KHẨU NGHIỆP','#6d321e','#ffefbf',34); wish.scale.set(3.6,.78,1); wish.position.set(-10.2,4.8,.4); scene.add(wish);
  box(2.8,.18,1.2,col('#8c5c36'),8.1,1.25,.1); box(.18,1.1,.18,col('#694226'),7.1,.55,-.35); box(.18,1.1,.18,col('#694226'),9.1,.55,-.35); box(.18,1.1,.18,col('#694226'),7.1,.55,.55); box(.18,1.1,.18,col('#694226'),9.1,.55,.55); box(1.4,.1,.7,col('#ebddb0'),8.1,1.42,.05); const desk=textSprite('BÀN VIẾT SỚ','#694226','#f9ecc5',30); desk.scale.set(2.9,.7,1); desk.position.set(8.1,2.7,.1); scene.add(desk);

  // garden decorations
  for(const [x,z,s] of [[11.5,7,.8],[9.5,8.8,.65],[-12.8,-1.6,.8],[-9.4,-3.8,.65],[-4,10,.75],[3.6,10.2,.7]]) treeAt(x,z,s);
  for(let i=0;i<10;i++){ sphere(.32,col(i%2?'#6ea45c':'#4f8e4f'), -14+Math.random()*28, .25, -8+Math.random()*18); }
  // path to temple
  for(let i=0;i<8;i++){ const stone=new THREE.Mesh(new THREE.BoxGeometry(1.25,.05,1.7), new THREE.MeshStandardMaterial({color:i%2?'#cdb496':'#bea281', roughness:.95})); stone.position.set(0,.03,8.5-i*1.7); scene.add(stone);}  
  // Torii-like gate
  box(7,.28,.38,trim,0,3.85,10.6); box(.42,4.1,.42,wall,-2.6,2.05,10.6); box(.42,4.1,.42,wall,2.6,2.05,10.6); box(5.8,.2,.34,roof,0,4.15,10.6);

  avatar = makePerson('#d7a85f'); scene.add(avatar); assignLabel(avatar,'Bạn');
}

function setupControls(){
  if(!host || host.dataset.bound==='1') return; host.dataset.bound='1';
  host.addEventListener('pointerdown', e=>{ if(!entered) return; dragPointer=e.pointerId; dragLastX=e.clientX; dragLastY=e.clientY; host.setPointerCapture?.(e.pointerId); });
  host.addEventListener('pointermove', e=>{ if(dragPointer!==e.pointerId||!entered) return; const dx=e.clientX-dragLastX, dy=e.clientY-dragLastY; dragLastX=e.clientX; dragLastY=e.clientY; cameraYaw -= dx*0.008; cameraPitch = THREE.MathUtils.clamp(cameraPitch - dy*0.003, .24, .62); });
  const end = e=>{ if(dragPointer===e.pointerId) dragPointer=null; };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end); host.addEventListener('lostpointercapture', end);
}
function resize(){ if(!renderer||!camera) return; const w=Math.max(1,host.clientWidth), h=Math.max(1,host.clientHeight); renderer.setSize(w,h,false); camera.aspect=w/h; camera.fov=w<h?76:62; camera.updateProjectionMatrix(); }
function updateCamera(playerPos){
  const radiusXZ = cameraDistance*Math.cos(cameraPitch); const target = new THREE.Vector3(playerPos.x, 1.85, playerPos.z + .8);
  const desired = target.clone().add(new THREE.Vector3(Math.sin(cameraYaw)*radiusXZ, cameraDistance*Math.sin(cameraPitch)+1.4, Math.cos(cameraYaw)*radiusXZ));
  camera.position.lerp(desired,.08); camera.lookAt(target);
}
function loop(now){ requestAnimationFrame(loop); if(!entered||!renderer) return; const dt=Math.min((now-last)/1000,.06); last=now; elapsed+=dt; 
  if(avatar?.userData?.body){ avatar.userData.walk += dt*7; const bob = Math.sin(avatar.userData.walk)*.03; avatar.userData.body.position.y = 1.02 + bob; avatar.position.y = 0; }
  for(const peer of peers.values()){
    peer.group.userData.walk += dt*7; const bob = peer.moving ? Math.sin(peer.group.userData.walk)*.04 : 0; peer.group.userData.body.position.y = 1.02 + bob; 
  }
  renderer.render(scene,camera);
}

function setup(){
  try { renderer = new THREE.WebGLRenderer({ antialias: !matchMedia('(pointer:coarse)').matches, alpha:false, powerPreference:'default' }); }
  catch(_){ return false; }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1, matchMedia('(pointer:coarse)').matches?1.4:1.8)); renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.18;
  renderer.domElement.style.width='100%'; renderer.domElement.style.height='100%'; host.appendChild(renderer.domElement);
  buildScene(); setupControls(); window.addEventListener('resize', resize); resize(); loop(performance.now()); return true;
}

window.courtyard3D = {
  enter(){ if(!renderer){ if(!setup()) return false; } host.classList.remove('hidden'); host.style.pointerEvents='auto'; entered=true; last=performance.now(); resize(); return true; },
  exit(){ host.classList.add('hidden'); host.style.pointerEvents='none'; entered=false; },
  getCameraYaw(){ return cameraYaw; },
  sync({ player, others, name, bubble }){
    if(!entered || !scene || !avatar) return;
    const pos = mapPosition(player); avatar.position.x=pos.x; avatar.position.z=pos.z; assignLabel(avatar, name||'Bạn'); assignBubble(avatar, bubble||''); updateCamera(pos);
    const seen=new Set();
    for(const p of others||[]){ if(p.scene!=='temple') continue; seen.add(p.id); let o=peers.get(p.id); if(!o){ const group=makePerson(p.color||'#88a8a5'); scene.add(group); o={group}; peers.set(p.id,o);} const pp=mapPosition(p); o.group.position.x=pp.x; o.group.position.z=pp.z; o.moving=p.moving; assignLabel(o.group,p.name||'Khách'); assignBubble(o.group,p.chat||''); }
    for(const [id,o] of peers){ if(!seen.has(id)){ scene.remove(o.group); peers.delete(id); } }
  }
};
