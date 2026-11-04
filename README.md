# Xả Stress Online v6.5.1 — Sửa nền và kiểm tra triển khai

- Sân gạch xám phủ kín toàn bộ phía trong tường bao, kích thước 65.5 × 54.5 đơn vị 3D. Dùng một PlaneGeometry và CanvasTexture lặp để tiết kiệm hiệu năng.
- Bỏ các cây/bụi trang trí (`buildDecor` rỗng). Chỉ giữ Cây Khẩu Nghiệp GLB.
- Các khu xa nhau theo bố cục v6.4: cây (130,430), nhà (600,420), bao cát (220,640), deadline (980,640), bàn (1070,470). Đây là tọa độ game quy đổi sang 3D.
- Hiển thị nhãn phiên bản v6.5 trên góc trên màn hình để xác nhận web đang chạy bản mới.
- HTTP headers `no-store` cho HTML/JS/CSS để giảm tình trạng trình duyệt giữ bản cũ.

## Cập nhật
Thay **toàn bộ** các file project trên GitHub, commit, chờ Render deploy hoàn thành, bấm Ctrl+Shift+R và quan sát nhãn `v6.5` trên góc trên. Nếu chưa thấy nhãn, Render vẫn đang phục vụ bản cũ hoặc chưa deploy đúng branch/commit.

## Kiểm tra
Cú pháp JS và ZIP được kiểm tra tự động. Chưa thử web đang chạy trên tài khoản Render của bạn.
