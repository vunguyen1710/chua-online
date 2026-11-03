# Chùa Online 3.0 — Multiplayer + Joystick + Dâng sớ

## Hành trình chơi
1. Chọn biệt danh, dùng **WASD / phím mũi tên** trên PC hoặc **joystick tròn kéo 360°** trên điện thoại.
2. Đi tới **bàn viết sớ** bên phải sân chùa, nhấn E hoặc nút tương tác. Nhập sớ và niêm sớ.
3. Đi tới **cửa điện chính** (giữa sân, phía trên) và nhấn E để vào nội điện.
4. Trong điện, đi tới **hương án** và nhấn E, chọn **Dâng sớ**.
5. Chọn **Thắp hương**. Chỉ sau đó mới nhận được lời chúc và một cá vàng.
6. Chọn ra hồ, nhấn **Thả cá** để phóng sinh. Có thể chơi lại.

Những người chơi khác xuất hiện và di chuyển thời gian thực thông qua Socket.IO, có bong bóng trò chuyện khi gửi chat. Bạn có thể chat ở sân hoặc trong điện với người cùng cảnh. Văn bản sớ chỉ nằm trong trình duyệt, không truyền lên máy chủ.

## Chạy trên Windows
Cần Node.js 18+. Giải nén, mở CMD trong thư mục có `package.json`:

```cmd
npm install
npm start
```

Mở `http://localhost:3000` trên máy tính. Điện thoại cùng Wi-Fi mở `http://IP-MAY-TINH:3000` (xem IP bằng lệnh `ipconfig`). Cho phép kết nối mạng riêng qua Windows Firewall nếu cần.

## Đưa lên Internet
Đẩy thư mục dự án lên GitHub (không đưa node_modules), tạo **Web Service** trên Render hoặc máy chủ Node.js hỗ trợ WebSocket, chọn Build `npm install` và Start `npm start`. **GitHub Pages không đủ để chạy multiplayer**, vì cần server Node.js.

## Lưu ý
- Giới hạn 60 người chơi đồng thời trên một tiến trình Node.js theo cấu hình hiện tại, **chưa được kiểm thử tải**.
- Chưa có kiểm soát hành vi chat và quản trị/moderation chuyên sâu; nên bổ sung trước khi phát hành công khai.
- Số cá phóng sinh được lưu trong localStorage của mỗi trình duyệt, không phải tổng toàn server.
- Tiến độ nghi thức trên client, phù hợp mini-game giải trí, không phải phần thưởng có giá trị và chưa chống gian lận.
- Không đại diện tổ chức tôn giáo.


## Bản 3.1 — ảnh nền Điện Quan Âm
- `assets/dien-quan-am.png` là hình nền nội điện mới.
- Khi mang sớ đến cửa điện, cảnh bên trong hiện ảnh Quan Thế Âm cùng bàn thờ.
- Đến khoảng giữa phần sân gạch ngay trước bàn thờ để tương tác dâng sớ (nút E hoặc Tương tác).
- Sau khi dâng sớ, chọn Thắp hương để nhận cá vàng rồi phóng sinh.
- Các chức năng joystick, chat bong bóng và đồng bộ Socket.IO được giữ nguyên.
- Có thể thay ảnh bằng file PNG khác cùng tên; bố cục hiện tại dành cho ảnh 16:9.
