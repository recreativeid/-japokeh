/**
 * Japakeh Post - API CLIENT CONNECTOR
 * Menghubungkan Frontend Website dan Admin ke REST API PHP / MySQL
 */

const API_BASE_URL = (function() {
  // Otomatis deteksi base URL apakah dibuka dari localhost:8000, xampp (localhost/...), atau live server
  const origin = window.location.origin;
  const path = window.location.pathname;
  
  if (path.includes('/admin/')) {
    return '../api';
  }
  return 'api';
})();

const BuserInfoAPI = {
  // --- Konfigurasi Batas Waktu Sesi (Session Timeout) ---
  SESSION_CONFIG: {
    MAX_LIFETIME_MS: 2 * 60 * 60 * 1000, // 2 jam batas maksimal sesi aktif
    IDLE_TIMEOUT_MS: 30 * 60 * 1000,    // 30 menit batas inaktivitas
  },

  // Periksa apakah sesi saat ini masih valid dan belum kedaluwarsa
  isSessionValid() {
    try {
      const token = localStorage.getItem('buser_token');
      const user = localStorage.getItem('buser_user');
      if (!token || !user) return false;

      const now = Date.now();
      const expiresAt = parseInt(localStorage.getItem('buser_session_expires') || '0', 10);
      const lastActivity = parseInt(localStorage.getItem('buser_last_activity') || '0', 10);

      // Jika data sesi belum memiliki timestamp kedaluwarsa, anggap kedaluwarsa
      if (!expiresAt || !lastActivity) {
        return false;
      }

      // Periksa batas maksimal masa aktif sesi (2 jam)
      if (now > expiresAt) {
        return false;
      }

      // Periksa batas inaktivitas (30 menit)
      if (now - lastActivity > this.SESSION_CONFIG.IDLE_TIMEOUT_MS) {
        return false;
      }

      // Periksa payload token JWT jika ada exp
      try {
        const parts = token.split('.');
        if (parts.length === 2) {
          const b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(decodeURIComponent(escape(atob(b64))));
          if (payload && payload.exp && (now / 1000) > payload.exp) {
            return false;
          }
        }
      } catch (pe) {}

      return true;
    } catch (e) {
      return false;
    }
  },

  // Perbarui waktu aktivitas terakhir pengguna
  recordActivity() {
    try {
      const token = localStorage.getItem('buser_token');
      const expiresAt = parseInt(localStorage.getItem('buser_session_expires') || '0', 10);
      const now = Date.now();
      if (token && expiresAt && now < expiresAt) {
        localStorage.setItem('buser_last_activity', now.toString());
      }
    } catch (e) {}
  },

  // --- Autentikasi Helpers ---
  getToken() {
    try {
      if (!this.isSessionValid()) {
        if (localStorage.getItem('buser_token')) {
          this.clearAuth();
        }
        return null;
      }
      const localToken = localStorage.getItem('buser_token');
      if (localToken) return localToken;
      // Fallback ke cookie jika ada
      const match = document.cookie.match(/(?:^|;\s*)buser_token=([^;]*)/);
      return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
      return null;
    }
  },

  getUser() {
    try {
      if (!this.isSessionValid()) {
        if (localStorage.getItem('buser_user')) {
          this.clearAuth();
        }
        return null;
      }
      const raw = localStorage.getItem('buser_user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setAuth(token, user, expiresInSeconds) {
    try {
      const now = Date.now();
      const lifetimeMs = (typeof expiresInSeconds === 'number' && expiresInSeconds > 0)
        ? expiresInSeconds * 1000
        : this.SESSION_CONFIG.MAX_LIFETIME_MS;
      const expiresAt = now + lifetimeMs;

      if (token) {
        localStorage.setItem('buser_token', token);
        localStorage.setItem('buser_session_created', now.toString());
        localStorage.setItem('buser_session_expires', expiresAt.toString());
        localStorage.setItem('buser_last_activity', now.toString());

        // Cookie sesi dengan batas waktu (bukan persisten 30 hari)
        const cookieMaxAge = Math.floor(lifetimeMs / 1000);
        document.cookie = `buser_token=${encodeURIComponent(token)}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`;
      }
      if (user) localStorage.setItem('buser_user', JSON.stringify(user));
    } catch (e) {}
  },

  clearAuth() {
    try {
      localStorage.removeItem('buser_token');
      localStorage.removeItem('buser_user');
      localStorage.removeItem('buser_session_created');
      localStorage.removeItem('buser_session_expires');
      localStorage.removeItem('buser_last_activity');
      document.cookie = 'buser_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    } catch (e) {}
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  getAuthHeaders(extra = {}) {
    const headers = { ...extra };
    const token = this.getToken();
    if (token) {
      this.recordActivity(); // Rekam aktivitas aktif
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-Authorization'] = `Bearer ${token}`;
      headers['X-Token'] = token;
    }
    return headers;
  },

  // Helper untuk intercept response 401 pada admin panel
  handleUnauthorized(status) {
    if (status === 401) {
      const path = window.location.pathname;
      if (path.includes('/admin/') && !path.includes('login.html')) {
        this.clearAuth();
        window.location.replace('login.html?expired=1');
      }
    }
  },

  // --- Autentikasi Endpoints ---
  async login(email, password) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth.php?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        this.setAuth(json.data.token, json.data.user, json.data.expires_in);
      }
      return json;
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal login:', err);
      return { status: 'error', message: err.message || 'Gagal terhubung ke server autentikasi' };
    }
  },

  async logout() {
    try {
      await fetch(`${API_BASE_URL}/auth.php?action=logout`, {
        method: 'GET',
        credentials: 'include',
        headers: this.getAuthHeaders()
      });
    } catch (e) {
      // Abaikan jika network error saat logout
    } finally {
      this.clearAuth();
      if (window.location.pathname.includes('/admin/')) {
        window.location.replace('login.html');
      }
    }
  },

  async me() {
    try {
      const token = this.getToken();
      if (!token) return null;

      const res = await fetch(`${API_BASE_URL}/auth.php?action=me`, {
        method: 'GET',
        credentials: 'include',
        headers: this.getAuthHeaders()
      });

      if (res.status === 401) {
        this.clearAuth();
        this.handleUnauthorized(401);
        return null;
      }

      let json = null;
      try {
        json = await res.json();
      } catch (parseErr) {
        console.warn('[BuserInfoAPI] Response me() bukan JSON valid:', parseErr);
        // Tetap gunakan profil lokal jika server mengembalikan output tidak standar
        return this.getUser();
      }

      if (json && json.status === 'success' && json.data) {
        const currentUser = this.getUser() || {};
        const updated = { ...currentUser, ...json.data };
        this.setAuth(token, updated);
        return updated;
      } else if (json && json.status === 'error' && (json.message || '').toLowerCase().includes('terautentikasi')) {
        this.clearAuth();
        this.handleUnauthorized(401);
        return null;
      }

      return this.getUser();
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal verifikasi sesi:', err);
      // Jangan langsung menghapus sesi jika hanya gangguan jaringan sementara
      return this.getUser();
    }
  },

  // --- Kategori Endpoints ---
  // Ambil daftar kategori
  async getCategories() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_BASE_URL}/kategori.php`, {
        credentials: 'include',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    } catch (err) {
      // Fallback ke kategori bawaan jika API offline/timeout
    }
    // Fallback kategori bawaan
    const defaultCats = window.JAPAKEH_CATEGORIES || window.BUSER_CATEGORIES || [];
    return defaultCats.filter(c => c.id !== 'home').map((c, i) => ({
      id_kategori: i + 1,
      name_kategori: c.name,
      slug: c.slug,
      deskripsi: `Rubrik berita ${c.name} Japakeh Post`
    }));
  },

  // Tambah kategori baru
  async createCategory(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/kategori.php`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Update kategori
  async updateCategory(id, data) {
    try {
      const res = await fetch(`${API_BASE_URL}/kategori.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ id_kategori: id, ...data })
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Hapus kategori
  async deleteCategory(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/kategori.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // --- Video YouTube Endpoints ---
  // Ekstraksi YouTube Video ID dari URL
  extractYouTubeId(url) {
    if (!url) return null;
    url = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    const match = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
    return match ? match[1] : null;
  },

  // Ambil daftar video
  async getVideos(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${API_BASE_URL}/video.php?${query}`, {
        credentials: 'include',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const json = await res.json();
      if (json.status === 'success' && json.data && Array.isArray(json.data.videos)) {
        return json.data;
      }
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal fetch video dari API:', err);
    }
    // Fallback data video jika server offline
    const fallbackVideos = [
      {
        id_video: 4,
        title: 'Pesona Bahari dan Keindahan Pesisir Pantai Barat Aceh',
        youtube_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
        youtube_id: 'kJQP7kiw5Fk',
        caption: 'Dokumentasi visual keindahan lanskap pantai, kehidupan nelayan pesisir, dan ragam potensi wisata bahari nusantara.',
        is_active: true,
        embed_url: 'https://www.youtube-nocookie.com/embed/kJQP7kiw5Fk?rel=0',
        watch_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
        thumbnail_url: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
        created_at: '2026-09-12 14:00:00'
      },
      {
        id_video: 3,
        title: 'Gelora Atlet Daerah Matangkan Latihan Intensif Menuju PON',
        youtube_url: 'https://www.youtube.com/watch?v=kXYiU_JCYtU',
        youtube_id: 'kXYiU_JCYtU',
        caption: 'Liputan eksklusif persiapan kontingen atlet daerah dalam pemusatan latihan cabang olahraga unggulan dengan dukungan sport science terpadu.',
        is_active: true,
        embed_url: 'https://www.youtube-nocookie.com/embed/kXYiU_JCYtU?rel=0',
        watch_url: 'https://www.youtube.com/watch?v=kXYiU_JCYtU',
        thumbnail_url: 'https://img.youtube.com/vi/kXYiU_JCYtU/hqdefault.jpg',
        created_at: '2026-09-12 10:00:00'
      },
      {
        id_video: 2,
        title: 'Inovasi Mahasiswa Aceh: Kulit Manggis Jadi Penjernih Air Gambut',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        youtube_id: 'dQw4w9WgXcQ',
        caption: 'Dokumentasi riset terapan kampus mengolah limbah kulit manggis menjadi karbon aktif yang mampu menyaring air rawa menjadi air bersih layak konsumsi.',
        is_active: true,
        embed_url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0',
        watch_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        created_at: '2026-09-11 09:41:07'
      },
      {
        id_video: 1,
        title: 'Apel Siaga Satgas Linmas dan Pageu Gampong Kabupaten Aceh Barat',
        youtube_url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
        youtube_id: 'ScMzIvxBSi4',
        caption: 'Liputan video jurnalis Japakeh Post menyoroti apel gelar kesiapsiagaan aparat perlindungan gampong dalam menjaga kamtibmas dan mitigasi bencana.',
        is_active: true,
        embed_url: 'https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?rel=0',
        watch_url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
        thumbnail_url: 'https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg',
        created_at: '2026-09-11 09:41:07'
      }
    ];
    return { videos: fallbackVideos, total: fallbackVideos.length };
  },

  // Ambil detail satu video
  async getVideoById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/video.php?id=${encodeURIComponent(id)}`, {
        credentials: 'include'
      });
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        return json.data;
      }
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal fetch detail video:', err);
    }
    return null;
  },

  // Tambah video baru
  async createVideo(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/video.php`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Update video
  async updateVideo(id, data) {
    try {
      const res = await fetch(`${API_BASE_URL}/video.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ id_video: id, ...data })
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Hapus video
  async deleteVideo(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/video.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Helper Fallback Mengambil Artikel dari articles-seed.json atau window.BUSER_ARTICLES
  async _getSeedArticlesFallback(params = {}) {
    try {
      let rawList = null;
      try {
        const seedUrl = `${API_BASE_URL}/articles-seed.json`;
        const res = await fetch(seedUrl);
        if (res.ok) {
          rawList = await res.json();
        }
      } catch (fe) {}

      // Fallback ke window.BUSER_ARTICLES jika fetch gagal (misal pada protokol file://)
      if (!Array.isArray(rawList) || rawList.length === 0) {
        if (typeof window !== 'undefined' && Array.isArray(window.BUSER_ARTICLES) && window.BUSER_ARTICLES.length > 0) {
          rawList = window.BUSER_ARTICLES;
        }
      }

      if (!Array.isArray(rawList) || rawList.length === 0) {
        return { articles: [], pagination: {} };
      }

      let list = rawList.map((item, idx) => ({
        id_artikel: item.id || (idx + 1),
        id: item.id || `art-${idx + 1}`,
        title: item.title,
        slug: item.slug,
        excerpt: item.excerpt,
        content: item.content,
        thumbnail: item.image,
        status: 'published',
        views: parseInt(String(item.views || '1000').replace(/\D/g, ''), 10) || 1000,
        published_at: item.date ? `${item.date} • ${item.time || 'WIB'}` : 'Baru saja',
        name_kategori: item.category || 'Daerah',
        kategori_slug: item.categorySlug || 'daerah',
        author_name: item.author || 'Al Bahri',
        author_role: item.authorRole || 'Pemimpin Redaksi Japakeh Post',
        author_avatar: 'assets/images/logo/favicon.webp',
        tags: item.tags || [],
        isHero: !!item.isHero,
        isTrending: !!item.isTrending,
        trendingRank: item.trendingRank || (idx + 1),
        timestamp: item.timestamp || Date.now()
      }));

      // Filter Kategori
      if (params.kategori && String(params.kategori).toLowerCase() !== 'all') {
        const catFilter = String(params.kategori).toLowerCase().trim();
        list = list.filter(a => 
          (a.kategori_slug || '').toLowerCase() === catFilter || 
          (a.name_kategori || '').toLowerCase() === catFilter
        );
      }

      // Filter Pencarian (Cari di Title, Excerpt, Content, Tags, Author, Kategori)
      if (params.search && String(params.search).trim()) {
        const q = String(params.search).toLowerCase().trim();
        list = list.filter(a => 
          (a.title || '').toLowerCase().includes(q) || 
          (a.excerpt || '').toLowerCase().includes(q) || 
          (a.content || '').toLowerCase().includes(q) ||
          (Array.isArray(a.tags) && a.tags.some(t => String(t).toLowerCase().includes(q))) ||
          (a.author_name || '').toLowerCase().includes(q) ||
          (a.name_kategori || '').toLowerCase() === q
        );
      }

      // Limit
      if (params.limit && parseInt(params.limit, 10) > 0) {
        list = list.slice(0, parseInt(params.limit, 10));
      }

      return {
        articles: list,
        pagination: {
          total: list.length,
          page: 1,
          limit: params.limit || list.length,
          total_pages: 1
        }
      };
    } catch (e) {
      return { articles: [], pagination: {} };
    }
  },

  // --- Berita Endpoints ---
  // Ambil daftar berita dengan parameter (kategori, status, limit, search, page)
  async getArticles(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout agar handal pada database lokal

      const res = await fetch(`${API_BASE_URL}/artikel.php?${query}`, {
        credentials: 'include',
        headers: this.getAuthHeaders(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const json = await res.json();
      if (json.status === 'success' && json.data && Array.isArray(json.data.articles)) {
        if (json.data.articles.length > 0 || params.search) {
          return json.data;
        }
      }
    } catch (err) {
      // Graceful fallback ke local data jika API offline / timeout / error
    }
    // Fallback otomatis ke seed data jika API kosong atau server belum aktif
    return await this._getSeedArticlesFallback(params);
  },

  // Ambil detail berita berdasarkan slug
  async getArticleBySlug(slug) {
    try {
      const res = await fetch(`${API_BASE_URL}/artikel.php?slug=${encodeURIComponent(slug)}`, {
        credentials: 'include'
      });
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        return json.data;
      }
    } catch (err) {
      console.warn('[JapakehPostAPI] Gagal memuat detail artikel by slug:', err);
    }
    // Fallback cari dari seed data
    const fallbackData = await this._getSeedArticlesFallback();
    const found = fallbackData.articles.find(a => a.slug === slug);
    return found || null;
  },

  // Ambil detail berita berdasarkan ID (Admin Edit)
  async getArticleById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/artikel.php?id=${encodeURIComponent(id)}`, {
        credentials: 'include',
        headers: this.getAuthHeaders()
      });
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        return json.data;
      }
    } catch (err) {
      console.warn('[JapakehPostAPI] Gagal memuat detail artikel by ID:', err);
    }
    const fallbackData = await this._getSeedArticlesFallback();
    const found = fallbackData.articles.find(a => String(a.id_artikel) === String(id));
    return found || null;
  },

  // Upload Gambar Thumbnail Berita (Admin)
  async uploadThumbnail(file) {
    try {
      const formData = new FormData();
      formData.append('thumbnail', file);
      const res = await fetch(`${API_BASE_URL}/upload.php`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
        body: formData
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Simpan artikel baru (Admin)
  async createArticle(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/artikel.php`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Update artikel (Admin)
  async updateArticle(id, data) {
    try {
      const res = await fetch(`${API_BASE_URL}/artikel.php?id=${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Hapus artikel (Admin)
  async deleteArticle(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/artikel.php?id=${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Ambil data statistik dashboard (counts, chart, kategori, artikel terbaru)
  async getDashboardStats() {
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard.php`, {
        credentials: 'include',
        headers: this.getAuthHeaders()
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      return json.status === 'success' ? json.data : null;
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal memuat data dashboard:', err);
      return null;
    }
  },

  // Helper Ekstraksi YouTube ID
  extractYouTubeId(url) {
    if (!url) return null;
    const cleanUrl = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) return cleanUrl;
    const match = cleanUrl.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
    return match ? match[1] : null;
  },

  // Ambil daftar video YouTube
  async getVideos(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/video.php${query ? '?' + query : ''}`, {
        credentials: 'include'
      });
      const json = await res.json();
      return json.status === 'success' ? json.data : { videos: [], total: 0 };
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal memuat video:', err);
      return { videos: [], total: 0 };
    }
  },

  // Ambil detail satu video berdasarkan ID
  async getVideoById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/video.php?id=${encodeURIComponent(id)}`, {
        credentials: 'include'
      });
      const json = await res.json();
      return json.status === 'success' ? json.data : null;
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal memuat detail video:', err);
      return null;
    }
  },

  // Simpan video YouTube baru (Admin)
  async createVideo(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/video.php`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Update video YouTube (Admin)
  async updateVideo(id, data) {
    try {
      const res = await fetch(`${API_BASE_URL}/video.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ id_video: id, ...data })
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Hapus video YouTube (Admin)
  async deleteVideo(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/video.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // --- Iklan & Ads Endpoints (Google Ads & Banner Endorse) ---
  getDefaultAds() {
    return [
      {
        id: 1,
        judul: 'Sponsor Resmi Japakeh Post — Bank Syariah Indonesia',
        tipe: 'banner',
        posisi: 'header',
        kode_html: null,
        gambar: 'assets/images/berita/nasional/kantor-pusat-bsi-landmark-aceh.jpg',
        link_tujuan: 'https://bankbsi.co.id',
        keterangan: 'Mitra Finansial & Perbankan Syariah Mitra Redaksi',
        is_active: 1,
        urutan: 1,
        created_at: '2026-09-12 10:00:00'
      },
      {
        id: 2,
        judul: 'Google AdSense — Sidebar Responsive Display',
        tipe: 'google',
        posisi: 'sidebar',
        kode_html: '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-1234567890123456" data-ad-slot="9876543210" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>',
        gambar: null,
        link_tujuan: null,
        keterangan: 'Slot iklan sidebar otomatis Google AdSense',
        is_active: 1,
        urutan: 2,
        created_at: '2026-09-12 10:05:00'
      },
      {
        id: 3,
        judul: 'Google AdSense — Artikel Tengah (In-Article)',
        tipe: 'google',
        posisi: 'article_middle',
        kode_html: '<ins class="adsbygoogle" style="display:block; text-align:center;" data-ad-layout="in-article" data-ad-format="fluid" data-ad-client="ca-pub-1234567890123456" data-ad-slot="5432109876"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>',
        gambar: null,
        link_tujuan: null,
        keterangan: 'Slot iklan di sela paragraf artikel berita',
        is_active: 1,
        urutan: 3,
        created_at: '2026-09-12 10:10:00'
      },
      {
        id: 4,
        judul: 'Banner Promo UMKM Aceh & Kuliner Khas Nusantara',
        tipe: 'banner',
        posisi: 'home_middle',
        kode_html: null,
        gambar: 'assets/images/berita/ekonomi/panen-kopi-gayo-organik.jpg',
        link_tujuan: 'https://japakehpost.com',
        keterangan: 'Banner kemitraan promosi UMKM daerah',
        is_active: 1,
        urutan: 4,
        created_at: '2026-09-12 10:15:00'
      }
    ];
  },

  getLocalAds() {
    try {
      const stored = localStorage.getItem('japakeh_ads_cache');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    const defaults = this.getDefaultAds();
    this.saveLocalAds(defaults);
    return defaults;
  },

  saveLocalAds(ads) {
    try {
      localStorage.setItem('japakeh_ads_cache', JSON.stringify(ads));
    } catch (e) {}
  },

  // Ambil daftar iklan
  async getAds(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/iklan.php${query ? '?' + query : ''}`, {
        credentials: 'include'
      });
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        if (Array.isArray(json.data.ads)) {
          this.saveLocalAds(json.data.ads);
        }
        return json.data;
      }
    } catch (err) {
      console.warn('[BuserInfoAPI] Menggunakan cache lokal iklan:', err.message);
    }

    // Fallback lokal jika fetch gagal
    let ads = this.getLocalAds();
    if (params.posisi) ads = ads.filter(a => a.posisi === params.posisi);
    if (params.tipe) ads = ads.filter(a => a.tipe === params.tipe);
    if (params.status === 'active') ads = ads.filter(a => a.is_active == 1);
    if (params.status === 'inactive') ads = ads.filter(a => a.is_active == 0);
    if (params.search) {
      const q = params.search.toLowerCase();
      ads = ads.filter(a => (a.judul && a.judul.toLowerCase().includes(q)) || (a.keterangan && a.keterangan.toLowerCase().includes(q)));
    }
    return { ads, total: ads.length };
  },

  // Ambil detail satu iklan berdasarkan ID
  async getAdById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/iklan.php?id=${encodeURIComponent(id)}`, {
        credentials: 'include'
      });
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        return json.data;
      }
    } catch (err) {}
    const ads = this.getLocalAds();
    return ads.find(a => a.id == id) || null;
  },

  // Simpan iklan baru (Admin)
  async createAd(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/iklan.php`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      if (json.status === 'success') {
        const ads = this.getLocalAds();
        const newId = json.data?.id || Date.now();
        ads.unshift({ id: newId, ...data, is_active: data.is_active ? 1 : 0, created_at: new Date().toISOString() });
        this.saveLocalAds(ads);
        return json;
      }
      return json;
    } catch (err) {
      const ads = this.getLocalAds();
      const newId = Date.now();
      const newAd = { id: newId, ...data, is_active: data.is_active ? 1 : 0, created_at: new Date().toISOString() };
      ads.unshift(newAd);
      this.saveLocalAds(ads);
      return { status: 'success', message: 'Iklan berhasil disimpan (mode penyimpanan lokal)', data: { id: newId } };
    }
  },

  // Update iklan (Admin)
  async updateAd(id, data) {
    try {
      const res = await fetch(`${API_BASE_URL}/iklan.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ id, ...data })
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      if (json.status === 'success') {
        const ads = this.getLocalAds();
        const idx = ads.findIndex(a => a.id == id);
        if (idx !== -1) {
          ads[idx] = { ...ads[idx], ...data };
          this.saveLocalAds(ads);
        }
        return json;
      }
      return json;
    } catch (err) {
      const ads = this.getLocalAds();
      const idx = ads.findIndex(a => a.id == id);
      if (idx !== -1) {
        ads[idx] = { ...ads[idx], ...data };
        this.saveLocalAds(ads);
      }
      return { status: 'success', message: 'Iklan berhasil diperbarui (mode penyimpanan lokal)', data: { id } };
    }
  },

  // Hapus iklan (Admin)
  async deleteAd(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/iklan.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      const ads = this.getLocalAds().filter(a => a.id != id);
      this.saveLocalAds(ads);
      return json;
    } catch (err) {
      const ads = this.getLocalAds().filter(a => a.id != id);
      this.saveLocalAds(ads);
      return { status: 'success', message: 'Iklan berhasil dihapus' };
    }
  },

  // Toggle status aktif/nonaktif iklan (Admin)
  async toggleAdStatus(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/iklan.php?action=toggle_status&id=${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      if (json.status === 'success') {
        const ads = this.getLocalAds();
        const ad = ads.find(a => a.id == id);
        if (ad) {
          ad.is_active = json.data?.is_active ?? (ad.is_active == 1 ? 0 : 1);
          this.saveLocalAds(ads);
        }
        return json;
      }
      return json;
    } catch (err) {
      const ads = this.getLocalAds();
      const ad = ads.find(a => a.id == id);
      let newStatus = 1;
      if (ad) {
        ad.is_active = ad.is_active == 1 ? 0 : 1;
        newStatus = ad.is_active;
        this.saveLocalAds(ads);
      }
      return { status: 'success', message: 'Status iklan berhasil diubah', data: { id, is_active: newStatus } };
    }
  },

  // --- Komentar Endpoints ---
  // Ambil komentar pembaca (publik per artikel atau komprehensif admin)
  async getComments(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/komentar.php?${query}`, {
        credentials: 'include',
        headers: this.getAuthHeaders()
      });
      const json = await res.json();
      return json.status === 'success' ? json.data : { comments: [], counts: {} };
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal memuat komentar:', err);
      return { comments: [], counts: {} };
    }
  },

  // Kirim komentar pembaca baru (Publik / Guest)
  async submitComment(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/komentar.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Update status moderasi komentar (Admin: approved, rejected, spam, pending)
  async updateCommentStatus(id, status) {
    try {
      const res = await fetch(`${API_BASE_URL}/komentar.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Hapus komentar permanen (Admin)
  async deleteComment(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/komentar.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // --- Penulis (Wartawan & Redaktur) Endpoints ---
  // Ambil daftar seluruh penulis beserta jumlah artikel
  async getAuthors(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/penulis.php${query ? '?' + query : ''}`, {
        credentials: 'include',
        headers: this.getAuthHeaders()
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      return json.status === 'success' ? json.data : [];
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal memuat penulis:', err);
      return [];
    }
  },

  // Ambil detail satu penulis berdasarkan ID
  async getAuthorById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/penulis.php?id=${encodeURIComponent(id)}`, {
        credentials: 'include',
        headers: this.getAuthHeaders()
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      return json.status === 'success' ? json.data : null;
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal memuat detail penulis:', err);
      return null;
    }
  },

  // Tambah penulis baru
  async createAuthor(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/penulis.php`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Perbarui data penulis
  async updateAuthor(id, data) {
    try {
      const res = await fetch(`${API_BASE_URL}/penulis.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Toggle status aktif/nonaktif penulis
  async toggleAuthorStatus(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/penulis.php?id=${encodeURIComponent(id)}&action=toggle_status`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Hapus penulis permanen
  async deleteAuthor(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/penulis.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // --- Pengguna CMS (Users) Endpoints ---
  // Ambil daftar seluruh akun pengguna
  async getUsers(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/pengguna.php${query ? '?' + query : ''}`, {
        credentials: 'include',
        headers: this.getAuthHeaders()
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      return json.status === 'success' ? json.data : [];
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal memuat pengguna:', err);
      return [];
    }
  },

  // Ambil detail satu pengguna
  async getUserById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/pengguna.php?id=${encodeURIComponent(id)}`, {
        credentials: 'include',
        headers: this.getAuthHeaders()
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      return json.status === 'success' ? json.data : null;
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal memuat detail pengguna:', err);
      return null;
    }
  },

  // Tambah pengguna CMS baru
  async createUser(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/pengguna.php`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Update profil/role pengguna
  async updateUser(id, data) {
    try {
      const res = await fetch(`${API_BASE_URL}/pengguna.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Ubah hak akses / peran (role) pengguna
  async changeUserRole(id, role) {
    try {
      const res = await fetch(`${API_BASE_URL}/pengguna.php?id=${encodeURIComponent(id)}&action=change_role`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ role })
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Toggle status aktif/nonaktif akun pengguna
  async toggleUserStatus(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/pengguna.php?id=${encodeURIComponent(id)}&action=toggle_status`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Hapus akun pengguna CMS
  async deleteUser(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/pengguna.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // --- Profil & Susunan Redaksi Endpoints ---
  // Ambil daftar profil redaksi (dengan opsional search, kategori, status)
  async getRedaksi(params = {}) {
    try {
      const query = new URLSearchParams(params).toString();
      const res = await fetch(`${API_BASE_URL}/redaksi.php${query ? '?' + query : ''}`, {
        credentials: 'include',
        headers: this.getAuthHeaders()
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        // Cache data redaksi aktif untuk tampilan cepat & fallback offline di client
        if (!params.status || params.status === 'active') {
          try {
            const listToCache = (json.data.profiles || []).filter(p => (p.status || 'active').toLowerCase() === 'active');
            localStorage.setItem('buser_redaksi_cache', JSON.stringify(listToCache));
          } catch (e) {}
        }
        return json.data;
      }
      return { profiles: [], total: 0, stats: {} };
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal memuat profil redaksi:', err);
      // Fallback ke cache lokal jika server/jaringan offline
      try {
        const cached = localStorage.getItem('buser_redaksi_cache');
        if (cached) {
          const profiles = JSON.parse(cached);
          return { profiles, total: profiles.length, stats: {} };
        }
      } catch (e) {}
      return { profiles: [], total: 0, stats: {} };
    }
  },

  // Ambil detail satu anggota profil redaksi
  async getRedaksiById(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/redaksi.php?id=${encodeURIComponent(id)}`, {
        credentials: 'include',
        headers: this.getAuthHeaders()
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      return json.status === 'success' ? json.data : null;
    } catch (err) {
      console.warn('[BuserInfoAPI] Gagal memuat detail profil redaksi:', err);
      return null;
    }
  },

  // Tambah anggota profil redaksi baru
  async createRedaksi(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/redaksi.php`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Perbarui data anggota profil redaksi
  async updateRedaksi(id, data) {
    try {
      const res = await fetch(`${API_BASE_URL}/redaksi.php?id=${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Toggle status aktif/nonaktif anggota profil redaksi
  async toggleRedaksiStatus(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/redaksi.php?id=${encodeURIComponent(id)}&action=toggle_status`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Hapus anggota profil redaksi
  async deleteRedaksi(id) {
    try {
      const res = await fetch(`${API_BASE_URL}/redaksi.php?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Upload foto anggota redaksi
  async uploadRedaksiFoto(file) {
    try {
      const formData = new FormData();
      formData.append('foto', file);
      const res = await fetch(`${API_BASE_URL}/redaksi.php?action=upload_foto`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
        body: formData
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Ambil kategori profil redaksi yang tersedia
  async getRedaksiCategories() {
    try {
      const res = await fetch(`${API_BASE_URL}/redaksi.php?action=categories`, {
        credentials: 'include'
      });
      const json = await res.json();
      return json.status === 'success' ? json.data : [];
    } catch (err) {
      return [];
    }
  },

  // Reset susunan profil redaksi ke 9 profil standar bawaan
  async resetRedaksiDefaults() {
    try {
      const res = await fetch(`${API_BASE_URL}/redaksi.php?action=reset_defaults`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include'
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Update profil pribadi redaksi yang sedang login
  async updateMyProfile(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth.php?action=update_profile`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        const currentUser = this.getUser() || {};
        this.setAuth(this.getToken(), { ...currentUser, ...json.data });
      }
      return json;
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Ubah kata sandi akun redaksi yang sedang login
  async updateMyPassword(data) {
    try {
      const res = await fetch(`${API_BASE_URL}/auth.php?action=update_password`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(data)
      });
      this.handleUnauthorized(res.status);
      return await res.json();
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Unggah foto profil avatar untuk akun yang sedang login
  async uploadMyAvatar(file) {
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`${API_BASE_URL}/auth.php?action=upload_avatar`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
        body: formData
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      if (json && json.status === 'success' && json.data && json.data.user) {
        const currentUser = this.getUser() || {};
        this.setAuth(this.getToken(), { ...currentUser, ...json.data.user });
      }
      return json;
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  },

  // Hapus/reset foto profil avatar akun yang sedang login
  async deleteMyAvatar() {
    try {
      const res = await fetch(`${API_BASE_URL}/auth.php?action=delete_avatar`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders()
      });
      this.handleUnauthorized(res.status);
      const json = await res.json();
      if (json && json.status === 'success' && json.data && json.data.user) {
        const currentUser = this.getUser() || {};
        this.setAuth(this.getToken(), { ...currentUser, ...json.data.user });
      }
      return json;
    } catch (err) {
      return { status: 'error', message: err.message };
    }
  }
};

window.BuserInfoAPI = BuserInfoAPI;
window.JapakehPostAPI = BuserInfoAPI;
