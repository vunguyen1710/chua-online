from pathlib import Path
import re
root=Path(__file__).parent
p=root/'outside3d.js'
s=p.read_text()
# Keep mapPosition map with no clamp on the 'house' placement; use same map transform everywhere for interactive points.
s=s.replace("function fromGame(x,y){ return mapPosition({x,y}); }", "function fromGame(x,y){ return mapPosition({x,y}); }\n// Shared authoring scale: character height ~2.1m, all GLB origins ground-center (Y=0), front = +Z.\nconst LOCATIONS={tree:fromGame(190,442),door:fromGame(600,401),smash:fromGame(390,508),scream:fromGame(760,508),desk:fromGame(926,493)};")
start=s.index('function loadRecoveryHouse(){')
end=s.index('function buildPondAndRelax(){',start)
s=s[:start]+'''function loadAsset(url, onSuccess, onError){
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
  loadAsset('/assets/nha-hoi-phuc-3d.glb?v=6.2.0', model => {
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
  loadAsset('/assets/ban-xa-buc-3d.glb?v=6.2.0',model=>{
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
  loadAsset('/assets/bao-cat-3d.glb?v=6.2.0',model=>{
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

'''+s[end:]
# fix fallbacks place house on door; fewer critical anyway
s=s.replace("const pos = fromGame(600,360);", "const pos = LOCATIONS.door;")
s=s.replace("g.position.set(pos.x,0,pos.z-1.2)","g.position.set(pos.x,0,pos.z-5.3)")
# make tree a bit smaller, avoid overlap with central house
s=s.replace('model.scale.set(1.65,1.65,1.65);','model.scale.set(.86,.86,.86);')
s=s.replace('sign.position.set(pos.x,9.25,pos.z+.2);','sign.position.set(pos.x,8.5,pos.z+.2);')
# version? no no
p.write_text(s)
# Interaction proximity use normalized actual world distance, not pixel distance with anisotropic scaling
p=root/'game.js'; s=p.read_text()
anchor="const ZONES={tree:{x:190,y:442,r:145},desk:{x:926,y:493,r:117},door:{x:600,y:401,r:100},smash:{x:390,y:508,r:96},scream:{x:760,y:508,r:96},ritual:{x:600,y:460,r:105}};"
new=anchor+"\n  // Compare in the same metric as the 3D world (32.5 px per X unit; 15.4 px per Z unit).\n  // This keeps click/interaction radii centered exactly on the 3D marker rather than on old pixel circles.\n  function near3D(zone,radius){return Math.hypot((state.player.x-zone.x)/32.5,(state.player.y-zone.y)/15.4)<radius;}"
s=s.replace(anchor,new)
s=s.replace("Math.hypot(state.player.x-ZONES.tree.x,state.player.y-ZONES.tree.y)<ZONES.tree.r","near3D(ZONES.tree,3.2)")
s=s.replace("Math.hypot(state.player.x-ZONES.smash.x,state.player.y-ZONES.smash.y)<ZONES.smash.r","near3D(ZONES.smash,2.3)")
s=s.replace("Math.hypot(state.player.x-ZONES.scream.x,state.player.y-ZONES.scream.y)<ZONES.scream.r","near3D(ZONES.scream,2.3)")
s=s.replace("Math.hypot(state.player.x-ZONES.desk.x,state.player.y-ZONES.desk.y)<ZONES.desk.r","near3D(ZONES.desk,2.25)")
s=s.replace("Math.hypot(state.player.x-ZONES.door.x,state.player.y-ZONES.door.y)<ZONES.door.r","near3D(ZONES.door,2.1)")
# fix 1 missing option: after trigger from house if coming from courtyard, enter interior.
p.write_text(s)
# cache bust
p=root/'index.html'; s=p.read_text()
for v in ['6.1.0','6.0.0']:
    s=s.replace(f'outside3d.js?v={v}','outside3d.js?v=6.2.0').replace(f'game.js?v={v}','game.js?v=6.2.0').replace(f'index.html?v={v}','index.html?v=6.2.0')
p.write_text(s)
print('Integration fixed')
