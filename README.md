# Xả Stress Online 7.2 — sửa khu trôi sông để chơi được

- Thay map sông v7.0 lỗi bằng **mô hình 3D v7.1**, có địa hình núi và nước nằm sẵn trong GLB.
- **Không tự vẽ đè** mặt nước thứ hai, tránh lỗi chồng hình.
- **Sửa lỗi `localProfile is not defined`** khiến animation đóng băng khi bắt đầu trôi.
- Camera xuất hiện trực tiếp trên bến ở góc cao; không chạy xuyên địa hình từ gốc 0,0,0.
- Phần phao vịt trôi theo đường sông khép kín 1.000 waypoint; giới hạn lệch ngang trong lòng sông.
- Mỗi người có nhịp lắc/bồng bềnh khác nhau.
- Giữ nguyên multiplayer, các khu khác, dữ liệu Cây Khẩu Nghiệp.

Triển khai: giải nén toàn bộ project vào repository, Render deploy latest commit. Kiểm tra nhãn v7.2 và Ctrl+F5.

Đã kiểm tra: cú pháp JS, cấu trúc GLB, JSON, ZIP. Chưa kiểm thử WebGL thực tế trên trình duyệt của người dùng.
