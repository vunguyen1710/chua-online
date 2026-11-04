import * as THREE from '/vendor/three/three.module.js';
import { GLTFLoader } from '/vendor/three/addons/loaders/GLTFLoader.js';

const host=document.getElementById('river3d');
let renderer,scene,camera,player,avatar,loaderReady=false,entered=false,looping=false,peers=new Map();
let points=[],curveDistance=[],totalDistance=1,riverIndex=60,startDistance=0,travelled=0,laps=0,clock=performance.now(),water=null,waterStrip=null,duckTemplate=null;
let camOrbit=0,camHeight=5.2,camDistance=9.5,drag=null,entry=null,boarding=0;
const speed=5.2; // metres per second along the stream
const mat=(c,roughness=.76)=>new THREE.MeshStandardMaterial({color:c,roughness});
function box(w,h,d,color,x,y,z,p=scene){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);p.add(m);return m}
function ball(r,color,x,y,z,p=scene){const m=new THREE.Mesh(new THREE.SphereGeometry(r,18,14),mat(color));m.position.set(x,y,z);p.add(m);return m}
function tube(r,h,color,x,y,z,p=scene){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,16),mat(color));m.position.set(x,y,z);p.add(m);return m}
function text3D(text){const can=document.createElement('canvas');can.width=1024;can.height=256;const c=can.getContext('2d');c.fillStyle='#234a47';c.fillRect(0,0,1024,256);c.fillStyle='#fff0bc';c.font='bold 66px sans-serif';c.textAlign='center';c.fillText(text,512,155,960);const tex=new THREE.CanvasTexture(can);tex.colorSpace=THREE.SRGBColorSpace;const group=new THREE.Group();group.add(new THREE.Mesh(new THREE.BoxGeometry(5,.9,.2),mat('#69563f')));const front=new THREE.Mesh(new THREE.PlaneGeometry(4.8,.8),new THREE.MeshBasicMaterial({map:tex}));front.position.z=.105;group.add(front);return group}

function createDuckFallback(){
  const g=new THREE.Group();
  const yellow=new THREE.MeshStandardMaterial({color:'#f2cf45',roughness:.7});
  const yellow2=new THREE.MeshStandardMaterial({color:'#f7df7e',roughness:.78});
  const orange=new THREE.MeshStandardMaterial({color:'#ef8d34',roughness:.6});
  const dark=new THREE.MeshStandardMaterial({color:'#1e1e1e',roughness:.5});
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.0,.25,16,40),yellow); ring.rotation.x=Math.PI/2; ring.position.y=.25; g.add(ring);
  const body=new THREE.Mesh(new THREE.SphereGeometry(.52,20,16),yellow); body.scale.set(1.15,.9,1); body.position.set(0,.67,.55); g.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.34,18,14),yellow); head.position.set(0,1.15,1.0); g.add(head);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.12,.28,18),orange); beak.rotation.x=Math.PI/2; beak.position.set(0,1.04,1.28); g.add(beak);
  for(const s of [-1,1]){ const eye=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),dark); eye.position.set(s*.12,1.16,1.22); g.add(eye); }
  return g;
}
function attachDuckRide(g){
  if(g.userData.duck) return g.userData.duck;
  const duck = duckTemplate ? duckTemplate.clone(true) : createDuckFallback();
  duck.position.set(0,-.32,0); duck.scale.setScalar(1.03);
  g.add(duck); g.userData.duck = duck; duck.visible=false; return duck;
}
function replaceDuckModel(g){
  if(!g || !duckTemplate) return;
  const old=g.userData.duck;
  const wasVisible=old?.visible || false;
  if(old) g.remove(old);
  g.userData.duck=null;
  const next=attachDuckRide(g);
  next.visible=wasVisible;
}
function setFloatingPose(g, floating){
  const duck = attachDuckRide(g);
  duck.visible = floating;
  const body = g.userData.body; if(!body) return;
  if(floating){
    // Reclining seated pose in the hole of the float, head behind the duck's neck.
    body.scale.setScalar(.81);
    body.position.set(0,.38,-.20);
    body.rotation.set(-.45,0,0);
  } else {
    body.scale.setScalar(1);
    body.position.set(0,0,0);
    body.rotation.x *= .82; body.rotation.y *= .82; body.rotation.z *= .82;
  }
}

function buildWaterSurface(path, width=19){
  if(!path?.length) return null;
  const left=[], right=[];
  for(let i=0;i<path.length;i++){
    const a=path[i], b=path[(i+1)%path.length], prev=path[(i-1+path.length)%path.length];
    const dir = new THREE.Vector3(b.x-prev.x,0,b.z-prev.z).normalize();
    const normal = new THREE.Vector3(-dir.z,0,dir.x).normalize();
    left.push(new THREE.Vector3(a.x, a.y, a.z).addScaledVector(normal, width*.5));
    right.push(new THREE.Vector3(a.x, a.y, a.z).addScaledVector(normal, -width*.5));
  }
  const verts=[], uvs=[], idx=[];
  for(let i=0;i<path.length;i++){
    const l=left[i], r=right[i];
    verts.push(l.x,l.y,l.z, r.x,r.y,r.z);
    uvs.push(0, i/path.length, 1, i/path.length);
  }
  for(let i=0;i<path.length;i++){
    const a=i*2, b=i*2+1, c=((i+1)%path.length)*2, d=((i+1)%path.length)*2+1;
    idx.push(a,b,c, b,d,c);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts,3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const mat=new THREE.MeshStandardMaterial({color:'#5fbfda',roughness:.22,metalness:.08,transparent:true,opacity:.9,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geo,mat); mesh.renderOrder=1; return mesh;
}

function updateLabel(g,name){
  if(g.userData.labelName===name)return;
  const old=g.userData.label;
  if(old){g.remove(old);old.traverse(obj=>{obj.geometry?.dispose?.();obj.material?.map?.dispose?.();obj.material?.dispose?.();});}
  const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');
  x.fillStyle='#f5e8c8';x.fillRect(0,0,512,128);x.fillStyle='#3b473c';x.font='bold 58px sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText((name||'Khách').slice(0,18),256,65,480);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const group=new THREE.Group();
  group.add(new THREE.Mesh(new THREE.BoxGeometry(1.9,.43,.07),mat('#5a5a4f')));
  const front=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.37),new THREE.MeshBasicMaterial({map:t}));front.position.z=.038;group.add(front);
  group.position.y=2.5;group.scale.setScalar(.85);g.add(group);g.userData.label=group;g.userData.labelName=name;
}
function person(color='#d4aa66'){
  const g=new THREE.Group(),body=new THREE.Group();g.add(body);g.userData.body=body;
  const shirt=mat(color),skin=mat('#eec299'),dark=mat('#394653');
  const torso=new THREE.Mesh(new THREE.CylinderGeometry(.42,.46,1.05,16),shirt);torso.position.y=1.1;body.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.36,16,12),skin);head.position.y=1.98;body.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.365,16,12),mat('#302d32'));hair.position.set(0,2.16,-.04);hair.scale.y=.55;body.add(hair);
  for(const s of [-1,1]){
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.17,.18,.88,12),dark);leg.position.set(s*.24,.24,0);body.add(leg);
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(.13,.14,.85,12),skin);arm.position.set(s*.57,1.08,0);arm.rotation.z=s*.14;body.add(arm);
  }
  
  return g;
}
const riverToGame=p=>({x:Math.round(37+(p.x+116)/232*1126),y:Math.round(390+(p.z+150)/300*331)});
const gameToRiver=p=>({x:(p.x-37)/1126*232-116,z:(p.y-390)/331*300-150});
function floatingPoint(dist){
  const d=((dist%totalDistance)+totalDistance)%totalDistance;
  let lo=0,hi=curveDistance.length-1;
  while(lo<hi){const mid=(lo+hi+1)>>1;if(curveDistance[mid]<=d)lo=mid;else hi=mid-1;}
  const i=lo,next=(i+1)%points.length;
  const start=curveDistance[i],end=next===0?totalDistance:curveDistance[next];
  const t=THREE.MathUtils.clamp((d-start)/Math.max(.0001,end-start),0,1);
  const a=points[i],b=points[next];
  return new THREE.Vector3(THREE.MathUtils.lerp(a.x,b.x,t),-.28,THREE.MathUtils.lerp(a.z,b.z,t));
}
function readyPath(d){
  entry=d.entryDeck;
  points=d.floatingPath.map(p=>new THREE.Vector3(p.x,p.y,p.z));
  curveDistance=[];let length=0;
  for(let i=0;i<points.length;i++){
    if(i>0)length+=points[i].distanceTo(points[i-1]);curveDistance.push(length);
  }
  length+=points[points.length-1].distanceTo(points[0]);totalDistance=length;
  startDistance=curveDistance[d.river.startIndex] || 0;riverIndex=startDistance;travelled=0;laps=0;
  if(waterStrip){ scene.remove(waterStrip); waterStrip.geometry?.dispose?.(); waterStrip.material?.dispose?.(); waterStrip=null; }
  waterStrip = buildWaterSurface(points, d.river?.averageWidth || 19);
  if(waterStrip){ scene.add(waterStrip); water = waterStrip; }
  document.getElementById('riverStatus').textContent='Đã đến bến sông. Nhấn “Bắt đầu trôi” để thả mình theo dòng nước.';
  document.getElementById('riverFloatBtn').disabled=!loaderReady;
}
function create(){
  try{renderer=new THREE.WebGLRenderer({antialias:!matchMedia('(pointer:coarse)').matches, powerPreference:'default'});}catch(e){console.error('WebGL नदी',e);return false;}
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.3:1.75));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
  renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';host.appendChild(renderer.domElement);
  scene=new THREE.Scene();scene.background=new THREE.Color('#c9e4ed');scene.fog=new THREE.Fog('#cadfe4',115,320);
  camera=new THREE.PerspectiveCamera(64,1,.2,600);scene.add(new THREE.HemisphereLight('#fff6e5','#5e7e68',2.6));
  const sun=new THREE.DirectionalLight('#fff2d3',3.3);sun.position.set(-40,95,35);scene.add(sun);
  player=person('#d6a35d');scene.add(player);updateLabel(player,'Bạn'); attachDuckRide(player);
  const loader=new GLTFLoader();
  loader.load('/assets/thung-lung-song-vong-tron-3d.glb?v=6.9.0',gl=>{scene.add(gl.scene);loaderReady=true;document.getElementById('riverFloatBtn').disabled=!points.length;document.getElementById('riverStatus').textContent='Đã tải thung lũng 3D. Bắt đầu trôi khi bạn sẵn sàng.';},undefined,err=>{
    console.error('River GLB load failed',err);document.getElementById('riverStatus').textContent='Không tải được mô hình thung lũng. Hãy tải lại trang.';
  });
  loader.load('/assets/phao-con-vit-3d.glb?v=6.9.0', gl=>{ duckTemplate=gl.scene; replaceDuckModel(player); for(const peer of peers.values()) replaceDuckModel(peer.group); }, undefined, err=>{ console.warn('Duck float model load failed, fallback will be used', err); });
  fetch('/assets/river-route.json?v=6.9.0',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('river route not found');return r.json()}).then(readyPath).catch(err=>{
    console.error(err);document.getElementById('riverStatus').textContent='Không tải được tuyến sông. Hãy tải lại trang.';
  });
  host.addEventListener('pointerdown',e=>{if(!entered)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};host.setPointerCapture(e.pointerId)});
  host.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;camOrbit+= (e.clientX-drag.x)*.006;camHeight=THREE.MathUtils.clamp(camHeight+(drag.y-e.clientY)*.025,3.2,17);drag.x=e.clientX;drag.y=e.clientY});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(name,()=>drag=null);
  host.addEventListener('wheel',e=>{if(!entered)return;e.preventDefault();camDistance=THREE.MathUtils.clamp(camDistance+e.deltaY*.012,5.5,25)},{passive:false});
  window.addEventListener('resize',resize);resize();requestAnimationFrame(frame);return true;
}
function resize(){if(!renderer)return;const w=host.clientWidth||1,h=host.clientHeight||1;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?77:64;camera.updateProjectionMatrix()}
function frame(now){requestAnimationFrame(frame);if(!renderer||!entered||!scene)return;const dt=Math.min(.06,(now-clock)/1000);clock=now;
  if(!entry){renderer.render(scene,camera);return;}
  let center,tangent;
  if(looping && points.length){
    boarding=Math.min(2.6,boarding+dt);if(boarding>=2.6){travelled+=speed*dt;}riverIndex=(startDistance+travelled)%totalDistance;
    const newLaps=Math.floor(travelled/totalDistance);if(newLaps!==laps){laps=newLaps;document.getElementById('riverLaps').textContent=String(laps);}
    center=floatingPoint(riverIndex);
    if(boarding<2.6){const u=THREE.MathUtils.smoothstep(boarding/2.6,0,1);center.lerpVectors(new THREE.Vector3(entry.x,entry.y+.3,entry.z),center,u);}
    tangent=floatingPoint(riverIndex+1.5).sub(floatingPoint(riverIndex-1.5)).normalize();
    document.getElementById('riverProgress').textContent=Math.round((travelled%totalDistance)/totalDistance*100)+'%';
  }else{center=new THREE.Vector3(entry.x,entry.y+.3,entry.z);tangent=new THREE.Vector3(0,0,1);}
  player.position.copy(center);
  if(looping){
    setFloatingPose(player,true);
    player.position.y+=Math.sin(now*.0035)*.09;
    const yaw=Math.atan2(tangent.x, tangent.z);
    player.rotation.y = yaw;
    player.userData.body.rotation.x = -.45 + Math.sin(now*.003)*.025;
    player.userData.body.rotation.z = Math.sin(now*.0025)*.018;
  }else{
    setFloatingPose(player,false);
    player.rotation.y += (0-player.rotation.y)*.12;
  }
  const backward=looping?tangent.clone().multiplyScalar(-camDistance):new THREE.Vector3(0,0,camDistance);
  const dx=backward.x*Math.cos(camOrbit)-backward.z*Math.sin(camOrbit);
  const dz=backward.x*Math.sin(camOrbit)+backward.z*Math.cos(camOrbit);
  const target=new THREE.Vector3(center.x,center.y+.85,center.z);
  const desired=target.clone().add(new THREE.Vector3(dx,camHeight+1,dz));
  camera.position.lerp(desired,.055);camera.lookAt(target);
  if(player.userData.label)player.userData.label.lookAt(camera.position);
  if(waterStrip){ waterStrip.position.y = -0.02 + Math.sin(now*.0012)*.04; if(waterStrip.material) waterStrip.material.opacity = 0.84 + Math.sin(now*.0018)*.06; }
  for(const peer of peers.values()){
    peer.group.position.lerp(peer.target,.25);
    setFloatingPose(peer.group, peer.floating);
    if(peer.floating){ peer.group.rotation.y = Math.atan2(peer.tangent.x, peer.tangent.z); peer.group.userData.body.rotation.x = -.45; peer.group.userData.body.rotation.z = 0; }
    else { peer.group.rotation.y += (0-peer.group.rotation.y)*.12; }
    if(peer.group.userData.label)peer.group.userData.label.lookAt(camera.position);
  }
  renderer.render(scene,camera);
}
function syncPeers(others){
  if(!entered||!scene)return;
  const seen=new Set();
  for(const p of others||[]){if(p.scene!=='river')continue;seen.add(p.id);let peer=peers.get(p.id);
    if(!peer){const group=person(p.color||'#8bbab7');scene.add(group);updateLabel(group,p.name||'Khách');attachDuckRide(group);peer={group,target:new THREE.Vector3(),tangent:new THREE.Vector3(0,0,1),floating:false};peers.set(p.id,peer)}
    updateLabel(peer.group,p.name||'Khách');const loc=gameToRiver(p);peer.target.set(loc.x,p.meditating?-.2:.9,loc.z);peer.floating=p.meditating===true;
    const future=gameToRiver({x:p.x+(p.dir||0)*6,y:p.y+2});peer.tangent.set(future.x-loc.x,0,future.z-loc.z).normalize();
  }
  for(const [id,p] of peers){if(!seen.has(id)){scene.remove(p.group);peers.delete(id)}}
}
window.river3D={
  enter(){if(!renderer&&!create())return false;host.classList.remove('hidden');host.style.pointerEvents='auto';entered=true;clock=performance.now();resize();return true},
  exit(){entered=false;looping=false;host.classList.add('hidden');host.style.pointerEvents='none';document.getElementById('riverFloatBtn').textContent='🦆 Bắt đầu trôi'},
  start(){if(!points.length||!loaderReady)return false;looping=true;boarding=0;document.getElementById('riverFloatBtn').textContent='🦆 Lên bờ';document.getElementById('riverStatus').textContent='Bạn đang thả trôi trên phao con vịt… Nhấn Lên bờ để dừng, hoặc Quay về sân để rời khu.';return true},
  stop(){looping=false;document.getElementById('riverFloatBtn').textContent='🦆 Bắt đầu trôi';document.getElementById('riverStatus').textContent='Bạn đã lên bờ. Bạn có thể tiếp tục nằm trên phao con vịt để bắt đầu vòng trôi mới.';return true},
  isFloating(){return looping},
  toggle(){return looping?this.stop():this.start()},
  getNetworkPosition(){if(!entry)return {x:600,y:610};const p=looping?floatingPoint(riverIndex):entry;return riverToGame(p)},
  syncPeers,
  setName(name){if(player)updateLabel(player,name||'Bạn')},
  getState(){return {laps,percent:Math.round((travelled%totalDistance)/totalDistance*100),ready:loaderReady&&points.length>0}}
};
