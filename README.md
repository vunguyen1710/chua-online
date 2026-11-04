# XẢ STRESS ONLINE 6.7 — THUNG LŨNG TRÔI SÔNG 3D

Nâng cấp trực tiếp từ game 6.6 (giữ toàn bộ chức năng cũ):
- Thêm CỔNG THUNG LŨNG TRÔI SÔNG 3D ở khu sân chính, tọa độ game (600, 550).
- Nhấn **E / TƯƠNG TÁC** khi đến gần cổng để sang map riêng.
- Map 3D độc lập thật (`assets/thung-lung-song-vong-tron-3d.glb`) có đảo núi, rừng thông, sông chạy thành vòng khép kín, bến gỗ.
- Nhấn **🌊 Bắt đầu trôi** để nhân vật nằm ngang và di chuyển tự động theo dòng nước.
- Vị trí hiện tại, số vòng, % quãng đường và camera theo chuyển động được cập nhật liên tục.
- Nhấn **⏸ Lên bờ** để ngừng; nhấn **↶ Quay về sân chính** để quay về khu Xả Stress.
- Vẫn đồng bộ trạng thái scene `river`, vị trí, động tác nằm trôi và những người chơi cùng map qua Socket.IO.
- Cảnh độc lập ở `river3d.js`, không chèn địa hình sông quá lớn lên sân chính.
- Tên nhân vật trong cảnh sông có dạng bảng 3D nhỏ.

## File chính
- `river3d.js`: renderer Three.js, avatar trôi, camera, đồng bộ người chơi.
- `assets/river-route.json`: 480 điểm dòng sông khép kín.
- `assets/thung-lung-song-vong-tron-3d.glb`: địa hình 3D thực.
- `outside3d.js`: cổng vào trên sân.
- `game.js`: điều khiển chuyển khu, nút bắt đầu/dừng.
- `server.js`: phục vụ route và chấp nhận scene river.

## Cài đặt
Chạy trong thư mục dự án:

    npm install
    npm start

Mở http://localhost:3000

## Deploy Render
Thay toàn bộ repository bằng nội dung của ZIP, bao gồm `assets` và `river3d.js` ở thư mục gốc. Deploy commit mới, tải lại trang bằng Ctrl+Shift+R, và xác nhận góc trang hiển thị v6.7.

## Giới hạn kiểm thử
Đã kiểm tra cú pháp JS, đường dẫn file, dữ liệu tuyến sông và GLB. Chưa chạy thử browser + Socket.IO trên Render thực tế. Các chuyển động hiện là animation lập trình bằng Three.js, không phải skeleton/rig chuyên nghiệp.
