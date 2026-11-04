import os, math
import numpy as np
import trimesh
from trimesh.creation import box, cylinder, icosphere
from trimesh.transformations import rotation_matrix

OUT = '/mnt/data/xastress61/assets'
os.makedirs(OUT, exist_ok=True)

def rgba(h, a=255):
    h = h.lstrip('#')
    return [int(h[i:i+2],16) for i in (0,2,4)] + [a]

def add(scene, mesh, color, name=None):
    mesh.visual.face_colors = np.tile(rgba(color), (len(mesh.faces),1))
    scene.add_geometry(mesh, node_name=name)
    return mesh

def mk_box(scene,size,pos,color,name=None,rot=None):
    m = box(extents=size)
    if rot is not None:
        m.apply_transform(rot)
    m.apply_translation(pos)
    return add(scene,m,color,name)

def mk_cyl(scene,r,h,pos,color,name=None,axis='y',sections=24):
    m = cylinder(radius=r, height=h, sections=sections)
    if axis=='x':
        m.apply_transform(rotation_matrix(math.pi/2, [0,0,1]))
    elif axis=='z':
        m.apply_transform(rotation_matrix(math.pi/2, [1,0,0]))
    m.apply_translation(pos)
    return add(scene,m,color,name)

def mk_cyl2(scene,r1,r2,h,pos,color,name=None,axis='y',sections=24):
    m = trimesh.creation.cone(radius=r1, height=h, sections=sections)
    # use cone? no


def mk_sphere(scene,r,pos,color,name=None,sub=2,scale=None):
    m = icosphere(subdivisions=sub, radius=r)
    if scale is not None:
        m.apply_scale(scale)
    m.apply_translation(pos)
    return add(scene,m,color,name)

def prism_roof(scene,width,depth,rise,base_y,center,color,trim=None,name=None):
    w=width/2; d=depth/2
    verts=np.array([
        [-w,base_y,-d],[w,base_y,-d],[0,base_y+rise,-d],
        [-w,base_y,d],[w,base_y,d],[0,base_y+rise,d],
    ],float)
    verts += np.array(center)
    faces=np.array([[0,1,2],[3,5,4],[0,2,5],[0,5,3],[2,1,4],[2,4,5],[0,3,4],[0,4,1]])
    m=trimesh.Trimesh(vertices=verts, faces=faces, process=False)
    add(scene,m,color,name)
    if trim:
        mk_box(scene,[width*0.97,0.08,0.18],[center[0],base_y-0.01,center[2]-d+0.04],trim)
        mk_box(scene,[width*0.97,0.08,0.18],[center[0],base_y-0.01,center[2]+d-0.04],trim)
        mk_box(scene,[0.16,0.18,depth*0.96],[center[0],base_y+rise+0.05,center[2]],trim)

# 1) Recovery house
scene = trimesh.Scene()
WALL = '#f3efe7'; ACC = '#8db09c'; ROOF = '#5d6e75'; WOOD = '#875f3f'; WOOD2 = '#6d4932'; GOLD = '#d6aa63'; STONE='#d4cabd'; GLASS='#9ecfda'; GREEN='#6d9d58'; POT='#9a6e4a'; FLOWER='#efb1c0'
# base
mk_box(scene,[16.8,0.45,11.2],[0,0.23,0],STONE,'base')
mk_box(scene,[8.8,0.22,2.4],[0,0.56,5.4],'#ddd4c7','porch')
for i in range(3): mk_box(scene,[6.2-i*.4,0.18,1.0],[0,0.12+i*0.18,6.35-i*0.8],'#cfc1ae')
# main hall
mk_box(scene,[13.8,4.6,8.8],[0,2.53,0.0],WALL,'hall')
mk_box(scene,[14.4,0.22,9.4],[0,4.95,0],ACC)
# side rooms
mk_box(scene,[3.8,2.9,4.6],[-8.1,1.75,-1.5],WALL,'left_room')
mk_box(scene,[3.8,2.9,4.6],[8.1,1.75,-1.5],WALL,'right_room')
# columns and porch beam
for x in (-3.4,-1.3,1.3,3.4):
    mk_cyl(scene,0.16,2.9,[x,1.9,4.35],GOLD)
    mk_cyl(scene,0.24,0.16,[x,0.54,4.35],STONE)
    mk_cyl(scene,0.24,0.14,[x,3.32,4.35],STONE)
mk_box(scene,[8.4,0.22,0.36],[0,3.32,4.35],WOOD)
# doors
mk_box(scene,[4.6,3.25,0.16],[0,2.1,4.43],WOOD2,'doorframe')
for x in (-1.15,1.15):
    mk_box(scene,[1.95,2.95,0.08],[x,2.1,4.52],WOOD)
    for y in (1.2,2.1,3.0): mk_box(scene,[1.6,0.05,0.03],[x,y,4.56],GOLD)
    for xx in (-0.48,0,0.48): mk_box(scene,[0.04,2.62,0.03],[x+xx,2.1,4.56],GOLD)
# windows front
for x in (-4.8,4.8):
    mk_box(scene,[2.2,1.8,0.14],[x,2.55,4.45],WOOD2)
    mk_box(scene,[1.9,1.5,0.05],[x,2.55,4.52],GLASS)
    mk_box(scene,[0.05,1.5,0.02],[x,2.55,4.54],GOLD)
    mk_box(scene,[1.9,0.05,0.02],[x,2.55,4.54],GOLD)
# side windows
for x in (-6.95,6.95):
    mk_box(scene,[0.14,1.8,2.3],[x,2.4,-1.0],WOOD2)
    mk_box(scene,[0.05,1.5,2.0],[x+0.03,2.4,-1.0],GLASS)
# roof and side awnings
prism_roof(scene,15.8,10.2,2.15,5.05,[0,0,-0.2],ROOF,GOLD,'roof_main')
prism_roof(scene,4.9,5.2,1.0,3.15,[-8.1,0,-1.5],ROOF,GOLD,'roof_left')
prism_roof(scene,4.9,5.2,1.0,3.15,[8.1,0,-1.5],ROOF,GOLD,'roof_right')
# skylight / decor
mk_box(scene,[1.0,0.55,4.2],[0,5.9,-0.2],ACC)
# sign frame
mk_box(scene,[6.0,0.82,0.2],[0,4.1,4.62],'#2e5b47','sign_plate')
mk_box(scene,[6.2,0.08,0.24],[0,4.55,4.61],GOLD)
mk_box(scene,[6.2,0.08,0.24],[0,3.65,4.61],GOLD)
# planters
for x in (-6.9,-5.6,5.6,6.9):
    mk_cyl(scene,0.28,0.46,[x,0.78,5.2],POT)
    mk_sphere(scene,0.22,[x,1.1,5.2],GREEN,sub=1)
    for dx,dz in ((-.1,0),(.1,0),(0,.08),(0,-.08)): mk_sphere(scene,0.09,[x+dx,1.25,5.2+dz],FLOWER,sub=1)
# lanterns
for x in (-4.4,4.4):
    mk_cyl(scene,0.04,0.45,[x,4.05,4.75],GOLD)
    mk_cyl(scene,0.22,0.52,[x,3.55,4.75],'#ce4a3d',sections=18)
# benches outside sides
for x in (-9.8,9.8):
    mk_box(scene,[2.1,0.14,0.52],[x,0.82,3.7],WOOD)
    mk_box(scene,[2.0,0.12,0.18],[x,1.22,3.48],WOOD)
    for dx in (-0.85,0.85):
        for dz in (-0.15,0.15): mk_box(scene,[0.1,0.78,0.1],[x+dx,0.39,3.7+dz],WOOD2)
scene.export(os.path.join(OUT,'nha-hoi-phuc-3d.glb'))

# 2) Punching bag zone
scene = trimesh.Scene()
DARK='#33383d'; METAL='#7f8a92'; RED='#c9483a'; ORANGE='#da8c4d'; MAT='#2f3940'; WOOD='#806145'; BLUE='#5a7f93';
mk_box(scene,[5.6,0.18,5.6],[0,0.09,0],MAT,'mat')
# steel frame arch
for x,z in [(-1.9,-1.9),(1.9,-1.9),(-1.9,1.9),(1.9,1.9)]: mk_cyl(scene,0.12,3.4,[x,1.7,z],METAL)
for z in (-1.9,1.9): mk_box(scene,[4.1,0.14,0.14],[0,3.25,z],METAL)
for x in (-1.9,1.9): mk_box(scene,[0.14,0.14,4.1],[x,3.25,0],METAL)
mk_box(scene,[0.16,0.16,1.2],[0,3.15,0],METAL)
# bag and chains
for x,z in [(-0.18,-0.18),(0.18,-0.18),(-0.18,0.18),(0.18,0.18)]: mk_cyl(scene,0.02,0.55,[x,2.8,z],'#d3d7dc')
bag = cylinder(radius=0.52,height=1.95,sections=28); bag.apply_translation([0,1.82,0]); add(scene,bag,RED,'bag')
mk_box(scene,[0.65,0.12,0.65],[0,2.83,0],ORANGE)
mk_box(scene,[0.62,0.08,0.62],[0,0.84,0],ORANGE)
# side props
mk_box(scene,[1.1,0.18,0.9],[-1.8,0.28,1.7],WOOD,'crate1')
mk_box(scene,[0.85,0.48,0.65],[1.55,0.24,1.65],WOOD,'crate2')
# gloves
for s in (-1,1):
    mk_sphere(scene,0.22,[1.8+s*0.18,0.72,-1.35],RED,sub=2,scale=[1.05,1.0,1.2])
    mk_box(scene,[0.14,0.18,0.12],[1.8+s*0.18,0.5,-1.35],'#f2d59f')
# sign board
mk_box(scene,[2.7,0.72,0.18],[0,4.3,0],'#8a3e34','sign')
mk_box(scene,[2.9,0.08,0.22],[0,4.72,0],ORANGE)
scene.export(os.path.join(OUT,'bao-cat-3d.glb'))

# 3) Vent desk
scene = trimesh.Scene()
WOOD='#8b5f3b'; WOOD2='#6d4a30'; PAPER='#eee4c5'; GREEN='#5d8f54'; POT='#997050'; METAL='#9eabb2'; RED='#d26c5f'; GOLD='#d8b16e'; CREAM='#f8efcf'
mk_box(scene,[3.6,0.18,1.6],[0,1.2,0],WOOD,'tabletop')
for x in (-1.45,1.45):
    for z in (-0.55,0.55): mk_box(scene,[0.15,1.05,0.15],[x,0.52,z],WOOD2)
mk_box(scene,[2.1,0.12,0.85],[0,1.38,0],PAPER,'paperpad')
mk_box(scene,[0.95,0.06,0.08],[0,1.52,0.26],RED)
# chair
mk_box(scene,[1.1,0.14,0.92],[0,0.66,-1.15],WOOD)
for x in (-0.42,0.42):
    for z in (-1.45,-0.85): mk_box(scene,[0.1,0.6,0.1],[x,0.3,z],WOOD2)
mk_box(scene,[1.0,0.9,0.12],[0,1.2,-1.54],WOOD)
# lamp
mk_cyl(scene,0.04,0.55,[1.05,1.55,0.2],METAL)
mk_box(scene,[0.5,0.08,0.08],[1.22,1.78,0.2],METAL)
mk_box(scene,[0.36,0.22,0.26],[1.42,1.68,0.2],CREAM)
# note tray / tissue / plant
mk_box(scene,[0.55,0.16,0.38],[-1.0,1.34,0.22],GOLD)
mk_box(scene,[0.42,0.28,0.32],[-1.05,1.42,-0.28],CREAM)
mk_cyl(scene,0.18,0.3,[1.18,1.35,-0.35],POT)
for dx,dz in ((0,0),(0.1,0.08),(-0.08,0.04),(0.06,-0.05)): mk_sphere(scene,0.16,[1.18+dx,1.6, -0.35+dz],GREEN,sub=1)
# side notice stand
mk_box(scene,[1.8,0.08,0.92],[0,2.55,0.1],'#71482d','header')
mk_box(scene,[0.12,1.0,0.12],[-0.78,2.0,0.1],WOOD2); mk_box(scene,[0.12,1.0,0.12],[0.78,2.0,0.1],WOOD2)
scene.export(os.path.join(OUT,'ban-xa-buc-3d.glb'))

# verify sizes
for fn in ['nha-hoi-phuc-3d.glb','bao-cat-3d.glb','ban-xa-buc-3d.glb']:
    path=os.path.join(OUT,fn)
    loaded=trimesh.load(path, force='scene')
    faces=sum(len(g.faces) for g in loaded.geometry.values())
    print(fn, 'geometry', len(loaded.geometry), 'triangles', faces)
