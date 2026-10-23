import { CyberScene3D } from './scene3d.js';
import { cyberAudio } from './audio.js';
import confetti from 'canvas-confetti';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize 3D Three.js Scene (with Core, Spectrum Ring, Floating Crystals & Shockwave)
  const canvasContainer = document.getElementById('webgl-canvas-container');
  let scene3d = null;
  try {
    scene3d = new CyberScene3D(canvasContainer);
  } catch (err) {
    console.warn('WebGL initialization fallback:', err);
  }

  // 2. Interactive Cyber Spark Trail on Mouse Move
  const sparkCanvas = document.getElementById('spark-canvas');
  if (sparkCanvas) {
    const sCtx = sparkCanvas.getContext('2d');
    let sw = (sparkCanvas.width = window.innerWidth);
    let sh = (sparkCanvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      sw = sparkCanvas.width = window.innerWidth;
      sh = sparkCanvas.height = window.innerHeight;
    });

    const sparks = [];
    const maxSparks = 60;

    class Spark {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3.5 + 1.5;
        this.vx = (Math.random() - 0.5) * 2.2;
        this.vy = (Math.random() - 0.5) * 2.2;
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.02;
        this.color = Math.random() > 0.3 ? '#00f0ff' : '#d946ef';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        this.size = Math.max(0, this.size - 0.05);
      }

      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    let lastSparkTime = 0;
    window.addEventListener('mousemove', (e) => {
      const now = performance.now();
      if (now - lastSparkTime > 15 && sparks.length < maxSparks) {
        sparks.push(new Spark(e.clientX, e.clientY));
        if (Math.random() > 0.5) {
          sparks.push(new Spark(e.clientX, e.clientY));
        }
        lastSparkTime = now;
      }
    });

    function animateSparks() {
      sCtx.clearRect(0, 0, sw, sh);
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.update();
        s.draw(sCtx);
        if (s.alpha <= 0 || s.size <= 0) {
          sparks.splice(i, 1);
        }
      }
      requestAnimationFrame(animateSparks);
    }
    animateSparks();
  }

  // 3. Matrix Digital Rain Canvas
  const matrixCanvas = document.getElementById('matrix-background');
  if (matrixCanvas) {
    const ctx = matrixCanvas.getContext('2d');
    let w = (matrixCanvas.width = window.innerWidth);
    let h = (matrixCanvas.height = window.innerHeight);
    const fontSize = 14;
    let cols = Math.floor(w / fontSize);
    let ypos = Array(cols).fill(0);
    const chars = '01010101ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<>[]{}#*+=-~/|';

    window.addEventListener('resize', () => {
      w = matrixCanvas.width = window.innerWidth;
      h = matrixCanvas.height = window.innerHeight;
      cols = Math.floor(w / fontSize);
      ypos = Array(cols).fill(0);
    });

    function drawMatrix() {
      ctx.fillStyle = 'rgba(6, 8, 14, 0.08)';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--color-primary').trim() || '#00f0ff';
      ctx.font = `${fontSize}px 'Space Mono', monospace`;

      for (let i = 0; i < cols; i++) {
        const char = chars.charAt(Math.floor(Math.random() * chars.length));
        const x = i * fontSize;
        const y = ypos[i] * fontSize;

        ctx.fillText(char, x, y);

        if (y > h + Math.random() * 8000) {
          ypos[i] = 0;
        } else {
          ypos[i]++;
        }
      }
      requestAnimationFrame(drawMatrix);
    }
    drawMatrix();
  }

  // 4. Loading Progress Bar
  const loadingBar = document.getElementById('loading-bar');
  let loadProgress = 0;
  const loadInterval = setInterval(() => {
    if (loadProgress < 100) {
      loadProgress += 5;
      if (loadingBar) loadingBar.style.width = loadProgress + '%';
    } else {
      clearInterval(loadInterval);
      if (loadingBar) {
        setTimeout(() => {
          loadingBar.style.opacity = '0';
        }, 300);
      }
    }
  }, 35);

  // 5. HIỆU ỨNG MỞ RA 3D (Cyber Blast Door Opening Mechanism)
  const doorContainer = document.getElementById('cyber-door-container');
  const doorCenterLock = document.getElementById('doorCenterLock');
  const welcomeEnterBtn = document.getElementById('welcomeEnterBtn');
  const profileContainer = document.getElementById('profileContainer');

  let isDoorOpened = false;

  function triggerDoorOpen() {
    if (isDoorOpened) return;
    isDoorOpened = true;

    cyberAudio.playDoorOpen();

    if (scene3d) {
      scene3d.enterScene();
    }

    if (doorContainer) {
      doorContainer.classList.add('doors-open');
    }

    if (profileContainer) {
      profileContainer.classList.add('card-enter-anim');
    }

    // Yêu cầu quyền GPS khi người dùng click tương tác mở cửa
    requestGpsLocation();

    setTimeout(() => {
      if (doorContainer) {
        doorContainer.style.display = 'none';
      }
    }, 1400);
  }

  if (welcomeEnterBtn) welcomeEnterBtn.addEventListener('click', triggerDoorOpen);
  if (doorCenterLock) doorCenterLock.addEventListener('click', triggerDoorOpen);

  window.addEventListener('wheel', (e) => {
    if (!isDoorOpened && e.deltaY > 12) {
      triggerDoorOpen();
    }
  }, { passive: true });

  window.addEventListener('touchmove', () => {
    if (!isDoorOpened) {
      triggerDoorOpen();
    }
  }, { passive: true });

  // 5.1. Visitor Location & Real Public IP Tracking (GPS with user consent / Fallback to IP)
  let cachedBrowserIp = null;
  async function fetchBrowserIpData() {
    if (cachedBrowserIp) return cachedBrowserIp;
    try {
      // Truy vấn trực tiếp từ thiết bị người dùng (Đảm bảo đúng IP mạng Việt Nam & không phụ thuộc máy chủ Mỹ)
      const res = await fetch('https://ipwho.is/');
      if (res.ok) {
        const d = await res.json();
        if (d && d.success !== false) {
          cachedBrowserIp = {
            clientIp: d.ip,
            city: d.city,
            country: d.country,
            lat: d.latitude,
            lon: d.longitude
          };
          return cachedBrowserIp;
        }
      }
    } catch (e) {}

    try {
      const res2 = await fetch('https://api.ipify.org?format=json');
      if (res2.ok) {
        const d2 = await res2.json();
        cachedBrowserIp = { clientIp: d2.ip };
        return cachedBrowserIp;
      }
    } catch (e2) {}

    return null;
  }

  // Khởi động lấy IP public từ trình duyệt ngay khi load
  fetchBrowserIpData();

  let hasSentTrack = false;
  let hasSentGps = false;

  async function sendTrackingPayload(payload) {
    try {
      await fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      hasSentTrack = true;
      sessionStorage.setItem('btk_tracked', 'true');
    } catch (err) {}
  }

  // Yêu cầu GPS từ trình duyệt (Kích hoạt từ cử chỉ Click/Touch của người dùng)
  async function requestGpsLocation() {
    if (hasSentGps) return;
    const ipData = (await fetchBrowserIpData()) || {};

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          hasSentGps = true;
          sessionStorage.setItem('btk_gps_granted', 'true');
          sendTrackingPayload({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            source: 'gps',
            clientIp: ipData.clientIp,
            city: ipData.city,
            country: ipData.country,
            userAgent: navigator.userAgent
          });
        },
        (_err) => {
          // Người dùng từ chối cấp GPS -> Dùng tọa độ và IP thực tế Việt Nam từ browser lookup
          if (!hasSentTrack) {
            sendTrackingPayload({
              source: 'ip',
              lat: ipData.lat,
              lon: ipData.lon,
              clientIp: ipData.clientIp,
              city: ipData.city,
              country: ipData.country,
              userAgent: navigator.userAgent
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000
        }
      );
    } else {
      if (!hasSentTrack) {
        sendTrackingPayload({
          source: 'ip',
          lat: ipData.lat,
          lon: ipData.lon,
          clientIp: ipData.clientIp,
          city: ipData.city,
          country: ipData.country,
          userAgent: navigator.userAgent
        });
      }
    }
  }

  // Đăng ký cử chỉ chạm/click đầu tiên để trình duyệt cho phép hiện pop-up GPS hợp lệ
  window.addEventListener('click', () => { requestGpsLocation(); }, { once: true });
  window.addEventListener('touchstart', () => { requestGpsLocation(); }, { once: true });

  // Tự động gửi log IP dự phòng sau 5 giây nếu người dùng không tương tác
  setTimeout(async () => {
    if (!hasSentTrack && !hasSentGps) {
      const ipData = (await fetchBrowserIpData()) || {};
      sendTrackingPayload({
        source: 'ip',
        lat: ipData.lat,
        lon: ipData.lon,
        clientIp: ipData.clientIp,
        city: ipData.city,
        country: ipData.country,
        userAgent: navigator.userAgent
      });
    }
  }, 5000);

  // 6. 3D Holographic Card Tilt with Iridescent Sheen
  const card = document.querySelector('.holo-card-hud');
  if (card) {
    let currentRotateX = 0;
    let currentRotateY = 0;
    let targetRotateX = 0;
    let targetRotateY = 0;

    window.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;

      const offsetX = (e.clientX - cardCenterX) / (window.innerWidth / 2);
      const offsetY = (e.clientY - cardCenterY) / (window.innerHeight / 2);

      targetRotateY = offsetX * 12;
      targetRotateX = -offsetY * 12;

      const sheenX = ((e.clientX - rect.left) / rect.width) * 100;
      const sheenY = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', `${sheenX}%`);
      card.style.setProperty('--mouse-y', `${sheenY}%`);
    });

    function renderCardTilt() {
      currentRotateX += (targetRotateX - currentRotateX) * 0.1;
      currentRotateY += (targetRotateY - currentRotateY) * 0.1;

      card.style.transform = `perspective(1000px) rotateX(${currentRotateX.toFixed(2)}deg) rotateY(${currentRotateY.toFixed(2)}deg)`;
      requestAnimationFrame(renderCardTilt);
    }
    renderCardTilt();

    card.addEventListener('mouseleave', () => {
      targetRotateX = 0;
      targetRotateY = 0;
    });
  }

  // 7. Sound FX & Audio Controller
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundBars = document.querySelector('.sound-bars');
  const soundStatusText = document.getElementById('soundStatusText');

  if (soundToggleBtn) {
    soundToggleBtn.addEventListener('click', () => {
      const isMuted = cyberAudio.toggleMute();
      if (isMuted) {
        if (soundBars) soundBars.classList.remove('active');
        if (soundStatusText) soundStatusText.textContent = 'SFX: OFF';
      } else {
        if (soundBars) soundBars.classList.add('active');
        if (soundStatusText) soundStatusText.textContent = 'SFX: ON';
        cyberAudio.playClick();
      }
    });
  }

  // Add hover & click sound to interactive elements
  function bindAudioTriggers(parent = document) {
    const hoverSoundTargets = parent.querySelectorAll(
      '.social-hud-link, .hud-btn, .welcome-enter-btn, .avatar-image, .modal-action-button, .close-button-cyber, .theme-chip, .door-center-lock, .admin-vault-btn, .category-chip, .resource-action-link, .admin-logout-btn, .admin-del-btn, .admin-tab-btn, .admin-mini-btn, .log-maps-link'
    );
    hoverSoundTargets.forEach((el) => {
      el.removeEventListener('mouseenter', hoverHandler);
      el.removeEventListener('click', clickHandler);
      el.addEventListener('mouseenter', hoverHandler);
      el.addEventListener('click', clickHandler);
    });
  }

  function hoverHandler() { cyberAudio.playHover(); }
  function clickHandler() { cyberAudio.playClick(); }
  bindAudioTriggers();

  // 8. Theme Switcher (Cyan / Magenta / Emerald)
  const themeChips = document.querySelectorAll('.theme-chip');
  themeChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const theme = chip.getAttribute('data-theme');
      if (theme === 'cyan') {
        document.body.removeAttribute('data-theme');
      } else {
        document.body.setAttribute('data-theme', theme);
      }
      if (scene3d) {
        scene3d.setTheme(theme);
      }
      cyberAudio.playClick();
    });
  });

  // 9. Ripple Effect on Buttons
  function bindRipple(parent = document) {
    parent.querySelectorAll('[data-ripple]').forEach((btn) => {
      btn.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const ripple = document.createElement('span');
        ripple.classList.add('ripple-circle');
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        this.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });
  }
  bindRipple();

  // 10. Social Links & Unified Cyber Modal
  const modal = document.getElementById('unifiedModal');
  const closeButton = document.querySelector('.close-button-cyber');
  const modalTitle = document.getElementById('modalTitle');
  const modalInstruction = document.getElementById('modalInstruction');
  const modalDetailsText = document.getElementById('modalDetailsText');
  const modalActionButton = document.getElementById('modalActionButton');
  const emailFormContainer = document.getElementById('emailFormContainer');
  const contactForm = document.getElementById('contactForm');
  const formMessage = document.getElementById('formMessage');
  const formSubmitButton = document.getElementById('formSubmitButton');

  const socialData = {
    'icon-facebook': {
      title: 'KẾT NỐI FACEBOOK',
      details: 'Tên người dùng: Bùi Tấn Khang',
      instruction: "Nhấn 'MỞ LIÊN KẾT' để truy cập trang cá nhân.",
      url: 'https://www.facebook.com/buitan.khang0206',
      isForm: false
    },
    'icon-zalo': {
      title: 'KẾT NỐI ZALO',
      details: 'Số Zalo: 09XX XXX XXX',
      instruction: 'Để bảo mật, vui lòng nhấn mở liên kết để truy cập.',
      url: 'https://zalo.me/0971642189',
      isForm: false
    },
    'icon-email': {
      title: 'GỬI EMAIL TRỰC TIẾP',
      details: 'Email: your.email@example.com',
      instruction: 'Bạn có thể gửi tin nhắn ngay tại đây. Tôi sẽ phản hồi sớm nhất có thể.',
      url: 'mailto:your.email@example.com',
      isForm: true
    },
    'icon-tiktok': {
      title: 'MỞ TIKTOK',
      details: 'Tên tài khoản: ⓘ',
      instruction: 'Vui lòng nhấn mở liên kết để truy cập.',
      url: 'https://tiktok.com/@t.k0206',
      isForm: false
    },
    'icon-discord': {
      title: 'THAM GIA DISCORD',
      details: 'Tên người dùng: kʜᴀɴɢ',
      instruction: 'Vui lòng nhấn mở liên kết để truy cập.',
      url: 'https://discordapp.com/users/818502525991780353',
      isForm: false
    },
    'icon-instagram': {
      title: 'THEO DÕI INSTAGRAM',
      details: 'Tên người dùng: Bùi Tấn Khang',
      instruction: 'Vui lòng nhấn mở liên kết để truy cập.',
      url: 'https://instagram.com/buitan.khang0206',
      isForm: false
    },
    'icon-github': {
      title: 'XEM GITHUB',
      details: 'Tên tài khoản: Bùi Tấn Khang',
      instruction: 'Vui lòng nhấn mở liên kết để truy cập.',
      url: 'https://github.com/BTKhang',
      isForm: false
    }
  };

  const socialLinks = document.querySelectorAll('.social-hud-link');
  socialLinks.forEach((link) => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const iconClass = Array.from(this.classList).find((cls) => cls.startsWith('icon-'));
      const data = socialData[iconClass];

      if (data && modal) {
        cyberAudio.playModal();
        modalTitle.textContent = data.title;
        modalInstruction.textContent = data.instruction;

        if (data.isForm) {
          modalDetailsText.style.display = 'none';
          modalActionButton.style.display = 'none';
          emailFormContainer.style.display = 'block';
          contactForm.reset();
          formMessage.textContent = '';
        } else {
          modalDetailsText.style.display = 'block';
          modalActionButton.style.display = 'block';
          emailFormContainer.style.display = 'none';
          modalDetailsText.textContent = data.details;
          modalActionButton.href = data.url;
        }

        modal.style.display = 'block';
      }
    });
  });

  function closeModal() {
    if (modal) {
      modal.style.display = 'none';
      if (contactForm) contactForm.reset();
      if (formMessage) formMessage.textContent = '';
    }
  }

  if (closeButton) closeButton.addEventListener('click', closeModal);
  window.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeAdminModal();
    }
  });

  // Contact Form Submission
  if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      if (formSubmitButton) {
        formSubmitButton.disabled = true;
        formSubmitButton.textContent = 'ĐANG GỬI...';
      }

      const formData = new FormData(contactForm);

      try {
        const response = await fetch(contactForm.action, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' }
        });

        if (response.ok) {
          cyberAudio.playSuccess();
          confetti({
            particleCount: 90,
            spread: 75,
            origin: { y: 0.6 },
            colors: ['#00f0ff', '#d946ef', '#38bdf8']
          });

          if (formMessage) {
            formMessage.style.color = '#34d399';
            formMessage.textContent = '✓ Email đã được gửi thành công! Cảm ơn bạn.';
          }
          contactForm.reset();
        } else {
          throw new Error('Gửi qua Formspree không thành công.');
        }
      } catch (err) {
        try {
          const fallbackRes = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.get('name'),
              email: formData.get('_replyto'),
              message: formData.get('message')
            })
          });
          if (fallbackRes.ok) {
            cyberAudio.playSuccess();
            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.6 }
            });
            if (formMessage) {
              formMessage.style.color = '#34d399';
              formMessage.textContent = '✓ Tin nhắn đã được gửi qua Node.js Server!';
            }
            contactForm.reset();
          } else {
            throw new Error();
          }
        } catch {
          if (formMessage) {
            formMessage.style.color = '#f43f5e';
            formMessage.textContent = '✕ Gửi thất bại. Vui lòng thử lại sau.';
          }
        }
      } finally {
        setTimeout(() => {
          if (formSubmitButton) {
            formSubmitButton.disabled = false;
            formSubmitButton.textContent = 'GỬI EMAIL';
          }
        }, 2500);
      }
    });
  }

  // ==========================================================================
  // 11. RESOURCE VAULT (KHO TÀI NGUYÊN CHIA SẺ)
  // ==========================================================================
  let allResources = [];
  let currentCategory = 'Tất cả';
  let searchQuery = '';

  const resourceCardsGrid = document.getElementById('resourceCardsGrid');
  const searchInput = document.getElementById('resourceSearchInput');
  const categoryChips = document.querySelectorAll('.category-chip');

  async function fetchResources() {
    try {
      const res = await fetch('/api/resources');
      if (res.ok) {
        const json = await res.json();
        allResources = json.data || [];
        renderResources();
        renderAdminResources();
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách tài nguyên:', err);
    }
  }

  function renderResources() {
    if (!resourceCardsGrid) return;

    let filtered = allResources.filter((item) => {
      const matchCat = currentCategory === 'Tất cả' || item.category === currentCategory;
      const matchSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery) ||
        (item.description && item.description.toLowerCase().includes(searchQuery)) ||
        (item.category && item.category.toLowerCase().includes(searchQuery));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      resourceCardsGrid.innerHTML = `
        <div class="resource-loading-state">
          <i class="fas fa-search" style="font-size: 2rem; opacity: 0.4;"></i>
          <span>KHÔNG TÌM THẤY TÀI NGUYÊN PHÙ HỢP</span>
        </div>
      `;
      return;
    }

    resourceCardsGrid.innerHTML = filtered
      .map(
        (item) => `
        <div class="resource-card" data-id="${item.id}">
          <div class="resource-card-top">
            <div class="resource-card-meta">
              <span class="resource-category-tag">[ ${escapeHtml(item.category || 'Tài nguyên')} ]</span>
              <span class="resource-badge ${item.badge || 'NEW'}">${escapeHtml(item.badge || 'NEW')}</span>
            </div>
            <h4 class="resource-card-title">${escapeHtml(item.title)}</h4>
            <p class="resource-card-desc">${escapeHtml(item.description || 'Không có mô tả chi tiết.')}</p>
          </div>
          <div class="resource-card-bottom">
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="resource-action-link" data-ripple>
              <span><i class="fas fa-external-link-alt"></i> TRUY CẬP LIÊN KẾT</span>
              <i class="fas fa-arrow-right"></i>
            </a>
          </div>
        </div>
      `
      )
      .join('');

    bindAudioTriggers(resourceCardsGrid);
    bindRipple(resourceCardsGrid);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderResources();
    });
  }

  categoryChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      categoryChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.getAttribute('data-category');
      cyberAudio.playClick();
      renderResources();
    });
  });

  fetchResources();

  // ==========================================================================
  // 12. ADMIN MANAGEMENT PANEL (Mật khẩu: 0971642189)
  // ==========================================================================
  const adminModal = document.getElementById('adminModal');
  const openAdminBtn = document.getElementById('openAdminBtn');
  const closeAdminModalBtn = document.getElementById('closeAdminModalBtn');
  const adminAuthSection = document.getElementById('adminAuthSection');
  const adminDashboardSection = document.getElementById('adminDashboardSection');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const adminAuthError = document.getElementById('adminAuthError');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const addResourceForm = document.getElementById('addResourceForm');
  const addResourceMsg = document.getElementById('addResourceMsg');
  const adminResourcesList = document.getElementById('adminResourcesList');
  const adminResourceCount = document.getElementById('adminResourceCount');

  // Admin Navigation Tabs & Logs Elements
  const adminTabResBtn = document.getElementById('adminTabResBtn');
  const adminTabLogsBtn = document.getElementById('adminTabLogsBtn');
  const adminPaneResources = document.getElementById('adminPaneResources');
  const adminPaneLogs = document.getElementById('adminPaneLogs');
  const adminLogsList = document.getElementById('adminLogsList');
  const statTotalLogs = document.getElementById('statTotalLogs');
  const statGpsLogs = document.getElementById('statGpsLogs');
  const statIpLogs = document.getElementById('statIpLogs');
  const refreshLogsBtn = document.getElementById('refreshLogsBtn');
  const clearLogsBtn = document.getElementById('clearLogsBtn');

  let adminToken = localStorage.getItem('btk_admin_token') || sessionStorage.getItem('btk_admin_token') || null;
  let currentAdminTab = 'resources';

  function switchAdminTab(tabName) {
    currentAdminTab = tabName;
    cyberAudio.playClick();

    if (tabName === 'logs') {
      if (adminTabResBtn) adminTabResBtn.classList.remove('active');
      if (adminTabLogsBtn) adminTabLogsBtn.classList.add('active');
      if (adminPaneResources) adminPaneResources.style.display = 'none';
      if (adminPaneLogs) adminPaneLogs.style.display = 'block';
      fetchAdminLogs();
    } else {
      if (adminTabResBtn) adminTabResBtn.classList.add('active');
      if (adminTabLogsBtn) adminTabLogsBtn.classList.remove('active');
      if (adminPaneResources) adminPaneResources.style.display = 'block';
      if (adminPaneLogs) adminPaneLogs.style.display = 'none';
      renderAdminResources();
    }
  }

  if (adminTabResBtn) adminTabResBtn.addEventListener('click', () => switchAdminTab('resources'));
  if (adminTabLogsBtn) adminTabLogsBtn.addEventListener('click', () => switchAdminTab('logs'));

  async function showAdminView() {
    if (adminToken) {
      // Xác thực token với server (Nếu token hết hạn hoặc giả mạo -> yêu cầu đăng nhập lại)
      try {
        const verifyRes = await fetch('/api/admin/verify', {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        if (!verifyRes.ok) {
          adminToken = null;
          localStorage.removeItem('btk_admin_token');
          sessionStorage.removeItem('btk_admin_token');
        }
      } catch (e) {
        // Lỗi mạng tạm thời, giữ nguyên token
      }
    }

    if (adminToken) {
      if (adminAuthSection) adminAuthSection.style.display = 'none';
      if (adminDashboardSection) adminDashboardSection.style.display = 'block';
      switchAdminTab(currentAdminTab || 'resources');
    } else {
      if (adminAuthSection) adminAuthSection.style.display = 'block';
      if (adminDashboardSection) adminDashboardSection.style.display = 'none';
      if (adminPasswordInput) adminPasswordInput.value = '';
      if (adminAuthError) adminAuthError.textContent = '';
    }
    if (adminModal) adminModal.style.display = 'block';
    cyberAudio.playModal();
  }

  function closeAdminModal() {
    if (adminModal) adminModal.style.display = 'none';
    if (addResourceMsg) addResourceMsg.textContent = '';
  }

  if (openAdminBtn) openAdminBtn.addEventListener('click', showAdminView);
  if (closeAdminModalBtn) closeAdminModalBtn.addEventListener('click', closeAdminModal);

  window.addEventListener('click', (e) => {
    if (e.target === adminModal) closeAdminModal();
  });

  // Admin Login
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = adminPasswordInput.value.trim();

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          adminToken = data.token;
          localStorage.setItem('btk_admin_token', adminToken);
          sessionStorage.setItem('btk_admin_token', adminToken);
          cyberAudio.playSuccess();
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
          showAdminView();
        } else {
          cyberAudio.playHover();
          if (adminAuthError) adminAuthError.textContent = data.message || 'Mật khẩu quản trị không chính xác!';
        }
      } catch (err) {
        if (adminAuthError) adminAuthError.textContent = 'Lỗi kết nối máy chủ.';
      }
    });
  }

  // Admin Logout
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', () => {
      adminToken = null;
      localStorage.removeItem('btk_admin_token');
      sessionStorage.removeItem('btk_admin_token');
      cyberAudio.playClick();
      showAdminView();
    });
  }

  // Add Resource
  if (addResourceForm) {
    addResourceForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('resTitleInput').value.trim();
      const url = document.getElementById('resUrlInput').value.trim();
      const category = document.getElementById('resCategoryInput').value;
      const badge = document.getElementById('resBadgeInput').value;
      const description = document.getElementById('resDescInput').value.trim();

      try {
        const res = await fetch('/api/resources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`
          },
          body: JSON.stringify({ title, url, category, badge, description })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          cyberAudio.playSuccess();
          confetti({ particleCount: 60, spread: 60 });
          addResourceForm.reset();
          if (addResourceMsg) {
            addResourceMsg.textContent = '✓ Đã cập nhật tài nguyên thành công lên Web!';
            setTimeout(() => (addResourceMsg.textContent = ''), 3000);
          }
          await fetchResources();
        } else {
          if (addResourceMsg) addResourceMsg.textContent = data.message || 'Lỗi thêm tài nguyên.';
        }
      } catch (err) {
        if (addResourceMsg) addResourceMsg.textContent = 'Lỗi kết nối máy chủ.';
      }
    });
  }

  // Render Admin Resources List
  function renderAdminResources() {
    if (!adminResourcesList) return;
    if (adminResourceCount) adminResourceCount.textContent = allResources.length;

    adminResourcesList.innerHTML = allResources
      .map(
        (item) => `
        <div class="admin-item-row" data-id="${item.id}">
          <div class="admin-item-info">
            <span class="admin-item-title">${escapeHtml(item.title)}</span>
            <span class="admin-item-category">[${escapeHtml(item.category)}] • ${escapeHtml(item.badge || 'NEW')}</span>
          </div>
          <div class="admin-item-actions">
            <a href="${escapeHtml(item.url)}" target="_blank" class="hud-btn" style="padding: 3px 8px; font-size: 0.7rem;" title="Mở">
              <i class="fas fa-external-link-alt"></i>
            </a>
            <button class="admin-del-btn" data-id="${item.id}" title="Xóa tài nguyên">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      `
      )
      .join('');

    // Bind delete clicks
    adminResourcesList.querySelectorAll('.admin-del-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Bạn có chắc chắn muốn xóa tài nguyên này?')) return;

        try {
          const res = await fetch(`/api/resources/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${adminToken}` }
          });
          if (res.ok) {
            cyberAudio.playClick();
            await fetchResources();
          }
        } catch (err) {
          alert('Lỗi xóa tài nguyên');
        }
      });
    });
  }

  // Fetch Admin Access Logs (IP & GPS / Approximate)
  async function fetchAdminLogs() {
    if (!adminToken) return;
    if (adminLogsList) {
      adminLogsList.innerHTML = '<div class="admin-logs-empty"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu truy cập...</div>';
    }

    try {
      const res = await fetch('/api/admin/logs', {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (res.status === 401 || res.status === 403) {
        adminToken = null;
        localStorage.removeItem('btk_admin_token');
        sessionStorage.removeItem('btk_admin_token');
        showAdminView();
        return;
      }
      const result = await res.json();
      if (res.ok && result.success) {
        renderAdminLogs(result.data || []);
      } else {
        if (adminLogsList) {
          adminLogsList.innerHTML = `<div class="admin-logs-empty" style="color: #f87171;">${escapeHtml(result.message || 'Lỗi tải nhật ký.')}</div>`;
        }
      }
    } catch (err) {
      if (adminLogsList) {
        adminLogsList.innerHTML = '<div class="admin-logs-empty" style="color: #f87171;">Lỗi kết nối máy chủ khi lấy nhật ký.</div>';
      }
    }
  }

  // Render Admin Access Logs
  function renderAdminLogs(logs) {
    if (!adminLogsList) return;
    if (statTotalLogs) statTotalLogs.textContent = logs.length;
    const gpsCount = logs.filter((l) => l.loc_source === 'gps').length;
    if (statGpsLogs) statGpsLogs.textContent = gpsCount;
    if (statIpLogs) statIpLogs.textContent = logs.length - gpsCount;

    if (!logs || logs.length === 0) {
      adminLogsList.innerHTML = '<div class="admin-logs-empty"><i class="fas fa-satellite-dish"></i> Chưa có lượt truy cập nào được ghi nhận.</div>';
      return;
    }

    adminLogsList.innerHTML = logs
      .map((log) => {
        const isGps = log.loc_source === 'gps';
        const tagClass = isGps ? 'gps' : 'ip';
        const tagLabel = isGps ? 'GPS THỰC' : 'IP XẤP XỈ';
        const timeStr = log.created_at
          ? new Date(log.created_at).toLocaleString('vi-VN', {
              dateStyle: 'short',
              timeStyle: 'medium'
            })
          : 'Vừa xong';

        let locationDisplay = '';
        if (log.city && log.city !== 'Unknown') {
          locationDisplay += escapeHtml(log.city);
        }
        if (log.country && log.country !== 'Unknown') {
          locationDisplay += (locationDisplay ? ', ' : '') + escapeHtml(log.country);
        }
        if (!locationDisplay) locationDisplay = 'Địa điểm chưa xác định';

        let coordsDisplay = '';
        let mapBtn = '';
        if (typeof log.latitude === 'number' && typeof log.longitude === 'number') {
          coordsDisplay = `<span class="log-coords">[${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}] ${escapeHtml(log.accuracy || '')}</span>`;
          mapBtn = `
            <a href="https://www.google.com/maps?q=${log.latitude},${log.longitude}" target="_blank" rel="noopener noreferrer" class="log-maps-link" title="Xem trên Google Maps">
              <i class="fas fa-external-link-alt"></i> Bản đồ
            </a>
          `;
        }

        const uaSafe = escapeHtml(log.user_agent || 'Không rõ thiết bị');

        return `
          <div class="log-item-card">
            <div class="log-item-header">
              <span class="log-ip"><i class="fas fa-network-wired"></i> ${escapeHtml(log.ip_address || '127.0.0.1')}</span>
              <span class="log-tag ${tagClass}">${tagLabel}</span>
            </div>
            <div class="log-item-location">
              <div class="log-loc-text">
                <i class="fas fa-map-marker-alt"></i>
                <span>${locationDisplay}</span>
                ${coordsDisplay}
              </div>
              ${mapBtn}
            </div>
            <div class="log-item-footer">
              <span class="log-ua" title="${uaSafe}">${uaSafe}</span>
              <span class="log-time"><i class="far fa-clock"></i> ${timeStr}</span>
            </div>
          </div>
        `;
      })
      .join('');

    bindAudioTriggers(adminLogsList);
  }

  // Refresh logs button
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', () => {
      cyberAudio.playClick();
      fetchAdminLogs();
    });
  }

  // Clear all logs button
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', async () => {
      if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử truy cập?')) return;
      try {
        const res = await fetch('/api/admin/logs', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        const result = await res.json();
        if (res.ok && result.success) {
          cyberAudio.playSuccess();
          fetchAdminLogs();
        } else {
          alert(result.message || 'Không thể xóa nhật ký.');
        }
      } catch (err) {
        alert('Lỗi kết nối khi xóa nhật ký.');
      }
    });
  }

  // 13. Real-time Telemetry (Live Clock, Ping)
  const clockEl = document.getElementById('liveClock');
  function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour12: false });
    if (clockEl) clockEl.textContent = timeStr;
  }
  setInterval(updateClock, 1000);
  updateClock();

  const pingEl = document.getElementById('livePing');
  setInterval(() => {
    if (pingEl) {
      const ping = Math.floor(13 + Math.random() * 7);
      pingEl.textContent = `${ping}ms`;
    }
  }, 4000);
});
