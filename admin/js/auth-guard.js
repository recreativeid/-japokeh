/**
 * Japakeh Post - AUTH GUARD & SESSION TIMEOUT MANAGER
 * Memastikan setiap halaman panel admin hanya dapat diakses setelah login,
 * serta menerapkan batas waktu sesi (maksimal 2 jam aktif & 30 menit batas inaktivitas).
 */

(function() {
  'use strict';

  const isLoginPage = window.location.pathname.includes('login.html');
  const MAX_SESSION_MS = 2 * 60 * 60 * 1000; // 2 Jam batas total sesi aktif
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;   // 30 Menit batas inaktivitas

  // Helper fungsi pengecekan validitas sesi
  function checkSessionValidity() {
    try {
      const token = localStorage.getItem('buser_token');
      const userRaw = localStorage.getItem('buser_user');
      if (!token || !userRaw) return false;

      const now = Date.now();
      const expiresAt = parseInt(localStorage.getItem('buser_session_expires') || '0', 10);
      const lastActivity = parseInt(localStorage.getItem('buser_last_activity') || '0', 10);

      // Jika data sesi belum tercatat batas waktu (misal sisa login lama), anggap kedaluwarsa
      if (!expiresAt || !lastActivity) {
        return false;
      }

      // 1. Cek batas maksimal masa aktif sesi (2 jam)
      if (now > expiresAt) {
        return false;
      }

      // 2. Cek batas inaktivitas (30 menit tanpa aktivitas)
      if (now - lastActivity > IDLE_TIMEOUT_MS) {
        return false;
      }

      // 3. Cek payload token jika ada expired timestamp
      const parts = token.split('.');
      if (parts.length === 2) {
        try {
          const b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(decodeURIComponent(escape(atob(b64))));
          if (payload && payload.exp && (now / 1000) > payload.exp) {
            return false;
          }
        } catch (pe) {}
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  // Helper untuk membersihkan seluruh sesi auth lokal
  function clearAllAuth() {
    try {
      if (window.BuserInfoAPI && typeof window.BuserInfoAPI.clearAuth === 'function') {
        window.BuserInfoAPI.clearAuth();
      } else {
        localStorage.removeItem('buser_token');
        localStorage.removeItem('buser_user');
        localStorage.removeItem('buser_session_created');
        localStorage.removeItem('buser_session_expires');
        localStorage.removeItem('buser_last_activity');
        document.cookie = 'buser_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }
    } catch (e) {}
  }

  // 1. Sinkron Gatekeeper (dijalankan segera di <head> sebelum DOM dirender)
  const isSessionValid = checkSessionValidity();

  if (!isLoginPage) {
    if (!isSessionValid) {
      // Periksa apakah sebelumnya ada token (berarti sesi habis/expired)
      const hadToken = !!localStorage.getItem('buser_token');
      clearAllAuth();
      window.location.replace(hadToken ? 'login.html?expired=1' : 'login.html');
      return;
    }
  } else {
    // Jika di halaman login
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('expired') || urlParams.has('logout')) {
      clearAllAuth();
    } else if (isSessionValid) {
      // Jika sesi masih aktif dan valid, langsung alihkan ke index.html
      window.location.replace('index.html');
      return;
    } else {
      // Jika data sesi rusak atau sudah expired di login page, bersihkan
      clearAllAuth();
    }
  }

  // 2. Verifikasi Asinkron & Activity Listener saat DOM selesai dimuat
  document.addEventListener('DOMContentLoaded', () => {
    if (isLoginPage) return;

    let user = null;
    try {
      user = JSON.parse(localStorage.getItem('buser_user'));
    } catch (e) {
      user = null;
    }

    // A. Perbarui Tampilan Profil Pengguna di Header & Sidebar
    if (user) {
      updateUserInterface(user);
    }

    // B. Pengecekan Integritas Sesi ke Server Backend
    if (window.BuserInfoAPI && window.BuserInfoAPI.me) {
      window.BuserInfoAPI.me().then(serverUser => {
        if (!serverUser && !localStorage.getItem('buser_token')) {
          window.location.replace('login.html?expired=1');
        } else if (serverUser) {
          updateUserInterface(serverUser);
        }
      }).catch(() => {
        // Jika offline atau error jaringan sementara, tetap izinkan sesi lokal berjalan
      });
    }

    // C. Kaitkan Tombol / Link Logout
    bindLogoutHandlers();

    // D. Inisialisasi Detektor Aktivitas Pengguna & Timer Auto-Logout
    initSessionTimeoutWatcher();
  });

  // Fungsi memperbarui UI dengan nama & peran pengguna yang login
  function updateUserInterface(u) {
    const displayName = u.nama_users || u.name || 'Pengguna Redaksi';
    const displayRole = (u.role === 'admin' || u.role === 'Administrator') ? 'Pemimpin Redaksi' : (u.role || 'Redaksi');
    const displayEmail = u.email_users || u.email || 'alb4hri@gmail.com';

    // Cari dan ganti teks nama user di navbar/sidebar
    document.querySelectorAll('.user-display-name, [data-user-name], #sidebar-user-name').forEach(el => {
      el.textContent = displayName;
    });

    // Cari elemen default teks dummy lama dan perbarui
    const nameCandidates = document.querySelectorAll('span, p, h4, div');
    nameCandidates.forEach(el => {
      if (el.children.length === 0 && (el.textContent.trim() === 'Agus Riyadi' || el.textContent.trim() === 'Agus Riyadi, S.Sos., M.I.Kom.' || el.textContent.trim() === 'Al Bahri')) {
        el.textContent = displayName;
      }
      if (el.children.length === 0 && (el.textContent.trim() === 'redaksi@buserinfo.com' || el.textContent.trim() === 'alb4hri@gmail.com') && el.tagName !== 'INPUT') {
        el.textContent = displayEmail;
      }
    });

    document.querySelectorAll('.user-display-role, [data-user-role], #sidebar-user-role').forEach(el => {
      el.textContent = displayRole;
    });

    // Update avatar jika ada
    if (u.avatar && u.avatar.trim() !== '') {
      const avatarSrc = u.avatar.startsWith('http') ? u.avatar : '../' + u.avatar;
      document.querySelectorAll('.user-display-avatar').forEach(el => {
        el.innerHTML = `<img src="${avatarSrc}" alt="${displayName}" class="w-full h-full object-cover rounded-full">`;
      });
    } else {
      const parts = displayName.trim().split(/\s+/);
      const initials = parts.length === 1 ? parts[0].substring(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      document.querySelectorAll('.user-display-avatar').forEach(el => {
        el.textContent = initials || 'RD';
      });
    }
  }

  // Fungsi mengaitkan handler logout pada tombol/link keluar
  function bindLogoutHandlers() {
    const logoutSelectors = [
      'a[href="login.html"]',
      'a[href*="login.html"]',
      '[data-action="logout"]',
      '#btn-logout'
    ];

    document.querySelectorAll(logoutSelectors.join(',')).forEach(btn => {
      if (isLoginPage) return;

      btn.addEventListener('click', function(e) {
        e.preventDefault();
        handleLogoutAction();
      });
    });
  }

  function handleLogoutAction() {
    const performLogout = () => {
      if (window.BuserInfoAPI && window.BuserInfoAPI.logout) {
        window.BuserInfoAPI.logout();
      } else {
        clearAllAuth();
        window.location.replace('login.html');
      }
    };

    if (typeof confirmAction === 'function') {
      confirmAction({
        title: 'Keluar dari Sistem CMS',
        message: 'Apakah Anda yakin ingin mengakhiri sesi kerja editorial ini?',
        confirmText: 'Keluar Sekarang',
        cancelText: 'Tetap di Sini',
        type: 'danger',
        onConfirm: performLogout
      });
    } else if (confirm('Apakah Anda yakin ingin keluar dari sistem admin?')) {
      performLogout();
    }
  }

  // Inisialisasi Detektor Aktivitas Pengguna & Timer Auto-Logout
  function initSessionTimeoutWatcher() {
    let lastRecorded = Date.now();

    // Perbarui waktu aktivitas terakhir (throttled maksimal 1 kali per 10 detik)
    function recordActivity() {
      const now = Date.now();
      if (now - lastRecorded > 10000) {
        lastRecorded = now;
        if (window.BuserInfoAPI && typeof window.BuserInfoAPI.recordActivity === 'function') {
          window.BuserInfoAPI.recordActivity();
        } else {
          try {
            localStorage.setItem('buser_last_activity', now.toString());
          } catch (e) {}
        }
      }
    }

    // Dengarkan aktivitas pengguna
    const userEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    userEvents.forEach(evt => {
      window.addEventListener(evt, recordActivity, { passive: true });
    });

    // Pengecekan berkala setiap 15 detik apakah sesi telah habis
    const checkInterval = setInterval(() => {
      if (!checkSessionValidity()) {
        clearInterval(checkInterval);
        clearAllAuth();
        // Beri tahu pengguna dan redirect ke halaman login
        window.location.replace('login.html?expired=1');
      }
    }, 15000);
  }

  // Ekspos helper ke scope global
  window.BuserInfoAuth = {
    logout: handleLogoutAction,
    isSessionValid: checkSessionValidity,
    getUser() {
      try {
        return JSON.parse(localStorage.getItem('buser_user'));
      } catch (e) {
        return null;
      }
    },
    getRemainingTime() {
      try {
        const now = Date.now();
        const expiresAt = parseInt(localStorage.getItem('buser_session_expires') || '0', 10);
        const lastActivity = parseInt(localStorage.getItem('buser_last_activity') || '0', 10);
        return {
          totalRemainingSeconds: Math.max(0, Math.floor((expiresAt - now) / 1000)),
          idleRemainingSeconds: Math.max(0, Math.floor((IDLE_TIMEOUT_MS - (now - lastActivity)) / 1000))
        };
      } catch (e) {
        return { totalRemainingSeconds: 0, idleRemainingSeconds: 0 };
      }
    }
  };

})();
