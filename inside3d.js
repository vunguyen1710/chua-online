// Chùa Online 3.5 — dedicated WebGL shrine. Three.js is installed via npm and served locally.
import * as THREE from '/vendor/three/three.module.js';

const host = document.getElementById('inside3d');
const txt = document.getElementById('inside3dHint');
let renderer, scene, camera, avatar, ritualLight, incense, entered=false, available=true;
let peers = new Map(), elapsed=0, last=performance.now();
const mats = {};
const col = (hex, roughness=.72, metalness=0) => new THREE.MeshStandardMaterial({color:hex,roughness,metalness});
const wood = col('#622617'), darkWood = col('#36160f'), gold=col('#d2a34c',.31,.6), paleGold=col('#f6d88c',.45,.22);
const red = col('#961f20'), ivory=col('#f8e9c9'), stone=col('#bf8b60'), green=col('#37664d');
const floorMat=col('#9e563f');
const box=(w,h,d,m,x,y,z,parent=scene)=> {const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const sphere=(r,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,20,14),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
const cyl=(r1,r2,h,m,x,y,z,parent=scene)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,24),m);mesh.position.set(x,y,z);parent.add(mesh);return mesh;};
function textSprite(text, bg='#fff0ce', fg='#493321', size=64){
 const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
 ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(8,9,496,110,26);ctx.fill();ctx.font=`bold ${size}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=fg;ctx.fillText(text.slice(0,22),256,65,470);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(2.9,.73,1);return s;
}
function pillar(x,z){cyl(.46,.48,5.5,red,x,2.75,z);cyl(.61,.61,.26,gold,x,.26,z);cyl(.6,.6,.23,gold,x,5.43,z);}
function makeLotus(x,y,z,s=.7){const mat=col('#ea88a8',.55);const center=sphere(.26*s,paleGold,x,y,z);for(let j=0;j<9;j++){const a=j*Math.PI*2/9;let p=sphere(.3*s,mat,x+Math.cos(a)*.29*s,y-.08*s,z+Math.sin(a)*.29*s);p.scale.set(.65,1.3,.85)}return center;}
function makeStatue(){
 const g=new THREE.Group();g.position.set(0,3.55,-10.7);scene.add(g);
 // lotus pedestal, robe body, arms, face, halo and crown. Artistic 3D interpretation.
 cyl(1.16,1.22,.38,gold,0,0,0,g);makeLotus(0,.37,0,2.7);
 const body=cyl(.46,.88,1.75,ivory,0,1.42,0,g);body.rotation.z=.02;
 sphere(.51,ivory,0,2.37,0,g).scale.set(.75,1.15,.72);
 const hair=col('#1d211e');sphere(.39,hair,0,2.74,-.05,g).scale.set(.91,.52,.9);
 cyl(.2,.3,.26,gold,0,3.08,0,g);sphere(.14,paleGold,0,3.29,0,g);
 for(const side of [-1,1]){const arm=cyl(.14,.2,1.08,ivory,side*.48,1.73,.15,g);arm.rotation.z=side*.65;sphere(.17,ivory,side*.81,1.25,.31,g);}
 const halo=new THREE.Mesh(new THREE.TorusGeometry(.9,.09,12,66),new THREE.MeshStandardMaterial({color:'#ffe3a4',emissive:'#ce922e',emissiveIntensity:1.6,metalness:.5}));halo.position.set(0,2.45,-.32);g.add(halo);
 const light=new THREE.PointLight('#eec977',16,9);light.position.set(0,2.7,-.2);g.add(light);
 return g;
}
function makePerson(color='#83a8a4'){
 const g=new THREE.Group();g.userData.walk=0;
 const cloth=col(color), skin=col('#e8b991'), black=col('#282b29');
 const torso=box(.65,.85,.39,cloth,0,1.18,0,g);
 torso.rotation.y=.08;sphere(.34,skin,0,1.95,0,g);sphere(.34,black,0,2.19,-.08,g).scale.set(1,.4,1);
 const legs=[];for(const side of [-1,1]){const leg=box(.2,.65,.23,darkWood,side*.19,.4,0,g);legs.push(leg);box(.18,.73,.2,cloth,side*.43,1.13,0,g);}
 g.userData.legs=legs;
 const label=textSprite('Khách');label.position.y=2.85;g.add(label);g.userData.label=label;
 const bubble=textSprite('');bubble.position.y=3.55;bubble.visible=false;g.add(bubble);g.userData.bubble=bubble;g.userData.bubbleText='';
 return g;
}
function assignLabel(g,name){g.remove(g.userData.label);const s=textSprite(name);s.position.y=2.85;g.userData.label=s;g.add(s)}
function assignBubble(g,text){if(g.userData.bubbleText===text)return;g.remove(g.userData.bubble);const s=textSprite(text,'#fff9df','#503a25',43);s.position.y=3.55;s.visible=!!text;g.add(s);g.userData.bubble=s;g.userData.bubbleText=text;}
function mapPosition(p){return {x:THREE.MathUtils.clamp((p.x-600)/56,-8.4,8.4),z:THREE.MathUtils.clamp((p.y-570)/25,-5.1,6.4)};}
function setup(){
 try{renderer=new THREE.WebGLRenderer({antialias:!matchMedia('(pointer:coarse)').matches,alpha:false,powerPreference:'default'});}catch(e){available=false;return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.4:1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';renderer.domElement.setAttribute('aria-label','Điện Quan Âm không gian ba chiều');host.appendChild(renderer.domElement);
 scene=new THREE.Scene();scene.background=new THREE.Color('#221818');scene.fog=new THREE.Fog('#34251f',13,32);
 camera=new THREE.PerspectiveCamera(64,1,.08,90);
 scene.add(new THREE.HemisphereLight('#fff1cc','#533126',3));const sun=new THREE.DirectionalLight('#ffe2a7',4);sun.position.set(-5,12,6);scene.add(sun);
 const floor=box(22,.16,25,floorMat,0,-.09,-3); // floor tiles
 for(let x=-11;x<=11;x+=1.5)box(.025,.013,25,col('#754234'),x,.015,-3);
 for(let z=-15;z<10;z+=1.5)box(22,.014,.025,col('#754234'),0,.018,z);
 box(22,7,.5,darkWood,0,3.5,-15);box(.4,7,25,darkWood,-11,3.5,-3);box(.4,7,25,darkWood,11,3.5,-3);
 box(22,.43,25,darkWood,0,6.8,-3);
 // panel art is decorative, but walls, columns, altar and statue are 3D meshes
 const loader=new THREE.TextureLoader();loader.load('/assets/dien-quan-am.png',tex=>{tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.MeshBasicMaterial({map:tex});box(10,5.7,.08,m,0,3.7,-14.62);},undefined,()=>{});
 for(const x of [-8,-4,4,8]){pillar(x,-12);pillar(x,4)}
 for(const z of [-12,4]){box(18,.24,.5,gold,0,5.55,z);box(18,.18,.6,wood,0,6.15,z)}
 // altar 3D
 box(8,1.1,2.3,wood,0,1.05,-10);box(8.4,.22,2.6,gold,0,1.65,-10);
 for(const x of [-3.25,3.25]){box(.18,1.1,2.2,paleGold,x,1.12,-10);makeLotus(x,2,-9.8,1.2)}
 cyl(.65,.8,.57,gold,0,1.98,-8.98);cyl(.72,.72,.18,darkWood,0,1.66,-8.98);
 for(let i=-3;i<=3;i++){const stick=cyl(.019,.019,.8,red,i*.15,2.65,-8.98);stick.rotation.z=.035*i;}
 const altarGlow=new THREE.PointLight('#efb04d',12,10);altarGlow.position.set(0,3,-9);scene.add(altarGlow);
 for(const x of [-2.5,2.5]){cyl(.09,.09,1.1,gold,x,2.35,-9.6);sphere(.19,new THREE.MeshStandardMaterial({color:'#ffc76e',emissive:'#ea9c39',emissiveIntensity:2}),x,2.97,-9.6)}
 makeStatue();
 // nearby approach marker on walkable floor
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.8,.055,8,60),new THREE.MeshBasicMaterial({color:'#ffd17e',transparent:true,opacity:.7}));ring.rotation.x=-Math.PI/2;ring.position.set(0,.04,-4.35);scene.add(ring);ritualLight=ring;
 avatar=makePerson('#d7a85f');scene.add(avatar);assignLabel(avatar,'Bạn');
 // thin incense haze drifting upwards
 const smokeMat=new THREE.MeshBasicMaterial({color:'#ffefdc',transparent:true,opacity:.15,depthWrite:false});incense=[];
 for(let i=0;i<12;i++){const puff=sphere(.2,smokeMat.clone(),0,2.7,-8.9);puff.position.x=(i%4-1.5)*.16;puff.position.y=2.6+(i/12)*2;incense.push(puff)}
 window.addEventListener('resize',resize);resize();loop(performance.now());
}
function resize(){if(!renderer||!camera)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?75:62;camera.updateProjectionMatrix();}
function loop(now){requestAnimationFrame(loop);if(!entered||!renderer)return;const dt=Math.min((now-last)/1000,.06);last=now;elapsed+=dt;
 ritualLight.material.opacity=.45+.25*Math.sin(elapsed*2);
 for(let i=0;i<incense.length;i++){const p=incense[i];const t=(elapsed*.24+i/12)%1;p.position.y=2.6+t*2.5;p.position.x=Math.sin(elapsed+i)*(.1+t*.48);p.scale.setScalar(.7+t*2);p.material.opacity=(1-t)*.09;}
 for(const p of peers.values()){p.group.userData.walk+=dt*6;const moving=p.moving?Math.sin(p.group.userData.walk)*.25:0;p.group.userData.legs[0].rotation.x=moving;p.group.userData.legs[1].rotation.x=-moving;}
 renderer.render(scene,camera);
}
window.temple3D={
 enter(){if(!renderer && available)setup();if(!renderer){host.classList.add('hidden');txt?.classList.remove('hidden');if(txt)txt.textContent='Thiết bị chưa hỗ trợ WebGL, đang dùng cảnh 2D dự phòng.';return false;}host.classList.remove('hidden');entered=true;last=performance.now();resize();return true;},
 exit(){host.classList.add('hidden');entered=false;peers.forEach(x=>scene.remove(x.group));peers.clear();},
 sync({player,others,name,bubble}){if(!entered||!scene)return;const pos=mapPosition(player);avatar.position.set(pos.x,0,pos.z);assignLabelIfChanged(avatar,name||'Bạn');assignBubble(avatar,bubble||'');
  camera.position.lerp(new THREE.Vector3(pos.x*.5,5.9,Math.min(pos.z+9.5,13.9)),.085);camera.lookAt(pos.x*.35,2.6,pos.z-6.1);
  const seen=new Set();for(const p of others||[]){if(p.scene!=='inside')continue;seen.add(p.id);let o=peers.get(p.id);if(!o){const group=makePerson(p.color||'#88a8a5');scene.add(group);o={group};peers.set(p.id,o)}const pp=mapPosition(p);o.group.position.set(pp.x,0,pp.z);o.moving=p.moving;assignLabelIfChanged(o.group,p.name||'Khách');assignBubble(o.group,p.chat||'');}
  for(const [id,o] of peers)if(!seen.has(id)){scene.remove(o.group);peers.delete(id)}
 }
};
function assignLabelIfChanged(g,name){if(g.userData.lastName===name)return;g.userData.lastName=name;assignLabel(g,name)}
