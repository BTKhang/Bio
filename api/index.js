import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '0971642189';

// 1. Supabase Cloud Database Config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('[DATABASE] Đã kích hoạt Supabase Client!');
  } catch (err) {
    console.warn('[DATABASE] Lỗi khởi tạo Supabase:', err.message);
  }
}

// 2. MongoDB Atlas Config (Alternative Option)
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
    const db = await mongoose.connect(MONGODB_URI, { bufferCommands: false });
    isMongoConnected = db.connections[0].readyState === 1;
    return isMongoConnected;
  } catch (err) {
    return false;
  }
}

// 3. In-memory / Initial Fallback Dataset
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

// API: System Status
app.get('/api/status', async (req, res) => {
  let dbName = 'Memory / JSON Store';
  if (supabase) {
    dbName = 'Supabase (PostgreSQL)';
  } else if (await connectToMongo()) {
    dbName = 'MongoDB Atlas';
  }

  res.json({
    status: 'ONLINE',
    version: '2.0.0',
    database: dbName,
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
  // 1. Try Supabase
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
      } else if (error) {
        console.warn('Supabase select error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase query error:', err.message);
    }
  }

  // 2. Try MongoDB
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

  // 3. Fallback
  return res.json({
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

  const payload = {
    title: title.trim(),
    description: (description || '').trim(),
    url: url.trim(),
    category: (category || 'Tất cả').trim(),
    badge: (badge || 'NEW').trim().toUpperCase()
  };

  // 1. Save to Supabase
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
          message: 'Đã lưu tài nguyên vào Supabase Database thành công!',
          data: {
            id: data.id.toString(),
            ...payload,
            createdAt: data.created_at
          }
        });
      } else if (error) {
        console.warn('Supabase insert error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase insert exception:', err.message);
    }
  }

  // 2. Save to MongoDB
  if (await connectToMongo()) {
    try {
      const created = await ResourceModel.create({
        ...payload,
        createdAt: new Date()
      });
      return res.status(201).json({
        success: true,
        message: 'Đã lưu tài nguyên vào MongoDB Atlas thành công!',
        data: {
          id: created._id.toString(),
          ...payload,
          createdAt: created.createdAt
        }
      });
    } catch (err) {
      console.warn('MongoDB insert exception:', err.message);
    }
  }

  // 3. Fallback memory save
  const newResource = {
    id: 'res-' + Date.now(),
    ...payload,
    createdAt: new Date().toISOString()
  };
  memoryResources.unshift(newResource);

  return res.status(201).json({
    success: true,
    message: 'Đã lưu tài nguyên thành công!',
    data: newResource
  });
});

// API: Delete Resource (Admin only)
app.delete('/api/resources/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  // 1. Delete from Supabase
  if (supabase) {
    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', id);

      if (!error) {
        return res.json({ success: true, message: 'Đã xóa tài nguyên khỏi Supabase Database!' });
      }
    } catch (err) {
      console.warn('Supabase delete error:', err.message);
    }
  }

  // 2. Delete from MongoDB
  if (await connectToMongo()) {
    try {
      await ResourceModel.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Đã xóa tài nguyên khỏi MongoDB Atlas!' });
    } catch (err) {
      console.warn('MongoDB delete error:', err.message);
    }
  }

  // 3. Fallback memory delete
  memoryResources = memoryResources.filter(r => r.id !== id);
  return res.json({ success: true, message: 'Đã xóa tài nguyên thành công!' });
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
