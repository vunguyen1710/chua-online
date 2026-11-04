# THUNG LŨNG TRÔI SÔNG 3D v7.1 — MÔ HÌNH ĐỘC LẬP

Đây là **bản mô hình để xem và duyệt trước**, KHÔNG sửa đổi game Xả Stress Online đang chạy.

## Các file

- `thung-lung-song-uon-khuc-v71.glb`: mô hình 3D GLB gồm địa hình, lòng sông, mặt nước màu xanh, núi trung tâm / núi bao quanh, cây, đá và bến gỗ.
- `tuyen-song-v71.json`: 1000 điểm tuyến trôi liên tục thành vòng, kích thước và độ cao mặt nước, tọa độ bến.
- `xem-mo-hinh-3d.html`: trình xem bằng Three.js; mở file và chọn GLB thủ công nếu trình duyệt không tự tải do hạn chế `file://`.
- `ban-do-nhin-tren.png` / `ban-do-goc-nghieng.png`: ảnh nhìn tổng quan từ dữ liệu hình học (ảnh tham khảo; màu preview có thể khác GLB).
- `create_map.py`: mã dựng lại mô hình có thể sửa để tạo bản khác.

## Thông số

- Khu vực địa hình: **396 × 396 đơn vị 3D**.
- Sông uốn khúc khép kín, trung bình **24 đơn vị** rộng.
- Tuyến trôi **1000 điểm**, bắt đầu ở bến phía đông bắc.
- Mặt nước được xuất thành **mesh riêng nằm ở Y=+0.24**, mặt hướng lên trên; đáy sông Y khoảng -2.15, bờ cao hơn mặt nước.
- Tối đa cho phao lệch ngang theo tuyến: `safeDriftMax=8.4` đơn vị, để hạn chế xuyên bờ khi tích hợp sau.

## Kiểm tra đã thực hiện

- Mô hình GLB nạp lại thành công qua `trimesh`.
- 14 thành phần hình học, trong đó có `02_VISIBLE_RIVER_WATER` (mặt nước có pháp tuyến hướng lên).
- Đáy sông thấp hơn mặt nước, bờ sông cao hơn mặt nước.
- Đã kiểm tra đường sông khép kín và tọa độ mô hình.

**Chưa tích hợp vào game và chưa kiểm thử với Render/WebGL trên máy người dùng.** Khi duyệt bản này, bước kế tiếp mới là nối animation phao vịt, đồng bộ multiplayer, giới hạn va chạm trong sông.
