# Xả Stress Online 6.2 — sửa tỷ lệ 3D và tương tác

Dự án multiplayer Three.js/Socket.IO trên Node.js.

## Thay đổi so với 6.1

- Dựng lại ba mô hình GLB với trục Y hướng lên, gốc tại mặt đất, phía trước theo hướng **+Z**:
  - `assets/nha-hoi-phuc-3d.glb` — nhà rộng 13,65 đơn vị, mái dốc liền khối, cửa chính, hiên, cột, bậc thang.
  - `assets/bao-cat-3d.glb` — khung thép và bao cát độc lập; khi đập chỉ bao cát chuyển động.
  - `assets/ban-xa-buc-3d.glb` — bàn, ghế, giấy, bút, đèn và cây cảnh có tỷ lệ gần với nhân vật.
- Điểm tương tác ngoài sân được đo theo đúng tọa độ thế giới 3D, không dùng vòng bán kính pixel 2D cũ.
- Đặt bậc cửa Nhà Hồi Phục khớp với vòng tương tác ở điểm (600,401) trong logic game.
- Điều chỉnh kích cỡ Cây Khẩu Nghiệp để các khu không bị chồng lên nhau quá nhiều.
- Thêm version `v=6.2.0` để trình duyệt tải đúng GLB và JS mới.

## Sơ đồ vị trí chính

| Khu | Tọa độ logic 2D | Tọa độ 3D (X, Z) |
|---|---:|---:|
| Nhà Hồi Phục — cửa | (600,401) | (0, -10.325) |
| Bao cát | (390,508) | (-6.462, -3.377) |
| Bàn Xả Bực | (926,493) | (10.031, -4.351) |
| Cây Khẩu Nghiệp | (190,442) | (-12.615, -7.662) |

File `assets/stress-model-metrics.json` chứa kích thước thực tế sau khi xuất mô hình.

## Kiểm tra đã thực hiện

```bash
python create_stress_models.py
python verify_layout.py
node --check game.js
node --check outside3d.js
node --check inside3d.js
node --check server.js
```

Các bài kiểm tra xác nhận GLB mở được, không bị lệch khỏi nền đất, kích thước hợp lý và vị trí tương tác đúng theo công thức. Cần tiếp tục kiểm tra hình ảnh và thao tác trên điện thoại sau khi deploy.

## Chạy / deploy

```bash
npm install
npm start
```

Đảm bảo tải **cả thư mục `assets/`**, không chỉ riêng `outside3d.js`. Không đưa `node_modules` lên GitHub.

## 6.3 — Đấu Trường Đập Tan Deadline 3D
- Loại bỏ Phòng Hét khỏi cảnh ngoài trời, giao diện và logic tương tác.
- Thay bằng 5 khối áp lực 3D xoay và có hoạt ảnh khi đập.
- Đến vùng (760,508) nhấn E để chơi vòng 25 giây, bấm E tạo combo.
- Điểm kỷ lục cá nhân lưu trong localStorage, không phải bảng xếp hạng online.
- Thưởng bình tĩnh khi hoàn tất vòng.
- Giữ lại Cây Khẩu Nghiệp, Nhà Hồi Phục, bao cát và bàn xả bực.
