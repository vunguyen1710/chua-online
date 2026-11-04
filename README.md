# Chùa Online 3.5 — Điện Quan Âm 3D

Bản 3.5 giữ sân chùa 2D, Cây Khẩu Nghiệp, Socket.IO nhiều người chơi, joystick cảm ứng, lời sớ riêng và hồ phóng sinh. Khi dâng sớ, người chơi bước vào nội điện dựng **3D WebGL bằng Three.js** (sàn lát gạch, cột, bàn thờ, tượng Quan Âm cách điệu, nén nhang, ánh sáng và nhân vật 3D). Camera góc nhìn thứ ba theo người chơi. Ảnh `assets/dien-quan-am.png` được dùng làm tranh/khung cảnh phụ phía sau hương án. Đây là mô hình 3D dựng bằng hình học, **chưa phải** mô hình điêu khắc photorealistic/GLB chi tiết.

## Cài đặt Windows

Cần Node.js >=18. Trong thư mục chứa `package.json`:

```
npm install
npm start
```

Mở http://localhost:3000. Không mở trực tiếp `index.html` vì app cần máy chủ Socket.IO và module Three.js.

## Cách chơi

1. Vào sân, tìm **Bàn Viết Sớ Cầu An** (khác Cây Khẩu Nghiệp).
2. Viết sớ, đi tới cửa điện và tương tác E/nút tương tác.
3. Khi vào nội điện, cảnh chuyển sang 3D. Di chuyển tới vòng sáng phía trước bàn thờ (khoảng giữa điện).
4. Nhấn E/nút tương tác để dâng sớ, tiếp tục thắp hương và nhận cá.
5. Mang cá ra hồ phóng sinh. Trò chuyện bằng bong bóng chữ vẫn có thể dùng trong điện 3D.

WASD/mũi tên cho máy tính; joystick trên điện thoại. Camera 3D theo người chơi.

## GitHub / Render

Upload **tất cả các file của bản 3.5**, gồm `inside3d.js`, `game.js`, `index.html`, `style.css`, `server.js`, `package.json`, `assets/`. **Không** upload `node_modules/`. Trong Render: Build Command `npm install`, Start Command `npm start`. Biến `DATABASE_URL` lưu Cây Khẩu Nghiệp vào PostgreSQL như bản 3.4. Nên cập nhật `package-lock.json` bằng `npm install` trên PC rồi commit file lock nếu có.

Three.js được tự cài từ npm và được máy chủ cung cấp qua `/vendor/three/three.module.js`, không cần CDN riêng. Điện thoại phải hỗ trợ WebGL; nếu không, nội điện sẽ quay về nền 2D dự phòng.

## Giới hạn hiện tại

- Game 3D được dựng bằng các mesh hình học, là prototype có thể chơi, không phải kiến trúc scan thực tế.
- Hành động dâng sớ và thắp hương vẫn được xác nhận bằng các hộp thoại; chưa có hoạt ảnh tay nhân vật cầm sớ hoặc cắm hương thực tế.
- Chưa kiểm thử trên thiết bị di động và Render thật. Bạn nên thử nhiều cấu hình để điều chỉnh hiệu suất và điều khiển.
- Cơ sở dữ liệu chỉ lưu sớ khẩu nghiệp; bảo mật và lọc nội dung cộng đồng cần tăng cường trước khi công khai quy mô lớn.
