# Xả Stress Online 6.1 (3D Multiplayer)

Bản 6.1 nâng cấp các mô hình 3D chính ngoài sân:
- `assets/cay-khau-nghiep-3d.glb` — Cây Khẩu Nghiệp
- `assets/nha-hoi-phuc-3d.glb` — Nhà Hồi Phục 3D
- `assets/bao-cat-3d.glb` — Bao cát / khu đập phá 3D
- `assets/ban-xa-buc-3d.glb` — Bàn Xả Bực 3D

## Điểm mới
- Nhà Hồi Phục, bao cát và bàn xả bực đã chuyển sang **mô hình GLB thật** thay vì chỉ dựng bằng vài khối đơn giản.
- `outside3d.js` ưu tiên tải các GLB mới. Nếu thiết bị tải lỗi, game sẽ tự rơi về mô hình dựng sẵn dự phòng để không trắng màn hình.
- Giữ nguyên multiplayer, Cây Khẩu Nghiệp, Phòng Hét, Nhà Hồi Phục bên trong và các điểm tương tác.

## Tạo lại mô hình
Nếu muốn chỉnh các asset 3D, chạy:
```bash
python create_stress_models.py
```

## Chạy local
```bash
npm install
npm start
```
