/**
 * Japakeh Post - Main Application Logic
 * Modern, Professional, Mobile-First Indonesian Online News Portal
 */

document.addEventListener('DOMContentLoaded', () => {
  initLiveDate();
  initMobileDrawer();
  initBreakingNewsTicker();
  initBookmarkSystem();
  initQuickSearch();
  initCategoryScroller();
  initCategoryOverflowNav();
  highlightActiveNav();
  loadDynamicCategoriesNav();
});

/* --------------------------------------------------------------------------
   1. Live Date & Time (Indonesian Format)
   -------------------------------------------------------------------------- */
function initLiveDate() {
  const dateContainers = document.querySelectorAll('.live-date-text');
  if (!dateContainers.length) return;

  function update() {
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayName = days[now.getDay()];
    const date = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const formatted = `${dayName}, ${date} ${monthName} ${year} | ${hours}:${minutes}:${seconds} WIB`;
    dateContainers.forEach(el => el.textContent = formatted);
  }

  update();
  setInterval(update, 1000);
}

/* --------------------------------------------------------------------------
   2. Mobile Hamburger Menu Drawer
   -------------------------------------------------------------------------- */
function initMobileDrawer() {
  const openBtns = document.querySelectorAll('.mobile-menu-btn');
  const closeBtns = document.querySelectorAll('.close-drawer-btn');
  const drawer = document.getElementById('mobile-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const panel = document.getElementById('drawer-panel');

  if (!drawer || !backdrop || !panel) return;

  function openDrawer() {
    drawer.classList.remove('hidden');
    // slight delay to trigger transition
    setTimeout(() => {
      backdrop.classList.add('active');
      panel.classList.add('active');
      document.body.style.overflow = 'hidden';
    }, 10);
  }

  function closeDrawer() {
    backdrop.classList.remove('active');
    panel.classList.remove('active');
    setTimeout(() => {
      drawer.classList.add('hidden');
      document.body.style.overflow = '';
    }, 300);
  }

  openBtns.forEach(btn => btn.addEventListener('click', openDrawer));
  closeBtns.forEach(btn => btn.addEventListener('click', closeDrawer));
  backdrop.addEventListener('click', closeDrawer);

  // Close when pressing ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.classList.contains('hidden')) {
      closeDrawer();
    }
  });
}

/* --------------------------------------------------------------------------
   3. Breaking News Ticker
   -------------------------------------------------------------------------- */
async function initBreakingNewsTicker() {
  const track = document.getElementById('breaking-ticker-track');
  const nextBtn = document.getElementById('ticker-next-btn');
  if (!track || nextBtn) return; // If nextBtn is present, home-live.js handles single-headline rotator ticker

  let items = [];

  if (window.BuserInfoAPI) {
    try {
      const res = await window.BuserInfoAPI.getArticles({ limit: 8, status: 'published' });
      const articles = res.articles || [];
      if (articles.length > 0) {
        items = articles.map(art => ({
          title: art.title,
          category: (art.name_kategori || 'Terkini').toUpperCase(),
          link: `artikel.html?slug=${encodeURIComponent(art.slug)}`
        }));
      }
    } catch (e) {}
  }

  if (items.length === 0) {
    items = [
      {
        title: 'Selamat Datang di Japakeh Post — Cepat, Akurat, Terpercaya',
        category: 'INFO',
        link: 'tentang.html'
      },
      {
        title: 'Japakeh Post berkomitmen menyajikan karya jurnalistik independen, berimbang, dan tepercaya',
        category: 'REDAKSI',
        link: 'tentang.html'
      },
      {
        title: 'Layanan Pengaduan & Informasi Warga: Hubungi WhatsApp 082165071114',
        category: 'HOTLINE',
        link: 'https://wa.me/6282165071114'
      }
    ];
  }

  let html = '';
  // Repeat items for continuous marquee loop
  const repeatCount = 2;
  for (let r = 0; r < repeatCount; r++) {
    items.forEach((item) => {
      html += `
        <a href="${item.link}" class="inline-flex items-center text-xs sm:text-sm font-semibold text-slate-900 hover:text-buser-red mr-8 transition-colors group">
          <span class="inline-block w-2 h-2 rounded-full bg-buser-red mr-2.5 flex-shrink-0"></span>
          <span class="bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded-full font-bold mr-2 uppercase tracking-wider">${item.category || 'TERKINI'}</span>
          <span class="group-hover:underline">${item.title}</span>
        </a>
      `;
    });
  }

  track.innerHTML = html;
}

/* --------------------------------------------------------------------------
   4. LocalStorage Bookmark System
   -------------------------------------------------------------------------- */
const BOOKMARK_KEY = 'buser_saved_articles';

function getSavedBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading bookmarks', e);
    return [];
  }
}

function saveBookmark(id) {
  const list = getSavedBookmarks();
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(list));
    updateBookmarkUI();
    showToast('Berita berhasil disimpan ke daftar baca!', 'success');
  }
}

function removeBookmark(id) {
  let list = getSavedBookmarks();
  list = list.filter(item => item !== id);
  localStorage.setItem(BOOKMARK_KEY, JSON.stringify(list));
  updateBookmarkUI();
  showToast('Berita dihapus dari daftar baca', 'info');
}

function toggleBookmark(id) {
  const list = getSavedBookmarks();
  if (list.includes(id)) {
    removeBookmark(id);
    return false;
  } else {
    saveBookmark(id);
    return true;
  }
}

function isBookmarked(id) {
  const list = getSavedBookmarks();
  return list.includes(id);
}

function updateBookmarkUI() {
  const list = getSavedBookmarks();
  const badges = document.querySelectorAll('.bookmark-count-badge');
  badges.forEach(badge => {
    badge.textContent = list.length;
    if (list.length > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  });

  // Render modal content if open
  renderBookmarkModalList();
}

function renderBookmarkModalList() {
  const container = document.getElementById('bookmark-modal-list');
  if (!container || typeof window.NewsDB === 'undefined') return;

  const list = getSavedBookmarks();
  if (list.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 px-4">
        <svg class="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <p class="font-bold text-gray-700 text-base mb-1">Belum Ada Berita Tersimpan</p>
        <p class="text-xs text-gray-500">Klik ikon bookmark pada artikel untuk menyimpannya ke daftar baca offline Anda.</p>
      </div>
    `;
    return;
  }

  let html = '';
  list.forEach(id => {
    const article = window.NewsDB.getById(id);
    if (!article) return;
    html += `
      <div class="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-sm hover:border-buser-red transition-all group">
        <img src="${article.image}" alt="${article.title}" class="w-20 h-16 object-cover rounded-sm flex-shrink-0" />
        <div class="flex-1 min-w-0">
          <span class="text-[10px] font-bold text-buser-red uppercase tracking-wider">${article.category}</span>
          <a href="${article.slug ? 'artikel.html?slug=' + encodeURIComponent(article.slug) : 'artikel.html?id=' + article.id}" class="block text-sm font-bold text-gray-900 group-hover:text-buser-red line-clamp-2 leading-snug">
            ${article.title}
          </a>
          <div class="flex items-center justify-between mt-2">
            <span class="text-[11px] text-gray-500">${article.date}</span>
            <button onclick="removeBookmark('${article.id}')" class="text-xs text-red-600 hover:text-red-800 font-semibold inline-flex items-center">
              <svg class="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Hapus
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function initBookmarkSystem() {
  updateBookmarkUI();

  const openBtns = document.querySelectorAll('.open-bookmark-btn');
  const closeBtns = document.querySelectorAll('.close-bookmark-btn');
  const modal = document.getElementById('bookmark-modal');
  const backdrop = document.getElementById('bookmark-backdrop');
  const panel = document.getElementById('bookmark-panel');

  if (!modal || !backdrop || !panel) return;

  function openModal() {
    renderBookmarkModalList();
    modal.classList.remove('hidden');
    setTimeout(() => {
      backdrop.classList.add('active');
      panel.classList.add('active');
      document.body.style.overflow = 'hidden';
    }, 10);
  }

  function closeModal() {
    backdrop.classList.remove('active');
    panel.classList.remove('active');
    setTimeout(() => {
      modal.classList.add('hidden');
      document.body.style.overflow = '';
    }, 300);
  }

  openBtns.forEach(b => b.addEventListener('click', openModal));
  closeBtns.forEach(b => b.addEventListener('click', closeModal));
  backdrop.addEventListener('click', closeModal);
}

/* --------------------------------------------------------------------------
   5. Quick Search Modal & Redirection
   -------------------------------------------------------------------------- */
function initQuickSearch() {
  const triggerBtns = document.querySelectorAll('.open-search-modal-btn');
  const searchModal = document.getElementById('search-modal') || document.getElementById('quick-search-modal');
  const searchBackdrop = document.getElementById('search-modal-backdrop');
  const searchInput = (searchModal ? searchModal.querySelector('input[name="q"]') : null) || document.getElementById('quick-search-input');
  const searchForm = (searchModal ? searchModal.querySelector('form') : null) || document.getElementById('quick-search-form');
  const closeBtn = document.getElementById('close-search-modal-btn');

  if (!searchModal) return;

  // Kontainer hasil live search di dalam modal DOM
  let liveResultsContainer = document.getElementById('quick-search-live-results');
  if (!liveResultsContainer && searchForm) {
    liveResultsContainer = document.createElement('div');
    liveResultsContainer.id = 'quick-search-live-results';
    liveResultsContainer.className = 'mt-3 max-h-72 overflow-y-auto divide-y divide-slate-100 hidden rounded-xl border border-slate-200 bg-slate-50/70 p-2 shadow-inner';
    searchForm.appendChild(liveResultsContainer);
  }

  function openSearch() {
    searchModal.classList.remove('hidden');
    searchModal.classList.add('flex');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 50);
  }

  function closeSearch() {
    searchModal.classList.add('hidden');
    searchModal.classList.remove('flex');
    document.body.style.overflow = '';
    if (liveResultsContainer) {
      liveResultsContainer.classList.add('hidden');
      liveResultsContainer.innerHTML = '';
    }
  }

  triggerBtns.forEach(btn => btn.addEventListener('click', openSearch));
  if (closeBtn) closeBtn.addEventListener('click', closeSearch);
  if (searchBackdrop) searchBackdrop.addEventListener('click', closeSearch);

  // Live real-time search langsung di dalam modal Quick Search
  let quickSearchTimer;
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(quickSearchTimer);
      quickSearchTimer = setTimeout(() => {
        const val = searchInput.value.trim();
        if (!liveResultsContainer) return;

        if (val.length < 2) {
          liveResultsContainer.innerHTML = '';
          liveResultsContainer.classList.add('hidden');
          return;
        }

        const matches = (window.NewsDB && typeof window.NewsDB.search === 'function')
          ? window.NewsDB.search(val)
          : [];

        if (matches.length === 0) {
          liveResultsContainer.innerHTML = `
            <div class="py-4 text-center text-xs text-slate-500">
              Tidak ada berita yang cocok dengan kata kunci "<strong>${escapeQuickHtml(val)}</strong>".
            </div>
          `;
          liveResultsContainer.classList.remove('hidden');
          return;
        }

        const topMatches = matches.slice(0, 4);
        liveResultsContainer.innerHTML = `
          <div class="px-2 py-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Hasil Terkait (${matches.length})</span>
            <span class="text-buser-red font-semibold lowercase">klik untuk baca</span>
          </div>
          ${topMatches.map(item => {
            const url = item.slug ? `artikel.html?slug=${encodeURIComponent(item.slug)}` : `artikel.html?id=${item.id}`;
            const thumb = item.image || item.thumbnail || 'assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg';
            const cat = item.category || item.name_kategori || 'Berita';
            return `
              <a href="${url}" class="flex items-center gap-3 p-2 rounded-lg hover:bg-white hover:shadow-xs transition-all group">
                <img src="${thumb}" alt="${escapeQuickHtml(item.title)}" class="w-12 h-12 object-cover rounded-md flex-shrink-0 bg-slate-900" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
                <div class="flex-1 min-w-0 text-left">
                  <span class="text-[9px] font-bold text-buser-red uppercase tracking-wider">${escapeQuickHtml(cat)}</span>
                  <h4 class="text-xs font-bold text-slate-900 group-hover:text-buser-red line-clamp-1 transition-colors leading-tight">
                    ${escapeQuickHtml(item.title)}
                  </h4>
                  <span class="text-[10px] text-slate-400">${escapeQuickHtml(item.date || 'Terbaru')}</span>
                </div>
              </a>
            `;
          }).join('')}
          <div class="pt-2 text-center">
            <a href="cari.html?q=${encodeURIComponent(val)}" class="text-xs font-bold text-buser-red hover:text-buser-redHover transition-colors inline-flex items-center">
              Lihat semua ${matches.length} hasil di Halaman Cari Berita &rarr;
            </a>
          </div>
        `;
        liveResultsContainer.classList.remove('hidden');
      }, 150);
    });
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = searchInput ? searchInput.value.trim() : '';
      if (val) {
        window.location.href = `cari.html?q=${encodeURIComponent(val)}`;
      }
    });
  }

  // Keyboard shortcut Ctrl+K or /
  window.addEventListener('keydown', (e) => {
    if ((e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) || (e.ctrlKey && e.key === 'k')) {
      e.preventDefault();
      openSearch();
    }
  });
}

function escapeQuickHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* --------------------------------------------------------------------------
   6. Horizontal Category Navigation Scroll Controls
   -------------------------------------------------------------------------- */
function initCategoryScroller() {
  const navContainer = document.getElementById('category-scroll-nav');
  const leftBtn = document.getElementById('scroll-nav-left');
  const rightBtn = document.getElementById('scroll-nav-right');

  if (!navContainer) return;

  if (leftBtn) {
    leftBtn.addEventListener('click', () => {
      navContainer.scrollBy({ left: -160, behavior: 'smooth' });
    });
  }
  if (rightBtn) {
    rightBtn.addEventListener('click', () => {
      navContainer.scrollBy({ left: 160, behavior: 'smooth' });
    });
  }
}

/* --------------------------------------------------------------------------
   6b. Category Navigation Overflow & Extra Categories Dropdown
   (Navigasi kategori yang ditampilkan maksimal 10, sisanya di menu titik/garis tiga)
   -------------------------------------------------------------------------- */
function bindCategoryMoreEvents() {
  const moreContainer = document.getElementById('category-more-container');
  const moreDropdown = document.getElementById('category-more-dropdown');
  const moreBtn = document.getElementById('category-more-btn');
  const moreArrow = document.getElementById('category-more-arrow');

  if (!moreContainer || !moreDropdown || !moreBtn) return;

  if (!moreBtn.dataset.bound) {
    moreBtn.dataset.bound = 'true';
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isClosed = moreDropdown.classList.contains('hidden');
      if (isClosed) {
        moreDropdown.classList.remove('hidden');
        moreBtn.setAttribute('aria-expanded', 'true');
        if (moreArrow) moreArrow.classList.add('rotate-180');
      } else {
        moreDropdown.classList.add('hidden');
        moreBtn.setAttribute('aria-expanded', 'false');
        if (moreArrow) moreArrow.classList.remove('rotate-180');
      }
    });

    document.addEventListener('click', (e) => {
      if (!moreContainer.contains(e.target)) {
        moreDropdown.classList.add('hidden');
        moreBtn.setAttribute('aria-expanded', 'false');
        if (moreArrow) moreArrow.classList.remove('rotate-180');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        moreDropdown.classList.add('hidden');
        moreBtn.setAttribute('aria-expanded', 'false');
        if (moreArrow) moreArrow.classList.remove('rotate-180');
      }
    });
  }
}

function initCategoryOverflowNav() {
  const navContainer = document.getElementById('category-scroll-nav');
  const moreContainer = document.getElementById('category-more-container');
  const moreDropdown = document.getElementById('category-more-dropdown');

  if (!navContainer || !moreContainer || !moreDropdown) return;

  const links = Array.from(navContainer.querySelectorAll('.cat-nav-link'));
  const MAX_VISIBLE = 10;

  if (links.length > MAX_VISIBLE) {
    moreContainer.classList.remove('hidden');
    moreContainer.classList.add('flex');
    moreDropdown.innerHTML = '';

    const overflowLinks = links.slice(MAX_VISIBLE);
    overflowLinks.forEach(link => {
      link.remove();
      const item = document.createElement('a');
      item.href = link.getAttribute('href');
      item.className = 'cat-nav-link block px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-rose-50 hover:text-buser-red transition-colors whitespace-nowrap border-b border-slate-100 last:border-0';
      item.textContent = link.textContent.trim();
      moreDropdown.appendChild(item);
    });
  } else {
    // Cek apakah di dropdown sudah ada link yang didefinisikan
    const dropdownLinks = moreDropdown.querySelectorAll('.cat-nav-link');
    if (dropdownLinks.length === 0) {
      moreContainer.classList.add('hidden');
      moreContainer.classList.remove('flex');
    } else {
      moreContainer.classList.remove('hidden');
      moreContainer.classList.add('flex');
    }
  }

  bindCategoryMoreEvents();
}

/* --------------------------------------------------------------------------
   6c. Dynamic Category Loader from PostgreSQL / MySQL Database
   (Memastikan kategori baru yang ditambah di admin langsung otomatis muncul di navigasi)
   -------------------------------------------------------------------------- */
async function loadDynamicCategoriesNav() {
  const navContainer = document.getElementById('category-scroll-nav');
  const moreContainer = document.getElementById('category-more-container');
  const moreDropdown = document.getElementById('category-more-dropdown');

  if (!navContainer) return;

  const api = window.JapakehPostAPI || window.BuserInfoAPI;
  if (!api || typeof api.getCategories !== 'function') return;

  try {
    const rawCategories = await api.getCategories();
    if (!Array.isArray(rawCategories) || rawCategories.length === 0) return;

    // Filter kategori: buang 'home' dan buang 'opini' sesuai permintaan pengguna
    const filtered = rawCategories.filter(c => {
      const slug = (c.slug || '').toLowerCase();
      return slug !== 'home' && slug !== 'opini';
    });

    if (filtered.length === 0) return;

    // Urutkan kategori: Prioritas rubrik utama dahulu, kemudian kategori tambahan (foto, video, olahraga, tokoh, dll)
    const PRIMARY_ORDER = ['daerah', 'nasional', 'politik', 'hukum', 'ekonomi', 'bisnis', 'pendidikan', 'teknologi', 'internasional'];
    filtered.sort((a, b) => {
      const aSlug = (a.slug || '').toLowerCase();
      const bSlug = (b.slug || '').toLowerCase();
      const aIdx = PRIMARY_ORDER.indexOf(aSlug);
      const bIdx = PRIMARY_ORDER.indexOf(bSlug);

      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return (a.id_kategori || 0) - (b.id_kategori || 0);
    });

    // Track utama maksimal 10 tombol (1 'Home' + 9 kategori pertama)
    // Sisanya masuk ke dropdown 'Lainnya' (tombol titik/garis tiga)
    const MAX_TRACK_ITEMS = 10;
    const trackCategories = filtered.slice(0, MAX_TRACK_ITEMS - 1);
    const overflowCategories = filtered.slice(MAX_TRACK_ITEMS - 1);

    // 1. Render Track Utama (Clean underline style matching UI DESKTOP.jpeg)
    let trackHtml = `
      <a href="index.html" class="cat-nav-link whitespace-nowrap text-[#E60000] border-b-2 border-[#E60000] pb-1 transition-colors text-xs font-bold uppercase tracking-wider">Home</a>
    `;
    trackCategories.forEach(cat => {
      const name = cat.name_kategori || cat.name || cat.slug;
      const slug = (cat.slug || '').toLowerCase();
      trackHtml += `
        <a href="internasional.html?cat=${encodeURIComponent(slug)}" class="cat-nav-link whitespace-nowrap text-slate-800 hover:text-[#E60000] border-b-2 border-transparent pb-1 transition-colors text-xs font-bold uppercase tracking-wider">${escapeQuickHtml(name)}</a>
      `;
    });
    navContainer.innerHTML = trackHtml;

    // 2. Render Dropdown Menu Kategori Tambahan
    if (moreContainer && moreDropdown) {
      if (overflowCategories.length > 0) {
        moreContainer.classList.remove('hidden');
        moreContainer.classList.add('flex');

        let dropHtml = '';
        overflowCategories.forEach(cat => {
          const name = cat.name_kategori || cat.name || cat.slug;
          const slug = (cat.slug || '').toLowerCase();
          dropHtml += `
            <a href="internasional.html?cat=${encodeURIComponent(slug)}" class="cat-nav-link block px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-rose-50 hover:text-buser-red transition-colors whitespace-nowrap border-b border-slate-100 last:border-0">${escapeQuickHtml(name)}</a>
          `;
        });
        moreDropdown.innerHTML = dropHtml;
      } else {
        moreContainer.classList.add('hidden');
        moreContainer.classList.remove('flex');
        moreDropdown.innerHTML = '';
      }
    }

    // 3. Update Mobile Drawer (Kanal Berita) secara dinamis
    const mobileDrawer = document.getElementById('mobile-drawer');
    if (mobileDrawer) {
      const navGroup = mobileDrawer.querySelector('.divide-y > div:first-child');
      if (navGroup) {
        let mobileHtml = `
          <span class="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-2">Kanal Berita</span>
          <a href="index.html" class="block px-3 py-2 rounded-xl hover:bg-slate-800/60 text-slate-300 hover:text-white transition-colors">Beranda</a>
        `;
        filtered.forEach(cat => {
          const name = cat.name_kategori || cat.name || cat.slug;
          const slug = (cat.slug || '').toLowerCase();
          mobileHtml += `
            <a href="internasional.html?cat=${encodeURIComponent(slug)}" class="block px-3 py-2 rounded-xl hover:bg-slate-800/60 text-slate-300 hover:text-white transition-colors">${escapeQuickHtml(name)}</a>
          `;
        });
        navGroup.innerHTML = mobileHtml;
      }
    }

    // 4. Update status aktif & pastikan event listener tombol menu tetap terikat
    bindCategoryMoreEvents();
    highlightActiveNav();

  } catch (err) {
    console.warn('[loadDynamicCategoriesNav] Error loading dynamic categories:', err);
  }
}

/* --------------------------------------------------------------------------
   7. Active Navigation State
   -------------------------------------------------------------------------- */
function highlightActiveNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const searchParams = new URLSearchParams(window.location.search);
  const currentCat = searchParams.get('cat');

  const navLinks = document.querySelectorAll('.cat-nav-link');
  let hasActiveInMore = false;

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    let isActive = false;
    if (currentPath === 'index.html' && (href === 'index.html' || href === './')) {
      isActive = true;
    } else if ((currentPath === 'internasional.html' || currentPath === 'kategori.html') && !currentCat && (href.startsWith('internasional.html') || href.startsWith('kategori.html')) && !href.includes('?cat=')) {
      isActive = true;
    } else if (currentCat && href.includes(`cat=${currentCat}`)) {
      isActive = true;
    }

    if (isActive) {
      if (link.closest('#category-scroll-nav')) {
        link.classList.add('text-[#E60000]', 'border-[#E60000]');
        link.classList.remove('text-slate-800', 'border-transparent');
      } else {
        link.classList.add('bg-buser-red', 'text-white', 'shadow-xs');
        link.classList.remove('text-slate-700', 'hover:bg-rose-50', 'hover:text-buser-red');
      }
      if (link.closest('#category-more-dropdown')) {
        hasActiveInMore = true;
      }
    } else {
      if (link.closest('#category-scroll-nav')) {
        link.classList.remove('text-[#E60000]', 'border-[#E60000]');
        link.classList.add('text-slate-800', 'border-transparent');
      } else if (!link.closest('#category-more-dropdown')) {
        link.classList.remove('bg-buser-red', 'text-white', 'shadow-xs');
        link.classList.add('text-slate-700', 'hover:bg-rose-50', 'hover:text-buser-red');
      }
    }
  });

  const moreBtn = document.getElementById('category-more-btn');
  if (moreBtn && hasActiveInMore) {
    moreBtn.classList.add('bg-rose-50', 'border-buser-red', 'text-buser-red');
  }
}

/* --------------------------------------------------------------------------
   8. Global Toast Notification Helper
   -------------------------------------------------------------------------- */
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-xs';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-[#0F172A] border-l-4 border-[#C8102E]' : 'bg-[#1E293B] border-l-4 border-slate-400';
  toast.className = `${bgColor} text-white px-4 py-3 rounded-xl shadow-soft text-sm flex items-center justify-between transition-all duration-300 transform translate-y-2 opacity-0 border border-slate-800/80`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="ml-3 text-gray-400 hover:text-white">&times;</button>
  `;

  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  }, 10);

  const closeToast = () => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('button').addEventListener('click', closeToast);
  setTimeout(closeToast, 3500);
}

// Expose globals
window.saveBookmark = saveBookmark;
window.removeBookmark = removeBookmark;
window.toggleBookmark = toggleBookmark;
window.isBookmarked = isBookmarked;
window.showToast = showToast;
