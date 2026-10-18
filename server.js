import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0971642189';

// In-memory admin tokens
const activeAdminTokens = new Set();

// Resources File Path
const DATA_DIR = path.join(__dirname, 'data');
const RESOURCES_FILE = path.join(DATA_DIR, 'resources.json');

function ensureResourcesFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RESOURCES_FILE)) {
    fs.writeFileSync(RESOURCES_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function getResources() {
  ensureResourcesFile();
  try {
    const raw = fs.readFileSync(RESOURCES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveResources(list) {
  ensureResourcesFile();
  fs.writeFileSync(RESOURCES_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth middleware for admin operations
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Yêu cầu quyền quản trị viên (Admin Token).' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!activeAdminTokens.has(token)) {
    return res.status(403).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }

  next();
}

// Profile data
const profileData = {
  name: "BÙI TẤN KHANG",
  title: "Software Engineering | Đại Học Quy Nhơn (QNU)",
  avatar: "/avatar.jpg",
  system: "SYSTEM ONLINE: READY FOR CONNECTION | V 1.0",
  socials: [
    {
      id: "icon-facebook",
      name: "FACEBOOK",
      code: "FB-01",
      url: "https://www.facebook.com/buitan.khang0206",
      details: "Tên người dùng: Bùi Tấn Khang",
      instruction: "Nhấn 'MỞ LIÊN KẾT' để truy cập trang cá nhân.",
      isForm: false
    },
    {
      id: "icon-zalo",
      name: "ZALO",
      code: "ZL-02",
      url: "https://zalo.me/0971642189",
      details: "Số Zalo: 09XX XXX XXX",
      instruction: "Để bảo mật, vui lòng nhấn mở liên kết để truy cập.",
      isForm: false
    },
    {
      id: "icon-email",
      name: "EMAIL",
      code: "EM-03",
      url: "mailto:your.email@example.com",
      details: "Email: your.email@example.com",
      instruction: "Bạn có thể gửi tin nhắn ngay tại đây. Tôi sẽ phản hồi sớm nhất có thể.",
      isForm: true,
      formspreeEndpoint: "https://formspree.io/f/xkgdeolq"
    },
    {
      id: "icon-tiktok",
      name: "TIKTOK",
      code: "TT-04",
      url: "https://tiktok.com/@t.k0206",
      details: "Tên tài khoản: ⓘ",
      instruction: "Vui lòng nhấn mở liên kết để truy cập.",
      isForm: false
    },
    {
      id: "icon-discord",
      name: "DISCORD",
      code: "DC-05",
      url: "https://discordapp.com/users/818502525991780353",
      details: "Tên người dùng: kʜᴀɴɢ",
      instruction: "Vui lòng nhấn mở liên kết để truy cập.",
      isForm: false
    },
    {
      id: "icon-instagram",
      name: "INSTAGRAM",
      code: "IG-06",
      url: "https://instagram.com/buitan.khang0206",
      details: "Tên người dùng: Bùi Tấn Khang",
      instruction: "Vui lòng nhấn mở liên kết để truy cập.",
      isForm: false
    },
    {
      id: "icon-github",
      name: "GITHUB",
      code: "GH-07",
      url: "https://github.com/BTKhang",
      details: "Tên tài khoản: Bùi Tấn Khang",
      instruction: "Vui lòng nhấn mở liên kết để truy cập.",
      isForm: false
    }
  ]
};

// API: System Status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    memoryUsage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    timestamp: new Date().toISOString()
  });
});

// API: Profile
app.get('/api/profile', (req, res) => {
  res.json({
    success: true,
    data: profileData
  });
});

// API: Admin Authentication (Password: 0971642189)
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!password || String(password).trim() !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      message: 'Mật khẩu quản trị viên không chính xác!'
    });
  }

  const token = 'btk_' + crypto.randomBytes(24).toString('hex');
  activeAdminTokens.add(token);

  return res.json({
    success: true,
    message: 'Đăng nhập trang quản trị thành công!',
    token
  });
});

// API: Verify Admin Token
app.get('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ success: true, message: 'Admin session hợp lệ.' });
});

// API: Get Resources (Public)
app.get('/api/resources', (req, res) => {
  const resources = getResources();
  res.json({
    success: true,
    data: resources
  });
});

// API: Add Resource (Admin only)
app.post('/api/resources', requireAdmin, (req, res) => {
  const { title, description, url, category, badge } = req.body;

  if (!title || !url) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp tối thiểu Tiêu đề và Link tài nguyên.'
    });
  }

  const resources = getResources();
  const newResource = {
    id: 'res-' + Date.now(),
    title: title.trim(),
    description: (description || '').trim(),
    url: url.trim(),
    category: (category || 'Tất cả').trim(),
    badge: (badge || 'NEW').trim().toUpperCase(),
    createdAt: new Date().toISOString()
  };

  resources.unshift(newResource);
  saveResources(resources);

  res.status(201).json({
    success: true,
    message: 'Đã thêm tài nguyên mới thành công!',
    data: newResource
  });
});

// API: Update Resource (Admin only)
app.put('/api/resources/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, description, url, category, badge } = req.body;

  const resources = getResources();
  const idx = resources.findIndex(r => r.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài nguyên để cập nhật.' });
  }

  resources[idx] = {
    ...resources[idx],
    title: title ? title.trim() : resources[idx].title,
    description: description !== undefined ? description.trim() : resources[idx].description,
    url: url ? url.trim() : resources[idx].url,
    category: category ? category.trim() : resources[idx].category,
    badge: badge ? badge.trim().toUpperCase() : resources[idx].badge,
    updatedAt: new Date().toISOString()
  };

  saveResources(resources);

  res.json({
    success: true,
    message: 'Cập nhật tài nguyên thành công!',
    data: resources[idx]
  });
});

// API: Delete Resource (Admin only)
app.delete('/api/resources/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const resources = getResources();
  const filtered = resources.filter(r => r.id !== id);

  if (filtered.length === resources.length) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy tài nguyên để xóa.' });
  }

  saveResources(filtered);

  res.json({
    success: true,
    message: 'Đã xóa tài nguyên thành công!'
  });
});

// Direct contact endpoint
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng điền đầy đủ Tên, Email và Nội dung tin nhắn.'
    });
  }

  return res.json({
    success: true,
    message: 'Tin nhắn đã được tiếp nhận thành công!'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Serve frontend assets
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.use(express.static(__dirname));
  app.use('/public', express.static(path.join(__dirname, 'public')));
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║             ⚡ BÙI TẤN KHANG - BIO 3D HUD ⚡                ║
║                     NODE.JS SERVER                         ║
╠════════════════════════════════════════════════════════════╣
║  • Server running on: http://localhost:${PORT}             ║
║  • Health check:      http://localhost:${PORT}/health      ║
║  • API Resources:     http://localhost:${PORT}/api/resources
║  • Admin Password:    0971642189                           ║
╚════════════════════════════════════════════════════════════╝
  `);
});
