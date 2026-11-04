# CHÙA ONLINE 3.8 — CAMERA THÔNG MINH & ĐIỆN DÂN GIAN

Đây là bản cập nhật dựa trên Chùa Online 3.7 (Node.js, Socket.IO, Three.js, PostgreSQL tùy chọn).

## Những điểm mới

- Vào điện **không cần viết sớ**. Từ sân chùa, đến cửa điện chính và nhấn E hoặc nút tương tác. Có thể ra sân qua khu vực gần cửa điện trong nội điện. Viết sớ là hoạt động riêng để mở nghi thức dâng sớ/thắp hương/nhận cá.
- **Di chuyển tương đối theo camera 3D**: khi xoay camera, joystick/WASD vẫn đi đúng hướng hình ảnh (trái/phải/tiến/lùi). Sân chùa 2D không đổi hướng điều khiển.
- **Camera ít bị che**: bỏ trần kín, tường bên gần như xuyên thấu, làm mờ cột khi có tia nhìn từ camera đến nhân vật, và giới hạn vị trí camera trong không gian điện.
- **12 đệm thiền** bố trí thành hàng, khu giữa không có vật trang trí lớn. Nhấn E để ngồi; mỗi giây +1 tích đức và popup bay lên trên nhân vật.
- Trang trí dân gian: cột đỏ, bình gốm xanh trắng, đèn lồng, màn gỗ, cồng đồng, vách gỗ sơn son thếp vàng, ánh đèn vàng.
- Giữ Cây Khẩu Nghiệp, chat bong bóng, Multiplayer, phóng sinh và ảnh nền Quan Âm.

## Chạy thử

Cài Node.js >=18, mở CMD tại thư mục chứa `package.json`:

```bash
npm install
npm start
```

Mở `http://localhost:3000`. Không mở file HTML trực tiếp.

## Cập nhật GitHub / Render

Thay `inside3d.js`, `game.js`, `index.html`, `style.css`, `server.js`, `package.json`, `README.md` và giữ `assets/dien-quan-am.png`. Không upload `node_modules`. Render: Build `npm install`, Start `npm start`. `DATABASE_URL` để duy trì Cây Khẩu Nghiệp lâu dài vẫn như trước.

## Giới hạn

- Đồ họa 3D được dựng bằng khối hình học Three.js; chưa phải nội điện scan 3D chân thực.
- Chưa chạy kiểm thử bằng điện thoại thật hoặc nhiều người chơi trên Render. Lỗi mạng, hiệu năng máy yếu hay tỉ lệ màn hình có thể cần tinh chỉnh.
- Tích đức hiện lưu trên trình duyệt (`localStorage`); chưa phải điểm tài khoản được xác thực bằng máy chủ.
