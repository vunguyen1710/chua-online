"""Rebuild properly scaled, Y-up glTF models. 3D units: avatar ≈2.1 m.
Each model has origin at its ground footprint center; front faces positive Z.
Use Python 3.13 + trimesh, numpy. Produces valid .glb files for Three.js.
"""
from pathlib import Path
import math, numpy as np, trimesh
from trimesh.creation import box, cylinder, icosphere
from trimesh.transformations import rotation_matrix

ROOT=Path(__file__).parent
OUT=ROOT/'assets'; OUT.mkdir(exist_ok=True)

def rgb(hex_code):
    h=hex_code.strip('#')
    return [int(h[i:i+2],16) for i in (0,2,4)]+[255]

class Builder:
    def __init__(self): self.scene=trimesh.Scene(); self.counter=0
    def add(self,mesh,color,name):
        mesh.visual.face_colors=np.tile(rgb(color),(len(mesh.faces),1))
        self.counter+=1
        self.scene.add_geometry(mesh, node_name=f'{name}_{self.counter:03d}', geom_name=f'{name}_{self.counter:03d}')
        return mesh
    def cuboid(self,size,pos,color,name='Part',angle=0):
        mesh=box(extents=size)
        if angle: mesh.apply_transform(rotation_matrix(angle,[0,1,0]))
        mesh.apply_translation(pos); return self.add(mesh,color,name)
    def cyl(self,radius,height,pos,color,name='Part',segments=18):
        mesh=cylinder(radius=radius,height=height,sections=segments)
        mesh.apply_transform(rotation_matrix(-math.pi/2,[1,0,0]))
        mesh.apply_translation(pos); return self.add(mesh,color,name)
    def ball(self,radius,pos,color,name='Part',scale=(1,1,1),sub=1):
        mesh=icosphere(subdivisions=sub,radius=radius)
        mesh.apply_scale(scale); mesh.apply_translation(pos); return self.add(mesh,color,name)
    def cylinder_taper(self, top_radius,bottom_radius,height,pos,color,name='Part',segments=20):
        mesh=trimesh.creation.conical_frustum(height=height,radius=bottom_radius,top_radius=top_radius,sections=segments) if hasattr(trimesh.creation,'conical_frustum') else None
        if mesh is None: return self.cyl(bottom_radius,height,pos,color,name,segments)
        mesh.apply_transform(rotation_matrix(-math.pi/2,[1,0,0]));mesh.apply_translation(pos)
        return self.add(mesh,color,name)
    def roof(self,w,depth,eave_y,rise,center_x,center_z,color,trim='#d6ae7b',name='Roof'):
        """True gable roof. Ridge runs along Z, front & rear eaves along X."""
        x=center_x; z=center_z; hw=w/2; hd=depth/2
        V=np.array([
            [x-hw,eave_y,z-hd], [x+hw,eave_y,z-hd], [x,eave_y+rise,z-hd],
            [x-hw,eave_y,z+hd], [x+hw,eave_y,z+hd], [x,eave_y+rise,z+hd],
        ],float)
        faces=np.array([[0,2,1],[3,4,5],[0,3,5],[0,5,2],[1,2,5],[1,5,4],[0,1,4],[0,4,3]],dtype=int)
        self.add(trimesh.Trimesh(vertices=V,faces=faces,process=False),color,name)
        self.cuboid((w,.11,.12),(x,eave_y+.02,z+hd-.04),trim,name+'FrontEdge')
        self.cuboid((w,.11,.12),(x,eave_y+.02,z-hd+.04),trim,name+'RearEdge')
        self.cuboid((.12,.14,depth),(x,eave_y+rise+.045,z),trim,name+'Ridge')
    def export(self,file):
        fn=OUT/file;self.scene.export(str(fn));s=trimesh.load(str(fn),force='scene');bounds=s.bounds
        return {'name':file,'geometries':len(s.geometry),'triangles':sum(len(g.faces) for g in s.geometry.values()),'min':bounds[0].tolist(),'max':bounds[1].tolist(),'size':s.extents.tolist(),'path':str(fn)}

# House: 13.8w × 9.7d × 7.1h; front at local Z≈4.15, interaction ring at +4.2
b=Builder()
STONE='#c9c3b5';WALL='#ece6dc';MINT='#73978c';ROOF='#526a74';ROOF_HIGHLIGHT='#748b90';WOOD='#845d43';DARK='#49382f';TRIM='#d4ae70';GLASS='#91c3c8';LEAF='#588264';LEAF2='#77a47c';POT='#9e7564';PINK='#e8b6c1'
b.cuboid((13.5,.42,9.0),(0,.21,-.15),STONE,'Foundation')
b.cuboid((7.4,.17,2.35),(0,.34,4.42),'#bdb2a1','EntryLanding')
for i in range(2):
    b.cuboid((6.1-i*.15,.16,.65),(0,.09+i*.16,5.6-i*.65),'#d9d2c6','EntranceStep')
b.cuboid((12.2,4.4,7.5),(0,2.6,-.65),WALL,'MainHall')
# exterior wooden horizontal accents
for yy in (.58,4.63): b.cuboid((12.35,.16,7.7),(0,yy,-.65),MINT,'FacadeTrim')
# natural pitched roof at y=4.9, extends in front to z5.0; not intersecting columns
b.roof(13.65,9.7,4.97,2.04,0,-.1,ROOF,TRIM,'MainRoof')
# a thin porch awning at lower height in front of door
b.cuboid((8.1,.18,2.25),(0,3.98,4.05),MINT,'PorchAwning')
# four aligned columns sitting on porch deck, ending just below awning
for xx in (-3.1,-1.75,1.75,3.1):
    b.cyl(.135,3.38,(xx,2.21,4.31),TRIM,'PorchColumn',18)
    b.cyl(.19,.15,(xx,.59,4.31),STONE,'ColumnFoot')
    b.cyl(.20,.16,(xx,3.89,4.31),WOOD,'ColumnCap')
# door at wall FRONT face local Z=3.1 (wall center -0.65 plus half depth 3.75)
b.cuboid((3.55,3.2,.12),(0,2.1,3.19),DARK,'DoorFrame')
for xx in (-.87,.87):
    b.cuboid((1.65,2.85,.075),(xx,2.1,3.31),WOOD,'DoorLeaf')
    for yy in (1.25,2.1,2.95): b.cuboid((1.46,.045,.028),(xx,yy,3.37),TRIM,'DoorOrnament')
    b.ball(.055,(-.12 if xx<0 else .12,2.05,3.39),TRIM,'DoorHandle',sub=1)
# panel signage fixed above entrance not across roof
b.cuboid((4.15,.65,.16),(0,4.28,3.3),'#2c6658','SignBoard')
b.cuboid((4.35,.08,.2),(0,4.66,3.32),TRIM,'SignEdge')
b.cuboid((4.35,.08,.2),(0,3.91,3.32),TRIM,'SignEdge')
# windows with smaller wooden frames
for xx in (-4.53,4.53):
    b.cuboid((2.12,1.7,.13),(xx,2.68,3.15),DARK,'WindowFrame')
    b.cuboid((1.85,1.43,.04),(xx,2.68,3.23),GLASS,'WindowGlass')
    b.cuboid((.065,1.45,.045),(xx,2.68,3.27),WOOD,'WindowMullion')
    b.cuboid((1.85,.06,.045),(xx,2.68,3.27),WOOD,'WindowMullion')
# side walls low windows
for xx in (-6.17,6.17):
    for zz in (-2.2,.65):
        b.cuboid((.08,1.45,1.52),(xx,2.5,zz),DARK,'SideWindowFrame')
        b.cuboid((.045,1.18,1.28),(xx+(-.04 if xx<0 else .04),2.5,zz),GLASS,'SideWindowGlass')
# pots and pleasant garden props
for xx in (-5.9,5.9):
    b.cyl(.31,.5,(xx,.69,4.1),POT,'CeramicPot')
    b.ball(.42,(xx,1.14,4.1),LEAF,'Shrub',scale=(1.0,1.2,.92))
    for dx,dz in ((-.22,0),(.18,.1),(0,-.15)):
        b.ball(.13,(xx+dx,1.36,4.1+dz),LEAF2,'ShrubLeaves')
# small lamps attached to walls
for xx in (-5.65,5.65):
    b.cuboid((.16,.63,.22),(xx,3.65,3.3),WOOD,'WallLantern')
    b.ball(.16,(xx,3.63,3.47),'#f8d18d','WallLanternLight')
# an entrance mat
b.cuboid((2.5,.035,1.1),(0,.45,4.72),'#768f7d','WelcomeMat')
house=b.export('nha-hoi-phuc-3d.glb')

# Punching bag: frame 2.7w × 2.4d, bag hangs in frame with independent Bag_* nodes.
b=Builder()
DARK='#353c42';METAL='#8a949c';RED='#ca5045';ORANGE='#e5ae72';FLOOR='#343b41';GLOVE='#b44542'
b.cuboid((3.6,.12,3.1),(0,.06,0),FLOOR,'TrainingMat')
for xx in (-1.35,1.35):
    for zz in (-1.06,1.06):
        b.cyl(.07,3.25,(xx,1.625,zz),METAL,'FramePillar')
for zz in (-1.06,1.06): b.cuboid((2.8,.12,.14),(0,3.23,zz),METAL,'FrameBeam')
for xx in (-1.35,1.35): b.cuboid((.14,.12,2.2),(xx,3.23,0),METAL,'FrameBeam')
b.cuboid((.22,.14,1.0),(0,3.19,0),METAL,'TopCrossbar')
for xx in (-.2,.2):
    for zz in (-.2,.2): b.cyl(.017,.48,(xx,2.82,zz),'#d1d5d7','BagChain')
b.cyl(.43,1.73,(0,1.77,0),RED,'BagMain')
b.cyl(.45,.11,(0,2.68,0),ORANGE,'BagTop')
b.cyl(.45,.11,(0,.87,0),ORANGE,'BagBottom')
for xx in (-.55,.55): b.ball(.20,(xx,.4,1.0),GLOVE,'BoxingGloves',scale=(1.2,1.0,.92))
b.cuboid((1.0,.26,.68),(1.0,.2,-.8),'#7c6757','StorageBox')
b.cuboid((1.05,.26,.7),(-.95,.2,-.82),'#8f7662','StorageBox')
bag=b.export('bao-cat-3d.glb')

# Desk: top at y~1.0, chair clear of desk; paper + pencil + planter.
b=Builder()
DESK='#a3724b';FRAME='#694a33';PAPER='#f4edd9';INK='#c65f50';LAMP='#e9c58c';PLANT='#6b9a65';POT='#a77c67';CHAIR='#866445';METAL='#9ca7ad';
b.cuboid((2.85,.14,1.22),(0,1.12,0),DESK,'DeskSurface')
for xx in (-1.16,1.16):
    for zz in (-.42,.42): b.cuboid((.12,1.02,.12),(xx,.54,zz),FRAME,'DeskLeg')
b.cuboid((2.35,.09,.12),(0,.53,-.38),FRAME,'SupportRail')
b.cuboid((1.4,.03,.69),(-.15,1.22,.07),PAPER,'WritingPaper')
b.cuboid((.8,.03,.035),(-.2,1.28,.31),INK,'Pencil')
# organizer and desk lamp
b.cuboid((.33,.16,.31),(-1.06,1.27,-.2),INK,'PenCup')
b.cyl(.035,.54,(.98,1.43,-.11),METAL,'LampStand')
b.cuboid((.43,.20,.35),(.98,1.79,-.11),LAMP,'DeskLamp')
# chair behind desk = positive Z on user's front approach
b.cuboid((.83,.1,.74),(0,.58,1.25),CHAIR,'ChairSeat')
for xx in (-.32,.32):
    for zz in (.98,1.52): b.cuboid((.085,.53,.085),(xx,.27,zz),FRAME,'ChairLeg')
b.cuboid((.8,.75,.095),(0,1.06,1.58),CHAIR,'ChairBack')
# plant
b.cyl(.155,.25,(1.14,1.31,.27),POT,'Pot')
for dx,dz in ((-.08,0),(.08,.04),(0,-.06)):
    b.ball(.17,(1.14+dx,1.56,.27+dz),PLANT,'PlantLeaf')
desk=b.export('ban-xa-buc-3d.glb')

import json
(OUT/'stress-model-metrics.json').write_text(json.dumps({'model_origin':'center at ground (Y=0), front toward +Z','assets':[house,bag,desk]},ensure_ascii=False,indent=2),encoding='utf-8')
for a in [house,bag,desk]: print(a['name'],'size',[round(x,2) for x in a['size']],'triangles',a['triangles'])
