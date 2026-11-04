from pathlib import Path
import json,math,trimesh
p=Path(__file__).parent
metrics=json.loads((p/'assets/stress-model-metrics.json').read_text(encoding='utf-8'))
assert len(metrics['assets'])==3
world=lambda x,y:(max(-19.4,min(19.4,(x-600)/32.5)),max(-10.8,min(11.6,(y-560)/15.4)))
door=world(600,401); smash=world(390,508); desk=world(926,493)
assets={v['name']:v for v in metrics['assets']}
h=assets['nha-hoi-phuc-3d.glb']
b=assets['bao-cat-3d.glb'];d=assets['ban-xa-buc-3d.glb']
# House model entry steps center at +5.6 Z; aligns with the marker.
house_origin=(door[0],door[1]-5.6)
steps_center=(house_origin[0],house_origin[1]+5.6)
assert math.dist(steps_center,door)<1e-7
# sizes in units (1 character ~ 2.1 units high)
assert 12<=h['size'][0]<=15 and 9<=h['size'][2]<=12
assert 3<=b['size'][0]<=4 and 3<=b['size'][2]<=4
assert 2.6<=d['size'][0]<=3 and 2<=d['size'][2]<=2.5
# Grounded mesh and reasonable dimensions
for asset in assets.values():
    assert -0.03<=asset['min'][1]<=0.03,asset['name']
    assert asset['size'][1]<8,asset['name']
# Clear space around the 3 facilities
assert math.dist(door,smash)>7.0
assert math.dist(door,desk)>9.0
assert math.dist(smash,desk)>10.0
assert all(a['triangles']<6000 for a in assets.values())
print('PASS: GLB bounds, geometry, origin, house door marker and interaction locations')
for asset in assets.values():print(' ',asset['name'], 'triangles',asset['triangles'])
print('DOOR',door,'HOUSE_ORIGIN',house_origin,'SMASH',smash,'DESK',desk)
