/**
 * Japakeh Post - Search Page Script
 * Real-time news search, DOM rendering, category filters, sorting, and empty state handling.
 * Mendukung pencarian DOM client-side (NewsDB) & terhubung ke REST API jika tersedia.
 */

let currentCategory = 'all';
let currentSort = 'newest';
let searchDebounceTimeout = null;
let currentSearchSeq = 0;

document.addEventListener('DOMContentLoaded', () => {
  initSearchPage();
});

async function initSearchPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q') || '';
  const initialCat = urlParams.get('cat') || 'all';

  const searchInput = document.getElementById('search-page-input');
  const searchForm = document.getElementById('search-page-form');
  const clearBtn = document.getElementById('clear-search-btn');
  const sortSelect = document.getElementById('search-sort-select');

  if (searchInput) {
    searchInput.value = initialQuery;
  }
  if (initialCat) {
    currentCategory = initialCat;
  }

  // Update visibility tombol clear awal
  updateClearBtnVisibility();

  // Pasang listener ke pill yang sudah ada di DOM langsung agar responsif seketika
  attachPillListeners();

  // Highlight kategori aktif
  updateActivePill(currentCategory);

  // Jalankan pencarian awal segera tanpa hambatan
  performSearch(initialQuery, currentCategory, currentSort);

  // Muat kategori tambahan secara dinamis dari database di background jika API tersedia
  initCategoryPills();

  // Form submit event
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = searchInput ? searchInput.value.trim() : '';
      updateUrl(query, currentCategory);
      performSearch(query, currentCategory, currentSort);
    });
  }

  // Real-time input dengan debounce halus (200ms)
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      updateClearBtnVisibility();
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        const query = searchInput.value.trim();
        updateUrl(query, currentCategory);
        performSearch(query, currentCategory, currentSort);
      }, 200);
    });
  }

  // Tombol bersihkan input (Clear Button)
  if (clearBtn && searchInput) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchInput.focus();
      updateClearBtnVisibility();
      updateUrl('', currentCategory);
      performSearch('', currentCategory, currentSort);
    });
  }

  // Sort select event
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      const query = searchInput ? searchInput.value.trim() : '';
      performSearch(query, currentCategory, currentSort);
    });
  }
}

/**
 * Pengaturan visibilitas tombol hapus pencarian (Clear Button)
 */
function updateClearBtnVisibility() {
  const searchInput = document.getElementById('search-page-input');
  const clearBtn = document.getElementById('clear-search-btn');
  if (!clearBtn || !searchInput) return;

  if (searchInput.value.trim().length > 0) {
    clearBtn.style.display = 'block';
    clearBtn.classList.remove('hidden');
  } else {
    clearBtn.style.display = 'none';
    clearBtn.classList.add('hidden');
  }
}

/**
 * Inisialisasi pill kategori dari database atau DOM
 */
async function initCategoryPills() {
  const container = document.getElementById('search-cat-pills-container');
  if (!container) return;

  const api = window.JapakehPostAPI || window.BuserInfoAPI;
  if (api) {
    try {
      const categories = await api.getCategories();
      if (Array.isArray(categories) && categories.length > 0) {
        container.innerHTML = `
          <span class="text-slate-400 text-xs font-semibold mr-1 hidden sm:inline">Kategori:</span>
          <button type="button" data-cat="all" class="search-cat-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${currentCategory === 'all' ? 'bg-buser-red text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">Semua</button>
          ${categories.map(cat => {
            const isActive = currentCategory.toLowerCase() === String(cat.slug || '').toLowerCase();
            return `
              <button type="button" data-cat="${escapeHtml(cat.slug)}" class="search-cat-pill px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${isActive ? 'bg-buser-red text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
                ${escapeHtml(cat.name_kategori || cat.name)}
              </button>
            `;
          }).join('')}
        `;
        attachPillListeners();
      }
    } catch (err) {
      // Menggunakan pill bawaan yang sudah dirender di HTML
    }
  }
}

function attachPillListeners() {
  const searchInput = document.getElementById('search-page-input');
  const catPills = document.querySelectorAll('.search-cat-pill');

  catPills.forEach(pill => {
    // Hindari duplikasi listener jika dipanggil kembali
    pill.replaceWith(pill.cloneNode(true));
  });

  const refreshedPills = document.querySelectorAll('.search-cat-pill');
  refreshedPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const cat = pill.getAttribute('data-cat') || 'all';
      currentCategory = cat;
      updateActivePill(cat);
      const query = searchInput ? searchInput.value.trim() : '';
      updateUrl(query, cat);
      performSearch(query, cat, currentSort);
    });
  });
}

function updateActivePill(activeCat) {
  const catPills = document.querySelectorAll('.search-cat-pill');
  catPills.forEach(pill => {
    const cat = pill.getAttribute('data-cat') || 'all';
    if (cat.toLowerCase() === String(activeCat || '').toLowerCase()) {
      pill.classList.remove('bg-slate-100', 'text-slate-700', 'hover:bg-slate-200', 'bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
      pill.classList.add('bg-buser-red', 'text-white', 'shadow-xs');
    } else {
      pill.classList.remove('bg-buser-red', 'text-white', 'shadow-xs');
      pill.classList.add('bg-slate-100', 'text-slate-700', 'hover:bg-slate-200');
    }
  });
}

function updateUrl(query, cat) {
  const params = new URLSearchParams();
  if (query) params.set('q', query);
  if (cat && cat !== 'all') params.set('cat', cat);
  const newQueryStr = params.toString();
  const newUrl = newQueryStr ? `${window.location.pathname}?${newQueryStr}` : window.location.pathname;
  window.history.replaceState({}, '', newUrl);
}

/**
 * Eksekusi Pencarian Berita (DOM & Database dengan Graceful Fallback)
 */
async function performSearch(query, category, sort) {
  const searchSeq = ++currentSearchSeq;
  const container = document.getElementById('search-results-container');
  const countLabel = document.getElementById('search-results-count');
  const emptyState = document.getElementById('search-empty-state');
  const queryDisplay = document.getElementById('search-query-display');

  if (!container) return;

  const trimmedQuery = String(query || '').trim();
  const activeCat = String(category || 'all').trim();

  // Update Teks Deskripsi Pencarian di Header Hasil
  if (queryDisplay) {
    if (trimmedQuery && activeCat !== 'all') {
      queryDisplay.innerHTML = `untuk kata kunci <span class="text-buser-red font-bold">"${escapeHtml(trimmedQuery)}"</span> dalam kategori <span class="text-buser-red font-bold">"${escapeHtml(activeCat.toUpperCase())}"</span>`;
    } else if (trimmedQuery) {
      queryDisplay.innerHTML = `untuk kata kunci <span class="text-buser-red font-bold">"${escapeHtml(trimmedQuery)}"</span>`;
    } else if (activeCat !== 'all') {
      queryDisplay.innerHTML = `dalam kategori <span class="text-buser-red font-bold">"${escapeHtml(activeCat.toUpperCase())}"</span>`;
    } else {
      queryDisplay.innerHTML = `terbaru`;
    }
  }

  let results = [];

  // 1. Coba ambil dari Database / API jika tersedia
  const api = window.JapakehPostAPI || window.BuserInfoAPI;
  if (api && typeof api.getArticles === 'function') {
    try {
      const params = {
        status: 'published',
        limit: 50
      };
      if (trimmedQuery) params.search = trimmedQuery;
      if (activeCat && activeCat !== 'all') params.kategori = activeCat;

      const data = await api.getArticles(params);
      if (searchSeq === currentSearchSeq && data && Array.isArray(data.articles)) {
        results = data.articles;
      }
    } catch (err) {
      // Fallback ke NewsDB
    }
  }

  // 2. Fallback ke NewsDB (DOM client-side data store) jika API kosong atau gagal
  if ((!results || results.length === 0) && window.NewsDB && typeof window.NewsDB.search === 'function') {
    const localMatches = window.NewsDB.search(trimmedQuery, activeCat);
    if (Array.isArray(localMatches) && localMatches.length > 0) {
      results = localMatches;
    }
  }

  // Cek apakah ada pencarian baru yang mendahului (Race condition protection)
  if (searchSeq !== currentSearchSeq) return;

  // Sorting Hasil Pencarian
  results = sortResults(results, sort);

  // Update Label Jumlah Hasil Berita
  if (countLabel) {
    countLabel.textContent = results.length;
  }

  // Tampilkan Empty State jika tidak ada hasil
  if (results.length === 0) {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (emptyState) emptyState.classList.add('hidden');

  // Render Kartu Hasil Berita ke DOM dengan keyword highlighting
  container.innerHTML = results.map(item => renderArticleCard(item, trimmedQuery)).join('');
}

/**
 * Fungsi Pengurutan Berita (Sorting)
 */
function sortResults(list, sort) {
  const arr = [...list];
  const getViews = (item) => parseInt(String(item.views || '0').replace(/\D/g, ''), 10) || 0;
  const getTimestamp = (item) => {
    if (item.timestamp) return item.timestamp;
    if (item.published_at) {
      const parsed = Date.parse(String(item.published_at).replace(' ', 'T'));
      if (!isNaN(parsed)) return parsed;
    }
    if (item.date) {
      const parsed = Date.parse(item.date);
      if (!isNaN(parsed)) return parsed;
    }
    return 0;
  };

  if (sort === 'popular') {
    arr.sort((a, b) => getViews(b) - getViews(a));
  } else if (sort === 'oldest') {
    arr.sort((a, b) => getTimestamp(a) - getTimestamp(b));
  } else {
    // Default: Terbaru (newest)
    arr.sort((a, b) => getTimestamp(b) - getTimestamp(a));
  }

  return arr;
}

/**
 * Render kartu berita tunggal dengan highlighting kata kunci
 */
function renderArticleCard(item, query) {
  const catName = item.name_kategori || item.category || 'Berita';
  const dateStr = item.published_at ? formatDateIndo(item.published_at) : (item.date || 'Baru saja');
  const thumb = getThumb(item.thumbnail || item.image);

  const articleUrl = item.slug 
    ? `artikel.html?slug=${encodeURIComponent(item.slug)}` 
    : `artikel.html?id=${encodeURIComponent(item.id || item.id_artikel || '')}`;

  const highlightedTitle = highlightKeywords(item.title, query);

  return `
    <article class="compact-news-card group flex items-start gap-3 sm:gap-4 pb-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 p-2.5 rounded-lg transition-colors">
      <a href="${articleUrl}" class="w-28 sm:w-40 h-20 sm:h-24 flex-shrink-0 relative overflow-hidden rounded-md block bg-gray-100">
        <img 
          src="${thumb}" 
          alt="${escapeHtml(item.title)}" 
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
          loading="lazy" 
          onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'"
        />
      </a>
      <div class="flex-1 min-w-0 flex flex-col justify-between h-20 sm:h-24 py-0.5">
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[11px] font-bold text-[#E60000] uppercase tracking-wider">${escapeHtml(catName)}</span>
          </div>
          <a href="${articleUrl}" class="block font-bold text-sm sm:text-base text-gray-900 group-hover:text-[#E60000] line-clamp-2 leading-snug transition-colors">
            ${highlightedTitle}
          </a>
        </div>
        <div class="flex items-center gap-1.5 text-[11px] text-gray-400">
          <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>${escapeHtml(dateStr)}</span>
        </div>
      </div>
    </article>
  `;
}

/**
 * Sorot kata kunci pada teks (Keyword Highlighting)
 */
function highlightKeywords(text, query) {
  if (!text) return '';
  const str = String(text);
  if (!query || !query.trim()) return escapeHtml(str);

  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return escapeHtml(str);

  const escaped = escapeHtml(str);
  const pattern = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');

  return escaped.replace(regex, '<mark class="bg-amber-100 text-slate-950 font-bold px-0.5 rounded-xs">$1</mark>');
}

function formatDateIndo(dateStr) {
  if (!dateStr) return 'Baru saja';
  if (typeof dateStr === 'string' && (dateStr.includes('•') || dateStr.includes('WIB') || dateStr.includes('Senin') || dateStr.includes('Selasa') || dateStr.includes('Rabu') || dateStr.includes('Kamis') || dateStr.includes('Jumat') || dateStr.includes('Sabtu') || dateStr.includes('Minggu'))) {
    return dateStr;
  }
  const safeStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(safeStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) + ' • ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

function getThumb(url) {
  return url && url.length > 5 ? url : 'assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg';
}

function escapeHtml(string) {
  if (!string) return '';
  return String(string)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
