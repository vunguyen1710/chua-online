import trimesh, numpy as np, math, random, os
from collections import defaultdict
from pathlib import Path
random.seed(27)
root=Path('/mnt/data/tree3d_work')
out=root/'assets'/'cay-khau-nghiep-3d.glb'
out.parent.mkdir(exist_ok=True)
parts=defaultdict(list)
COLORS={
 'bark':(89,58,39,255),'bark2':(111,71,44,255),'barkdark':(62,43,34,255),
 'moss':(68,86,48,255),'leaf1':(57,105,49,255),'leaf2':(81,132,56,255),
 'leaf3':(99,147,67,255),'leaf4':(44,89,42,255), 'leaf5':(122,155,69,255),
 'gold':(223,175,79,255),'goldbright':(248,213,123,255),'red':(166,48,37,255),
 'lantern':(255,202,99,255),'lantern2':(234,150,53,255),'paper':(242,213,147,255),
 'paper2':(250,232,178,255),'rock':(116,110,98,255),'rock2':(154,147,129,255),
 'wood':(95,49,29,255),'white':(250,234,193,255),'flower':(196,79,85,255)
}
def append(mesh,key):
 if mesh is None:return
 mesh.visual.vertex_colors=np.tile(np.array(COLORS[key],dtype=np.uint8),(len(mesh.vertices),1))
 parts[key].append(mesh)
def cylinder_between(a,b,r1,r2,key,sections=9):
 a=np.array(a,float);b=np.array(b,float); axis=b-a; length=float(np.linalg.norm(axis))
 if length<.001:return
 axis/=length
 perp=np.cross(axis,[0,0,1])
 if np.linalg.norm(perp)<.1: perp=np.cross(axis,[1,0,0])
 perp/=np.linalg.norm(perp); perp2=np.cross(axis,perp)
 v=[]
 for center,rad in [(a,r1),(b,r2)]:
  for i in range(sections):
   angle=2*np.pi*i/sections
   v.append(center+rad*(math.cos(angle)*perp+math.sin(angle)*perp2))
 faces=[]
 for i in range(sections):
  j=(i+1)%sections
  faces.extend([(i,j,sections+j),(i,sections+j,sections+i)])
 for i in range(1,sections-1):
  faces.append((0,i+1,i));faces.append((sections,sections+i,sections+i+1))
 append(trimesh.Trimesh(vertices=v,faces=faces,process=False),key)
def ellipsoid(center,radii,key,subdiv=1):
 m=trimesh.creation.icosphere(subdivisions=subdiv)
 m.apply_scale(radii);m.apply_translation(center);append(m,key)
def box(center,extents,key,rotation=0):
 m=trimesh.creation.box(extents)
 if rotation:m.apply_transform(trimesh.transformations.rotation_matrix(rotation,[0,1,0]))
 m.apply_translation(center); append(m,key)
def thin_cord(a,b,color='red',rad=.023):cylinder_between(a,b,rad,rad*.82,color,5)
# Trunk broad root flare
cylinder_between((0,.06,0),(0,3.1,0),1.10,.86,'bark',16)
cylinder_between((0,3.05,0),(.16,5.1,.0),.89,.59,'bark2',15)
cylinder_between((.16,5.1,0),(.1,6.4,0),.59,.32,'bark',12)
# roots radiate and taper, some jut out close to ground
for i in range(11):
 a=i*2*math.pi/11+.17; reach=random.uniform(1.2,2.55)
 start=np.array([math.cos(a)*.42,.34, math.sin(a)*.42]); mid=np.array([math.cos(a)*reach*.65,.14,math.sin(a)*reach*.65]); end=np.array([math.cos(a)*reach,.04,math.sin(a)*reach]);
 cylinder_between(start,mid,.43,.26,'bark2',9);cylinder_between(mid,end,.26,.03,'bark',7)
# bark relief ridges
for i in range(18):
 a=i*2*math.pi/18
 start=(.9*math.cos(a),.38,.9*math.sin(a));end=(.68*math.cos(a+.23),3.1,.68*math.sin(a+.23))
 cylinder_between(start,end,.06,.04,'barkdark',6)
# branching canopy
branches=[]
for i in range(12):
 angle=i*2*math.pi/12+.12
 h=3.7+(i%4)*.5
 reach=random.uniform(3.25,5.4)
 a=np.array([0,h,0]);b=np.array([math.cos(angle)*reach*.55,h+.65, math.sin(angle)*reach*.55]);c=np.array([math.cos(angle)*reach,h+1.55+random.uniform(-.25,.65), math.sin(angle)*reach]);
 cylinder_between(a,b,.31,.22,'bark2',10);cylinder_between(b,c,.22,.085,'bark',9);branches.append(tuple(c))
 for s in [-1,1]:
  d=c+np.array([math.cos(angle+s*.47)*1.45,random.uniform(.45,.9),math.sin(angle+s*.47)*1.45]);
  cylinder_between(c,d,.10,.02,'barkdark',7);branches.append(tuple(d))
# leaf clusters stylized organic foliage 3D
clusters=[]
for endpoint in branches:
 base=np.array(endpoint)
 clusters.append((base,random.uniform(.75,1.28)))
 for j in range(2):
  clusters.append((base+np.array([random.uniform(-1.2,1.2),random.uniform(-.4,.9),random.uniform(-1.2,1.2)]),random.uniform(.55,1.0)))
clusters += [(np.array([0,7.65,0]),1.95),(np.array([1.8,7.5,-.3]),1.45),(np.array([-1.6,7.8,.3]),1.55),(np.array([0,8.5,.4]),1.35)]
for center,size in clusters:
 c=tuple(center)
 ellipsoid(c, (size*1.13,size*.56,size*.9),random.choice(['leaf1','leaf2','leaf3','leaf4']),1)
 # leaf bunches 3D small elongated ellipsoid masses varying directions
 for j in range(6):
  off=np.array([random.uniform(-.9,.9),random.uniform(-.3,.6),random.uniform(-.7,.7)])*size
  rr=random.uniform(.22,.43)*size
  ellipsoid(c+off,(rr*.75,rr*.50,rr*1.2),random.choice(['leaf1','leaf2','leaf3','leaf5']),1)
# ground rocks and moss around roots
for i in range(18):
 a=i*2*math.pi/18;r=random.uniform(1.5,2.7)
 p=(math.cos(a)*r,.17,math.sin(a)*r)
 ellipsoid(p,(random.uniform(.3,.63),random.uniform(.18,.34),random.uniform(.3,.7)),random.choice(['rock','rock2']),0)
for i in range(24):
 a=random.uniform(0,math.tau);r=random.uniform(.8,2.8)
 ellipsoid((math.cos(a)*r,.08,math.sin(a)*r),(.15,.08,.21),'moss',0)
# hanging wish tags from branches, in scattered ring around outer canopy
for i in range(38):
 a=i*math.tau/38+random.uniform(-.12,.12)
 rad=random.uniform(2.2,5.4)
 x=math.cos(a)*rad;z=math.sin(a)*rad
 y=random.uniform(4.8,6.8)
 thin_cord((x,y+.35,z),(x,y-.1,z),'red',.016)
 box((x,y-.35,z),(.28,.47,.055),random.choice(['paper','paper2']),random.uniform(-.3,.3))
 box((x,y-.2,z+.04),(.21,.055,.02),'red')
 box((x,y-.45,z+.045),(.12,.04,.018),'gold')
 thin_cord((x,y-.59,z),(x,y-.78,z),'red',.014)
# lanterns with 3D framing and caps
for i in range(6):
 a=(i+.3)*math.tau/6;rr=3.1+(i%2)*.8
 x=math.cos(a)*rr;z=math.sin(a)*rr;y=5.65+(i%3)*.35
 thin_cord((x,y+.55,z),(x,y+.1,z),'red',.028)
 box((x,y-.1,z),(.45,.64,.42),'lantern')
 for dx in [-.24,.24]:
  for dz in [-.23,.23]:cylinder_between((x+dx,y+.22,z+dz),(x+dx,y-.42,z+dz),.029,.029,'wood',6)
 box((x,y+.24,z),(.56,.11,.52),'gold');box((x,y-.44,z),(.56,.1,.52),'gold')
 thin_cord((x,y-.49,z),(x,y-.81,z),'red',.023)
 ellipsoid((x,y-.84,z),(.08,.11,.08),'red',0)
# sacred rope hugging lower trunk 4 concentric toroidal strips
for a in np.linspace(0,math.tau,64,endpoint=False):
 b=a+math.tau/64
 for y in [2.02,2.17]:
  thin_cord((1.06*math.cos(a),y+.06*math.sin(6*a),1.06*math.sin(a)),(1.06*math.cos(b),y+.06*math.sin(6*b),1.06*math.sin(b)),'gold',.057)
for i in range(6):
 a=i*math.tau/6
 thin_cord((1.07*math.cos(a),2.0,1.07*math.sin(a)),(1.08*math.cos(a),1.48,1.08*math.sin(a)),'gold',.04)
 ellipsoid((1.08*math.cos(a),1.4,1.08*math.sin(a)),(.075,.14,.075),'gold',0)
# hanging golden medallion on front
ellipsoid((0,1.75,1.18),(.28,.29,.07),'gold',1)
ellipsoid((0,1.75,1.26),(.16,.17,.03),'red',1)
# sign posts at front left
for x in [-2.6,-1.2]:cylinder_between((x,.04,2.55),(x,2.0,2.55),.09,.09,'wood',7)
box((-1.9,2.02,2.57),(1.95,.76,.18),'wood')
box((-1.9,2.02,2.68),(1.75,.62,.04),'gold')
box((-1.9,2.02,2.71),(1.55,.49,.045),'wood')
# message area 3D relief lines
for i in range(3):box((-1.9,2.19-i*.15,2.742),(1.1-i*.1,.025,.025),'paper')

scene=trimesh.Scene()
for name,group in parts.items():
 if not group:continue
 combined=trimesh.util.concatenate(group)
 combined.metadata['name']=name
 scene.add_geometry(combined,node_name=name,geom_name=name)
blob=scene.export(file_type='glb')
out.write_bytes(blob)
print('GLB',out,'bytes',len(blob))
check=trimesh.load(out,force='scene')
print('geometry parts',len(check.geometry),'triangles',sum(len(m.faces) for m in check.geometry.values()),'bounds',check.bounds)
