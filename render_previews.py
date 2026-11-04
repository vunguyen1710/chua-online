from pathlib import Path
import trimesh, numpy as np
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).parent
items=[('nha-hoi-phuc-3d.glb','Nhà Hồi Phục'),('bao-cat-3d.glb','Bao cát'),('ban-xa-buc-3d.glb','Bàn Xả Bực')]
for f,title in items:
  scene=trimesh.load(root/'assets'/f,force='scene'); mesh=scene.to_geometry()
  V=np.asarray(mesh.vertices); F=np.asarray(mesh.faces); colors=np.asarray(mesh.visual.face_colors)[:,:3]
  # view front is from +Z looking towards negative Z, elevated 20deg, from camera right +X
  az=.50; el=.27
  cam=np.array([np.sin(az)*np.cos(el), np.sin(el),np.cos(az)*np.cos(el)])
  right=np.cross(np.array([0,1,0]),cam);right/=np.linalg.norm(right)
  up=np.cross(cam,right);up/=np.linalg.norm(up)
  ctr=(V.min(axis=0)+V.max(axis=0))/2
  rel=V-ctr
  px=rel@right; py=rel@up; depth=rel@cam
  size=640
  margin=35
  # shared uniform factor
  scale=(size-2*margin)/max(np.ptp(px),np.ptp(py))
  XY=np.column_stack((size/2+px*scale, size/2-py*scale))
  tris=F
  order=np.argsort(depth[tris].mean(axis=1))
  im=Image.new('RGB',(640,640),(240,242,240)); d=ImageDraw.Draw(im)
  light=np.array([-.5,.8,1]);light/=np.linalg.norm(light)
  normal=np.asarray(mesh.face_normals)
  for i in order:
    idx=tris[i]; pts=[tuple(XY[k]) for k in idx]
    c=np.asarray(colors[i],float)
    intensity=.67+.33*max(0,float(normal[i]@light))
    fill=tuple(np.clip(c*intensity,0,255).astype('uint8'))
    d.polygon(pts,fill=fill)
  output=root/(f.replace('.glb','-preview.png'))
  im.save(output)
  print(output)
