# Chùa Online Multiplayer 3.4 — Hai chức năng độc lập

## 1. Viết sớ cầu an (bàn bên phải sân chùa)
Viết sớ cầu an -> đến cửa Điện Quan Âm -> dâng sớ -> thắp hương -> nhận cá -> phóng sinh.
Sớ cầu an chỉ dùng trong phiên chơi; KHÔNG gửi lên API Cây Khẩu Nghiệp và không đăng công khai.

## 2. Cây Khẩu Nghiệp (bên trái sân chùa)
Đến cây hoặc dùng nút 🌳 -> Đọc các lời công khai, hoặc nhấn 'Viết lời khẩu nghiệp' -> treo lên cây.
Lời khẩu nghiệp được lưu bởi POST /api/notes và đọc bằng GET /api/notes, độc lập với nghi thức dâng sớ.
PostgreSQL cần DATABASE_URL để lưu qua các lần deploy; nếu không có, chế độ JSON local không bền vững trên Render.
Nội dung cũ trong bảng karma_notes được giữ nguyên.

## Chạy
`npm install` rồi `npm start`, vào http://localhost:3000.
Triển khai Render Web Service dùng Build: npm install, Start: npm start.
Cập nhật toàn bộ game.js, index.html, style.css, server.js; giữ thư mục assets.

## Lưu ý
Đây là game giải trí, không đại diện cơ sở tôn giáo. Nội dung trên cây công khai: cần quản trị và cơ chế báo cáo khi triển khai lớn.

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


## 3.2 – Tối ưu điện thoại
- Camera theo nhân vật trong màn hình dọc, giữ toạ độ đồng bộ Socket.IO.
- Joystick tròn và nút tương tác không đè thanh trò chuyện.
- Căn chỉnh cho màn hình nhỏ, landscape, vùng tai thỏ và safe-area.
- Nút ⛶ chuyển toàn màn hình (nếu trình duyệt hỗ trợ).
- Tăng kích thước nhập liệu trên iOS tránh tự zoom.
- URL `style.css?v=3.2.0` và `game.js?v=3.2.0` giúp trình duyệt nhận bản mới.


## 3.3 — Cây Khẩu Nghiệp (lưu chung lâu dài)

Mỗi người viết lời ở bàn sớ -> tự động treo lên cây ở phía trái sân. Người chơi khác có thể tới cây bấm E, nhấn cây bằng chuột/touch, hoặc dùng nút 🌳 ở góc trên để xem sớ (phân trang). Viết xong vẫn vào điện dâng sớ, thắp hương và thả cá như cũ. Sớ công khai với mọi người: không ghi thông tin cá nhân nhạy cảm.

### Quan trọng: lưu dữ liệu lâu dài trên Render

**BẮT BUỘC cấu hình PostgreSQL cho môi trường thật.** Render Free có filesystem tạm; JSON trên ổ đĩa của Render có thể mất lúc deploy lại, restart hoặc redeploy.

1. Tạo một PostgreSQL database được quản lý bởi Neon, Supabase hoặc Render Postgres (kiểm tra gói lưu trữ và thời hạn của nhà cung cấp).
2. Sao chép connection string dạng `postgresql://USER:PASSWORD@HOST/DB?sslmode=require`.
3. Trong Render Web Service -> Environment -> Add Environment Variable: `DATABASE_URL` = chuỗi kết nối đó; Save and Deploy. Giữ secret chỉ ở Render, KHÔNG commit lên GitHub.
4. Xem log có `Cây Khẩu Nghiệp: PostgreSQL connected`. Table `karma_notes` sẽ được tạo tự động.
5. Bản local nếu không có `DATABASE_URL` sẽ ghi `local-notes.json` để thử nghiệm. **Không bảo đảm dữ liệu vĩnh viễn trên Render**.

Endpoint: GET `/api/notes?page=1&limit=12`, POST `/api/notes`. Nội dung tối đa 400 ký tự, giới hạn tạo sớ 20 giây/IP để giảm spam. Nội dung có thể đọc công khai. Có API kiểm duyệt `DELETE /api/notes/:id` yêu cầu header `x-admin-token` bằng biến `ADMIN_TOKEN` đặt trên Render; không cung cấp token cho trình duyệt. Chưa có giao diện báo cáo/sàng lọc nội dung, cần bổ sung trước khi quảng bá rộng rãi.

**Ghi chú:** Bản ZIP không kèm `node_modules` hoặc `package-lock.json`. Chạy `npm install` ở thư mục dự án để tạo `package-lock.json` mới (gồm `pg`), rồi commit file lock mới. Render dùng lệnh build `npm install`.
