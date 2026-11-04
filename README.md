# CHÙA ONLINE 3.9 — ĐIỆN QUAN ÂM 3D, NHẠC THIỀN VÀ NỘI THẤT DÂN GIAN

Nâng cấp trực tiếp từ bản 3.8. Giữ nguyên sân chùa, Cây Khẩu Nghiệp, trò chuyện nhiều người qua Socket.IO, dâng sớ và phóng sinh. Nội điện vẫn sử dụng Three.js và hỗ trợ di chuyển theo hướng camera.

## Những điểm thay đổi

- **Nhạc thiền nhẹ**: tệp `assets/nhac-thien-dien-quan-am.mp3` là nhạc nền không lời tự tạo dành riêng cho game. Tự phát khi người chơi tương tác để bước vào điện; dừng khi ra khỏi điện/chuyển cảnh/ẩn tab, bật lại khi quay về nếu âm thanh được bật. Nút ♫ bật/tắt và lưu lựa chọn trên thiết bị. Trình duyệt có thể chặn tự phát trước tương tác đầu tiên.
- **Đệm thiền**: 12 đệm bố trí theo 3 hàng, khoảng cách lớn hơn. Chỉ chọn **đệm gần nhất trong phạm vi 43 đơn vị tọa độ**, tránh việc tự nhảy sang đệm khác. Giữ hiệu ứng +1 tích đức mỗi giây khi thiền.
- **Bàn thờ Quan Âm**: thêm bệ thờ nhiều tầng, sơn son thếp vàng, bình hoa sen, đèn dầu, hoa văn và khung bảng; giữ tượng 3D và hình nền điện gốc.
- **Tường và cửa sổ**: các mảng hoa văn đỏ vàng và cửa sổ nan gỗ ở hai vách, dùng chất liệu bán trong suốt ở sát mép để giảm khả năng che góc camera.

## Chạy thử trên Windows

```bash
npm install
npm start
```

Mở `http://localhost:3000`. Điện thoại cùng mạng LAN có thể vào `http://IP_MAY_TINH:3000` khi tường lửa cho phép.

## Cập nhật Render

Thay các file `game.js`, `inside3d.js`, `index.html`, `package.json`, `README.md` và **upload file MP3 mới trong thư mục `assets`**. Giữ ảnh `assets/dien-quan-am.png`. Không upload `node_modules`. Commit lên GitHub, để Render deploy commit mới.

`DATABASE_URL` trên Render vẫn được dùng cho việc lưu lời trên Cây Khẩu Nghiệp; điểm tích đức hiện lưu trên trình duyệt. Vào điện không yêu cầu viết sớ, nhưng dâng sớ vẫn yêu cầu viết sớ trước.

## Kiểm thử gợi ý

1. Mở game trên điện thoại, chọn tên và vào điện; kiểm tra có nhạc nhẹ. Nhấn ♫ để bật/tắt.
2. Ra sân và xác nhận nhạc dừng; quay vào điện và nhạc phát tiếp.
3. Tới từng đệm, nhấn tương tác, xác nhận không nhảy sang đệm khác và nhận +1 tích đức/giây.
4. Xoay camera đủ bốn phía, quan sát hoa văn và cửa sổ, kiểm tra nhân vật không bị che đáng kể.
5. Mở game trên hai thiết bị và thử đồng bộ nhân vật, chat, cùng các tính năng cũ.

**Lưu ý:** Đã kiểm tra cú pháp mã nguồn. Chưa xác nhận trực quan trên mọi loại điện thoại/trình duyệt.
