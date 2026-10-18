# ⚡ BÙI TẤN KHANG - 3D CYBERPUNK BIO & DATA VAULT

Dự án Portfolio & Bio Card giao diện Cyberpunk tương tác 3D thế hệ mới, tích hợp kho tài nguyên chia sẻ (**Resource Data Vault**) và trang quản trị (**Admin Panel**) được bảo mật bằng mật khẩu, xây dựng trên nền tảng **Node.js** + **Three.js (WebGL)**.

---

## 🌟 TÍNH NĂNG NỔI BẬT

### 1. 🪐 Đồ họa 3D Three.js WebGL Thế hệ mới:
- **Hologram 3D Core & Dual Orbiting Rings**: Lõi Icosahedron phát sáng đa sắc cùng 2 vòng lượng tử và 8 vệ tinh lượng tử xoay quỹ đạo thời gian thực.
- **3D Spectrum Visualizer Ring**: Vòng 48 cột quang phổ 3D nhảy động theo dải tần số âm thanh quanh lõi.
- **Floating 3D Crystals**: Các khối tinh thể đa giác 3D (Octahedron, Tetrahedron, Dodecahedron) trôi nổi đa chiều xung quanh không gian.
- **Interactive 3D Click Shockwave**: Khi click chuột vào không gian 3D, một vòng sóng năng lượng lượng tử sẽ phát tán rộng ra.
- **Quantum Starfield & Warp Speed**: 2.800 hạt sao lấp lánh phản hồi chuột và bứt tốc độ ánh sáng (Hyperspace Warp) khi mở cửa hệ thống.
- **Cyber Horizon Undulation**: Mặt sàn lưới số dập dềnh liên tục theo sóng sin.
- **Cyber Spark Trail**: Vệt tia lửa hạt phát sáng bay theo chuyển động của con trỏ chuột.

### 2. 🚪 Hiệu ứng mở ra không gian (Cyber Blast Door Opening):
- Hai cánh cửa chéo (Top-Right & Bottom-Left) phủ nền cyberpunk kết hợp đường viền laser neon.
- Khóa sinh trắc học vân tay trung tâm: bấm nút hoặc cuộn chuột để mở cửa, kích hoạt tiếng xả áp suất khí nén thủy lực và luồng ánh sáng chói lóa.

### 3. 🎴 Thẻ Holographic 3D Tilt HUD:
- Nghiêng 3D theo tọa độ chuột với độ sâu đa lớp (`perspective`, `rotateX`, `rotateY`, `translateZ`).
- Lớp tráng gương cầu vồng (Iridescent Sheen) di chuyển theo góc chiếu của chuột.
- Avatar HUD viền radar quét 2 chiều và hiệu ứng nhiễu số (Glitch) khi rê chuột vào tên BÙI TẤN KHANG.

### 4. 📦 Kho Tài Nguyên Chia Sẻ (Data Vault) & Trang Quản Trị (Admin Panel):
- **Kho tài nguyên**:
  - Hiển thị danh sách liên kết tải mã nguồn, công cụ, tài liệu chọn lọc dạng thẻ 3D.
  - Bộ lọc danh mục: `Tất cả`, `Source Code`, `Tools`, `Tài Liệu`, `Media`.
  - Ô tìm kiếm tức thì theo từ khóa.
- **Trang Quản trị viên (Admin Panel)**:
  - Bấm nút **"TRANG QUẢN TRỊ"** trên góc kho tài nguyên để mở.
  - **Mật khẩu quản trị**: `0971642189`
  - Quản trị viên có thể:
    - Thêm tài nguyên mới (Tiêu đề, Link URL, Danh mục, Badge: HOT / NEW / PRO / FREE, Mô tả).
    - Xem danh sách và Xóa tài nguyên trực tiếp.
    - Dữ liệu được lưu trữ tự động vào file `data/resources.json` qua REST API của Node.js server.

### 5. 🔊 Âm thanh Sci-Fi Synthesizer (Web Audio API):
- Tự động sinh âm thanh cyber blip khi hover/click, tiếng nổ xả thủy lực cơ khí khi mở cửa, và chuông ngân vang chúc mừng.
- Nút bật/tắt âm thanh (`SFX ON/OFF`) kèm biểu tượng sóng âm thanh nhảy động.

### 6. 🎨 Bộ chuyển màu Cyberpunk (Theme Switcher):
- Đổi màu tức thì giữa 3 giao diện: **Cyber Cyan**, **Neon Magenta**, và **Matrix Emerald** (đồng bộ hiệu ứng cả thẻ HUD lẫn vật thể 3D Three.js).

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### 1. Cài đặt thư viện:
```bash
npm install
```

### 2. Chạy ở môi trường phát triển (Development với Hot Reload):
```bash
npm run dev
```
> Trình duyệt mở tại: `http://localhost:5173`

### 3. Đóng gói mã nguồn (Production Build):
```bash
npm run build
```

### 4. Khởi chạy Node.js Server:
```bash
npm start
```
> Server khởi chạy tại: `http://localhost:3000`  
> Mật khẩu Admin: `0971642189`

---

## 🛠️ CẤU TRÚC DỰ ÁN

```
Bio/
├── data/
│   └── resources.json     # File lưu trữ dữ liệu tài nguyên chia sẻ
├── public/                 # Tài nguyên tĩnh (avatar.jpg, cyber_bg.jpg)
├── src/
│   ├── audio.js           # Bộ tạo hiệu ứng âm thanh Sci-Fi (Web Audio API)
│   ├── main.js            # Khởi tạo tương tác, Modal, Kho tài nguyên & Admin
│   ├── scene3d.js         # Động cơ Three.js WebGL (Core 3D, Spectrum, Crystals, Warp)
│   └── style.css          # Giao diện Cyberpunk Glassmorphism & 3D HUD
├── index.html             # Trang chủ giao diện
├── package.json           # Cấu hình dự án Node.js & dependencies
├── server.js              # Node.js Express Server & REST API Backend
└── vite.config.js         # Cấu hình Vite bundler
```
