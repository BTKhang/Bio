import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0971642189';

// 1. Supabase Client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[DATABASE] Đã kích hoạt Supabase Client!');
  } catch (err) {
    console.warn('[DATABASE] Lỗi Supabase:', err.message);
  }
}

// 2. MongoDB Atlas (Optional)
const MONGODB_URI = process.env.MONGODB_URI;
const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  url: { type: String, required: true },
  category: { type: String, default: 'Tất cả' },
  badge: { type: String, default: 'NEW' },
  createdAt: { type: Date, default: Date.now }
});
const ResourceModel = mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);

let isMongoConnected = false;
async function connectToMongo() {
  if (isMongoConnected || !MONGODB_URI) return isMongoConnected;
  try {
    const db = await mongoose.connect(MONGODB_URI);
    isMongoConnected = db.connections[0].readyState === 1;
    return isMongoConnected;
  } catch (err) {
    return false;
  }
}

// 3. Local JSON Fallback
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

// In-memory admin tokens
const activeAdminTokens = new Set();

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
  let dbName = 'Local JSON File';
  if (supabase) {
    dbName = 'Supabase (PostgreSQL)';
  } else if (await connectToMongo()) {
    dbName = 'MongoDB Atlas';
  }

  res.json({
    status: 'ONLINE',
    version: '2.0.0',
    database: dbName,
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
  // 1. Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted = data.map(item => ({
          id: item.id.toString(),
          title: item.title,
          description: item.description,
          url: item.url,
          category: item.category,
          badge: item.badge,
          createdAt: item.created_at
        }));
        return res.json({ success: true, data: formatted });
      }
    } catch (err) {
      console.warn('Supabase select error:', err.message);
    }
  }

  // 2. MongoDB
  if (await connectToMongo()) {
    try {
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
    } catch (err) {
      console.warn('MongoDB query error:', err.message);
    }
  }

  // 3. Local JSON fallback
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

  const payload = {
    title: title.trim(),
    description: (description || '').trim(),
    url: url.trim(),
    category: (category || 'Tất cả').trim(),
    badge: (badge || 'NEW').trim().toUpperCase()
  };

  // 1. Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('resources')
        .insert([payload])
        .select()
        .single();

      if (!error && data) {
        return res.status(201).json({
          success: true,
          message: 'Đã lưu tài nguyên vào Supabase Database!',
          data: {
            id: data.id.toString(),
            ...payload,
            createdAt: data.created_at
          }
        });
      }
    } catch (err) {
      console.warn('Supabase insert error:', err.message);
    }
  }

  // 2. MongoDB
  if (await connectToMongo()) {
    try {
      const created = await ResourceModel.create({
        ...payload,
        createdAt: new Date()
      });
      return res.status(201).json({
        success: true,
        message: 'Đã lưu tài nguyên vào MongoDB Atlas!',
        data: {
          id: created._id.toString(),
          ...payload,
          createdAt: created.createdAt
        }
      });
    } catch (err) {
      console.warn('MongoDB insert error:', err.message);
    }
  }

  // 3. Local JSON
  const resources = getLocalResources();
  const newResource = {
    id: 'res-' + Date.now(),
    ...payload,
    createdAt: new Date().toISOString()
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

  // 1. Supabase
  if (supabase) {
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (!error) {
        return res.json({ success: true, message: 'Đã xóa tài nguyên khỏi Supabase!' });
      }
    } catch (err) {
      console.warn('Supabase delete error:', err.message);
    }
  }

  // 2. MongoDB
  if (await connectToMongo()) {
    try {
      await ResourceModel.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Đã xóa tài nguyên khỏi MongoDB Atlas!' });
    } catch (err) {
      console.warn('MongoDB delete error:', err.message);
    }
  }

  // 3. Local JSON
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
  let activeDb = 'Local JSON';
  if (SUPABASE_URL && SUPABASE_KEY) activeDb = 'Supabase (PostgreSQL)';
  else if (MONGODB_URI) activeDb = 'MongoDB Atlas';

  console.log(`
╔════════════════════════════════════════════════════════════╗
║             ⚡ BÙI TẤN KHANG - BIO 3D HUD ⚡                ║
║                     NODE.JS SERVER                         ║
╠════════════════════════════════════════════════════════════╣
║  • Server running on: http://localhost:${PORT}             ║
║  • Health check:      http://localhost:${PORT}/health      ║
║  • API Resources:     http://localhost:${PORT}/api/resources
║  • Admin Auth:        PROTECTED (PASSWORD SECURED)         ║
║  • Database:          ${activeDb}
╚════════════════════════════════════════════════════════════╝
  `);
});
