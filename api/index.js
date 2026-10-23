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

const LogSchema = new mongoose.Schema({
  ip_address: { type: String, default: '' },
  city: { type: String, default: '' },
  country: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  loc_source: { type: String, default: 'ip' }, // 'gps' | 'ip'
  accuracy: { type: String, default: '' },
  user_agent: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});
const LogModel = mongoose.models.AccessLog || mongoose.model('AccessLog', LogSchema);

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

// 3. In-memory Fallback Dataset
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
let memoryLogs = [];
const activeAdminTokens = new Set();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper: Extract clean IP from request
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim().replace(/^::ffff:/, '');
  }
  const remote = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  return remote.replace(/^::ffff:/, '');
}

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

// ============================================================================
// ACCESS TRACKING API (GPS nếu người dùng cho phép / Tọa độ xấp xỉ qua IP nếu từ chối)
// ============================================================================
app.post('/api/track', async (req, res) => {
  const { lat, lon, accuracy, source, userAgent } = req.body;
  const clientIp = getClientIp(req);

  let finalLat = null;
  let finalLon = null;
  let finalCity = 'Unknown';
  let finalCountry = 'Unknown';
  let finalSource = 'ip'; // 'gps' | 'ip'
  let finalAccuracy = 'Xấp xỉ (IP)';

  // 1. Nếu người dùng cho phép chia sẻ vị trí GPS thực tế
  if (source === 'gps' && typeof lat === 'number' && typeof lon === 'number') {
    finalLat = lat;
    finalLon = lon;
    finalSource = 'gps';
    finalAccuracy = accuracy ? `Chính xác (~${Math.round(accuracy)}m)` : 'GPS thiết bị';

    // Lấy thành phố từ Vercel headers nếu có để hiển thị thêm
    if (req.headers['x-vercel-ip-city']) {
      finalCity = decodeURIComponent(req.headers['x-vercel-ip-city']);
    }
    if (req.headers['x-vercel-ip-country']) {
      finalCountry = req.headers['x-vercel-ip-country'];
    }
  } else {
    // 2. Nếu người dùng từ chối GPS hoặc không hỗ trợ: Định vị xấp xỉ qua IP
    finalSource = 'ip';

    // Ưu tiên Vercel Geo Headers
    if (req.headers['x-vercel-ip-latitude'] && req.headers['x-vercel-ip-longitude']) {
      finalLat = parseFloat(req.headers['x-vercel-ip-latitude']) || null;
      finalLon = parseFloat(req.headers['x-vercel-ip-longitude']) || null;
      finalCity = decodeURIComponent(req.headers['x-vercel-ip-city'] || 'Unknown');
      finalCountry = req.headers['x-vercel-ip-country'] || 'Unknown';
      finalAccuracy = 'Xấp xỉ (Vercel CDN)';
    } else if (clientIp && !['127.0.0.1', '::1', 'localhost'].includes(clientIp)) {
      // Gọi API định vị IP ngoài nếu không có header Vercel (ví dụ khi chạy host riêng)
      try {
        const ipRes = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,city,lat,lon`);
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData.status === 'success') {
            finalCity = ipData.city || finalCity;
            finalCountry = ipData.country || finalCountry;
            finalLat = ipData.lat || null;
            finalLon = ipData.lon || null;
            finalAccuracy = 'Xấp xỉ (IP Geo)';
          }
        }
      } catch (e) {
        console.warn('IP Geo lookup error:', e.message);
      }
    }
  }

  const logData = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    ip_address: clientIp || 'Unknown',
    city: finalCity,
    country: finalCountry,
    latitude: finalLat,
    longitude: finalLon,
    loc_source: finalSource,
    accuracy: finalAccuracy,
    user_agent: userAgent || req.headers['user-agent'] || '',
    created_at: new Date().toISOString()
  };

  // Lưu vào Supabase (nếu có bảng access_logs)
  if (supabase) {
    try {
      await supabase.from('access_logs').insert([{
        ip_address: logData.ip_address,
        city: logData.city,
        country: logData.country,
        latitude: logData.latitude,
        longitude: logData.longitude,
        loc_source: logData.loc_source,
        accuracy: logData.accuracy,
        user_agent: logData.user_agent
      }]);
    } catch (err) {
      console.warn('Supabase access_logs insert error:', err.message);
    }
  }

  // Lưu vào MongoDB (nếu có kết nối)
  if (await connectToMongo()) {
    try {
      await LogModel.create(logData);
    } catch (err) {
      console.warn('MongoDB access_logs insert error:', err.message);
    }
  }

  // Lưu vào bộ nhớ tạm
  memoryLogs.unshift(logData);
  if (memoryLogs.length > 100) memoryLogs.pop();

  return res.json({
    success: true,
    data: {
      ip: logData.ip_address,
      loc_source: logData.loc_source,
      city: logData.city,
      country: logData.country
    }
  });
});

// API: Get Access Logs (Admin only)
app.get('/api/admin/logs', requireAdmin, async (req, res) => {
  // 1. Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);

      if (!error && data) {
        const formatted = data.map(item => ({
          id: item.id.toString(),
          ip_address: item.ip_address,
          city: item.city,
          country: item.country,
          latitude: item.latitude,
          longitude: item.longitude,
          loc_source: item.loc_source,
          accuracy: item.accuracy,
          user_agent: item.user_agent,
          created_at: item.created_at
        }));
        return res.json({ success: true, data: formatted });
      }
    } catch (err) {
      console.warn('Supabase access_logs select error:', err.message);
    }
  }

  // 2. MongoDB
  if (await connectToMongo()) {
    try {
      const docs = await LogModel.find().sort({ created_at: -1 }).limit(60);
      const formatted = docs.map(d => ({
        id: d._id.toString(),
        ip_address: d.ip_address,
        city: d.city,
        country: d.country,
        latitude: d.latitude,
        longitude: d.longitude,
        loc_source: d.loc_source,
        accuracy: d.accuracy,
        user_agent: d.user_agent,
        created_at: d.created_at
      }));
      return res.json({ success: true, data: formatted });
    } catch (err) {
      console.warn('MongoDB access_logs select error:', err.message);
    }
  }

  // 3. Fallback memory logs
  return res.json({
    success: true,
    data: memoryLogs
  });
});

// API: Clear Access Logs (Admin only)
app.delete('/api/admin/logs', requireAdmin, async (req, res) => {
  if (supabase) {
    try {
      await supabase.from('access_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {}
  }
  if (await connectToMongo()) {
    try {
      await LogModel.deleteMany({});
    } catch (e) {}
  }
  memoryLogs = [];
  res.json({ success: true, message: 'Đã xóa toàn bộ nhật ký truy cập!' });
});

// ============================================================================
// RESOURCE VAULT API
// ============================================================================
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
