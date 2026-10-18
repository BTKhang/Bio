import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0971642189';
const MONGODB_URI = process.env.MONGODB_URI;

// In-memory admin tokens
const activeAdminTokens = new Set();

// Mongoose Schema for MongoDB Atlas
const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  url: { type: String, required: true },
  category: { type: String, default: 'Tất cả' },
  badge: { type: String, default: 'NEW' },
  createdAt: { type: Date, default: Date.now }
});

const ResourceModel = mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);

let isConnected = false;
async function connectToDatabase() {
  if (isConnected || !MONGODB_URI) return isConnected;
  try {
    const db = await mongoose.connect(MONGODB_URI);
    isConnected = db.connections[0].readyState === 1;
    console.log('[DATABASE] Kết nối MongoDB Atlas thành công!');
    return isConnected;
  } catch (err) {
    console.warn('[DATABASE] Không kết nối được MongoDB, sử dụng file JSON cục bộ:', err.message);
    return false;
  }
}

// Local JSON File Fallback
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

function getLocalResources() {
  ensureResourcesFile();
  try {
    const raw = fs.readFileSync(RESOURCES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveLocalResources(list) {
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
  system: "SYSTEM ONLINE: READY FOR CONNECTION | V 2.0"
};

// API: System Status
app.get('/api/status', async (req, res) => {
  const hasDb = await connectToDatabase();
  res.json({
    status: 'ONLINE',
    version: '2.0.0',
    database: hasDb ? 'MongoDB Atlas' : 'Local JSON File',
    uptime: Math.floor(process.uptime()),
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
app.get('/api/resources', async (req, res) => {
  try {
    const hasDb = await connectToDatabase();
    if (hasDb) {
      const docs = await ResourceModel.find().sort({ createdAt: -1 });
      const formatted = docs.map(d => ({
        id: d._id.toString(),
        title: d.title,
        description: d.description,
        url: d.url,
        category: d.category,
        badge: d.badge,
        createdAt: d.createdAt
      }));
      return res.json({ success: true, data: formatted });
    }
  } catch (err) {
    console.warn('MongoDB query fallback:', err.message);
  }

  // Fallback to local resources
  const resources = getLocalResources();
  res.json({
    success: true,
    data: resources
  });
});

// API: Add Resource (Admin only)
app.post('/api/resources', requireAdmin, async (req, res) => {
  const { title, description, url, category, badge } = req.body;

  if (!title || !url) {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng cung cấp tối thiểu Tiêu đề và Link tài nguyên.'
    });
  }

  const resourceData = {
    title: title.trim(),
    description: (description || '').trim(),
    url: url.trim(),
    category: (category || 'Tất cả').trim(),
    badge: (badge || 'NEW').trim().toUpperCase(),
    createdAt: new Date().toISOString()
  };

  try {
    const hasDb = await connectToDatabase();
    if (hasDb) {
      const created = await ResourceModel.create(resourceData);
      return res.status(201).json({
        success: true,
        message: 'Đã lưu tài nguyên vào MongoDB Atlas!',
        data: {
          id: created._id.toString(),
          ...resourceData
        }
      });
    }
  } catch (err) {
    console.warn('MongoDB insert fallback:', err.message);
  }

  // Fallback to local JSON
  const resources = getLocalResources();
  const newResource = {
    id: 'res-' + Date.now(),
    ...resourceData
  };
  resources.unshift(newResource);
  saveLocalResources(resources);

  res.status(201).json({
    success: true,
    message: 'Đã thêm tài nguyên mới thành công!',
    data: newResource
  });
});

// API: Delete Resource (Admin only)
app.delete('/api/resources/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const hasDb = await connectToDatabase();
    if (hasDb) {
      await ResourceModel.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Đã xóa tài nguyên khỏi MongoDB Atlas!' });
    }
  } catch (err) {
    console.warn('MongoDB delete fallback:', err.message);
  }

  // Fallback to local JSON
  const resources = getLocalResources();
  const filtered = resources.filter(r => r.id !== id);
  saveLocalResources(filtered);

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
║  • Admin Auth:        PROTECTED (PASSWORD SECURED)         ║
║  • Database:          ${MONGODB_URI ? 'MongoDB Atlas' : 'Local JSON'}
╚════════════════════════════════════════════════════════════╝
  `);
});
