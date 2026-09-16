/**
 * Japakeh Post - Render Beranda Dinamis Murni dari Database MySQL / REST API
 * PT Japakeh Media Nusantara
 * 
 * Revisi Beranda:
 * 1. Berita Utama (Hero): Single compact card, auto-carousel berputar berkala, tanpa tulisan waktu di client, ukuran lebih ramping.
 * 2. Berita Populer: Berada di kolom utama tepat setelah Berita Terbaru (2 kolom kompak horizontal).
 * 3. Editorial: Dihapus sepenuhnya.
 * 4. Berita Foto: Format YouTube Shorts vertikal memanjang horizontal (maks 4), tata letak adaptif sesuai jumlah, klik membuka modal foto & deskripsi. Berada DI ATAS Berita Video.
 * 5. Berita Video: Format YouTube Shorts vertikal memanjang horizontal (maks 4), tata letak adaptif sesuai jumlah, klik membuka modal video & deskripsi. Berada DI BAWAH Berita Foto.
 */

let heroCarouselTimer = null;
let heroCarouselIndex = 0;
let heroCarouselSlides = [];

document.addEventListener('DOMContentLoaded', () => {
  renderAllLiveContentFromDB();
  setupModals();
});

async function renderAllLiveContentFromDB() {
  let articles = [];

  // 1. Coba ambil data dari REST API jika tersedia
  if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getArticles === 'function') {
    try {
      const data = await window.BuserInfoAPI.getArticles({ limit: 100, status: 'published' });
      if (data && Array.isArray(data.articles) && data.articles.length > 0) {
        articles = data.articles;
      }
    } catch (err) {
      console.warn('[home-live.js] Gagal fetch dari API, fallback ke NewsDB:', err);
    }
  }

  // 2. Jika API offline / kosong, gunakan NewsDB / BUSER_ARTICLES
  if (articles.length === 0 && window.NewsDB && typeof window.NewsDB.getAll === 'function') {
    articles = window.NewsDB.getAll();
  }

  // 3. Render Breaking News Ticker
  renderTicker(articles);

  if (articles && articles.length > 0) {
    // 4. Setup Hero Carousel (Single Compact Card, Auto-rotate, No Time Display)
    setupHeroCarousel(articles);

    // 5. Render Berita Terbaru (10 kartu horizontal kompak, 2 kolom)
    renderBeritaTerbaru(articles);

    // 6. Render Berita Populer (Naik posisi tepat setelah Berita Terbaru, maks 5)
    renderBeritaPopuler(articles);

    // 7. Render Berita Foto (Shorts style, maks 4, di atas Video)
    renderFotoSection(articles);
  }

  // 8. Render Berita Video (Shorts style, maks 4, di bawah Foto - mandiri & selalu aktif)
  await renderVideoSection(articles);
}

/* ==========================================================================
   UTILITY HELPERS
   ========================================================================== */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cleanMediaTitle(title) {
  if (!title) return '';
  return title.replace(/^\[(VIDEO|FOTO)\]\s*/i, '').trim();
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '10 September 2026';
  const safeStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(safeStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function formatTimeIndo(dateStr) {
  if (!dateStr) return '12:00 WIB';
  const safeStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(safeStr);
  if (isNaN(d.getTime())) return '12:00 WIB';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

function getThumb(url) {
  return url && url.length > 5 ? url : 'assets/images/berita/daerah/penanganan-banjir-sumatera.jpg';
}

function extractYouTubeId(url) {
  if (!url) return null;
  const str = String(url).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([\w-]{11})/i);
  return match ? match[1] : null;
}

const DEFAULT_VIDEOS = [
  {
    id_video: 4,
    title: 'Pesona Bahari dan Keindahan Pesisir Pantai Barat Aceh',
    youtube_id: 'kJQP7kiw5Fk',
    youtube_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    caption: 'Dokumentasi visual keindahan lanskap pantai, kehidupan nelayan pesisir, dan ragam potensi wisata bahari nusantara.',
    thumbnail_url: 'https://img.youtube.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    created_at: '2026-09-12 10:00:00',
    author: 'Redaksi Japakeh',
    duration: '02:45'
  },
  {
    id_video: 3,
    title: 'Gelora Atlet Daerah Matangkan Latihan Intensif Menuju PON',
    youtube_id: 'kXYiU_JCYtU',
    youtube_url: 'https://www.youtube.com/watch?v=kXYiU_JCYtU',
    caption: 'Liputan eksklusif persiapan kontingen atlet daerah dalam pemusatan latihan cabang olahraga unggulan dengan dukungan sport science terpadu.',
    thumbnail_url: 'https://img.youtube.com/vi/kXYiU_JCYtU/hqdefault.jpg',
    created_at: '2026-09-12 11:30:00',
    author: 'Redaksi Japakeh',
    duration: '03:15'
  },
  {
    id_video: 2,
    title: 'Inovasi Mahasiswa Aceh: Kulit Manggis Jadi Penjernih Air Gambut',
    youtube_id: 'dQw4w9WgXcQ',
    youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    caption: 'Dokumentasi riset terapan kampus mengolah limbah kulit manggis menjadi karbon aktif yang mampu menyaring air rawa menjadi air bersih layak konsumsi.',
    thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    created_at: '2026-09-11 14:15:00',
    author: 'Redaksi Japakeh',
    duration: '02:10'
  },
  {
    id_video: 1,
    title: 'Apel Siaga Satgas Linmas dan Pageu Gampong Kabupaten Aceh Barat',
    youtube_id: 'ScMzIvxBSi4',
    youtube_url: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    caption: 'Liputan video jurnalis Japakeh Post menyoroti apel gelar kesiapsiagaan aparat perlindungan gampong dalam menjaga kamtibmas dan mitigasi bencana.',
    thumbnail_url: 'https://img.youtube.com/vi/ScMzIvxBSi4/hqdefault.jpg',
    created_at: '2026-09-11 16:00:00',
    author: 'Redaksi Japakeh',
    duration: '04:15'
  }
];

/* ==========================================================================
   1. BREAKING NEWS TICKER
   ========================================================================== */

function renderTicker(articles) {
  const track = document.getElementById('breaking-ticker-track');
  if (!track) return;

  let items = [];
  if (Array.isArray(articles) && articles.length > 0) {
    items = articles.slice(0, 8).map(art => ({
      title: art.title,
      category: (art.name_kategori || art.category || 'TERKINI').toUpperCase(),
      link: `artikel.html?slug=${encodeURIComponent(art.slug)}`
    }));
  } else {
    items = [
      {
        title: 'Banjir di Pidie Jaya, Warga Masih Bertahan di Posko Pengungsian',
        category: 'DAERAH',
        link: 'artikel.html?slug=banjir-di-pidie-jaya-warga-masih-bertahan-di-posko-pengungsian'
      },
      {
        title: 'Bupati Tarmizi Tegaskan Satlinmas dan Pageu Gampong Ujung Tombak Keamanan Masyarakat',
        category: 'DAERAH',
        link: 'artikel.html?slug=bupati-tarmizi-tegaskan-satlinmas-dan-pageu-gampong-ujung-tombak-keamanan-masyarakat'
      }
    ];
  }

  let html = '';
  const repeatCount = 2;
  for (let r = 0; r < repeatCount; r++) {
    items.forEach((item) => {
      html += `
        <a href="${item.link}" class="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-900 hover:text-buser-red mr-8 transition-colors group">
          <span class="inline-block w-2 h-2 rounded-full bg-buser-red mr-2.5 flex-shrink-0"></span>
          <span class="group-hover:underline">${escapeHtml(item.title)}</span>
        </a>
      `;
    });
  }
  track.innerHTML = html;
}

/* ==========================================================================
   2. HERO CAROUSEL (Single Compact Card, Auto-Rotate, No Time Display)
   ========================================================================== */

function setupHeroCarousel(articles) {
  const heroCard = document.getElementById('home-hero-card');
  if (!heroCard || !articles || articles.length === 0) return;

  // Kumpulkan 4-5 artikel berita utama (headline / trending / prioritas)
  let headlineList = articles.filter(a => a.isHero || a.isTrending);
  if (headlineList.length < 5) {
    const fillers = articles.filter(a => !headlineList.includes(a));
    headlineList = [...headlineList, ...fillers];
  }
  heroCarouselSlides = headlineList.slice(0, 5);
  heroCarouselIndex = 0;

  // Render dots indicators
  const dotsContainer = document.getElementById('hero-carousel-dots');
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    heroCarouselSlides.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `hero-dot-indicator ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Slide ${idx + 1}`);
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        goToHeroSlide(idx);
      });
      dotsContainer.appendChild(dot);
    });
  }

  // Prev / Next button listeners
  const prevBtn = document.getElementById('hero-prev-btn');
  const nextBtn = document.getElementById('hero-next-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToHeroSlide((heroCarouselIndex - 1 + heroCarouselSlides.length) % heroCarouselSlides.length);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToHeroSlide((heroCarouselIndex + 1) % heroCarouselSlides.length);
    });
  }

  // Tampilkan slide pertama
  renderHeroSlide(0);

  // Jalankan timer rotasi otomatis (5 detik)
  startHeroTimer();

  // Jeda saat mouse melayang (hover) agar nyaman dibaca / diklik
  heroCard.addEventListener('mouseenter', stopHeroTimer);
  heroCard.addEventListener('mouseleave', startHeroTimer);
}

function renderHeroSlide(index) {
  if (!heroCarouselSlides || heroCarouselSlides.length === 0) return;
  const item = heroCarouselSlides[index];
  if (!item) return;

  const heroLink = document.getElementById('home-hero-link');
  const heroImg = document.getElementById('home-hero-img');
  const heroCat = document.getElementById('home-hero-category');
  const heroTitle = document.getElementById('home-hero-title');
  const heroExcerpt = document.getElementById('home-hero-excerpt');
  const heroDate = document.getElementById('home-hero-date');

  const linkUrl = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
  const catName = (item.name_kategori || item.category || 'DAERAH').toUpperCase();
  const title = item.title;
  const excerpt = item.excerpt || 'Laporan terkini dan peristiwa terhangat dari jurnalisme terpercaya Japakeh Post.';
  const pubDate = formatDateIndo(item.published_at || item.date);
  const thumb = getThumb(item.thumbnail || item.image);

  if (heroImg) {
    heroImg.style.opacity = '0.7';
    setTimeout(() => {
      heroImg.src = thumb;
      heroImg.alt = title;
      heroImg.style.opacity = '1';
    }, 120);
  }

  if (heroLink) heroLink.href = linkUrl;
  if (heroCat) heroCat.textContent = catName;
  if (heroTitle) {
    heroTitle.textContent = title;
    heroTitle.href = linkUrl;
  }
  if (heroExcerpt) heroExcerpt.textContent = excerpt;
  // Catatan: Tulisan jam/waktu sengaja TIDAK ditampilkan per permintaan revisi pengguna
  if (heroDate) heroDate.textContent = pubDate;

  // Update status aktif pada dots
  const dots = document.querySelectorAll('#hero-carousel-dots .hero-dot-indicator');
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === index);
  });
}

function goToHeroSlide(index) {
  heroCarouselIndex = index;
  renderHeroSlide(heroCarouselIndex);
  // Reset interval waktu jika berpindah manual
  stopHeroTimer();
  startHeroTimer();
}

function startHeroTimer() {
  stopHeroTimer();
  heroCarouselTimer = setInterval(() => {
    if (heroCarouselSlides.length > 1) {
      heroCarouselIndex = (heroCarouselIndex + 1) % heroCarouselSlides.length;
      renderHeroSlide(heroCarouselIndex);
    }
  }, 5000);
}

function stopHeroTimer() {
  if (heroCarouselTimer) {
    clearInterval(heroCarouselTimer);
    heroCarouselTimer = null;
  }
}

/* ==========================================================================
   3. BERITA TERBARU (10 Kartu Horizontal Kompak 2 Kolom)
   ========================================================================== */

function renderBeritaTerbaru(articles) {
  const container = document.getElementById('home-berita-terbaru-grid');
  if (!container || !articles) return;

  // Ambil hingga 10 artikel terkini yang bukan slide hero utama
  const feedList = articles.filter(a => !a.isHero).slice(0, 10);
  if (feedList.length === 0) return;

  let html = '';
  feedList.forEach((item, index) => {
    const linkUrl = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
    const catName = (item.name_kategori || item.category || 'BERITA').toUpperCase();
    const pubDate = formatDateIndo(item.published_at || item.date);
    const thumb = getThumb(item.thumbnail || item.image);
    // Khusus layar mobile (<sm): batasi maksimal 5 berita tampil, item 6-10 tampil di sm ke atas
    const responsiveDisplayClass = index >= 5 ? 'hidden sm:flex' : 'flex';

    html += `
      <article class="${responsiveDisplayClass} items-center gap-2.5 sm:gap-3 group py-1">
        <a href="${linkUrl}" class="w-20 sm:w-24 h-14 sm:h-16 rounded-md overflow-hidden shrink-0 bg-slate-100 block">
          <img src="${thumb}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
        </a>
        <div class="flex-1 min-w-0">
          <span class="text-[10px] font-bold text-buser-red uppercase tracking-wider block mb-0.5">${escapeHtml(catName)}</span>
          <h3 class="font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-buser-red leading-snug line-clamp-2 transition-colors">
            <a href="${linkUrl}">${escapeHtml(item.title)}</a>
          </h3>
          <div class="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-400 mt-1">
            <svg class="w-2.5 h-2.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>${pubDate}</span>
          </div>
        </div>
      </article>
    `;
  });

  if (html.trim()) {
    container.innerHTML = html;
  }
}

/* ==========================================================================
   4. BERITA POPULER (Dinaikkan posisinya tepat setelah Berita Terbaru)
   ========================================================================== */

function renderBeritaPopuler(articles) {
  const container = document.getElementById('home-populer-grid');
  if (!container || !articles) return;

  // Ambil artikel trending atau terpopuler (maksimal 5 artikel sesuai instruksi)
  let popularList = articles.filter(a => a.isTrending && !a.isHero);
  if (popularList.length < 5) {
    const extras = articles.filter(a => !a.isHero && !popularList.includes(a));
    popularList = [...popularList, ...extras];
  }
  popularList = popularList.slice(0, 5);

  let html = '';
  popularList.forEach(item => {
    const linkUrl = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
    const catName = (item.name_kategori || item.category || 'POPULER').toUpperCase();
    const pubDate = formatDateIndo(item.published_at || item.date);
    const thumb = getThumb(item.thumbnail || item.image);

    html += `
      <article class="flex items-center gap-2.5 sm:gap-3 group py-1">
        <a href="${linkUrl}" class="w-20 sm:w-24 h-14 sm:h-16 rounded-md overflow-hidden shrink-0 bg-slate-100 block">
          <img src="${thumb}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
        </a>
        <div class="flex-1 min-w-0">
          <span class="text-[10px] font-bold text-buser-red uppercase tracking-wider block mb-0.5">${escapeHtml(catName)}</span>
          <h3 class="font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-buser-red leading-snug line-clamp-2 transition-colors">
            <a href="${linkUrl}">${escapeHtml(item.title)}</a>
          </h3>
          <div class="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-400 mt-1">
            <svg class="w-2.5 h-2.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>${pubDate}</span>
          </div>
        </div>
      </article>
    `;
  });

  if (html.trim()) {
    container.innerHTML = html;
  }
}

/* ==========================================================================
   5. BERITA FOTO (Shorts Style, Maks 4, Posisi DI ATAS Berita Video)
   ========================================================================== */

function renderFotoSection(articles) {
  const container = document.getElementById('home-foto-grid');
  if (!container || !articles) return;

  const fotoArticles = articles.filter(a => {
    const cat = (a.name_kategori || a.category || a.categorySlug || '').toLowerCase();
    return cat.includes('foto');
  });

  if (fotoArticles.length === 0) {
    const section = document.getElementById('home-foto-section');
    if (section) section.style.display = 'none';
    return;
  }

  // Maksimum 4 foto
  const displayFotos = fotoArticles.slice(0, 4);
  const count = displayFotos.length;

  // Tata letak responsif adaptif berdasarkan jumlah foto
  container.className = getAdaptiveGridClass(count);

  let html = '';
  displayFotos.forEach((item, index) => {
    const thumb = getThumb(item.thumbnail || item.image);
    const cleanTitle = cleanMediaTitle(item.title);
    const pubDate = formatDateIndo(item.published_at || item.date);
    const author = item.author || 'Redaksi Japakeh Post';

    html += `
      <article class="group relative rounded-xl overflow-hidden aspect-[9/13] sm:aspect-[9/14] bg-slate-950 cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 select-none foto-card-item" data-foto-index="${index}">
        <img src="${thumb}" alt="${escapeHtml(cleanTitle)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" onerror="this.src='assets/images/berita/daerah/festival-budaya-palembang.jpg'" />
        
        <!-- Top Gradient -->
        <div class="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/75 to-transparent pointer-events-none"></div>

        <!-- Badge Galeri (Top Left) -->
        <div class="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#E60000] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
          <svg class="w-3 h-3 fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd"/></svg>
          <span>GALERI</span>
        </div>

        <!-- Badge HD (Top Right) -->
        <span class="absolute top-2 right-2 z-10 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
          <svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/></svg>
          <span>HD</span>
        </span>

        <!-- Center Icon Expand -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/60 text-white flex items-center justify-center shadow-lg transform scale-90 opacity-80 group-hover:scale-110 group-hover:opacity-100 group-hover:bg-[#E60000] transition-all duration-300 backdrop-blur-xs">
            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"/></svg>
          </div>
        </div>

        <!-- Bottom Gradient Overlay -->
        <div class="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/75 to-transparent pointer-events-none"></div>

        <!-- Content at Bottom -->
        <div class="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 z-10 pointer-events-none">
          <h3 class="font-bold text-[11px] sm:text-xs text-white leading-tight line-clamp-2 drop-shadow-md group-hover:text-red-200 transition-colors">
            ${escapeHtml(cleanTitle)}
          </h3>
          <div class="flex items-center gap-1.5 text-[9px] text-slate-300 mt-1">
            <span class="truncate">${escapeHtml(author)}</span>
            <span>&bull;</span>
            <span class="shrink-0">${pubDate}</span>
          </div>
        </div>
      </article>
    `;
  });

  container.innerHTML = html;

  // Pasang listener klik untuk modal foto
  const cardElements = container.querySelectorAll('.foto-card-item');
  cardElements.forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-foto-index'), 10);
      if (!isNaN(idx) && displayFotos[idx]) {
        openFotoModal(displayFotos[idx]);
      }
    });
  });
}

/* ==========================================================================
   6. BERITA VIDEO (Shorts Style, Maks 4, Posisi DI BAWAH Berita Foto)
   ========================================================================== */

async function renderVideoSection(articles) {
  const container = document.getElementById('home-video-grid');
  const section = document.getElementById('home-video-section');
  if (!container) return;

  // Pastikan section video SELALU tampil (jangan pernah di-hide)
  if (section) section.style.display = '';

  let videoList = [];

  // 1. Coba fetch dari API endpoint video resmi jika tersedia (api/video.php)
  const apiObj = window.JapakehPostAPI || window.BuserInfoAPI;
  if (apiObj && typeof apiObj.getVideos === 'function') {
    try {
      const res = await apiObj.getVideos({ status: 'active' });
      if (res && Array.isArray(res.videos) && res.videos.length > 0) {
        videoList = res.videos;
      }
    } catch (err) {
      console.warn('[home-live.js] Gagal fetch video dari API, fallback ke default:', err);
    }
  }

  // 2. Jika API belum menghasilkan video, periksa apakah ada artikel berkategori video
  if (videoList.length === 0 && Array.isArray(articles)) {
    const fromArticles = articles.filter(a => {
      const cat = (a.name_kategori || a.category || a.categorySlug || '').toLowerCase();
      return cat.includes('video');
    });
    if (fromArticles.length > 0) {
      videoList = fromArticles;
    }
  }

  // 3. Fallback video default berkualitas tinggi (Shorts style)
  if (videoList.length === 0) {
    videoList = DEFAULT_VIDEOS;
  }

  // Maksimum 4 video
  const displayVideos = videoList.slice(0, 4);
  const count = displayVideos.length;

  // Tata letak responsif adaptif berdasarkan jumlah video
  container.className = getAdaptiveGridClass(count);

  let html = '';
  displayVideos.forEach((item, index) => {
    const ytid = item.youtube_id || extractYouTubeId(item.youtube_url || item.video_url || '') || '';
    const thumb = item.thumbnail_url || (ytid ? `https://img.youtube.com/vi/${ytid}/hqdefault.jpg` : getThumb(item.thumbnail || item.image));
    const cleanTitle = cleanMediaTitle(item.title);
    const pubDate = formatDateIndo(item.created_at || item.published_at || item.date);
    const author = item.author || 'Redaksi Japakeh';
    const duration = item.duration || '02:45';

    html += `
      <article class="group relative rounded-xl overflow-hidden aspect-[9/13] sm:aspect-[9/14] bg-slate-950 cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 select-none video-card-item" data-video-index="${index}">
        <img src="${thumb}" alt="${escapeHtml(cleanTitle)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" onerror="this.src='assets/images/berita/daerah/penanganan-banjir-sumatera.jpg'" />
        
        <!-- Top Gradient -->
        <div class="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/75 to-transparent pointer-events-none"></div>

        <!-- Badge Shorts (Top Left) -->
        <div class="absolute top-2 left-2 z-10 flex items-center gap-1 bg-[#E60000] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
          <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          <span>SHORTS</span>
        </div>

        <!-- Duration (Top Right) -->
        <span class="absolute top-2 right-2 z-10 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
          ${duration}
        </span>

        <!-- Center Play Button -->
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#E60000]/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-115 transition-transform duration-300 backdrop-blur-xs">
            <svg class="w-4 h-4 sm:w-5 sm:h-5 ml-0.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>

        <!-- Bottom Gradient Overlay -->
        <div class="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/75 to-transparent pointer-events-none"></div>

        <!-- Content at Bottom -->
        <div class="absolute inset-x-0 bottom-0 p-2.5 sm:p-3 z-10 pointer-events-none">
          <h3 class="font-bold text-[11px] sm:text-xs text-white leading-tight line-clamp-2 drop-shadow-md group-hover:text-red-200 transition-colors">
            ${escapeHtml(cleanTitle)}
          </h3>
          <div class="flex items-center gap-1.5 text-[9px] text-slate-300 mt-1">
            <span class="truncate">${escapeHtml(author)}</span>
            <span>&bull;</span>
            <span class="shrink-0">${pubDate}</span>
          </div>
        </div>
      </article>
    `;
  });

  container.innerHTML = html;

  // Pasang listener klik untuk modal video
  const cardElements = container.querySelectorAll('.video-card-item');
  cardElements.forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.getAttribute('data-video-index'), 10);
      if (!isNaN(idx) && displayVideos[idx]) {
        openVideoModal(displayVideos[idx]);
      }
    });
  });
}

/**
 * Kembalikan class grid adaptif berdasarkan jumlah kartu (1, 2, 3, atau 4)
 */
function getAdaptiveGridClass(count) {
  if (count === 1) {
    return 'grid grid-cols-1 max-w-[220px] mx-auto';
  } else if (count === 2) {
    return 'grid grid-cols-2 max-w-md mx-auto gap-2.5 sm:gap-3.5';
  } else if (count === 3) {
    return 'grid grid-cols-3 max-w-2xl mx-auto gap-2.5 sm:gap-3.5';
  } else {
    // 4 atau lebih: 2 kolom di mobile, 4 kolom di layar sm ke atas
    return 'grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5';
  }
}

/* ==========================================================================
   7. MODAL DIALOGS (Video & Foto Popups with Full Descriptions)
   ========================================================================== */

function setupModals() {
  // Video Modal Close Handlers
  const closeVideoBtn = document.getElementById('close-video-modal-btn');
  const videoBackdrop = document.getElementById('video-modal-backdrop');
  if (closeVideoBtn) closeVideoBtn.addEventListener('click', closeVideoModal);
  if (videoBackdrop) videoBackdrop.addEventListener('click', closeVideoModal);

  // Foto Modal Close Handlers
  const closeFotoBtn = document.getElementById('close-foto-modal-btn');
  const fotoBackdrop = document.getElementById('foto-modal-backdrop');
  if (closeFotoBtn) closeFotoBtn.addEventListener('click', closeFotoModal);
  if (fotoBackdrop) fotoBackdrop.addEventListener('click', closeFotoModal);

  // Keyboard Escape Key Handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeVideoModal();
      closeFotoModal();
    }
  });

  // Pasang listener pada kartu statis HTML jika dynamic render belum selesai
  bindStaticVideoCards();
}

function bindStaticVideoCards() {
  const staticVideoCards = document.querySelectorAll('#home-video-grid .video-card-item');
  staticVideoCards.forEach(card => {
    if (!card.dataset.bound) {
      card.dataset.bound = 'true';
      card.addEventListener('click', () => {
        const idx = parseInt(card.getAttribute('data-video-index'), 10);
        if (!isNaN(idx) && DEFAULT_VIDEOS[idx]) {
          openVideoModal(DEFAULT_VIDEOS[idx]);
        }
      });
    }
  });
}

function openVideoModal(item) {
  const modal = document.getElementById('video-modal');
  if (!modal || !item) return;

  const titleEl = document.getElementById('video-modal-title');
  const dateEl = document.getElementById('video-modal-date');
  const authorEl = document.getElementById('video-modal-author');
  const descEl = document.getElementById('video-modal-desc');
  const linkEl = document.getElementById('video-modal-link');
  const playerContainer = document.getElementById('video-modal-player-container');

  const cleanTitle = cleanMediaTitle(item.title);
  const pubDate = formatDateIndo(item.created_at || item.published_at || item.date);
  const author = item.authorRole ? `${item.author} (${item.authorRole})` : (item.author || 'Redaksi Japakeh Post');
  const articleUrl = item.slug ? `artikel.html?slug=${encodeURIComponent(item.slug)}` : 'internasional.html?cat=video';

  const ytid = item.youtube_id || extractYouTubeId(item.youtube_url || item.video_url || '') || '';
  const thumb = item.thumbnail_url || (ytid ? `https://img.youtube.com/vi/${ytid}/hqdefault.jpg` : getThumb(item.thumbnail || item.image));

  if (titleEl) titleEl.textContent = cleanTitle;
  if (dateEl) dateEl.textContent = pubDate;
  if (authorEl) authorEl.textContent = `Peliput: ${author}`;
  if (linkEl) {
    linkEl.href = articleUrl;
    if (!item.slug) {
      linkEl.innerHTML = `<span>Buka Kanal Video Lengkap &rarr;</span>`;
    } else {
      linkEl.innerHTML = `<span>Buka Halaman Artikel Lengkap &rarr;</span>`;
    }
  }

  // Bersihkan dan sajikan konten deskripsi
  if (descEl) {
    const rawDesc = item.caption || item.description || item.content || item.excerpt || 'Liputan video jurnalisme terpercaya Japakeh Post.';
    let cleanContent = typeof rawDesc === 'string' && rawDesc.startsWith('<') ? rawDesc : `<p>${escapeHtml(rawDesc)}</p>`;
    cleanContent = cleanContent.replace(/<div class="my-6 p-4[\s\S]*?<\/div>/gi, '');
    descEl.innerHTML = cleanContent;
  }

  // Player Video Interaktif YouTube Embed
  if (playerContainer) {
    if (ytid) {
      playerContainer.innerHTML = `
        <iframe 
          src="https://www.youtube-nocookie.com/embed/${ytid}?autoplay=1&rel=0" 
          title="${escapeHtml(cleanTitle)}" 
          class="w-full h-full border-0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      `;
    } else {
      renderInteractiveVideoPlayer(playerContainer, thumb, cleanTitle);
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function renderInteractiveVideoPlayer(container, thumb, title) {
  container.innerHTML = `
    <div class="relative w-full h-full bg-black group/player">
      <img src="${thumb}" alt="${escapeHtml(title)}" class="w-full h-full object-cover opacity-85" />
      
      <!-- Video Gradient Overlay -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/40"></div>

      <!-- Center Play Button with Live Pulse -->
      <div class="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        <button type="button" class="w-16 h-16 rounded-full bg-[#E60000] text-white flex items-center justify-center shadow-2xl hover:scale-110 hover:bg-red-700 transition-all cursor-pointer animate-pulse" aria-label="Putar Video">
          <svg class="w-8 h-8 ml-1 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <span class="text-xs font-semibold text-white/90 mt-3 drop-shadow-md">Klik untuk Menonton Video Berita Lengkap</span>
      </div>

      <!-- Player Controls Bar at Bottom -->
      <div class="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black to-transparent flex items-center justify-between text-xs text-white">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
          <span class="text-[10px] font-bold uppercase tracking-wider text-rose-300">Japakeh Video Stream</span>
        </div>
        <span class="text-[11px] font-mono text-slate-300">HD 1080p &bull; 02:45</span>
      </div>
    </div>
  `;
}

function closeVideoModal() {
  const modal = document.getElementById('video-modal');
  if (!modal) return;
  const playerContainer = document.getElementById('video-modal-player-container');
  if (playerContainer) playerContainer.innerHTML = '';
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
}

function openFotoModal(item) {
  const modal = document.getElementById('foto-modal');
  if (!modal || !item) return;

  const imgEl = document.getElementById('foto-modal-img');
  const titleEl = document.getElementById('foto-modal-title');
  const dateEl = document.getElementById('foto-modal-date');
  const authorEl = document.getElementById('foto-modal-author');
  const descEl = document.getElementById('foto-modal-desc');
  const linkEl = document.getElementById('foto-modal-link');

  const cleanTitle = cleanMediaTitle(item.title);
  const pubDate = formatDateIndo(item.published_at || item.date);
  const author = item.authorRole ? `${item.author} (${item.authorRole})` : (item.author || 'Redaksi Japakeh Post');
  const articleUrl = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
  const thumb = getThumb(item.thumbnail || item.image);

  if (imgEl) {
    imgEl.src = thumb;
    imgEl.alt = cleanTitle;
  }
  if (titleEl) titleEl.textContent = cleanTitle;
  if (dateEl) dateEl.textContent = pubDate;
  if (authorEl) authorEl.textContent = `Dokumentasi Foto: ${author}`;
  if (linkEl) linkEl.href = articleUrl;

  if (descEl) {
    descEl.innerHTML = item.content || `<p>${escapeHtml(item.excerpt)}</p>`;
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeFotoModal() {
  const modal = document.getElementById('foto-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
}
