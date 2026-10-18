import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0971642189';
const MONGODB_URI = process.env.MONGODB_URI;

// In-memory admin tokens
const activeAdminTokens = new Set();

// Mongoose Schema for Cloud Database
const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  url: { type: String, required: true },
  category: { type: String, default: 'Tất cả' },
  badge: { type: String, default: 'NEW' },
  createdAt: { type: Date, default: Date.now }
});

const ResourceModel = mongoose.models.Resource || mongoose.model('Resource', ResourceSchema);

// Cached MongoDB Connection for Serverless
let isConnected = false;
async function connectToDatabase() {
  if (isConnected || !MONGODB_URI) return isConnected;
  try {
    const db = await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
    isConnected = db.connections[0].readyState === 1;
    console.log('[DATABASE] Kết nối MongoDB Atlas thành công!');
    return isConnected;
  } catch (err) {
    console.warn('[DATABASE] Không thể kết nối MongoDB:', err.message);
    return false;
  }
}

// Local Fallback Dataset
const defaultResources = [
  {
    id: "res-1",
    title: "Full-Stack Source Code & Projects",
    description: "Kho mã nguồn tổng hợp các dự án Web, Node.js, React và Three.js được tối ưu hóa.",
    category: "Source Code",
    badge: "HOT",
    url: "https://github.com/BTKhang?tab=repositories",
    createdAt: new Date().toISOString()
  },
  {
    id: "res-2",
    title: "Bộ Công Cụ Lập Trình & Dev Tools",
    description: "Tuyển tập các công cụ, extension, script tự động hóa hỗ trợ lập trình viên Software Engineering.",
    category: "Tools",
    badge: "PRO",
    url: "https://github.com/BTKhang",
    createdAt: new Date().toISOString()
  },
  {
    id: "res-3",
    title: "Tài Liệu & Giáo Trình CNTT Đại Học Quy Nhơn (QNU)",
    description: "Bộ tài liệu học tập, slide bài giảng, đề cương và giáo trình Kỹ thuật phần mềm QNU.",
    category: "Tài Liệu",
    badge: "FREE",
    url: "https://zalo.me/0971642189",
    createdAt: new Date().toISOString()
  },
  {
    id: "res-4",
    title: "Kho Asset Đồ Họa 3D, Cyberpunk UI & Wallpaper",
    description: "Gói texture, mô hình 3D, cyber background 4K và icon pack dành cho thiết kế giao diện tương lai.",
    category: "Media",
    badge: "NEW",
    url: "https://www.facebook.com/buitan.khang0206",
    createdAt: new Date().toISOString()
  }
];

let memoryResources = [...defaultResources];

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

// API: System Status
app.get('/api/status', async (req, res) => {
  const dbStatus = await connectToDatabase();
  res.json({
    status: 'ONLINE',
    version: '2.0.0',
    database: dbStatus ? 'MongoDB Atlas (Connected)' : 'Local Memory Store',
    platform: 'Vercel Serverless',
    timestamp: new Date().toISOString()
  });
});

// API: Profile
app.get('/api/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      name: "BÙI TẤN KHANG",
      title: "Software Engineering | Đại Học Quy Nhơn (QNU)",
      avatar: "/avatar.jpg",
      system: "SYSTEM ONLINE: READY FOR CONNECTION | V 2.0"
    }
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
    console.warn('Error reading from DB, using fallback:', err.message);
  }

  // Fallback to memory resources
  res.json({
    success: true,
    data: memoryResources
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
        message: 'Đã lưu tài nguyên vào Cloud Database thành công!',
        data: {
          id: created._id.toString(),
          ...resourceData
        }
      });
    }
  } catch (err) {
    console.warn('Error saving to DB, using fallback:', err.message);
  }

  // Fallback memory store
  const newResource = {
    id: 'res-' + Date.now(),
    ...resourceData
  };
  memoryResources.unshift(newResource);

  res.status(201).json({
    success: true,
    message: 'Đã lưu tài nguyên thành công!',
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
      return res.json({ success: true, message: 'Đã xóa tài nguyên khỏi Cloud Database!' });
    }
  } catch (err) {
    console.warn('Error deleting from DB, using fallback:', err.message);
  }

  memoryResources = memoryResources.filter(r => r.id !== id);
  res.json({ success: true, message: 'Đã xóa tài nguyên thành công!' });
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

// Export default for Vercel Serverless
export default app;
