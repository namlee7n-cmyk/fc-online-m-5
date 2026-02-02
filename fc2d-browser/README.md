# FC-2D (Browser-only) — Prototype

Mô tả ngắn:
- Game 2D bóng đá chạy hoàn toàn trên trình duyệt (không cần server).
- Player vs CPU: bạn xây đội, đặt chiến thuật, sau đó xem trận mô phỏng với AI "Hard".
- Tất cả dữ liệu (players) được sinh tại client; mặc định sinh 17.000 cầu thủ giả.

Yêu cầu:
- Trình duyệt hiện đại: Chrome / Edge / Firefox.
- Máy tính bình thường để sinh 17k mục có thể mất vài giây.

Cách chạy:
1. Tải 4 file: `index.html`, `style.css`, `app.js`, `README.md` vào cùng 1 thư mục.
2. Mở `index.html` bằng trình duyệt (double-click hoặc kéo thả).
3. Chờ vài giây để hệ thống sinh players.
4. Tạo đội: nhập tên đội, chọn màu, mua cầu thủ từ "Thị trường".
5. Chỉnh chiến thuật trong phần Tactics (Pressing, Width, Tempo, Passing, Def Line).
6. Nhấn "Lưu đội & chiến thuật".
7. Nhấn "Bắt đầu trận" để xem trận mô phỏng (AI Hard).

Gợi ý chơi:
- AI Hard sử dụng tactics và thay người; để thắng, bạn cần:
  - Đội hình cân bằng (atk/pas/def/gk).
  - Stamina tốt; thay người nếu stamina < 20.
  - Chọn passing ngắn khi AI pressing cao.
  - Tăng tempo nếu cần ghi bàn.

Tuning:
- Nếu máy yếu, giảm số cầu thủ khi sinh (ô "Số cầu thủ sinh") để giảm thời gian khởi tạo.
- Nếu muốn match chậm hơn/nhanh hơn, chỉnh `animInterval` / tick delay trong `app.js`.

Pháp lý:
- Dữ liệu cầu thủ ở đây là giả ngẫu nhiên (names generative). Nếu bạn muốn nạp tên thật/historical, hãy tự đảm bảo quyền sử dụng likeness nếu phân phối thương mại.

Muốn mở rộng?
- Thêm lưu / load team (localStorage).
- Phân trang server-side nếu làm rất nhiều players và muốn tải từng phần.
- Thêm điều khiển trực tiếp (player control) — cần client input + server hoặc client-side resolve + prediction.
- Nếu muốn mình đóng gói thành ZIP hoặc tạo repo GitHub, nói mình biết — mình sẽ hướng dẫn từng bước.
