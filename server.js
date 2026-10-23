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

const LogSchema = new mongoose.Schema({
  ip_address: { type: String, default: '' },
  city: { type: String, default: '' },
  country: { type: String, default: '' },
  latitude: { type: Number, default: null },
  longitude: { type: Number, default: null },
  loc_source: { type: String, default: 'ip' },
  accuracy: { type: String, default: '' },
  user_agent: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});
const LogModel = mongoose.models.AccessLog || mongoose.model('AccessLog', LogSchema);

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
const LOGS_FILE = path.join(DATA_DIR, 'access_logs.json');

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(RESOURCES_FILE)) {
    fs.writeFileSync(RESOURCES_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!fs.existsSync(LOGS_FILE)) {
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function getLocalResources() {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(RESOURCES_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveLocalResources(list) {
  ensureDataFiles();
  fs.writeFileSync(RESOURCES_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

function getLocalLogs() {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(LOGS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function saveLocalLogs(list) {
  ensureDataFiles();
  fs.writeFileSync(LOGS_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

// ============================================================================
// STATELESS CRYPTOGRAPHIC ADMIN AUTHENTICATION (HMAC-SHA256)
// ============================================================================
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'btk_secret_vault_0971642189_2026';

function generateAdminToken() {
  const payload = {
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // Có hiệu lực 7 ngày
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', ADMIN_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', ADMIN_SECRET).update(data).digest('base64url');
  if (signature !== expectedSig) return false;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return false;
    return payload.role === 'admin';
  } catch (err) {
    return false;
  }
}

// Helper: Extract clean IP from request
function getClientIp(req, clientProvidedIp) {
  if (clientProvidedIp && typeof clientProvidedIp === 'string') {
    const clean = clientProvidedIp.trim().replace(/^::ffff:/, '');
    if (clean && !['127.0.0.1', 'localhost', '::1'].includes(clean) && !clean.startsWith('192.168.') && !clean.startsWith('10.')) {
      return clean;
    }
  }
  if (req.headers['x-real-ip']) {
    return String(req.headers['x-real-ip']).trim().replace(/^::ffff:/, '');
  }
  if (req.headers['cf-connecting-ip']) {
    return String(req.headers['cf-connecting-ip']).trim().replace(/^::ffff:/, '');
  }
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim().replace(/^::ffff:/, '');
  }
  const remote = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  return remote.replace(/^::ffff:/, '');
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
  if (!verifyAdminToken(token)) {
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

  // Stateless HMAC Token
  const token = generateAdminToken();

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
  const { lat, lon, accuracy, source, userAgent, clientIp: bodyIp, city: bodyCity, country: bodyCountry } = req.body;
  const clientIp = getClientIp(req, bodyIp);

  let finalLat = null;
  let finalLon = null;
  let finalCity = bodyCity || 'Unknown';
  let finalCountry = bodyCountry || 'Unknown';
  let finalSource = source === 'gps' ? 'gps' : 'ip';
  let finalAccuracy = 'Xấp xỉ (IP)';

  // 1. Người dùng cấp quyền GPS
  if (source === 'gps' && typeof lat === 'number' && typeof lon === 'number') {
    finalLat = lat;
    finalLon = lon;
    finalSource = 'gps';
    finalAccuracy = accuracy ? `Chính xác (~${Math.round(accuracy)}m)` : 'GPS thiết bị';

    if (!finalCity || finalCity === 'Unknown') {
      if (req.headers['x-vercel-ip-city']) {
        finalCity = decodeURIComponent(req.headers['x-vercel-ip-city']);
      }
    }
    if (!finalCountry || finalCountry === 'Unknown') {
      if (req.headers['x-vercel-ip-country']) {
        finalCountry = req.headers['x-vercel-ip-country'];
      }
    }
  } else {
    // 2. Người dùng từ chối GPS hoặc không hỗ trợ: Định vị xấp xỉ qua IP
    finalSource = 'ip';

    // Ưu tiên dữ liệu định vị IP từ client device
    if (typeof lat === 'number' && typeof lon === 'number') {
      finalLat = lat;
      finalLon = lon;
      finalAccuracy = 'Xấp xỉ (IP Thiết bị)';
    } else if (clientIp && !['127.0.0.1', '::1', 'localhost'].includes(clientIp)) {
      try {
        const ipRes = await fetch(`https://ipwho.is/${clientIp}`);
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData && ipData.success !== false) {
            finalCity = ipData.city || finalCity;
            finalCountry = ipData.country || finalCountry;
            finalLat = ipData.latitude || null;
            finalLon = ipData.longitude || null;
            finalAccuracy = 'Xấp xỉ (IP Geo)';
          }
        }
      } catch (e) {
        console.warn('IP Geo lookup error:', e.message);
      }
    }

    if (finalLat === null && req.headers['x-vercel-ip-latitude'] && req.headers['x-vercel-ip-longitude']) {
      finalLat = parseFloat(req.headers['x-vercel-ip-latitude']) || null;
      finalLon = parseFloat(req.headers['x-vercel-ip-longitude']) || null;
      if (finalCity === 'Unknown') finalCity = decodeURIComponent(req.headers['x-vercel-ip-city'] || 'Unknown');
      if (finalCountry === 'Unknown') finalCountry = req.headers['x-vercel-ip-country'] || 'Unknown';
      finalAccuracy = 'Xấp xỉ (Vercel CDN)';
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

  // 1. Supabase
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

  // 2. MongoDB
  if (await connectToMongo()) {
    try {
      await LogModel.create(logData);
    } catch (err) {
      console.warn('MongoDB access_logs insert error:', err.message);
    }
  }

  // 3. Local JSON
  const localLogs = getLocalLogs();
  localLogs.unshift(logData);
  if (localLogs.length > 100) localLogs.pop();
  saveLocalLogs(localLogs);

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

  // 3. Local JSON
  const localLogs = getLocalLogs();
  return res.json({
    success: true,
    data: localLogs
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
  saveLocalLogs([]);
  res.json({ success: true, message: 'Đã xóa toàn bộ nhật ký truy cập!' });
});

// ============================================================================
// RESOURCE VAULT API
// ============================================================================
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
║  • API Track Visitors: http://localhost:${PORT}/api/track   ║
║  • Admin Auth:        PROTECTED (PASSWORD SECURED)         ║
║  • Database:          ${activeDb}
╚════════════════════════════════════════════════════════════╝
  `);
});
