/**
 * Japakeh Post - Integrasi Berita Dinamis ke Tabel Admin (admin/berita.html)
 * Mengelola pemuatan artikel dari REST API/MySQL, tab switching (Semua, Published, Draft, Review, Scheduled),
 * live search & filtering (Kategori, Penulis, Tanggal), bulk actions, dan hapus artikel secara real-time.
 */

document.addEventListener('DOMContentLoaded', () => {
  initBeritaTabs();
  initBeritaFilters();
  initCheckboxAndBulkActions();
  populateCategoryFilter();
  populateAuthorFilter();
  loadLiveArticlesFromDB();
  updateBeritaTabCounts();
  initNewsModalAndEditor();
  checkUrlNewsActions();
});

/**
 * 1. Inisialisasi Tab Status Berita (Semua, Published, Draft, Review, Scheduled)
 */
function initBeritaTabs() {
  const tabs = document.querySelectorAll('.news-tab-btn');
  if (!tabs || tabs.length === 0) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active', 'border-b-buser-red', 'text-buser-red', 'font-bold');
        t.classList.add('border-b-transparent', 'text-gray-500', 'font-medium');
      });
      tab.classList.add('active', 'border-b-buser-red', 'text-buser-red', 'font-bold');
      tab.classList.remove('border-b-transparent', 'text-gray-500', 'font-medium');

      applyFilters();
    });
  });
}

/**
 * 2. Inisialisasi Filter Pencarian, Kategori, Penulis, Tanggal & Reset
 */
function initBeritaFilters() {
  const searchInput = document.getElementById('filter-search');
  const catSelect = document.getElementById('filter-category');
  const authorSelect = document.getElementById('filter-author');
  const dateInput = document.getElementById('filter-date');
  const resetBtn = document.getElementById('btn-reset-filters');

  [searchInput, catSelect, authorSelect, dateInput].forEach(el => {
    if (!el) return;
    el.addEventListener('input', applyFilters);
    el.addEventListener('change', applyFilters);
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (catSelect) catSelect.value = '';
      if (authorSelect) authorSelect.value = '';
      if (dateInput) dateInput.value = '';

      applyFilters();
      if (typeof showToast === 'function') {
        showToast('info', 'Filter Direset', 'Semua kriteria pencarian telah dikembalikan.');
      }
    });
  }
}

/**
 * 3. Inisialisasi Checkbox "Pilih Semua" dan Event Delegation untuk Checkbox Baris
 */
function initCheckboxAndBulkActions() {
  const checkAll = document.getElementById('check-all');
  const tableBody = document.getElementById('news-table-body');

  if (checkAll && tableBody) {
    checkAll.addEventListener('change', () => {
      const visibleCheckboxes = tableBody.querySelectorAll('tr:not(.hidden) .row-checkbox');
      visibleCheckboxes.forEach(cb => {
        cb.checked = checkAll.checked;
      });
      updateBulkBar();
    });

    tableBody.addEventListener('change', (e) => {
      if (e.target && e.target.classList.contains('row-checkbox')) {
        // Sync mobile and desktop checkboxes inside same tr
        const tr = e.target.closest('tr');
        if (tr) {
          tr.querySelectorAll('.row-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
          });
        }
        updateBulkBar();
        updateCheckAllStatus();
      }
    });
  }
}

/**
 * Perbarui status checkbox "check-all" sesuai checkbox baris yang terlihat
 */
function updateCheckAllStatus() {
  const checkAll = document.getElementById('check-all');
  const tableBody = document.getElementById('news-table-body');
  if (!checkAll || !tableBody) return;

  const visibleRows = Array.from(tableBody.querySelectorAll('tr.news-row:not(.hidden)'));
  if (visibleRows.length === 0) {
    checkAll.checked = false;
  } else {
    checkAll.checked = visibleRows.every(r => r.querySelector('.row-checkbox')?.checked);
  }
}

/**
 * Perbarui Floating Bulk Action Bar
 */
function updateBulkBar() {
  const bulkBar = document.getElementById('bulk-action-bar');
  const selectedCount = document.getElementById('selected-count');
  if (!bulkBar || !selectedCount) return;

  const checkedIds = new Set(Array.from(document.querySelectorAll('#news-table-body .row-checkbox:checked')).map(cb => cb.value));
  if (checkedIds.size > 0) {
    bulkBar.classList.remove('hidden');
    selectedCount.textContent = checkedIds.size;
  } else {
    bulkBar.classList.add('hidden');
  }
}

/**
 * 4. Muat Kategori Real ke Dropdown Filter
 */
async function populateCategoryFilter() {
  const catSelect = document.getElementById('filter-category');
  if (!catSelect || !window.BuserInfoAPI || !window.BuserInfoAPI.getCategories) return;

  try {
    const cats = await window.BuserInfoAPI.getCategories();
    if (!Array.isArray(cats) || cats.length === 0) return;

    const currentVal = catSelect.value.toLowerCase().trim();
    catSelect.innerHTML = '<option value="">Semua Kategori</option>';

    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name_kategori;
      opt.textContent = c.name_kategori;
      if (currentVal && currentVal === c.name_kategori.toLowerCase().trim()) {
        opt.selected = true;
      }
      catSelect.appendChild(opt);
    });
  } catch (e) {
    console.warn('[BeritaLive] Gagal memuat daftar kategori:', e);
  }
}

/**
 * Muat Penulis Real ke Dropdown Filter berdasarkan data database REST API (dengan fallback data artikel)
 */
async function populateAuthorFilter(articles = null) {
  const authorSelect = document.getElementById('filter-author');
  if (!authorSelect) return;

  const currentVal = authorSelect.value.toLowerCase().trim();
  let authorNames = [];

  // 1. Ambil daftar penulis dari database via REST API
  if (window.BuserInfoAPI && window.BuserInfoAPI.getAuthors) {
    try {
      const dbAuthors = await window.BuserInfoAPI.getAuthors();
      if (Array.isArray(dbAuthors) && dbAuthors.length > 0) {
        authorNames = dbAuthors.map(a => (a.nama_users || '').trim()).filter(Boolean);
      }
    } catch (e) {
      console.warn('[BeritaLive] Gagal memuat penulis dari DB untuk filter:', e);
    }
  }

  // 2. Fallback / merge dengan data artikel jika dari DB belum ada
  if (Array.isArray(articles) && articles.length > 0) {
    const fromArticles = articles.map(a => (a.author_name || '').trim()).filter(Boolean);
    authorNames = authorNames.concat(fromArticles);
  }

  const uniqueAuthors = Array.from(new Set(authorNames));
  if (uniqueAuthors.length === 0) return;

  authorSelect.innerHTML = '<option value="">Semua Penulis</option>';
  uniqueAuthors.forEach(auth => {
    const opt = document.createElement('option');
    opt.value = auth;
    opt.textContent = auth;
    if (currentVal && currentVal === auth.toLowerCase().trim()) {
      opt.selected = true;
    }
    authorSelect.appendChild(opt);
  });
}

/**
 * 5. Muat Berita dari Database PostgreSQL via REST API
 */
async function loadLiveArticlesFromDB() {
  const tableBody = document.getElementById('news-table-body');
  const emptyState = document.getElementById('empty-state');
  if (!tableBody || !window.BuserInfoAPI) return;

  try {
    const data = await window.BuserInfoAPI.getArticles({ limit: 100 });
    const articles = data.articles || [];

    if (articles.length === 0) {
      tableBody.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      tableBody.classList.add('hidden');
      updateTabCountsFromDOM();
      return;
    }

    tableBody.innerHTML = '';

    articles.forEach(item => {
      const st = (item.status || 'draft').toLowerCase().trim();

      const dateFormatted = item.published_at 
        ? new Date(item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
        : '-';

      const dateIso = item.published_at ? item.published_at.substring(0, 10) : '';

      // Indikator Expired / Batas Waktu Tayang
      let expireBadge = '';
      if (item.expired_at) {
        const expDate = new Date(item.expired_at);
        const isExp = expDate.getTime() <= Date.now();
        const expFormatted = expDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        if (isExp) {
          expireBadge = `<div class="inline-flex items-center gap-1 text-[9.5px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 mt-1 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Telah Kedaluwarsa (${expFormatted})</div>`;
        } else {
          expireBadge = `<div class="inline-flex items-center gap-1 text-[9.5px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 whitespace-nowrap"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Berakhir: ${expFormatted}</div>`;
        }
      }

      // Tampilan Tanggal & Waktu
      let dateDisplay = `<span class="whitespace-nowrap font-medium text-gray-700">${dateFormatted}</span>`;
      if (st === 'scheduled') {
        dateDisplay = `<div class="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 whitespace-nowrap"><svg class="w-3 h-3 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Jadwal: ${dateFormatted}</div>`;
      }

      const thumbUrl = item.thumbnail && item.thumbnail.startsWith('assets/') 
        ? `../${item.thumbnail}` 
        : (item.thumbnail || '../assets/images/berita/hero/sorotan-utama-dunia.jpg');

      let statusBadge = '';
      if (st === 'published') {
        statusBadge = `<span class="badge-status badge-published"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Published</span>`;
      } else if (st === 'review') {
        statusBadge = `<span class="badge-status badge-review"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Review</span>`;
      } else if (st === 'scheduled') {
        statusBadge = `<span class="badge-status badge-scheduled"><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Scheduled</span>`;
      } else {
        statusBadge = `<span class="badge-status badge-draft"><span class="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Draft</span>`;
      }

      const hasGallery = Boolean((item.gallery_count && item.gallery_count > 0) || (item.galeri && item.galeri.length > 0) || (item.gallery && item.gallery.length > 0));
      const galCount = item.gallery_count || (item.galeri ? item.galeri.length : (item.gallery ? item.gallery.length : 0));
      const galleryBadge = hasGallery ? `<span class="inline-flex items-center gap-1 text-[9.5px] px-1.5 py-0.5 rounded font-bold bg-amber-50 text-amber-800 border border-amber-300/60 mt-1 whitespace-nowrap"><svg class="w-3 h-3 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg> Galeri (${galCount} foto)</span>` : '';

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50/80 transition-colors news-row';
      tr.setAttribute('data-status', st);
      tr.setAttribute('data-category', (item.name_kategori || 'Umum').toLowerCase().trim());
      tr.setAttribute('data-author', (item.author_name || 'Redaksi').toLowerCase().trim());
      tr.setAttribute('data-date', dateIso);

      tr.innerHTML = `
        <!-- MOBILE CARD VIEW (md:hidden, NO HORIZONTAL SWIPING) -->
        <td class="md:hidden block w-full p-4 border-0">
          <div class="space-y-3">
            <!-- Top Bar: Checkbox + Category + Status -->
            <div class="flex items-center justify-between gap-2">
              <label class="inline-flex items-center space-x-2 cursor-pointer select-none">
                <input type="checkbox" value="${item.id_artikel}" class="row-checkbox w-4 h-4 rounded border-gray-300 text-buser-red focus:ring-buser-red cursor-pointer">
                <span class="inline-block px-2 py-0.5 text-[11px] font-bold bg-red-50 text-buser-red rounded">${item.name_kategori || 'Umum'}</span>
              </label>
              ${statusBadge}
            </div>

            <!-- Middle: Thumbnail + Title + Meta -->
            <div class="flex items-start space-x-3">
              <img src="${thumbUrl}" alt="Thumb" class="w-16 h-16 object-cover rounded-lg border border-gray-200 shrink-0" onerror="this.src='../assets/images/berita/hero/sorotan-utama-dunia.jpg'">
              <div class="min-w-0 flex-1">
                <a href="../artikel.html?slug=${item.slug}" target="_blank" class="font-bold text-gray-900 text-xs hover:text-buser-red transition-colors line-clamp-2 leading-snug">
                  ${item.title}
                </a>
                ${galleryBadge ? `<div>${galleryBadge}</div>` : ''}
                <div class="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-gray-500">
                  <span class="truncate max-w-[110px] font-medium text-gray-700">${item.author_name || 'Redaksi'}</span>
                  <span>•</span>
                  ${dateDisplay}
                </div>
                ${expireBadge ? `<div class="mt-1">${expireBadge}</div>` : ''}
              </div>
            </div>

            <!-- Bottom: Action Buttons full width without swiping! -->
            <div class="pt-2.5 border-t border-gray-100 flex items-center gap-2">
              <a href="../artikel.html?slug=${item.slug}" target="_blank" class="btn btn-outline btn-sm flex-1 justify-center text-xs py-1.5 text-gray-700 hover:bg-gray-100" title="Pratinjau">
                <svg class="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                Pratinjau
              </a>
              <button type="button" onclick="openEditNewsModal(${item.id_artikel})" class="btn btn-sm flex-1 justify-center text-xs py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200" title="Edit Berita">
                <svg class="w-3.5 h-3.5 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                Edit
              </button>
              <button type="button" onclick="handleDeleteRealArticle(${item.id_artikel})" class="btn btn-sm text-xs py-1.5 px-3 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200" title="Hapus">
                <svg class="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        </td>

        <!-- DESKTOP TABLE VIEW (hidden md:table-cell) -->
        <td class="hidden md:table-cell py-3 px-4">
          <input type="checkbox" value="${item.id_artikel}" class="row-checkbox w-4 h-4 rounded border-gray-300 text-buser-red focus:ring-buser-red cursor-pointer">
        </td>
        <td class="hidden md:table-cell py-3 px-4">
          <img src="${thumbUrl}" alt="Thumb" class="w-14 h-10 object-cover rounded border border-gray-200" onerror="this.src='../assets/images/berita/hero/sorotan-utama-dunia.jpg'">
        </td>
        <td class="hidden md:table-cell py-3 px-4 font-semibold text-gray-900 max-w-sm">
          <a href="../artikel.html?slug=${item.slug}" target="_blank" class="hover:text-buser-red transition-colors line-clamp-2">
            ${item.title}
          </a>
          ${galleryBadge}
        </td>
        <td class="hidden md:table-cell py-3 px-4">
          <span class="inline-block px-2 py-0.5 font-medium bg-red-50 text-buser-red rounded">${item.name_kategori || 'Umum'}</span>
        </td>
        <td class="hidden md:table-cell py-3 px-4 font-medium text-gray-700">${item.author_name || 'Redaksi'}</td>
        <td class="hidden md:table-cell py-3 px-4">
          ${statusBadge}
        </td>
        <td class="hidden md:table-cell py-3 px-4">
          ${dateDisplay}
          ${expireBadge ? `<div class="mt-0.5">${expireBadge}</div>` : ''}
        </td>
        <td class="hidden md:table-cell py-3 px-4 text-right space-x-1 whitespace-nowrap">
          <a href="../artikel.html?slug=${item.slug}" target="_blank" class="table-action-btn text-gray-500 hover:text-gray-900 rounded hover:bg-gray-100 inline-flex" title="Pratinjau">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </a>
          <button type="button" onclick="openEditNewsModal(${item.id_artikel})" class="table-action-btn text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 inline-flex" title="Edit Berita">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button type="button" onclick="handleDeleteRealArticle(${item.id_artikel})" class="table-action-btn text-red-600 hover:text-red-800 rounded hover:bg-red-50 inline-flex" title="Hapus">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </td>
      `;

      tableBody.appendChild(tr);
    });

    populateAuthorFilter(articles);
    applyFilters();
    updateTabCountsFromDOM();

  } catch (e) {
    console.error('[BeritaLive] Error saat memuat berita real:', e);
  }
}

/**
 * 6. Terapkan Filter & Tab Switching secara Dinamis pada DOM Baris Tabel
 */
function applyFilters() {
  const activeTabBtn = document.querySelector('.news-tab-btn.active');
  const activeTab = (activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'all').toLowerCase().trim();

  const searchInput = document.getElementById('filter-search');
  const catSelect = document.getElementById('filter-category');
  const authorSelect = document.getElementById('filter-author');
  const dateInput = document.getElementById('filter-date');
  const emptyState = document.getElementById('empty-state');
  const tableBody = document.getElementById('news-table-body');

  const summaryVisible = document.getElementById('summary-visible-count');
  const summaryTotal = document.getElementById('summary-total-count');

  if (!tableBody) return;

  const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const catVal = catSelect ? catSelect.value.toLowerCase().trim() : '';
  const authorVal = authorSelect ? authorSelect.value.toLowerCase().trim() : '';
  const dateVal = dateInput ? dateInput.value.trim() : '';

  // PENTING: Query rows secara dinamis dari tabel saat ini (bukan statis saat load)
  const rows = tableBody.querySelectorAll('.news-row');
  let visibleCount = 0;
  const totalCount = rows.length;

  rows.forEach(row => {
    const rowStatus = (row.getAttribute('data-status') || '').toLowerCase().trim();
    const rowCat = (row.getAttribute('data-category') || '').toLowerCase().trim();
    const rowAuthor = (row.getAttribute('data-author') || '').toLowerCase().trim();
    const rowDate = (row.getAttribute('data-date') || '').trim();
    const rowText = row.innerText.toLowerCase();

    const matchTab = (activeTab === 'all') || (rowStatus === activeTab);
    const matchSearch = searchVal === '' || rowText.includes(searchVal);
    const matchCat = catVal === '' || (rowCat === catVal);
    const matchAuthor = authorVal === '' || (rowAuthor === authorVal);
    const matchDate = dateVal === '' || (rowDate === dateVal);

    if (matchTab && matchSearch && matchCat && matchAuthor && matchDate) {
      row.classList.remove('hidden');
      visibleCount++;
    } else {
      row.classList.add('hidden');
      const cb = row.querySelector('.row-checkbox');
      if (cb) cb.checked = false;
    }
  });

  if (emptyState) {
    if (visibleCount === 0) {
      emptyState.classList.remove('hidden');
      tableBody.classList.add('hidden');
    } else {
      emptyState.classList.add('hidden');
      tableBody.classList.remove('hidden');
    }
  }

  if (summaryVisible) summaryVisible.textContent = visibleCount;
  if (summaryTotal) summaryTotal.textContent = totalCount;

  updateBulkBar();
  updateCheckAllStatus();
}

/**
 * 7. Hitung Jumlah Berita Per Tab Berdasarkan Elemen yang Ada di DOM
 */
function updateTabCountsFromDOM() {
  const rows = document.querySelectorAll('#news-table-body .news-row');
  let total = rows.length;
  let published = 0;
  let draft = 0;
  let review = 0;
  let scheduled = 0;

  rows.forEach(r => {
    const st = (r.getAttribute('data-status') || '').toLowerCase().trim();
    if (st === 'published') published++;
    else if (st === 'draft') draft++;
    else if (st === 'review') review++;
    else if (st === 'scheduled') scheduled++;
  });

  const tabAll = document.getElementById('tab-count-all');
  const tabPub = document.getElementById('tab-count-published');
  const tabDraft = document.getElementById('tab-count-draft');
  const tabRev = document.getElementById('tab-count-review');
  const tabSch = document.getElementById('tab-count-scheduled');

  if (tabAll) tabAll.textContent = total;
  if (tabPub) tabPub.textContent = published;
  if (tabDraft) tabDraft.textContent = draft;
  if (tabRev) tabRev.textContent = review;
  if (tabSch) tabSch.textContent = scheduled;
}

/**
 * 8. Perbarui Angka Tab dari Endpoint Dashboard Stats (Sinkronisasi Server)
 */
async function updateBeritaTabCounts() {
  if (!window.BuserInfoAPI || !window.BuserInfoAPI.getDashboardStats) return;
  try {
    const stats = await window.BuserInfoAPI.getDashboardStats();
    if (!stats || !stats.counts) return;

    const c = stats.counts;
    const tabAll = document.getElementById('tab-count-all');
    const tabPub = document.getElementById('tab-count-published');
    const tabDraft = document.getElementById('tab-count-draft');
    const tabRev = document.getElementById('tab-count-review');
    const tabSch = document.getElementById('tab-count-scheduled');
    const notifCount = document.getElementById('notif-berita-count');

    if (tabAll && c.total !== undefined) tabAll.textContent = c.total;
    if (tabPub && c.published !== undefined) tabPub.textContent = c.published;
    if (tabDraft && c.draft !== undefined) tabDraft.textContent = c.draft;
    if (tabRev && c.review !== undefined) tabRev.textContent = c.review;
    if (tabSch && c.scheduled !== undefined) tabSch.textContent = c.scheduled;
    if (notifCount && c.review !== undefined) notifCount.textContent = `${c.review} Berita menunggu review`;
  } catch (e) {
    console.warn('[BeritaLive] Gagal memperbarui hitungan tab dari server:', e);
  }
}

/**
 * 9. Tindakan Masal (Bulk Actions: Terbitkan, Simpan ke Draft, Hapus)
 */
async function executeBulk(action) {
  const checkedBoxes = Array.from(document.querySelectorAll('#news-table-body .row-checkbox:checked'));
  const ids = [...new Set(checkedBoxes.map(cb => cb.value))];
  const count = ids.length;
  if (count === 0) return;

  const actionName = action === 'publish' ? 'menerbitkan' : (action === 'draft' ? 'memindahkan ke draft' : 'menghapus');
  const pastTense = action === 'publish' ? 'diterbitkan' : (action === 'draft' ? 'dipindahkan ke draft' : 'dihapus');

  const doBulk = async () => {
    try {
      let successCount = 0;
      let failCount = 0;
      let lastErrMsg = '';

      if (action === 'delete') {
        for (const id of ids) {
          const res = await window.BuserInfoAPI.deleteArticle(id);
          if (res && res.status === 'success') {
            successCount++;
          } else {
            failCount++;
            if (res && res.message) lastErrMsg = res.message;
          }
        }
      } else {
        const newStatus = action === 'publish' ? 'published' : 'draft';
        for (const id of ids) {
          const res = await window.BuserInfoAPI.updateArticle(id, { status: newStatus });
          if (res && res.status === 'success') {
            successCount++;
          } else {
            failCount++;
            if (res && res.message) lastErrMsg = res.message;
          }
        }
      }

      if (successCount > 0 && failCount === 0) {
        if (typeof showToast === 'function') {
          showToast('success', 'Tindakan Berhasil', `${successCount} berita berhasil ${pastTense}.`);
        } else {
          alert(`${successCount} berita berhasil ${pastTense}.`);
        }
      } else if (failCount > 0 && successCount === 0) {
        const msg = lastErrMsg || `Gagal ${actionName} berita terpilih.`;
        if (typeof showToast === 'function') {
          showToast('error', 'Gagal', msg);
        } else {
          alert(msg);
        }
      } else if (successCount > 0 && failCount > 0) {
        if (typeof showToast === 'function') {
          showToast('warning', 'Selesai Sebagian', `${successCount} berita berhasil ${pastTense}, ${failCount} gagal.`);
        } else {
          alert(`${successCount} berita berhasil ${pastTense}, ${failCount} gagal.`);
        }
      }

      const checkAll = document.getElementById('check-all');
      if (checkAll) checkAll.checked = false;

      await loadLiveArticlesFromDB();
      await updateBeritaTabCounts();
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('error', 'Gagal', 'Terjadi kesalahan saat memproses berita: ' + err.message);
      } else {
        alert('Gagal memproses berita: ' + err.message);
      }
    }
  };

  if (typeof confirmAction === 'function') {
    confirmAction({
      title: 'Tindakan Masal',
      message: `Apakah Anda yakin ingin ${actionName} ${count} berita yang dipilih?`,
      confirmText: 'Jalankan',
      type: action === 'delete' ? 'danger' : 'primary',
      onConfirm: doBulk
    });
  } else {
    if (confirm(`Apakah Anda yakin ingin ${actionName} ${count} berita yang dipilih?`)) {
      await doBulk();
    }
  }
}

/**
 * 10. Hapus Berita Tunggal dari Database
 */
async function handleDeleteRealArticle(id) {
  const doDelete = async () => {
    const res = await window.BuserInfoAPI.deleteArticle(id);
    if (res && res.status === 'success') {
      if (typeof showToast === 'function') {
        showToast('success', 'Berhasil', 'Berhasil menghapus artikel.');
      } else {
        alert('Berhasil menghapus artikel.');
      }
      await loadLiveArticlesFromDB();
      await updateBeritaTabCounts();
    } else {
      const errMsg = (res && res.message) ? res.message : 'Gagal menghapus artikel.';
      if (typeof showToast === 'function') {
        showToast('error', 'Gagal', errMsg);
      } else {
        alert(errMsg);
      }
    }
  };

  if (typeof confirmAction === 'function') {
    confirmAction({
      title: 'Hapus Artikel?',
      message: 'Apakah Anda yakin ingin menghapus artikel ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus',
      type: 'danger',
      onConfirm: doDelete
    });
  } else {
    if (confirm('Apakah Anda yakin ingin menghapus artikel ini?')) {
      await doDelete();
    }
  }
}

// =========================================================================
// 11. MANAJEMEN BERITA LANGSUNG (MODAL TAMBAH & EDIT BERITA)
// =========================================================================

let uploadedThumbnailUrl = null;
let isSlugManual = false;
let currentGalleryPhotos = []; // [ { id?: number, file?: File, foto: string, url: string, caption: string, urutan: number, uploadStatus?: string } ]

/**
 * Helper sanitasi teks HTML agar aman dari karakter khusus XSS
 */
function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;

/**
 * Format path URL gambar untuk panel admin
 * Mendukung blob URL, data URL, http/https, serta path relatif assets/
 */
function formatAdminImageUrl(url) {
  if (!url) return '../assets/images/berita/hero/sorotan-utama-dunia.jpg';
  url = String(url).trim();
  if (url.startsWith('blob:') || url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
    return url;
  }
  if (url.startsWith('assets/')) {
    return '../' + url;
  }
  return '../assets/' + url;
}

/**
 * Inisialisasi Event Listener Galeri Foto Artikel (Slider / Grid)
 */
function initGalleryManager() {
  const fileInput = document.getElementById('gallery-file-input');
  const dropzone = document.getElementById('gallery-dropzone');
  const dropzoneInput = document.getElementById('gallery-dropzone-input');
  const addMoreInput = document.getElementById('gallery-add-more-input');
  const clearBtn = document.getElementById('btn-clear-gallery');

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const rawFiles = Array.from(files);
    // Filter hanya file gambar yang valid
    const fileArray = rawFiles.filter(f => {
      return (f.type && f.type.startsWith('image/')) || /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name || '');
    });

    if (fileArray.length === 0) {
      if (typeof showToast === 'function') {
        showToast('warning', 'Format Tidak Didukung', 'Pilih file gambar dengan format JPG, PNG, atau WEBP.');
      }
      return;
    }

    // Pastikan caption yang sedang diketik tidak hilang
    syncGalleryCaptionsFromDOM();

    const previewImg = document.getElementById('thumb-preview-img');

    // 1. Cek thumbnail berita yang sudah dipilih / diunggah saat ini
    let currentThumb = uploadedThumbnailUrl;
    if (!currentThumb && previewImg) {
      const curSrc = previewImg.getAttribute('src') || '';
      if (curSrc.includes('assets/') && !curSrc.includes('sorotan-utama-dunia')) {
        currentThumb = curSrc.substring(curSrc.indexOf('assets/'));
      }
    }

    // 2. Jika berita sudah memiliki thumbnail dan galeri masih kosong,
    // gunakan thumbnail tersebut sebagai foto urutan pertama (#1) galeri (Sesuai Permintaan User)
    if (currentThumb && currentGalleryPhotos.length === 0) {
      const mainCaption = document.getElementById('article-caption')?.value.trim() || '';
      currentGalleryPhotos.push({
        id: null,
        file: null,
        foto: currentThumb,
        url: currentThumb,
        localPreview: currentThumb,
        caption: mainCaption,
        urutan: 1,
        uploadStatus: 'success'
      });
    }

    // 3. TAMBAHKAN SEMUA FOTO BARU SECARA INSTAN KE STATE LOKAL DENGAN PREVIEW (0 ms)
    const newlyAddedItems = [];
    fileArray.forEach((file) => {
      let localUrl = '';
      try {
        localUrl = URL.createObjectURL(file);
      } catch (e) {
        localUrl = '';
      }

      const item = {
        id: null,
        file: file,
        foto: localUrl,
        url: localUrl,
        localPreview: localUrl,
        caption: '',
        urutan: currentGalleryPhotos.length + 1,
        uploadStatus: 'uploading' // 'uploading' | 'success' | 'error'
      };

      currentGalleryPhotos.push(item);
      newlyAddedItems.push(item);
    });

    // 4. Jika sebelumnya belum ada thumbnail sama sekali, gunakan foto urutan pertama sebagai thumbnail berita
    if (!uploadedThumbnailUrl && currentGalleryPhotos.length > 0) {
      uploadedThumbnailUrl = currentGalleryPhotos[0].foto;
      if (previewImg) {
        previewImg.src = formatAdminImageUrl(uploadedThumbnailUrl);
      }
    }

    // Susun nomor urutan 1..N
    currentGalleryPhotos.forEach((p, i) => p.urutan = i + 1);

    // RESET INPUT FILE SEGERA agar user dapat memilih file kembali tanpa bug browser
    if (fileInput) fileInput.value = '';
    if (dropzoneInput) dropzoneInput.value = '';
    if (addMoreInput) addMoreInput.value = '';

    // 5. RENDER PREVIEW SECARA INSTAN! USER LANGSUNG MELIHAT SEMUA GAMBAR DAN TOMBOL HAPUS!
    renderGalleryManagerItems();

    if (typeof showToast === 'function') {
      showToast('info', 'Foto Ditambahkan', `${fileArray.length} foto baru dimuat ke galeri. Menyimpan ke server...`);
    }

    // 6. Jalankan proses upload ke server di background tanpa memblokir interaksi user
    uploadGalleryItemsInBackground(newlyAddedItems);
  };

  /**
   * Upload foto galeri yang baru ditambahkan ke server di background
   */
  const uploadGalleryItemsInBackground = async (itemsToUpload) => {
    const indicator = document.getElementById('gallery-uploading-indicator');
    const indicatorText = document.getElementById('gallery-uploading-text');

    if (indicator) indicator.classList.remove('hidden');
    if (indicatorText) indicatorText.textContent = `Menyimpan ${itemsToUpload.length} foto galeri ke server...`;

    try {
      const filesOnly = itemsToUpload.map(item => item.file).filter(Boolean);
      let batchSuccess = false;

      // Coba batch upload jika API mendukung
      if (window.BuserInfoAPI && typeof window.BuserInfoAPI.uploadGalleryPhotos === 'function' && filesOnly.length > 0) {
        try {
          const res = await window.BuserInfoAPI.uploadGalleryPhotos(filesOnly);
          if (res && res.status === 'success' && res.data && Array.isArray(res.data.files) && res.data.files.length === filesOnly.length) {
            res.data.files.forEach((f, idx) => {
              const targetItem = itemsToUpload[idx];
              if (targetItem) {
                targetItem.foto = f.url;
                targetItem.url = f.url;
                targetItem.uploadStatus = 'success';
              }
            });
            batchSuccess = true;
          }
        } catch (be) {
          console.warn('Batch upload galeri fallback ke single upload:', be);
        }
      }

      // Fallback: upload satu per satu jika batch tidak tersedia atau gagal
      if (!batchSuccess) {
        for (const item of itemsToUpload) {
          if (!item.file || item.uploadStatus === 'success') continue;
          try {
            let singleRes = null;
            if (window.BuserInfoAPI && typeof window.BuserInfoAPI.uploadGalleryPhoto === 'function') {
              singleRes = await window.BuserInfoAPI.uploadGalleryPhoto(item.file);
            } else if (window.BuserInfoAPI && typeof window.BuserInfoAPI.uploadThumbnail === 'function') {
              singleRes = await window.BuserInfoAPI.uploadThumbnail(item.file);
            }
            if (singleRes && singleRes.status === 'success' && singleRes.data && singleRes.data.url) {
              item.foto = singleRes.data.url;
              item.url = singleRes.data.url;
              item.uploadStatus = 'success';
            } else {
              item.uploadStatus = 'error';
            }
          } catch (se) {
            console.error('Upload single item error:', se);
            item.uploadStatus = 'error';
          }
          updateItemStatusInDOM(item);
        }
      }

      // Perbarui thumbnail berita jika foto #1 baru saja tersimpan ke server
      if (currentGalleryPhotos.length > 0 && currentGalleryPhotos[0].uploadStatus === 'success') {
        const previewImg = document.getElementById('thumb-preview-img');
        uploadedThumbnailUrl = currentGalleryPhotos[0].foto;
        if (previewImg) {
          previewImg.src = formatAdminImageUrl(uploadedThumbnailUrl);
        }
      }

      // Re-render UI untuk memperbarui status dan memastikan URL tersinkronisasi
      renderGalleryManagerItems();

      const successCount = itemsToUpload.filter(i => i.uploadStatus === 'success').length;
      if (typeof showToast === 'function') {
        if (successCount === itemsToUpload.length) {
          showToast('success', 'Tersimpan ke Server', `${successCount} foto galeri telah tersimpan di server.`);
        } else {
          showToast('warning', 'Pemberitahuan Upload', `${successCount} dari ${itemsToUpload.length} foto galeri tersimpan ke server.`);
        }
      }
    } catch (err) {
      console.error('Gallery background upload error:', err);
    } finally {
      if (indicator) indicator.classList.add('hidden');
    }
  };

  if (fileInput) {
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
  }

  if (addMoreInput) {
    addMoreInput.addEventListener('change', (e) => handleFiles(e.target.files));
  }

  if (dropzone) {
    dropzone.addEventListener('click', (e) => {
      if (e.target !== dropzoneInput && dropzoneInput) {
        dropzoneInput.click();
      }
    });
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-buser-red', 'bg-red-50/40');
    });
    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-buser-red', 'bg-red-50/40');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-buser-red', 'bg-red-50/40');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    });
  }

  if (dropzoneInput) {
    dropzoneInput.addEventListener('change', (e) => handleFiles(e.target.files));
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (currentGalleryPhotos.length === 0) return;
      if (confirm('Apakah Anda yakin ingin mengosongkan semua foto di galeri artikel ini?')) {
        // Bebaskan memory blob URLs
        currentGalleryPhotos.forEach(p => {
          if (p.foto && p.foto.startsWith('blob:')) {
            try { URL.revokeObjectURL(p.foto); } catch (e) {}
          }
        });
        currentGalleryPhotos = [];
        renderGalleryManagerItems();
        if (typeof showToast === 'function') {
          showToast('info', 'Galeri Direset', 'Semua foto galeri telah dihapus.');
        }
      }
    });
  }
}

/**
 * Render visual daftar foto galeri di form admin modal
 * Desain Mobile-First, Rapi, Terstruktur, dan Responsif (Tidak Tertumpuk)
 */
function renderGalleryManagerItems() {
  const container = document.getElementById('gallery-items-list');
  const addMoreContainer = document.getElementById('gallery-add-more-container');
  const counterBadge = document.getElementById('gallery-counter-badge');
  const statusNotice = document.getElementById('gallery-status-notice');
  const clearBtn = document.getElementById('btn-clear-gallery');
  const dropzone = document.getElementById('gallery-dropzone');

  const count = currentGalleryPhotos.length;

  if (counterBadge) {
    if (count === 0) {
      counterBadge.className = 'px-2.5 py-0.5 text-[10.5px] font-bold rounded-full bg-slate-200 text-slate-700';
      counterBadge.textContent = '0 Foto';
    } else if (count < 5) {
      counterBadge.className = 'px-2.5 py-0.5 text-[10.5px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300';
      counterBadge.textContent = `${count} / 5 Foto (Kurang ${5 - count} foto lagi)`;
    } else {
      counterBadge.className = 'px-2.5 py-0.5 text-[10.5px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300';
      counterBadge.textContent = `✔ ${count} Foto (Syarat Minimal Terpenuhi)`;
    }
  }

  if (statusNotice) {
    if (count === 0) {
      statusNotice.className = 'flex items-center space-x-1.5 font-medium text-slate-500 text-[11px]';
      statusNotice.innerHTML = `<svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg><span>Belum ada foto galeri. Tambahkan minimal 5 foto untuk mode berita galeri/slider.</span>`;
    } else if (count < 5) {
      statusNotice.className = 'flex items-center space-x-1.5 font-medium text-amber-700 text-[11px]';
      statusNotice.innerHTML = `<svg class="w-3.5 h-3.5 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg><span>Anda memiliki ${count} foto. Disarankan minimal 5 foto agar slider dan thumbnail bawah tampil proporsional seperti Tabaca.id.</span>`;
    } else {
      statusNotice.className = 'flex items-center space-x-1.5 font-medium text-emerald-700 text-[11px]';
      statusNotice.innerHTML = `<svg class="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg><span>Hebat! Kuota minimal 5 foto telah terpenuhi (${count} foto siap ditayangkan dalam format slider & grid).</span>`;
    }
  }

  if (clearBtn) {
    if (count > 0) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  if (!container) return;

  // Jika tidak ada foto: tampilkan dropzone utama, sembunyikan list kartu dan tombol add-more
  if (count === 0) {
    container.innerHTML = '';
    container.classList.add('hidden');
    if (addMoreContainer) addMoreContainer.classList.add('hidden');
    if (dropzone) dropzone.classList.remove('hidden');
    return;
  }

  // Jika ada foto: sembunyikan dropzone besar utama agar tidak menumpuk, tampilkan list kartu & tombol add-more ringkas
  if (dropzone) dropzone.classList.add('hidden');
  container.classList.remove('hidden');
  if (addMoreContainer) addMoreContainer.classList.remove('hidden');

  container.innerHTML = currentGalleryPhotos.map((item, idx) => {
    const rawPhoto = item.foto || item.url || item.localPreview || '';
    const imgSrc = formatAdminImageUrl(rawPhoto);
    const isFirst = (idx === 0);
    const uploadStatus = item.uploadStatus || (item.file ? 'uploading' : 'success');

    let statusBadgeHtml = '';
    if (uploadStatus === 'uploading') {
      statusBadgeHtml = `
        <span id="gallery-status-badge-${idx}" class="text-[11px] font-semibold text-blue-600 inline-flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
          <svg class="animate-spin w-3 h-3 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          <span>Menyimpan ke server...</span>
        </span>`;
    } else if (uploadStatus === 'error') {
      statusBadgeHtml = `
        <span id="gallery-status-badge-${idx}" class="text-[11px] font-semibold text-amber-700 inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          <svg class="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
          <span>Gagal simpan</span>
          <button type="button" onclick="retryUploadGalleryItem(${idx})" class="text-[10px] text-blue-600 underline font-bold ml-1">Coba lagi</button>
        </span>`;
    } else {
      statusBadgeHtml = `
        <span id="gallery-status-badge-${idx}" class="text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
          <svg class="w-3 h-3 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          <span>Tersimpan</span>
        </span>`;
    }

    return `
      <div class="gallery-photo-item bg-white border border-gray-200 rounded-xl p-3 sm:p-3.5 shadow-2xs hover:border-gray-300 transition-all space-y-2.5" data-idx="${idx}">
        <!-- Top Bar: Index Badge + Status on Left, Actions on Right -->
        <div class="flex items-center justify-between gap-2 pb-2 border-b border-gray-100 flex-wrap">
          <div class="flex items-center gap-1.5 flex-wrap min-w-0">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${isFirst ? 'bg-red-50 text-buser-red border border-red-200 shadow-2xs' : 'bg-slate-100 text-slate-700 border border-slate-200'}">
              ${isFirst ? '<svg class="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> Foto #1 (Cover/Thumbnail Berita)' : `Foto #${idx + 1}`}
            </span>
            ${statusBadgeHtml}
            ${isFirst ? '<span class="text-[10.5px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 hidden sm:inline">Pembuka Galeri</span>' : ''}
          </div>

          <!-- Action Buttons: Move Up, Move Down, Delete (Mudah diakses di mobile & desktop) -->
          <div class="flex items-center gap-1 shrink-0 ml-auto">
            <button type="button" onclick="moveGalleryItem(${idx}, ${idx - 1})" ${idx === 0 ? 'disabled' : ''} class="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Pindah ke Posisi Sebelumnya">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
            </button>
            <button type="button" onclick="moveGalleryItem(${idx}, ${idx + 1})" ${idx === count - 1 ? 'disabled' : ''} class="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 disabled:opacity-20 disabled:cursor-not-allowed transition-colors" title="Pindah ke Posisi Berikutnya">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </button>
            <!-- Tombol Hapus Spesifik: Langsung buang gambar yang salah tanpa harus ulang dari awal -->
            <button type="button" onclick="removeGalleryItem(${idx})" class="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-lg shadow-sm transition-all cursor-pointer" title="Hapus foto ini dari galeri">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <span>Hapus Foto</span>
            </button>
          </div>
        </div>

        <!-- Card Body: Preview Gambar (Kiri/Atas) dan Input Keterangan (Kanan) -->
        <div class="flex flex-col sm:flex-row items-start gap-3">
          <!-- Frame Gambar Preview: Rasio Rapi & Tidak Gepeng -->
          <div class="relative w-full sm:w-44 h-44 sm:h-28 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-gray-200 group shadow-2xs">
            <img src="${imgSrc}" alt="Foto ${idx + 1}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" onerror="this.onerror=null; this.src='../assets/images/berita/hero/sorotan-utama-dunia.jpg'">
            <span class="absolute bottom-1.5 right-1.5 px-2 py-0.5 bg-black/75 backdrop-blur-2xs text-white text-[10px] font-bold rounded">
              #${idx + 1}
            </span>
            <!-- Tombol Hapus Cepat (Hover/Tap pada Gambar) -->
            <button type="button" onclick="removeGalleryItem(${idx})" class="absolute top-2 right-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white px-2.5 py-1 rounded-md text-[11px] font-bold shadow-md flex items-center gap-1 transition-all cursor-pointer z-10" title="Hapus foto ini dari galeri">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              <span>Hapus</span>
            </button>
          </div>

          <!-- Kolom Input Keterangan & Kontrol Cover -->
          <div class="flex-1 w-full min-w-0 space-y-1.5">
            <div class="flex items-center justify-between gap-1 flex-wrap">
              <label class="text-[11px] font-bold text-gray-700">
                Keterangan Foto #${idx + 1} (Caption)
              </label>
              ${!isFirst ? `
                <button type="button" onclick="setGalleryItemAsThumbnail(${idx})" class="text-[10.5px] font-semibold text-buser-red hover:underline inline-flex items-center gap-1" title="Pindahkan foto ini ke urutan #1 dan jadikan thumbnail utama berita">
                  <svg class="w-3 h-3 text-buser-red fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  <span>Jadikan Foto Utama (#1)</span>
                </button>
              ` : `
                <span class="text-[10px] text-gray-500 italic">Thumbnail Berita Utama</span>
              `}
            </div>
            <textarea 
              data-idx="${idx}"
              rows="2" 
              placeholder="Tuliskan keterangan detail foto ini, peristiwa, lokasi, atau atribusi..."
              class="gallery-item-caption w-full text-xs text-gray-800 border border-gray-300 rounded-lg p-2.5 focus:ring-1 focus:ring-buser-red focus:border-buser-red bg-white leading-relaxed resize-none transition-all shadow-2xs"
              oninput="updateGalleryItemCaption(${idx}, this.value)">${escapeHtml(item.caption || '')}</textarea>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Update nilai caption langsung ke state
 */
function updateGalleryItemCaption(idx, val) {
  if (currentGalleryPhotos[idx]) {
    currentGalleryPhotos[idx].caption = val;
    // Jika foto #1 diubah captionnya, sinkronkan ke input caption utama jika belum diisi manual
    if (idx === 0) {
      const mainCaption = document.getElementById('article-caption');
      if (mainCaption && document.activeElement !== mainCaption) {
        mainCaption.value = val;
      }
    }
  }
}

/**
 * Update visual badge status satu item foto di DOM
 */
function updateItemStatusInDOM(item) {
  const idx = currentGalleryPhotos.indexOf(item);
  if (idx === -1) return;
  const statusEl = document.getElementById(`gallery-status-badge-${idx}`);
  if (!statusEl) return;

  if (item.uploadStatus === 'success') {
    statusEl.className = 'text-[11px] font-semibold text-emerald-600 inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200';
    statusEl.innerHTML = `<svg class="w-3 h-3 text-emerald-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg><span>Tersimpan</span>`;
  } else if (item.uploadStatus === 'error') {
    statusEl.className = 'text-[11px] font-semibold text-amber-700 inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-200';
    statusEl.innerHTML = `<svg class="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg><span>Gagal simpan</span> <button type="button" onclick="retryUploadGalleryItem(${idx})" class="text-[10px] text-blue-600 underline font-bold ml-1">Coba lagi</button>`;
  }
}

/**
 * Coba unggah ulang foto yang sempat gagal simpan ke server
 */
async function retryUploadGalleryItem(idx) {
  if (!currentGalleryPhotos[idx] || !currentGalleryPhotos[idx].file) return;
  const item = currentGalleryPhotos[idx];
  item.uploadStatus = 'uploading';
  updateItemStatusInDOM(item);

  try {
    let res = null;
    if (window.BuserInfoAPI && typeof window.BuserInfoAPI.uploadGalleryPhoto === 'function') {
      res = await window.BuserInfoAPI.uploadGalleryPhoto(item.file);
    } else if (window.BuserInfoAPI && typeof window.BuserInfoAPI.uploadThumbnail === 'function') {
      res = await window.BuserInfoAPI.uploadThumbnail(item.file);
    }

    if (res && res.status === 'success' && res.data && res.data.url) {
      item.foto = res.data.url;
      item.url = res.data.url;
      item.uploadStatus = 'success';
      if (typeof showToast === 'function') {
        showToast('success', 'Berhasil Disimpan', `Foto #${idx + 1} berhasil disimpan ke server.`);
      }
    } else {
      item.uploadStatus = 'error';
    }
  } catch (e) {
    item.uploadStatus = 'error';
  }
  updateItemStatusInDOM(item);
}

/**
 * Pindahkan posisi urutan foto galeri (Naik / Turun)
 */
function moveGalleryItem(fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= currentGalleryPhotos.length) return;
  syncGalleryCaptionsFromDOM();
  const item = currentGalleryPhotos.splice(fromIndex, 1)[0];
  currentGalleryPhotos.splice(toIndex, 0, item);
  currentGalleryPhotos.forEach((p, i) => p.urutan = i + 1);

  // Jika posisi urutan #1 berubah, sinkronkan thumbnail berita dengan foto #1 yang baru
  if (fromIndex === 0 || toIndex === 0) {
    uploadedThumbnailUrl = currentGalleryPhotos[0].foto;
    const previewImg = document.getElementById('thumb-preview-img');
    if (previewImg) {
      previewImg.src = formatAdminImageUrl(uploadedThumbnailUrl);
    }
  }

  renderGalleryManagerItems();
}

/**
 * Hapus foto spesifik dari galeri secara instan (Permintaan 1 & 4)
 * User dapat langsung membuang gambar yang salah tanpa harus mengulang unggahan dari awal
 */
function removeGalleryItem(index) {
  syncGalleryCaptionsFromDOM();
  if (!currentGalleryPhotos[index]) return;

  const item = currentGalleryPhotos[index];
  // Bebaskan blob URL memory jika ada
  if (item.foto && item.foto.startsWith('blob:')) {
    try { URL.revokeObjectURL(item.foto); } catch (e) {}
  }
  if (item.localPreview && item.localPreview.startsWith('blob:')) {
    try { URL.revokeObjectURL(item.localPreview); } catch (e) {}
  }

  currentGalleryPhotos.splice(index, 1);
  currentGalleryPhotos.forEach((p, i) => p.urutan = i + 1);

  // Jika foto urutan pertama yang dihapus dan masih ada foto lain di galeri,
  // jadikan foto pertama yang baru sebagai thumbnail berita
  if (index === 0 && currentGalleryPhotos.length > 0) {
    uploadedThumbnailUrl = currentGalleryPhotos[0].foto || currentGalleryPhotos[0].url;
    const previewImg = document.getElementById('thumb-preview-img');
    if (previewImg) {
      previewImg.src = formatAdminImageUrl(uploadedThumbnailUrl);
    }
  }

  renderGalleryManagerItems();

  if (typeof showToast === 'function') {
    showToast('info', 'Foto Dihapus', `Foto #${index + 1} berhasil dihapus dari galeri.`);
  }
}

/**
 * Jadikan foto pilihan sebagai thumbnail berita dan pindahkan ke urutan pertama (#1) (Permintaan 3)
 */
function setGalleryItemAsThumbnail(index) {
  if (!currentGalleryPhotos[index]) return;
  syncGalleryCaptionsFromDOM();

  // Pindahkan foto yang dipilih ke urutan pertama (index 0)
  const [chosen] = currentGalleryPhotos.splice(index, 1);
  currentGalleryPhotos.unshift(chosen);
  currentGalleryPhotos.forEach((p, i) => p.urutan = i + 1);

  // Jadikan thumbnail artikel
  uploadedThumbnailUrl = chosen.foto || chosen.url;
  const previewImg = document.getElementById('thumb-preview-img');
  if (previewImg) {
    previewImg.src = formatAdminImageUrl(uploadedThumbnailUrl);
  }

  // Sinkronisasi caption utama jika kosong
  const captionInput = document.getElementById('article-caption');
  if (captionInput && chosen.caption && !captionInput.value.trim()) {
    captionInput.value = chosen.caption;
  }

  renderGalleryManagerItems();

  if (typeof showToast === 'function') {
    showToast('success', 'Cover Berita Diatur', 'Foto dipindahkan ke urutan pertama (#1) dan dijadikan thumbnail berita.');
  }
}

function syncGalleryCaptionsFromDOM() {
  const inputs = document.querySelectorAll('.gallery-item-caption');
  inputs.forEach(inp => {
    const idx = parseInt(inp.getAttribute('data-idx'));
    if (!isNaN(idx) && currentGalleryPhotos[idx]) {
      currentGalleryPhotos[idx].caption = inp.value;
    }
  });
}

window.formatAdminImageUrl = formatAdminImageUrl;
window.retryUploadGalleryItem = retryUploadGalleryItem;
window.updateGalleryItemCaption = updateGalleryItemCaption;
window.moveGalleryItem = moveGalleryItem;
window.removeGalleryItem = removeGalleryItem;
window.setGalleryItemAsThumbnail = setGalleryItemAsThumbnail;
window.renderGalleryManagerItems = renderGalleryManagerItems;

/* ==========================================================================
   LINK CARD EDITOR — Modal Sisipkan/Edit Link (PRD FR-01 s.d. FR-06)
   ========================================================================== */

let jpLinkSavedRange = null;
let jpLinkEditingNode = null;
let jpLinkPreviewTimer = null;
let jpLinkPreviewData = null;
let jpLinkPreviewState = 'idle'; // idle | loading | success | fallback | invalid

function jpEscapeAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function jpIsAllowedHttpUrl(url) {
  if (typeof url !== 'string') return false;
  const t = url.trim();
  if (!/^https?:\/\//i.test(t)) return false;
  if (t.length > 2048) return false;
  if (/[\s<>"'\\]/.test(t)) return false;
  return true;
}

function jpSaveSelection() {
  try {
    const sel = window.getSelection();
    const editorBody = document.getElementById('editor-body');
    if (sel && sel.rangeCount > 0 && editorBody) {
      const range = sel.getRangeAt(0);
      if (editorBody.contains(range.commonAncestorContainer) || editorBody.contains(sel.anchorNode)) {
        jpLinkSavedRange = range.cloneRange();
      }
    }
  } catch (e) { /* abaikan */ }
}

function jpRestoreSelection() {
  try {
    const editorBody = document.getElementById('editor-body');
    if (!editorBody) return;
    editorBody.focus();
    const sel = window.getSelection();
    if (!sel) return;
    if (jpLinkSavedRange && (editorBody.contains(jpLinkSavedRange.commonAncestorContainer) || editorBody === jpLinkSavedRange.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(jpLinkSavedRange);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editorBody);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } catch (e) { /* abaikan */ }
}

function jpGetSelectedText() {
  try {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return '';
    const editorBody = document.getElementById('editor-body');
    if (editorBody && !editorBody.contains(sel.anchorNode)) return '';
    return String(sel.toString() || '').trim();
  } catch (e) {
    return '';
  }
}

function jpFindCardNode(node) {
  if (!node) return null;
  if (node.nodeType === 3) node = node.parentElement;
  if (!node || !node.closest) return null;
  return node.closest('a.jp-link-card');
}

function jpRenderLinkPreviewBox() {
  const box = document.getElementById('jp-link-preview-box');
  if (!box) return;
  const urlInput = document.getElementById('jp-link-url');
  const url = urlInput ? urlInput.value.trim() : '';

  if (!url) {
    box.innerHTML = '<span class="text-[11px]">Tempel URL untuk memuat preview otomatis...</span>';
    return;
  }
  if (!jpIsAllowedHttpUrl(url)) {
    jpLinkPreviewState = 'invalid';
    box.innerHTML = '<div class="flex items-start gap-2 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">'
      + '<span class="font-bold">URL tidak valid.</span><span>Gunakan http:// atau https:// (tolak javascript:, data:, blob:, file:).</span></div>';
    return;
  }
  if (jpLinkPreviewState === 'loading') {
    box.innerHTML = '<div class="animate-pulse space-y-2">'
      + '<div class="h-3 bg-gray-200 rounded w-1/3"></div>'
      + '<div class="h-4 bg-gray-200 rounded w-2/3"></div>'
      + '<div class="h-3 bg-gray-200 rounded w-full"></div></div>';
    return;
  }
  if (jpLinkPreviewState === 'success' && jpLinkPreviewData) {
    const d = jpLinkPreviewData;
    box.innerHTML = '<div class="jp-link-card !m-0" aria-hidden="true" style="pointer-events:none">'
      + (d.image ? '<img class="jp-link-card__img" src="' + jpEscapeAttr(d.image) + '" alt="" loading="lazy" onerror="this.remove()" />' : '')
      + '<span class="jp-link-card__body">'
      + '<span class="jp-link-card__site">' + jpEscapeAttr(d.domain || '') + '</span>'
      + '<span class="jp-link-card__title">' + jpEscapeAttr(d.title || d.domain || '') + '</span>'
      + (d.description ? '<span class="jp-link-card__desc">' + jpEscapeAttr(d.description) + '</span>' : '')
      + '</span></div>';
    return;
  }
  if (jpLinkPreviewState === 'fallback') {
    box.innerHTML = '<div class="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">'
      + 'Metadata tidak ditemukan untuk URL ini. Anda tetap bisa menyisipkan sebagai <b>Link Teks</b>.'
      + (jpLinkPreviewData && jpLinkPreviewData.domain ? ' Domain: <b>' + jpEscapeAttr(jpLinkPreviewData.domain) + '</b>.' : '')
      + '</div>';
    return;
  }
  box.innerHTML = '<span class="text-[11px]">Menyiapkan preview...</span>';
}

function jpFetchLinkPreview(url) {
  const box = document.getElementById('jp-link-preview-box');
  if (!jpIsAllowedHttpUrl(url)) {
    jpLinkPreviewState = 'invalid';
    jpLinkPreviewData = null;
    jpRenderLinkPreviewBox();
    return;
  }
  jpLinkPreviewState = 'loading';
  jpRenderLinkPreviewBox();
  const base = (typeof window.API_BASE_URL !== 'undefined' && window.API_BASE_URL) ? window.API_BASE_URL : '../api';
  const endpoint = String(base).replace(/\/$/, '') + '/link-preview.php?url=' + encodeURIComponent(url);
  fetch(endpoint, { headers: { Accept: 'application/json' } })
    .then((res) => res.json().then((j) => ({ ok: res.ok, body: j })).catch(() => ({ ok: false, body: null })))
    .then(({ body }) => {
      if (!body || !body.data) {
        jpLinkPreviewState = 'fallback';
        jpLinkPreviewData = { domain: '' };
        jpRenderLinkPreviewBox();
        return;
      }
      jpLinkPreviewData = body.data;
      jpLinkPreviewState = (body.status === 'success') ? 'success' : 'fallback';
      // auto-suggest mode: kartu bila sukses, teks bila fallback
      const modeCard = document.querySelector('input[name="jp_link_mode"][value="card"]');
      const modeText = document.querySelector('input[name="jp_link_mode"][value="text"]');
      if (jpLinkEditingNode === null) {
        if (jpLinkPreviewState === 'success' && modeCard) modeCard.checked = true;
        if (jpLinkPreviewState === 'fallback' && modeText) modeText.checked = true;
      }
      jpRenderLinkPreviewBox();
    })
    .catch(() => {
      jpLinkPreviewState = 'fallback';
      jpLinkPreviewData = { domain: '' };
      jpRenderLinkPreviewBox();
    });
}

function jpSchedulePreviewFetch() {
  if (jpLinkPreviewTimer) clearTimeout(jpLinkPreviewTimer);
  jpLinkPreviewTimer = setTimeout(() => {
    const urlInput = document.getElementById('jp-link-url');
    const url = urlInput ? urlInput.value.trim() : '';
    if (!url) {
      jpLinkPreviewState = 'idle';
      jpLinkPreviewData = null;
      jpRenderLinkPreviewBox();
      return;
    }
    jpFetchLinkPreview(url);
  }, 500);
}

function openJpLinkModal(editNode) {
  if (!editNode) {
    jpSaveSelection();
  }
  jpLinkEditingNode = editNode || null;
  jpLinkPreviewData = null;
  jpLinkPreviewState = 'idle';

  const modal = document.getElementById('link-modal');
  if (modal) {
    modal.style.zIndex = '100'; // Pastikan mutlak di atas #news-modal (z-index: 50)
  }

  const urlInput = document.getElementById('jp-link-url');
  const textInput = document.getElementById('jp-link-text');
  const customTitle = document.getElementById('jp-link-custom-title');
  const titleEl = document.getElementById('link-modal-title');
  const submitBtn = document.getElementById('jp-link-submit');
  const modeCard = document.querySelector('input[name="jp_link_mode"][value="card"]');
  const modeText = document.querySelector('input[name="jp_link_mode"][value="text"]');

  if (jpLinkEditingNode) {
    const n = jpLinkEditingNode;
    if (urlInput) urlInput.value = n.getAttribute('href') || n.dataset.url || '';
    if (textInput) textInput.value = n.dataset.text || n.querySelector('.jp-link-card__title')?.textContent || n.textContent || '';
    if (customTitle) customTitle.value = '';
    if (titleEl) titleEl.textContent = 'Edit Link / Kartu';
    if (submitBtn) submitBtn.textContent = 'Simpan Perubahan';
    if (modeCard) modeCard.checked = n.classList.contains('jp-link-card');
    if (modeText) modeText.checked = !n.classList.contains('jp-link-card');
  } else {
    if (urlInput) urlInput.value = '';
    if (textInput) textInput.value = jpGetSelectedText();
    if (customTitle) customTitle.value = '';
    if (titleEl) titleEl.textContent = 'Sisipkan Link';
    if (submitBtn) submitBtn.textContent = 'Sisipkan';
    if (modeCard) modeCard.checked = true;
  }
  jpRenderLinkPreviewBox();
  if (modal) {
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  } else if (typeof openModal === 'function') {
    openModal('link-modal');
  }
  setTimeout(() => { if (urlInput) urlInput.focus(); }, 80);
}

function closeJpLinkModal() {
  const modal = document.getElementById('link-modal');
  if (modal) {
    modal.classList.add('hidden');
  } else if (typeof closeModal === 'function') {
    closeModal('link-modal');
  }
  // Pertahankan overflow-hidden pada body jika #news-modal masih aktif
  const newsModal = document.getElementById('news-modal');
  if (newsModal && !newsModal.classList.contains('hidden')) {
    document.body.classList.add('overflow-hidden');
  } else {
    document.body.classList.remove('overflow-hidden');
  }
}

function jpBuildCardHtml(opts) {
  const url = jpEscapeAttr(opts.url);
  const title = jpEscapeAttr(opts.title);
  const desc = jpEscapeAttr(opts.desc);
  const image = jpEscapeAttr(opts.image);
  const site = jpEscapeAttr(opts.site);
  const text = jpEscapeAttr(opts.text);
  const external = true; // v1: selalu _blank + nofollow untuk kesederhanaan (PRD FR-03)
  const rel = external ? 'noopener noreferrer nofollow' : 'noopener noreferrer';
  const imgHtml = image
    ? '<img class="jp-link-card__img" src="' + image + '" alt="' + title + '" loading="lazy" onerror="this.remove()" />'
    : '';
  return '<a class="jp-link-card' + (image ? '' : ' no-img') + '" href="' + url + '" target="_blank" rel="' + rel + '"'
    + ' contenteditable="false"'
    + ' data-jp-link="card" data-url="' + url + '"'
    + ' data-title="' + title + '" data-desc="' + desc + '" data-image="' + image + '" data-site="' + site + '" data-text="' + text + '">'
    + imgHtml
    + '<span class="jp-link-card__body">'
    + '<span class="jp-link-card__site">' + site + '</span>'
    + '<span class="jp-link-card__title">' + title + '</span>'
    + (opts.desc ? '<span class="jp-link-card__desc">' + desc + '</span>' : '')
    + '</span></a>';
}

function jpSetCaretToParagraph(p) {
  if (!p) return;
  const editorBody = document.getElementById('editor-body');
  if (editorBody) editorBody.focus();
  try {
    p.focus();
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      if (!p.firstChild) {
        p.innerHTML = '<br>';
      }
      range.selectNodeContents(p);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } catch (e) { /* abaikan */ }
}

function jpInsertCardAtSelection(cardHtml) {
  const editorBody = document.getElementById('editor-body');
  if (!editorBody) return;

  const tmp = document.createElement('div');
  tmp.innerHTML = cardHtml;
  const cardNode = tmp.querySelector('a.jp-link-card') || tmp.firstChild;
  if (!cardNode) return;
  cardNode.setAttribute('contenteditable', 'false');

  const afterP = document.createElement('p');
  afterP.innerHTML = '<br>';

  // 1. Mode Edit Kartu yang sudah ada
  if (jpLinkEditingNode && editorBody.contains(jpLinkEditingNode)) {
    const oldNode = jpLinkEditingNode;
    oldNode.replaceWith(cardNode);
    jpLinkEditingNode = null;
    let next = cardNode.nextElementSibling;
    if (!next || next.tagName !== 'P') {
      cardNode.after(afterP);
      jpSetCaretToParagraph(afterP);
    } else {
      jpSetCaretToParagraph(next);
    }
    return;
  }

  // 2. Mode Sisipkan Kartu Baru:
  // Temukan elemen blok langsung di dalam editorBody tempat kursor berada
  let targetBlock = null;
  if (jpLinkSavedRange && editorBody.contains(jpLinkSavedRange.commonAncestorContainer)) {
    let curr = jpLinkSavedRange.startContainer;
    while (curr && curr.parentNode && curr.parentNode !== editorBody) {
      curr = curr.parentNode;
    }
    if (curr && curr.parentNode === editorBody) {
      targetBlock = curr;
    }
  }

  if (targetBlock) {
    const text = (targetBlock.textContent || '').trim();
    const isPlaceholder = text === '' || text === 'Tulis konten naskah berita di sini...';
    if (isPlaceholder) {
      // Gantikan blok placeholder kosong dengan kartu dan siapkan paragraf kosong di bawahnya
      targetBlock.replaceWith(cardNode);
      cardNode.after(afterP);
    } else {
      // Sisipkan kartu tepat di bawah paragraf target tempat kursor aktif
      targetBlock.after(cardNode);
      cardNode.after(afterP);
    }
  } else {
    // Fallback jika kursor tidak terdeteksi di blok tertentu:
    const lastChild = editorBody.lastElementChild;
    const lastText = lastChild ? (lastChild.textContent || '').trim() : '';
    if (lastChild && lastChild.tagName === 'P' && (lastText === '' || lastText === 'Tulis konten naskah berita di sini...')) {
      lastChild.replaceWith(cardNode);
      cardNode.after(afterP);
    } else {
      editorBody.appendChild(cardNode);
      editorBody.appendChild(afterP);
    }
  }

  // Pindahkan kursor secara otomatis ke paragraf baru di bawah kartu
  setTimeout(() => {
    jpSetCaretToParagraph(afterP);
  }, 40);
}

function jpSubmitLinkModal() {
  const urlInput = document.getElementById('jp-link-url');
  const textInput = document.getElementById('jp-link-text');
  const customTitle = document.getElementById('jp-link-custom-title');
  const modeEl = document.querySelector('input[name="jp_link_mode"]:checked');

  const url = urlInput ? urlInput.value.trim() : '';
  if (!jpIsAllowedHttpUrl(url)) {
    if (typeof showToast === 'function') {
      showToast('error', 'URL Tidak Valid', 'Gunakan URL http:// atau https:// yang valid.');
    }
    if (urlInput) urlInput.focus();
    return;
  }
  const mode = modeEl ? modeEl.value : 'card';
  const d = jpLinkPreviewData || {};
  const domain = d.domain || (() => { try { return new URL(url).hostname; } catch (e) { return url; } })();
  const customTitleVal = customTitle ? customTitle.value.trim() : '';
  const fetchedTitle = d.title && d.title !== d.domain ? d.title : '';
  const title = (customTitleVal || fetchedTitle || domain).substring(0, 160);
  const desc = (d.description || '').substring(0, 160);
  const image = /^https?:\/\//i.test(d.image || '') ? d.image : '';

  let displayText = textInput ? textInput.value.trim() : '';
  if (!displayText) displayText = jpLinkEditingNode ? (jpLinkEditingNode.dataset.text || title) : (jpGetSelectedText() || title);
  displayText = displayText.substring(0, 200);

  const editorBody = document.getElementById('editor-body');
  if (editorBody) editorBody.focus();

  if (mode === 'text') {
    jpRestoreSelection();
    const textHtml = '<a href="' + jpEscapeAttr(url) + '" target="_blank" rel="noopener noreferrer nofollow">'
      + jpEscapeAttr(displayText || url) + '</a>';
    if (jpLinkEditingNode) {
      const tmp = document.createElement('div');
      tmp.innerHTML = textHtml;
      const anchor = tmp.firstChild;
      jpLinkEditingNode.replaceWith(anchor);
      jpLinkEditingNode = null;
    } else {
      const ok = document.execCommand('insertHTML', false, textHtml);
      if (!ok && editorBody) {
        editorBody.insertAdjacentHTML('beforeend', textHtml);
      }
    }
  } else {
    const cardHtml = jpBuildCardHtml({ url, title, desc, image, site: domain, text: displayText || title });
    jpInsertCardAtSelection(cardHtml);
  }

  if (typeof updateWordCount === 'function') updateWordCount();
  closeJpLinkModal();
  jpLinkPreviewData = null;
  jpLinkPreviewState = 'idle';
  if (typeof showToast === 'function') {
    showToast('success', 'Link Disisipkan', mode === 'card' ? 'Kartu preview berhasil ditambahkan ke naskah.' : 'Link teks berhasil ditambahkan ke naskah.');
  }
}

function jpHideLinkPopover() {
  const pop = document.getElementById('jp-link-popover');
  if (pop) pop.classList.add('hidden');
  document.querySelectorAll('#editor-body .jp-link-selected').forEach((el) => el.classList.remove('jp-link-selected'));
}

function jpShowLinkPopover(anchor) {
  const pop = document.getElementById('jp-link-popover');
  if (!pop || !anchor) return;
  document.querySelectorAll('#editor-body .jp-link-selected').forEach((el) => el.classList.remove('jp-link-selected'));
  anchor.classList.add('jp-link-selected');
  pop.classList.remove('hidden');
  try {
    const r = anchor.getBoundingClientRect();
    const top = Math.min(window.innerHeight - 60, Math.max(8, r.bottom + window.scrollY + 6 - window.scrollY));
    pop.style.top = (r.bottom + 6) + 'px';
    pop.style.left = Math.max(8, Math.min(window.innerWidth - 260, r.left)) + 'px';
    void top;
  } catch (e) { /* abaikan */ }
  pop.dataset.targetSet = '1';
  pop._targetNode = anchor;
}

function initJpLinkEditor() {
  const urlInput = document.getElementById('jp-link-url');
  const submitBtn = document.getElementById('jp-link-submit');
  const editorBody = document.getElementById('editor-body');
  const pop = document.getElementById('jp-link-popover');
  const linkModal = document.getElementById('link-modal');

  if (urlInput && !urlInput.dataset.jpBound) {
    urlInput.dataset.jpBound = '1';
    urlInput.addEventListener('input', jpSchedulePreviewFetch);
    urlInput.addEventListener('paste', () => setTimeout(jpSchedulePreviewFetch, 60));
  }
  if (submitBtn && !submitBtn.dataset.jpBound) {
    submitBtn.dataset.jpBound = '1';
    submitBtn.addEventListener('click', jpSubmitLinkModal);
  }

  // Klik backdrop #link-modal: tutup #link-modal tanpa mempengaruhi #news-modal
  if (linkModal && !linkModal.dataset.jpBackdropBound) {
    linkModal.dataset.jpBackdropBound = '1';
    linkModal.addEventListener('click', (e) => {
      if (e.target === linkModal) {
        closeJpLinkModal();
      }
    });
  }

  // Tombol Escape khusus #link-modal: jangan teruskan event agar #news-modal tidak ikut tertutup
  if (!window._jpLinkEscapeBound) {
    window._jpLinkEscapeBound = true;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const m = document.getElementById('link-modal');
        if (m && !m.classList.contains('hidden')) {
          e.preventDefault();
          e.stopImmediatePropagation();
          closeJpLinkModal();
        }
      }
    }, true);
  }

  if (editorBody && !editorBody.dataset.jpLinkBound) {
    editorBody.dataset.jpLinkBound = '1';

    // Update terus jpKursor/seleksi saat pengguna mengetik atau klik di editor
    editorBody.addEventListener('keyup', jpSaveSelection);
    editorBody.addEventListener('mouseup', jpSaveSelection);
    editorBody.addEventListener('input', jpSaveSelection);

    editorBody.addEventListener('click', (e) => {
      const card = e.target && e.target.closest ? e.target.closest('a.jp-link-card') : null;
      if (card && editorBody.contains(card)) {
        e.preventDefault();
        jpSaveSelection();
        jpShowLinkPopover(card);
      } else {
        jpHideLinkPopover();
        // Jika pengguna mengklik ruang kosong di bagian bawah editor
        if (e.target === editorBody) {
          const last = editorBody.lastElementChild;
          if (!last || last.classList.contains('jp-link-card') || last.tagName !== 'P') {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            editorBody.appendChild(p);
            jpSetCaretToParagraph(p);
          } else if (last && last.tagName === 'P') {
            jpSetCaretToParagraph(last);
          }
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!pop || pop.classList.contains('hidden')) return;
      if (e.target.closest && (e.target.closest('#jp-link-popover') || e.target.closest('a.jp-link-card'))) return;
      jpHideLinkPopover();
    });

    // Navigasi keyboard pada kartu link
    editorBody.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        jpHideLinkPopover();
        return;
      }
      const selected = editorBody.querySelector('.jp-link-card.jp-link-selected');
      if (selected) {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault();
          jpHideLinkPopover();
          let nextP = selected.nextElementSibling;
          if (!nextP || nextP.tagName !== 'P') {
            nextP = document.createElement('p');
            nextP.innerHTML = '<br>';
            selected.after(nextP);
          }
          jpSetCaretToParagraph(nextP);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          jpHideLinkPopover();
          let prevP = selected.previousElementSibling;
          if (!prevP || prevP.tagName !== 'P') {
            prevP = document.createElement('p');
            prevP.innerHTML = '<br>';
            selected.before(prevP);
          }
          jpSetCaretToParagraph(prevP);
          return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          jpHideLinkPopover();
          const next = selected.nextElementSibling;
          const prev = selected.previousElementSibling;
          selected.remove();
          if (next && next.tagName === 'P') {
            jpSetCaretToParagraph(next);
          } else if (prev && prev.tagName === 'P') {
            jpSetCaretToParagraph(prev);
          } else {
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            editorBody.appendChild(p);
            jpSetCaretToParagraph(p);
          }
          if (typeof updateWordCount === 'function') updateWordCount();
          return;
        }
      }
    });
  }

  const btnEdit = document.getElementById('jp-link-pop-edit');
  const btnText = document.getElementById('jp-link-pop-totext');
  const btnAddPara = document.getElementById('jp-link-pop-addpara');
  const btnDel = document.getElementById('jp-link-pop-delete');

  if (btnEdit && !btnEdit.dataset.jpBound) {
    btnEdit.dataset.jpBound = '1';
    btnEdit.addEventListener('click', () => {
      const node = pop ? pop._targetNode : null;
      jpHideLinkPopover();
      openJpLinkModal(node || undefined);
    });
  }
  if (btnText && !btnText.dataset.jpBound) {
    btnText.dataset.jpBound = '1';
    btnText.addEventListener('click', () => {
      const node = pop ? pop._targetNode : null;
      if (!node) { jpHideLinkPopover(); return; }
      const href = node.getAttribute('href') || node.dataset.url || '#';
      const text = node.dataset.text || node.querySelector('.jp-link-card__title')?.textContent || href;
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer nofollow');
      a.textContent = text;
      if (node.parentElement === editorBody) {
        const p = document.createElement('p');
        p.appendChild(a);
        node.replaceWith(p);
        jpSetCaretToParagraph(p);
      } else {
        node.replaceWith(a);
      }
      jpHideLinkPopover();
      if (typeof updateWordCount === 'function') updateWordCount();
    });
  }
  if (btnAddPara && !btnAddPara.dataset.jpBound) {
    btnAddPara.dataset.jpBound = '1';
    btnAddPara.addEventListener('click', () => {
      const node = pop ? pop._targetNode : null;
      if (!node) { jpHideLinkPopover(); return; }
      jpHideLinkPopover();
      let next = node.nextElementSibling;
      if (!next || next.tagName !== 'P') {
        next = document.createElement('p');
        next.innerHTML = '<br>';
        node.after(next);
      }
      jpSetCaretToParagraph(next);
    });
  }
  if (btnDel && !btnDel.dataset.jpBound) {
    btnDel.dataset.jpBound = '1';
    btnDel.addEventListener('click', () => {
      const node = pop ? pop._targetNode : null;
      if (node) {
        const next = node.nextElementSibling;
        const prev = node.previousElementSibling;
        node.remove();
        if (next && next.tagName === 'P') {
          jpSetCaretToParagraph(next);
        } else if (prev && prev.tagName === 'P') {
          jpSetCaretToParagraph(prev);
        } else {
          const p = document.createElement('p');
          p.innerHTML = '<br>';
          editorBody.appendChild(p);
          jpSetCaretToParagraph(p);
        }
      }
      jpHideLinkPopover();
      if (typeof updateWordCount === 'function') updateWordCount();
    });
  }
}

function jpNormalizeEditorCards() {
  const editorBody = document.getElementById('editor-body');
  if (!editorBody) return;
  editorBody.querySelectorAll('a.jp-link-card').forEach((card) => {
    card.setAttribute('contenteditable', 'false');
    let next = card.nextElementSibling;
    if (!next || next.tagName !== 'P') {
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      card.after(p);
    }
  });
  editorBody.querySelectorAll('p').forEach((p) => {
    if (!p.innerHTML || p.innerHTML.trim() === '') {
      p.innerHTML = '<br>';
    }
  });
}
window.jpNormalizeEditorCards = jpNormalizeEditorCards;

window.openJpLinkModal = openJpLinkModal;
window.closeJpLinkModal = closeJpLinkModal;

/* ==========================================================================
   MODAL SISIPKAN GAMBAR (UPLOAD DARI PERANGKAT & TAUTAN URL)
   ========================================================================== */
let editorImgActiveTab = 'upload';
let editorImgUploadedUrl = '';

function openEditorImageModal() {
  jpSaveSelection();
  resetEditorImageModal();
  if (typeof openModal === 'function') {
    openModal('image-modal');
  } else {
    const m = document.getElementById('image-modal');
    if (m) m.classList.remove('hidden');
  }
}

function closeEditorImageModal() {
  if (typeof closeModal === 'function') {
    closeModal('image-modal');
  } else {
    const m = document.getElementById('image-modal');
    if (m) m.classList.add('hidden');
  }
}

function resetEditorImageModal() {
  editorImgActiveTab = 'upload';
  editorImgUploadedUrl = '';

  const tabUpload = document.getElementById('tab-img-upload');
  const tabUrl = document.getElementById('tab-img-url');
  const panelUpload = document.getElementById('panel-img-upload');
  const panelUrl = document.getElementById('panel-img-url');
  const fileInput = document.getElementById('editor-img-file-input');
  const dropzone = document.getElementById('editor-img-dropzone');
  const dropzoneContent = document.getElementById('editor-img-dropzone-content');
  const uploadingSpinner = document.getElementById('editor-img-uploading');
  const previewBox = document.getElementById('editor-img-preview-box');
  const previewTag = document.getElementById('editor-img-preview-tag');
  const urlInput = document.getElementById('editor-img-url-input');
  const captionInput = document.getElementById('editor-img-caption-input');
  const submitBtn = document.getElementById('btn-submit-editor-img');

  if (fileInput) fileInput.value = '';
  if (urlInput) urlInput.value = '';
  if (captionInput) captionInput.value = '';
  if (previewTag) previewTag.src = '';
  if (previewBox) previewBox.classList.add('hidden');
  if (dropzone) dropzone.classList.remove('hidden');
  if (dropzoneContent) dropzoneContent.classList.remove('hidden');
  if (uploadingSpinner) uploadingSpinner.classList.add('hidden');
  if (submitBtn) submitBtn.disabled = true;

  if (tabUpload && tabUrl && panelUpload && panelUrl) {
    tabUpload.className = 'pb-2 border-b-2 border-buser-red text-buser-red flex items-center gap-1.5 transition-colors';
    tabUrl.className = 'pb-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors';
    panelUpload.classList.remove('hidden');
    panelUrl.classList.add('hidden');
  }
}

function initEditorImageModal() {
  const imageModal = document.getElementById('image-modal');
  if (!imageModal || imageModal.dataset.initBound) return;
  imageModal.dataset.initBound = '1';

  const tabUpload = document.getElementById('tab-img-upload');
  const tabUrl = document.getElementById('tab-img-url');
  const panelUpload = document.getElementById('panel-img-upload');
  const panelUrl = document.getElementById('panel-img-url');
  const fileInput = document.getElementById('editor-img-file-input');
  const dropzone = document.getElementById('editor-img-dropzone');
  const dropzoneContent = document.getElementById('editor-img-dropzone-content');
  const uploadingSpinner = document.getElementById('editor-img-uploading');
  const previewBox = document.getElementById('editor-img-preview-box');
  const previewTag = document.getElementById('editor-img-preview-tag');
  const btnRemoveImg = document.getElementById('btn-remove-editor-img');
  const urlInput = document.getElementById('editor-img-url-input');
  const captionInput = document.getElementById('editor-img-caption-input');
  const submitBtn = document.getElementById('btn-submit-editor-img');

  // Tab switching
  if (tabUpload && tabUrl) {
    tabUpload.addEventListener('click', () => {
      editorImgActiveTab = 'upload';
      tabUpload.className = 'pb-2 border-b-2 border-buser-red text-buser-red flex items-center gap-1.5 transition-colors';
      tabUrl.className = 'pb-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors';
      panelUpload?.classList.remove('hidden');
      panelUrl?.classList.add('hidden');
      if (editorImgUploadedUrl) {
        if (previewTag) previewTag.src = formatAdminImageUrl(editorImgUploadedUrl);
        previewBox?.classList.remove('hidden');
        dropzone?.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = false;
      } else {
        previewBox?.classList.add('hidden');
        dropzone?.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = true;
      }
    });

    tabUrl.addEventListener('click', () => {
      editorImgActiveTab = 'url';
      tabUrl.className = 'pb-2 border-b-2 border-buser-red text-buser-red flex items-center gap-1.5 transition-colors';
      tabUpload.className = 'pb-2 border-b-2 border-transparent text-gray-500 hover:text-gray-700 flex items-center gap-1.5 transition-colors';
      panelUrl?.classList.remove('hidden');
      panelUpload?.classList.add('hidden');
      const val = (urlInput?.value || '').trim();
      if (val && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('assets/'))) {
        if (previewTag) previewTag.src = val;
        previewBox?.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = false;
      } else {
        previewBox?.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = true;
      }
    });
  }

  // Handle File Upload dari perangkat
  async function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      if (typeof showToast === 'function') {
        showToast('warning', 'Format Salah', 'File yang dipilih harus berupa gambar (JPG, PNG, WebP).');
      } else {
        alert('File harus berupa gambar.');
      }
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      if (typeof showToast === 'function') {
        showToast('warning', 'File Terlalu Besar', 'Ukuran gambar maksimal 8MB.');
      } else {
        alert('Ukuran gambar maksimal 8MB.');
      }
      return;
    }

    if (uploadingSpinner) uploadingSpinner.classList.remove('hidden');
    if (dropzoneContent) dropzoneContent.classList.add('hidden');

    try {
      let res;
      if (window.BuserInfoAPI && typeof window.BuserInfoAPI.uploadThumbnail === 'function') {
        res = await window.BuserInfoAPI.uploadThumbnail(file);
      } else {
        const fd = new FormData();
        fd.append('thumbnail', file);
        const r = await fetch('../api/upload.php', { method: 'POST', body: fd, credentials: 'include' });
        res = await r.json();
      }

      if (res && (res.status === 'success' || res.status === true) && res.data && res.data.url) {
        editorImgUploadedUrl = res.data.url;
        if (previewTag) previewTag.src = formatAdminImageUrl(editorImgUploadedUrl);
        if (previewBox) previewBox.classList.remove('hidden');
        if (dropzone) dropzone.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = false;
        if (typeof showToast === 'function') {
          showToast('success', 'Gambar Berhasil Diunggah', 'Siap disisipkan ke dalam naskah berita.');
        }
      } else {
        throw new Error((res && res.message) || 'Gagal menyimpan file gambar ke server.');
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('warning', 'Gagal Upload', err.message || 'Terjadi kesalahan.');
      } else {
        alert('Gagal upload: ' + err.message);
      }
    } finally {
      if (uploadingSpinner) uploadingSpinner.classList.add('hidden');
      if (dropzoneContent) dropzoneContent.classList.remove('hidden');
    }
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleFile(file);
    });

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('border-buser-red', 'bg-red-50/30');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('border-buser-red', 'bg-red-50/30');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('border-buser-red', 'bg-red-50/30');
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
  }

  // Tombol reset gambar yang diupload
  if (btnRemoveImg) {
    btnRemoveImg.addEventListener('click', (e) => {
      e.stopPropagation();
      editorImgUploadedUrl = '';
      if (fileInput) fileInput.value = '';
      if (previewBox) previewBox.classList.add('hidden');
      if (editorImgActiveTab === 'upload') {
        if (dropzone) dropzone.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = true;
      }
      if (editorImgActiveTab === 'url') {
        if (urlInput) urlInput.value = '';
        if (submitBtn) submitBtn.disabled = true;
      }
    });
  }

  // URL input live listener
  if (urlInput) {
    const handleUrlInput = () => {
      if (editorImgActiveTab !== 'url') return;
      const val = urlInput.value.trim();
      if (val && (val.startsWith('http://') || val.startsWith('https://') || val.startsWith('assets/'))) {
        if (previewTag) previewTag.src = val;
        previewBox?.classList.remove('hidden');
        if (submitBtn) submitBtn.disabled = false;
      } else {
        previewBox?.classList.add('hidden');
        if (submitBtn) submitBtn.disabled = true;
      }
    };
    urlInput.addEventListener('input', handleUrlInput);
    urlInput.addEventListener('paste', () => setTimeout(handleUrlInput, 50));
  }

  // Submit & sisipkan ke editor
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      let finalSrc = '';
      if (editorImgActiveTab === 'upload') {
        finalSrc = editorImgUploadedUrl ? formatAdminImageUrl(editorImgUploadedUrl) : '';
      } else {
        finalSrc = (urlInput?.value || '').trim();
      }

      if (!finalSrc) {
        if (typeof showToast === 'function') {
          showToast('warning', 'Gambar Belum Dipilih', 'Silakan pilih file gambar atau isi URL gambar.');
        }
        return;
      }

      const caption = (captionInput?.value || '').trim();
      const altText = caption || 'Foto Dokumentasi Berita Japakeh Post';

      // Buat HTML figure responsif
      const figureHtml = `
<figure class="my-4 text-center">
  <img src="${finalSrc.replace(/"/g, '&quot;')}" alt="${altText.replace(/"/g, '&quot;')}" class="rounded-lg max-w-full h-auto mx-auto shadow-sm inline-block" />
  ${caption ? `<figcaption class="text-xs text-gray-500 mt-1.5 italic text-center leading-relaxed">${caption.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</figcaption>` : ''}
</figure>
<p><br></p>`;

      jpRestoreSelection();
      document.execCommand('insertHTML', false, figureHtml);
      updateWordCount();
      closeEditorImageModal();

      if (typeof showToast === 'function') {
        showToast('success', 'Gambar Disisipkan', 'Foto berhasil disisipkan ke dalam naskah berita.');
      }
    });
  }

  // Backdrop click & Escape key
  imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
      closeEditorImageModal();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !imageModal.classList.contains('hidden')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeEditorImageModal();
    }
  }, true);
}


/* ==========================================================================
   MODAL EMBED VIDEO YOUTUBE (URL LENGKAP / SHORTS / SHARE LINK)
   ========================================================================== */
function extractYouTubeVideoId(input) {
  if (!input) return null;
  input = String(input).trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
  const match = input.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/i);
  return match ? match[1] : null;
}

function openEditorVideoModal() {
  jpSaveSelection();
  resetEditorVideoModal();
  if (typeof openModal === 'function') {
    openModal('video-embed-modal');
  } else {
    const m = document.getElementById('video-embed-modal');
    if (m) m.classList.remove('hidden');
  }
  setTimeout(() => {
    document.getElementById('editor-video-url-input')?.focus();
  }, 100);
}

function closeEditorVideoModal() {
  const iframe = document.getElementById('editor-video-preview-iframe');
  if (iframe) iframe.src = '';
  if (typeof closeModal === 'function') {
    closeModal('video-embed-modal');
  } else {
    const m = document.getElementById('video-embed-modal');
    if (m) m.classList.add('hidden');
  }
}

function resetEditorVideoModal() {
  const urlInput = document.getElementById('editor-video-url-input');
  const iframe = document.getElementById('editor-video-preview-iframe');
  const placeholder = document.getElementById('editor-video-preview-placeholder');
  const feedback = document.getElementById('editor-video-feedback');
  const submitBtn = document.getElementById('btn-submit-editor-video');

  if (urlInput) urlInput.value = '';
  if (iframe) {
    iframe.src = '';
    iframe.classList.add('hidden');
  }
  if (placeholder) placeholder.classList.remove('hidden');
  if (feedback) {
    feedback.innerHTML = '';
    feedback.classList.add('hidden');
  }
  if (submitBtn) submitBtn.disabled = true;
}

function initEditorVideoModal() {
  const videoModal = document.getElementById('video-embed-modal');
  if (!videoModal || videoModal.dataset.initBound) return;
  videoModal.dataset.initBound = '1';

  const urlInput = document.getElementById('editor-video-url-input');
  const iframe = document.getElementById('editor-video-preview-iframe');
  const placeholder = document.getElementById('editor-video-preview-placeholder');
  const feedback = document.getElementById('editor-video-feedback');
  const submitBtn = document.getElementById('btn-submit-editor-video');

  let activeVideoId = null;

  const validateAndPreview = () => {
    const val = (urlInput?.value || '').trim();
    const ytId = extractYouTubeVideoId(val);

    if (ytId) {
      activeVideoId = ytId;
      if (iframe) {
        iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?rel=0`;
        iframe.classList.remove('hidden');
      }
      if (placeholder) placeholder.classList.add('hidden');
      if (feedback) {
        feedback.innerHTML = `<span class="text-emerald-600 font-semibold flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Link YouTube valid (ID: <code class="font-mono bg-gray-100 px-1 py-0.5 rounded text-[10px] text-gray-800">${ytId}</code>)</span>`;
        feedback.classList.remove('hidden');
      }
      if (submitBtn) submitBtn.disabled = false;
    } else if (val) {
      activeVideoId = null;
      if (iframe) {
        iframe.src = '';
        iframe.classList.add('hidden');
      }
      if (placeholder) placeholder.classList.remove('hidden');
      if (feedback) {
        feedback.innerHTML = `<span class="text-red-500 font-medium">Format link belum valid. Silakan tempelkan link video YouTube lengkap (contoh: https://www.youtube.com/watch?v=... atau https://youtu.be/...).</span>`;
        feedback.classList.remove('hidden');
      }
      if (submitBtn) submitBtn.disabled = true;
    } else {
      activeVideoId = null;
      if (iframe) {
        iframe.src = '';
        iframe.classList.add('hidden');
      }
      if (placeholder) placeholder.classList.remove('hidden');
      if (feedback) {
        feedback.innerHTML = '';
        feedback.classList.add('hidden');
      }
      if (submitBtn) submitBtn.disabled = true;
    }
  };

  if (urlInput) {
    urlInput.addEventListener('input', validateAndPreview);
    urlInput.addEventListener('paste', () => setTimeout(validateAndPreview, 50));
  }

  // Submit embed video
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const ytId = activeVideoId || extractYouTubeVideoId(urlInput?.value);
      if (!ytId) {
        if (typeof showToast === 'function') {
          showToast('warning', 'Link Tidak Valid', 'Silakan masukkan tautan video YouTube yang valid.');
        }
        return;
      }

      const embedHtml = `
<div class="aspect-video my-4 w-full rounded-lg overflow-hidden shadow-sm bg-black">
  <iframe class="w-full h-full rounded-lg" src="https://www.youtube-nocookie.com/embed/${ytId}?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
</div>
<p><br></p>`;

      jpRestoreSelection();
      document.execCommand('insertHTML', false, embedHtml);
      updateWordCount();
      closeEditorVideoModal();

      if (typeof showToast === 'function') {
        showToast('success', 'Video Disisipkan', 'Embed video YouTube berhasil disisipkan ke naskah berita.');
      }
    });
  }

  // Backdrop click & Escape key
  videoModal.addEventListener('click', (e) => {
    if (e.target === videoModal) {
      closeEditorVideoModal();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !videoModal.classList.contains('hidden')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      closeEditorVideoModal();
    }
  }, true);
}

window.openEditorImageModal = openEditorImageModal;
window.closeEditorImageModal = closeEditorImageModal;
window.openEditorVideoModal = openEditorVideoModal;
window.closeEditorVideoModal = closeEditorVideoModal;
window.extractYouTubeVideoId = extractYouTubeVideoId;

Object.defineProperty(window, 'currentGalleryPhotos', {
  get: () => currentGalleryPhotos,
  set: (val) => { currentGalleryPhotos = val; }
});

/**
 * Konversi ISO date atau MySQL datetime ke format YYYY-MM-DDTHH:MM (untuk input datetime-local)
 */
function formatForDatetimeLocal(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const mins = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

/**
 * Buat string datetime-local sekarang atau dengan offset jam
 */
function getNowForDatetimeLocal(offsetHours = 0) {
  const d = new Date();
  if (offsetHours !== 0) {
    d.setTime(d.getTime() + (offsetHours * 60 * 60 * 1000));
  }
  return formatForDatetimeLocal(d);
}

/**
 * Inisialisasi event listener modal tambah & edit berita
 */
function initNewsModalAndEditor() {
  const btnAdd = document.getElementById('btn-add-news');
  const btnEmptyAdd = document.getElementById('btn-empty-add-news');
  const titleInput = document.getElementById('article-title');
  const slugInput = document.getElementById('article-slug');
  const btnEditSlug = document.getElementById('btn-edit-slug');
  const excerptInput = document.getElementById('article-excerpt');
  const excerptCounter = document.getElementById('excerpt-counter');
  const editorBody = document.getElementById('editor-body');
  const fileInput = document.getElementById('thumb-file-input');
  const previewImg = document.getElementById('thumb-preview-img');
  const removeThumbBtn = document.getElementById('btn-remove-thumb');
  const btnToggleSeo = document.getElementById('btn-toggle-seo');
  const seoContent = document.getElementById('seo-content');
  const seoChevron = document.getElementById('seo-chevron');
  const radioSchedule = document.getElementById('radio-schedule');
  const scheduleBox = document.getElementById('schedule-picker-box');
  const radios = document.querySelectorAll('input[name="pub_status"]');
  const btnPreviewModal = document.getElementById('btn-preview-modal');
  const btnSaveDraft = document.getElementById('btn-save-draft');
  const newsForm = document.getElementById('news-modal-form');
  const newTagInput = document.getElementById('new-tag-input');
  const btnAddTag = document.getElementById('btn-add-tag');

  // Muat opsi kategori di modal
  populateModalCategorySelect();
  // Muat opsi penulis di modal
  populateModalAuthorSelect();
  // Muat opsi editor di modal
  populateModalEditorSelect();
  // Inisialisasi pengelola galeri foto artikel
  initGalleryManager();
  // Inisialisasi modal Link Card (FR-01 s.d. FR-06) — aman dipanggil ulang (idempotent)
  if (typeof initJpLinkEditor === 'function') { try { initJpLinkEditor(); } catch (e) {} }
  // Inisialisasi modal Gambar & Video dalam Naskah
  if (typeof initEditorImageModal === 'function') { try { initEditorImageModal(); } catch (e) {} }
  if (typeof initEditorVideoModal === 'function') { try { initEditorVideoModal(); } catch (e) {} }

  // Tombol buka modal tambah
  if (btnAdd) btnAdd.addEventListener('click', openAddNewsModal);
  if (btnEmptyAdd) btnEmptyAdd.addEventListener('click', openAddNewsModal);

  // Auto generate Slug dari Judul
  if (titleInput && slugInput) {
    titleInput.addEventListener('input', () => {
      if (!isSlugManual) {
        const slug = titleInput.value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .trim()
          .replace(/\s+/g, '-');
        slugInput.value = slug;
      }
    });
  }

  // Tombol Buka Kunci Slug Manual
  if (btnEditSlug && slugInput) {
    btnEditSlug.addEventListener('click', () => {
      isSlugManual = true;
      slugInput.focus();
      if (typeof showToast === 'function') {
        showToast('info', 'Slug Manual', 'Anda dapat mengubah permalink slug secara manual.');
      }
    });
  }

  // Hitung Karakter Ringkasan / Excerpt
  if (excerptInput && excerptCounter) {
    excerptInput.addEventListener('input', () => {
      excerptCounter.textContent = `${excerptInput.value.length} / 220 karakter`;
    });
  }

  // Hitung Kata Naskah Berita
  if (editorBody) {
    editorBody.addEventListener('input', updateWordCount);
  }

  // Toolbar Formatting WYSIWYG
  document.querySelectorAll('.editor-tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-command');
      const val = btn.getAttribute('data-val') || null;
      document.execCommand(cmd, false, val);
      updateWordCount();
    });
  });

  // Sisipkan Link (Teks vs Kartu Preview — PRD Link Card FR-01)
  const btnLink = document.getElementById('btn-insert-link');
  if (btnLink) {
    btnLink.addEventListener('mousedown', () => {
      // Simpan seleksi teks di editor sebelum tombol mengambil fokus
      jpSaveSelection();
    });
    btnLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.openJpLinkModal === 'function') {
        window.openJpLinkModal();
        return;
      }
      const url = prompt('Masukkan tautan URL:', 'https://');
      if (url) document.execCommand('createLink', false, url);
    });
  }

  // Sisipkan Gambar Konten (Upload dari Perangkat & Tautan URL)
  const btnImg = document.getElementById('btn-insert-image');
  if (btnImg) {
    btnImg.addEventListener('mousedown', () => {
      jpSaveSelection();
    });
    btnImg.addEventListener('click', (e) => {
      e.preventDefault();
      openEditorImageModal();
    });
  }

  // Embed YouTube Video (Link YouTube Lengkap / Shorts / Share)
  const btnVideo = document.getElementById('btn-insert-video');
  if (btnVideo) {
    btnVideo.addEventListener('mousedown', () => {
      jpSaveSelection();
    });
    btnVideo.addEventListener('click', (e) => {
      e.preventDefault();
      openEditorVideoModal();
    });
  }

  // Toggle Accordion SEO
  if (btnToggleSeo && seoContent) {
    btnToggleSeo.addEventListener('click', () => {
      seoContent.classList.toggle('hidden');
      if (seoChevron) seoChevron.classList.toggle('rotate-180');
    });
  }

  // 1. Status Publikasi & Jadwal Tayang
  const statusIndicator = document.getElementById('current-status-indicator');
  const publishDateWrapper = document.getElementById('publish-date-wrapper');
  const scheduleInput = document.getElementById('schedule-datetime');

  if (radios) {
    radios.forEach(r => {
      r.addEventListener('change', () => {
        const val = r.value;
        if (statusIndicator) statusIndicator.textContent = val;

        if (radioSchedule && radioSchedule.checked) {
          if (scheduleBox) scheduleBox.classList.remove('hidden');
          if (scheduleInput && !scheduleInput.value) {
            scheduleInput.value = getNowForDatetimeLocal(2); // default jadwal +2 jam
          }
          if (publishDateWrapper) publishDateWrapper.classList.add('hidden');
        } else {
          if (scheduleBox) scheduleBox.classList.add('hidden');
          if (publishDateWrapper) publishDateWrapper.classList.remove('hidden');
        }
      });
    });
  }

  // 2. Mode Tanggal Terbit Manual (Kustom / Backdate)
  const dateModeRadios = document.querySelectorAll('input[name="date_mode"]');
  const manualDateBox = document.getElementById('manual-date-picker-box');
  const pubAtInput = document.getElementById('article-published-at');
  const btnQuickNow = document.getElementById('btn-quick-now');
  const btnQuickYesterday = document.getElementById('btn-quick-yesterday');

  if (dateModeRadios && manualDateBox) {
    dateModeRadios.forEach(dm => {
      dm.addEventListener('change', () => {
        if (dm.value === 'manual' && dm.checked) {
          manualDateBox.classList.remove('hidden');
          if (pubAtInput && !pubAtInput.value) {
            pubAtInput.value = getNowForDatetimeLocal(0);
          }
        } else if (dm.value === 'auto' && dm.checked) {
          manualDateBox.classList.add('hidden');
        }
      });
    });
  }

  if (btnQuickNow && pubAtInput) {
    btnQuickNow.addEventListener('click', () => {
      pubAtInput.value = getNowForDatetimeLocal(0);
      if (typeof showToast === 'function') {
        showToast('info', 'Waktu Sekarang', 'Tanggal terbit disetel ke waktu saat ini.');
      }
    });
  }

  if (btnQuickYesterday && pubAtInput) {
    btnQuickYesterday.addEventListener('click', () => {
      pubAtInput.value = getNowForDatetimeLocal(-24);
      if (typeof showToast === 'function') {
        showToast('info', 'Waktu Kemarin', 'Tanggal terbit disetel ke kemarin (H-1).');
      }
    });
  }

  // 3. Batas Waktu Tayang (Auto-Expire)
  const checkExpire = document.getElementById('check-enable-expire');
  const expireBox = document.getElementById('expire-picker-box');
  const expireInput = document.getElementById('article-expired-at');
  const btnExp1d = document.getElementById('btn-expire-1d');
  const btnExp3d = document.getElementById('btn-expire-3d');
  const btnExp7d = document.getElementById('btn-expire-7d');

  if (checkExpire && expireBox) {
    checkExpire.addEventListener('change', () => {
      if (checkExpire.checked) {
        expireBox.classList.remove('hidden');
        if (expireInput && !expireInput.value) {
          expireInput.value = getNowForDatetimeLocal(72); // default +3 hari
        }
      } else {
        expireBox.classList.add('hidden');
        if (expireInput) expireInput.value = '';
      }
    });
  }

  if (btnExp1d && expireInput) {
    btnExp1d.addEventListener('click', () => {
      expireInput.value = getNowForDatetimeLocal(24);
    });
  }
  if (btnExp3d && expireInput) {
    btnExp3d.addEventListener('click', () => {
      expireInput.value = getNowForDatetimeLocal(72);
    });
  }
  if (btnExp7d && expireInput) {
    btnExp7d.addEventListener('click', () => {
      expireInput.value = getNowForDatetimeLocal(168);
    });
  }

  // Upload Thumbnail Berita
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        if (previewImg) previewImg.src = event.target.result;
      };
      reader.readAsDataURL(file);

      if (window.BuserInfoAPI && window.BuserInfoAPI.uploadThumbnail) {
        if (typeof showToast === 'function') {
          showToast('info', 'Mengunggah Thumbnail...', 'Sedang menyimpan file ke server.');
        }
        const res = await window.BuserInfoAPI.uploadThumbnail(file);
        if (res && res.status === 'success' && res.data && res.data.url) {
          uploadedThumbnailUrl = res.data.url;
          if (previewImg) previewImg.src = formatAdminImageUrl(uploadedThumbnailUrl);

          // SINKRONISASI KE GALERI (Permintaan 3):
          // Thumbnail yang digunakan pada berita tidak akan terganti saat user menambahkan gambar pada galeri foto,
          // thumbnail malah akan digunakan sebagai foto/galeri dengan urutan pertama (#1).
          if (currentGalleryPhotos.length > 0) {
            const existingIdx = currentGalleryPhotos.findIndex(p => (p.foto === uploadedThumbnailUrl || p.url === uploadedThumbnailUrl));
            if (existingIdx > 0) {
              const [chosen] = currentGalleryPhotos.splice(existingIdx, 1);
              currentGalleryPhotos.unshift(chosen);
            } else if (existingIdx === -1) {
              // Jika belum ada di list, update Foto #1 menjadi thumbnail baru ini
              currentGalleryPhotos[0].foto = uploadedThumbnailUrl;
              currentGalleryPhotos[0].url = uploadedThumbnailUrl;
            }
            currentGalleryPhotos.forEach((p, i) => p.urutan = i + 1);
            renderGalleryManagerItems();
          }

          if (typeof showToast === 'function') {
            showToast('success', 'Gambar Berhasil Diunggah', 'Thumbnail tersimpan dan disinkronkan ke Foto #1 Galeri.');
          }
        } else {
          if (typeof showToast === 'function') {
            showToast('warning', 'Peringatan Upload', (res && res.message) || 'Gagal menyimpan file.');
          }
        }
      }
    });
  }

  // Reset Thumbnail
  if (removeThumbBtn) {
    removeThumbBtn.addEventListener('click', () => {
      uploadedThumbnailUrl = 'assets/images/berita/hero/sorotan-utama-dunia.jpg';
      if (previewImg) previewImg.src = formatAdminImageUrl(uploadedThumbnailUrl);
      if (typeof showToast === 'function') {
        showToast('info', 'Thumbnail Direset', 'Thumbnail kembali ke gambar default.');
      }
    });
  }

  // Sinkronisasi input Caption Berita Utama ke Foto #1 Galeri
  const mainCaptionInput = document.getElementById('article-caption');
  if (mainCaptionInput) {
    mainCaptionInput.addEventListener('input', () => {
      if (currentGalleryPhotos.length > 0) {
        currentGalleryPhotos[0].caption = mainCaptionInput.value;
        const firstCaptionField = document.querySelector('.gallery-item-caption[data-idx="0"]');
        if (firstCaptionField && document.activeElement !== firstCaptionField) {
          firstCaptionField.value = mainCaptionInput.value;
        }
      }
    });
  }

  // Tags Management
  if (btnAddTag && newTagInput) {
    btnAddTag.addEventListener('click', (e) => {
      e.preventDefault();
      addTagFromInput();
    });
    newTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTagFromInput();
      }
    });
  }

  // Preview Button
  if (btnPreviewModal) {
    btnPreviewModal.addEventListener('click', (e) => {
      e.preventDefault();
      openArticlePreview();
    });
  }

  // Tombol Simpan Draft
  if (btnSaveDraft) {
    btnSaveDraft.addEventListener('click', (e) => {
      e.preventDefault();
      executeSaveNews('draft');
    });
  }

  // Form Submission
  if (newsForm) {
    newsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const statusVal = document.querySelector('input[name="pub_status"]:checked')?.value || 'publish';
      let finalStatus = 'published';
      if (statusVal === 'draft') finalStatus = 'draft';
      else if (statusVal === 'review') finalStatus = 'review';
      else if (statusVal === 'schedule') finalStatus = 'scheduled';

      executeSaveNews(finalStatus);
    });
  }
}

/**
 * Muat daftar kategori ke dropdown dalam modal berita
 */
async function populateModalCategorySelect() {
  const catSelect = document.getElementById('article-category');
  if (!catSelect || !window.BuserInfoAPI || !window.BuserInfoAPI.getCategories) return;
  try {
    const cats = await window.BuserInfoAPI.getCategories();
    if (!Array.isArray(cats) || cats.length === 0) return;
    catSelect.innerHTML = '<option value="" disabled selected>Pilih Kategori</option>';
    cats.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id_kategori;
      opt.textContent = c.name_kategori;
      catSelect.appendChild(opt);
    });
  } catch (e) {
    console.warn('[BeritaLive] Gagal memuat kategori ke modal:', e);
  }
}

/**
 * Muat daftar penulis/redaksi dari database ke dropdown dalam modal berita
 */
async function populateModalAuthorSelect(selectedAuthorId = null) {
  const authorSelect = document.getElementById('article-author');
  if (!authorSelect || !window.BuserInfoAPI || !window.BuserInfoAPI.getAuthors) return;

  try {
    const authors = await window.BuserInfoAPI.getAuthors();
    if (!Array.isArray(authors) || authors.length === 0) {
      authorSelect.innerHTML = '<option value="" disabled selected>Belum ada data penulis terdaftar</option>';
      return;
    }

    authorSelect.innerHTML = '<option value="" disabled selected>Pilih Penulis / Redaksi</option>';

    // Identifikasi pengguna aktif yang sedang login
    const currentUser = (window.BuserInfoAPI && window.BuserInfoAPI.getUser) ? window.BuserInfoAPI.getUser() : null;
    const currentUserId = currentUser ? String(currentUser.id) : null;

    authors.forEach(auth => {
      const opt = document.createElement('option');
      opt.value = auth.id;
      const roleText = auth.role ? ` (${auth.role})` : '';
      opt.textContent = `${auth.nama_users}${roleText}`;

      if (selectedAuthorId && String(auth.id) === String(selectedAuthorId)) {
        opt.selected = true;
      } else if (!selectedAuthorId && currentUserId && String(auth.id) === currentUserId) {
        opt.selected = true;
      }

      authorSelect.appendChild(opt);
    });

    // Jika belum ada nilai terpilih dan ada opsi valid, pilih opsi pertama yang tersedia
    if (!authorSelect.value && authorSelect.options.length > 1) {
      authorSelect.selectedIndex = 1;
    }
  } catch (e) {
    console.warn('[BeritaLive] Gagal memuat penulis ke modal:', e);
    authorSelect.innerHTML = '<option value="" disabled selected>Gagal memuat daftar penulis</option>';
  }
}

/**
 * Muat daftar editor/redaktur dari database ke dropdown dalam modal berita
 */
async function populateModalEditorSelect(selectedEditorId = null) {
  const editorSelect = document.getElementById('article-editor-select');
  if (!editorSelect || !window.BuserInfoAPI || !window.BuserInfoAPI.getAuthors) return;

  try {
    const authors = await window.BuserInfoAPI.getAuthors();
    const isTargetEmpty = !selectedEditorId || selectedEditorId === '' || selectedEditorId === 'null' || selectedEditorId === 0 || selectedEditorId === '0';
    editorSelect.innerHTML = `<option value=""${isTargetEmpty ? ' selected' : ''}>-- Tanpa Editor Khusus / Penanggung Jawab --</option>`;

    if (!Array.isArray(authors) || authors.length === 0) {
      editorSelect.selectedIndex = 0;
      editorSelect.value = '';
      return;
    }

    authors.forEach(auth => {
      const opt = document.createElement('option');
      opt.value = auth.id;
      const roleText = auth.role ? ` (${auth.role})` : '';
      opt.textContent = `${auth.nama_users}${roleText}`;

      if (!isTargetEmpty && String(auth.id) === String(selectedEditorId)) {
        opt.selected = true;
      }

      editorSelect.appendChild(opt);
    });

    if (isTargetEmpty) {
      editorSelect.selectedIndex = 0;
      editorSelect.value = '';
    } else {
      editorSelect.value = String(selectedEditorId);
    }
  } catch (e) {
    console.warn('[BeritaLive] Gagal memuat editor ke modal:', e);
  }
}

/**
 * Tambah pill tag dari input
 */
function addTagFromInput() {
  const newTagInput = document.getElementById('new-tag-input');
  const tagContainer = document.getElementById('tag-container');
  if (!newTagInput || !tagContainer) return;
  const tagText = newTagInput.value.trim().toLowerCase();
  if (!tagText) return;
  const pill = document.createElement('span');
  pill.className = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-buser-red border border-red-200';
  pill.innerHTML = `${tagText} <button type="button" class="ml-1 text-red-400 hover:text-red-700" onclick="this.parentElement.remove()">&times;</button>`;
  tagContainer.appendChild(pill);
  newTagInput.value = '';
}

/**
 * Render tags ke container admin
 */
function renderAdminTags(tags) {
  const tagContainer = document.getElementById('tag-container');
  if (!tagContainer) return;
  tagContainer.innerHTML = '';
  let tagList = [];
  if (Array.isArray(tags)) {
    tagList = tags;
  } else if (typeof tags === 'string') {
    tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  tagList.forEach(t => {
    const cleanTag = String(t).trim().toLowerCase();
    if (!cleanTag) return;
    const pill = document.createElement('span');
    pill.className = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-buser-red border border-red-200';
    pill.innerHTML = `${cleanTag} <button type="button" class="ml-1 text-red-400 hover:text-red-700" onclick="this.parentElement.remove()">&times;</button>`;
    tagContainer.appendChild(pill);
  });
}

/**
 * Dapatkan daftar tag aktif dari container admin
 */
function getAdminSelectedTags() {
  const tagContainer = document.getElementById('tag-container');
  if (!tagContainer) return [];
  const pills = tagContainer.querySelectorAll('span');
  const tags = [];
  pills.forEach(pill => {
    const clone = pill.cloneNode(true);
    const btn = clone.querySelector('button');
    if (btn) btn.remove();
    const txt = clone.textContent.trim().toLowerCase();
    if (txt && !tags.includes(txt)) {
      tags.push(txt);
    }
  });
  return tags;
}

/**
 * Hitung jumlah kata dan karakter di editor
 */
function updateWordCount() {
  const editorBody = document.getElementById('editor-body');
  const wordCountDisplay = document.getElementById('word-count-display');
  if (!editorBody || !wordCountDisplay) return;
  const text = editorBody.innerText.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const chars = text.length;
  wordCountDisplay.textContent = `${words} kata • ${chars} karakter`;
}

/**
 * Buka modal dalam mode "Tambah Berita Baru"
 */
function openAddNewsModal() {
  isSlugManual = false;
  uploadedThumbnailUrl = null;

  const idInput = document.getElementById('article-id');
  const modalTitle = document.getElementById('news-modal-title');
  const modalSubtitle = document.getElementById('news-modal-subtitle');
  const titleInput = document.getElementById('article-title');
  const slugInput = document.getElementById('article-slug');
  const excerptInput = document.getElementById('article-excerpt');
  const excerptCounter = document.getElementById('excerpt-counter');
  const captionInput = document.getElementById('article-caption');
  const editorBody = document.getElementById('editor-body');
  const previewImg = document.getElementById('thumb-preview-img');
  const catSelect = document.getElementById('article-category');
  const statusPublishRadio = document.querySelector('input[name="pub_status"][value="publish"]');
  const scheduleBox = document.getElementById('schedule-picker-box');
  const saveStatusText = document.getElementById('save-status-text');
  const submitBtn = document.getElementById('btn-submit-publish');

  if (idInput) idInput.value = '';
  if (modalTitle) modalTitle.textContent = 'Tambah Berita Baru';
  if (modalSubtitle) modalSubtitle.textContent = 'Lengkapi konten berita, rubrikasi, dan media untuk tayang di portal';
  if (titleInput) titleInput.value = '';
  if (slugInput) slugInput.value = '';
  if (excerptInput) excerptInput.value = '';
  if (excerptCounter) excerptCounter.textContent = '0 / 220 karakter';
  if (captionInput) captionInput.value = '';
  if (editorBody) {
    editorBody.innerHTML = '<p>Tulis konten naskah berita di sini...</p>';
    if (typeof jpNormalizeEditorCards === 'function') jpNormalizeEditorCards();
  }
  if (previewImg) previewImg.src = '../assets/images/berita/hero/sorotan-utama-dunia.jpg';
  if (statusPublishRadio) statusPublishRadio.checked = true;
  if (scheduleBox) scheduleBox.classList.add('hidden');
  const scheduleInput = document.getElementById('schedule-datetime');
  if (scheduleInput) scheduleInput.value = '';

  // Reset Pengaturan Tanggal & Waktu
  const dateModeAuto = document.getElementById('date-mode-auto');
  if (dateModeAuto) dateModeAuto.checked = true;
  const manualDateBox = document.getElementById('manual-date-picker-box');
  if (manualDateBox) manualDateBox.classList.add('hidden');
  const pubAtInput = document.getElementById('article-published-at');
  if (pubAtInput) pubAtInput.value = '';

  const checkExpire = document.getElementById('check-enable-expire');
  if (checkExpire) checkExpire.checked = false;
  const expireBox = document.getElementById('expire-picker-box');
  if (expireBox) expireBox.classList.add('hidden');
  const expireInput = document.getElementById('article-expired-at');
  if (expireInput) expireInput.value = '';

  const statusIndicator = document.getElementById('current-status-indicator');
  if (statusIndicator) statusIndicator.textContent = 'Published';

  const publishDateWrapper = document.getElementById('publish-date-wrapper');
  if (publishDateWrapper) publishDateWrapper.classList.remove('hidden');

  if (catSelect && catSelect.options.length > 1) catSelect.selectedIndex = 1;

  const authorSelect = document.getElementById('article-author');
  if (authorSelect) {
    const currentUser = (window.BuserInfoAPI && window.BuserInfoAPI.getUser) ? window.BuserInfoAPI.getUser() : null;
    const currentUserId = currentUser ? String(currentUser.id) : null;
    if (authorSelect.options.length <= 1) {
      populateModalAuthorSelect(currentUserId);
    } else if (currentUserId && Array.from(authorSelect.options).some(o => o.value === currentUserId)) {
      authorSelect.value = currentUserId;
    } else if (authorSelect.options.length > 1) {
      authorSelect.selectedIndex = 1;
    }
  }

  const editorSelect = document.getElementById('article-editor-select');
  if (editorSelect) {
    if (editorSelect.options.length <= 1) {
      populateModalEditorSelect();
    } else {
      editorSelect.value = '';
    }
  }

  if (saveStatusText) saveStatusText.textContent = 'Siap menambahkan artikel baru';
  if (submitBtn) submitBtn.innerHTML = 'Terbitkan Berita';

  // Reset galeri foto
  currentGalleryPhotos = [];
  renderGalleryManagerItems();

  // Reset tag berita ke default
  renderAdminTags(['berita', 'terkini']);

  updateWordCount();
  if (typeof openModal === 'function') {
    openModal('news-modal');
  }
}

/**
 * Buka modal dalam mode "Edit Berita" dan muat data artikel dari server
 */
async function openEditNewsModal(id) {
  isSlugManual = true;
  uploadedThumbnailUrl = null;

  const idInput = document.getElementById('article-id');
  const modalTitle = document.getElementById('news-modal-title');
  const modalSubtitle = document.getElementById('news-modal-subtitle');
  const titleInput = document.getElementById('article-title');
  const slugInput = document.getElementById('article-slug');
  const excerptInput = document.getElementById('article-excerpt');
  const excerptCounter = document.getElementById('excerpt-counter');
  const captionInput = document.getElementById('article-caption');
  const editorBody = document.getElementById('editor-body');
  const previewImg = document.getElementById('thumb-preview-img');
  const catSelect = document.getElementById('article-category');
  const authorSelect = document.getElementById('article-author');
  const editorSelect = document.getElementById('article-editor-select');
  const scheduleBox = document.getElementById('schedule-picker-box');
  const saveStatusText = document.getElementById('save-status-text');
  const submitBtn = document.getElementById('btn-submit-publish');

  if (idInput) idInput.value = id;
  if (modalTitle) modalTitle.textContent = `Edit Berita #${id}`;
  if (modalSubtitle) modalSubtitle.textContent = 'Perbarui naskah berita, rubrikasi, atau status publikasi';
  if (captionInput) captionInput.value = '';
  if (editorSelect) {
    editorSelect.value = '';
    editorSelect.selectedIndex = 0;
  }
  if (saveStatusText) saveStatusText.textContent = 'Memuat data artikel dari database...';
  if (submitBtn) submitBtn.innerHTML = 'Simpan Perubahan';

  if (typeof openModal === 'function') {
    openModal('news-modal');
  }

  if (!window.BuserInfoAPI || !window.BuserInfoAPI.getArticleById) return;

  try {
    const article = await window.BuserInfoAPI.getArticleById(id);
    if (!article) {
      if (typeof showToast === 'function') {
        showToast('error', 'Gagal', 'Data artikel tidak ditemukan.');
      }
      return;
    }

    if (titleInput) titleInput.value = article.title || '';
    if (slugInput) slugInput.value = article.slug || '';
    if (excerptInput) {
      excerptInput.value = article.excerpt || '';
      if (excerptCounter) excerptCounter.textContent = `${excerptInput.value.length} / 220 karakter`;
    }
    if (captionInput) captionInput.value = article.caption || '';
    if (editorBody) {
      editorBody.innerHTML = (article.content || '<p><br></p>').replace(/(src=["'])assets\//g, '$1../assets/');
      if (typeof jpNormalizeEditorCards === 'function') jpNormalizeEditorCards();
    }

    const catId = article.kategori_id || article.id_kategori;
    if (catSelect && catId) {
      catSelect.value = catId;
    }

    if (authorSelect) {
      const targetAuthorId = article.author_id ? String(article.author_id) : '';
      if (authorSelect.options.length <= 1) {
        await populateModalAuthorSelect(targetAuthorId);
      } else if (targetAuthorId && Array.from(authorSelect.options).some(opt => opt.value === targetAuthorId)) {
        authorSelect.value = targetAuthorId;
      } else if (article.author_name) {
        for (let opt of authorSelect.options) {
          if (opt.text.toLowerCase().includes(article.author_name.toLowerCase()) || opt.value === String(article.author_id)) {
            opt.selected = true;
            break;
          }
        }
      }
    }

    if (editorSelect) {
      const targetEditorId = (article.editor_id && article.editor_id !== 'null' && article.editor_id != 0) ? String(article.editor_id) : '';
      if (editorSelect.options.length <= 1) {
        await populateModalEditorSelect(targetEditorId);
      }
      if (!targetEditorId) {
        editorSelect.value = '';
        editorSelect.selectedIndex = 0;
        Array.from(editorSelect.options).forEach((opt, idx) => {
          opt.selected = (idx === 0);
        });
      } else {
        editorSelect.value = targetEditorId;
        Array.from(editorSelect.options).forEach(opt => {
          opt.selected = (opt.value === targetEditorId);
        });
      }
    }

    if (article.thumbnail) {
      uploadedThumbnailUrl = article.thumbnail;
      if (previewImg) {
        previewImg.src = formatAdminImageUrl(article.thumbnail);
      }
    }

    const rawStatus = (article.status || 'draft').toLowerCase().trim();
    let radioVal = 'publish';
    if (rawStatus === 'draft') radioVal = 'draft';
    else if (rawStatus === 'review') radioVal = 'review';
    else if (rawStatus === 'scheduled') radioVal = 'schedule';

    const stRadio = document.querySelector(`input[name="pub_status"][value="${radioVal}"]`);
    if (stRadio) stRadio.checked = true;

    const statusIndicator = document.getElementById('current-status-indicator');
    if (statusIndicator) statusIndicator.textContent = rawStatus;

    const scheduleBox = document.getElementById('schedule-picker-box');
    const scheduleInput = document.getElementById('schedule-datetime');
    const publishDateWrapper = document.getElementById('publish-date-wrapper');

    if (radioVal === 'schedule') {
      if (scheduleBox) scheduleBox.classList.remove('hidden');
      if (scheduleInput) scheduleInput.value = formatForDatetimeLocal(article.published_at);
      if (publishDateWrapper) publishDateWrapper.classList.add('hidden');
    } else {
      if (scheduleBox) scheduleBox.classList.add('hidden');
      if (scheduleInput) scheduleInput.value = '';
      if (publishDateWrapper) publishDateWrapper.classList.remove('hidden');
    }

    // Load Tanggal & Jam Terbit (Published At)
    const dateModeAuto = document.getElementById('date-mode-auto');
    const dateModeManual = document.getElementById('date-mode-manual');
    const manualDateBox = document.getElementById('manual-date-picker-box');
    const pubAtInput = document.getElementById('article-published-at');

    if (article.published_at && radioVal !== 'schedule') {
      if (dateModeManual) dateModeManual.checked = true;
      if (manualDateBox) manualDateBox.classList.remove('hidden');
      if (pubAtInput) pubAtInput.value = formatForDatetimeLocal(article.published_at);
    } else {
      if (dateModeAuto) dateModeAuto.checked = true;
      if (manualDateBox) manualDateBox.classList.add('hidden');
      if (pubAtInput) pubAtInput.value = '';
    }

    // Load Batas Waktu Tayang (Auto-Expire)
    const checkExpire = document.getElementById('check-enable-expire');
    const expireBox = document.getElementById('expire-picker-box');
    const expireInput = document.getElementById('article-expired-at');

    if (article.expired_at) {
      if (checkExpire) checkExpire.checked = true;
      if (expireBox) expireBox.classList.remove('hidden');
      if (expireInput) expireInput.value = formatForDatetimeLocal(article.expired_at);
    } else {
      if (checkExpire) checkExpire.checked = false;
      if (expireBox) expireBox.classList.add('hidden');
      if (expireInput) expireInput.value = '';
    }

    updateWordCount();
    if (saveStatusText) {
      saveStatusText.textContent = 'Terakhir disimpan ' + (article.updated_at ? new Date(article.updated_at).toLocaleTimeString('id-ID') : '-');
    }

    // Load foto galeri jika ada
    currentGalleryPhotos = [];
    const rawGallery = article.galeri || article.gallery || [];
    if (Array.isArray(rawGallery)) {
      currentGalleryPhotos = rawGallery.map((item, idx) => {
        if (typeof item === 'string') {
          return {
            id: null,
            foto: item,
            url: item,
            caption: '',
            urutan: idx + 1,
            uploadStatus: 'success'
          };
        }
        return {
          id: item.id || null,
          foto: item.foto || item.url || item.foto_url || item.image || '',
          url: item.foto || item.url || item.foto_url || item.image || '',
          caption: item.caption || item.keterangan || '',
          urutan: parseInt(item.urutan) || (idx + 1),
          uploadStatus: 'success'
        };
      }).filter(item => Boolean(item.foto || item.url));
    }

    // Pastikan thumbnail berita menjadi foto urutan pertama (#1) galeri jika artikel memiliki thumbnail
    if (article.thumbnail && article.thumbnail !== 'assets/images/berita/hero/sorotan-utama-dunia.jpg' && currentGalleryPhotos.length > 0) {
      const cleanThumb = article.thumbnail.trim();
      const thumbIdx = currentGalleryPhotos.findIndex(p => (p.foto === cleanThumb || p.url === cleanThumb));
      if (thumbIdx > 0) {
        const [chosen] = currentGalleryPhotos.splice(thumbIdx, 1);
        currentGalleryPhotos.unshift(chosen);
      } else if (thumbIdx === -1) {
        currentGalleryPhotos.unshift({
          id: null,
          foto: cleanThumb,
          url: cleanThumb,
          caption: article.caption || '',
          urutan: 1,
          uploadStatus: 'success'
        });
      }
      currentGalleryPhotos.forEach((p, i) => p.urutan = i + 1);
    }
    renderGalleryManagerItems();

    // Muat tag berita dari artikel
    const rawTags = article.tags || article.tag_list || [];
    renderAdminTags(rawTags);
  } catch (err) {
    console.error('Gagal memuat detail artikel:', err);
    if (typeof showToast === 'function') {
      showToast('error', 'Kesalahan', 'Gagal memuat detail artikel: ' + err.message);
    }
  }
}

/**
 * Simpan data berita baru atau update berita yang ada
 */
async function executeSaveNews(targetStatus = 'published') {
  const idInput = document.getElementById('article-id');
  const editId = idInput ? idInput.value.trim() : '';
  const titleInput = document.getElementById('article-title');
  const slugInput = document.getElementById('article-slug');
  const excerptInput = document.getElementById('article-excerpt');
  const editorBody = document.getElementById('editor-body');
  const catSelect = document.getElementById('article-category');
  const previewImg = document.getElementById('thumb-preview-img');
  const submitBtn = document.getElementById('btn-submit-publish');
  const saveDraftBtn = document.getElementById('btn-save-draft');

  const title = titleInput ? titleInput.value.trim() : '';
  if (!title) {
    if (typeof showToast === 'function') {
      showToast('error', 'Gagal Menyimpan', 'Judul berita wajib diisi terlebih dahulu.');
    }
    if (titleInput) titleInput.focus();
    return false;
  }

  const rawContent = editorBody ? editorBody.innerHTML.trim() : '';
  const content = rawContent.replace(/(src=["'])\.\.\/assets\//g, '$1assets/');
  if (!content || content === '<p><br></p>' || content === '<p>Tulis konten naskah berita di sini...</p>') {
    if (typeof showToast === 'function') {
      showToast('error', 'Gagal Menyimpan', 'Konten naskah berita masih kosong.');
    }
    if (editorBody) editorBody.focus();
    return false;
  }

  let thumbPath = uploadedThumbnailUrl;
  if (!thumbPath && previewImg) {
    const currentSrc = previewImg.getAttribute('src') || '';
    if (currentSrc.includes('assets/')) {
      thumbPath = currentSrc.substring(currentSrc.indexOf('assets/'));
    } else {
      thumbPath = 'assets/images/berita/hero/sorotan-utama-dunia.jpg';
    }
  }

  const authorSelect = document.getElementById('article-author');
  let chosenAuthorId = authorSelect ? parseInt(authorSelect.value) : null;
  if (!chosenAuthorId || isNaN(chosenAuthorId)) {
    const currentUser = (window.BuserInfoAPI && window.BuserInfoAPI.getUser) ? window.BuserInfoAPI.getUser() : null;
    chosenAuthorId = currentUser ? parseInt(currentUser.id) : 1;
  }

  const editorSelect = document.getElementById('article-editor-select');
  let chosenEditorId = (editorSelect && editorSelect.value) ? parseInt(editorSelect.value) : null;
  if (chosenEditorId && isNaN(chosenEditorId)) chosenEditorId = null;

  const captionInput = document.getElementById('article-caption');
  const caption = captionInput ? captionInput.value.trim() : '';

  // Sinkronisasi data caption foto galeri dari input DOM
  syncGalleryCaptionsFromDOM();

  // Validasi jumlah foto jika mengunggah galeri (minimal 5 foto sesuai spesifikasi)
  if (currentGalleryPhotos.length > 0 && currentGalleryPhotos.length < 5) {
    const confirmProceed = confirm(
      `Pemberitahuan Galeri Foto:\n` +
      `Artikel berita galeri disarankan mengunggah minimal 5 foto.\n` +
      `Saat ini Anda baru menambahkan ${currentGalleryPhotos.length} foto.\n\n` +
      `Tetap lanjutkan menyimpan artikel?`
    );
    if (!confirmProceed) {
      return false;
    }
  }

  // Jika ada foto galeri lokal yang belum selesai tersimpan ke server, simpan terlebih dahulu
  const pendingPhotos = currentGalleryPhotos.filter(p => p.file && (!p.foto || p.foto.startsWith('blob:') || p.foto.startsWith('data:')));
  if (pendingPhotos.length > 0) {
    if (submitBtn) {
      submitBtn.innerHTML = `<svg class="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white inline-block" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Menyimpan foto ke server...`;
    }
    for (const p of pendingPhotos) {
      try {
        let upRes = null;
        if (window.BuserInfoAPI && typeof window.BuserInfoAPI.uploadGalleryPhoto === 'function') {
          upRes = await window.BuserInfoAPI.uploadGalleryPhoto(p.file);
        } else if (window.BuserInfoAPI && typeof window.BuserInfoAPI.uploadThumbnail === 'function') {
          upRes = await window.BuserInfoAPI.uploadThumbnail(p.file);
        }
        if (upRes && upRes.status === 'success' && upRes.data && upRes.data.url) {
          p.foto = upRes.data.url;
          p.url = upRes.data.url;
          p.uploadStatus = 'success';
        }
      } catch (err) {
        console.warn('Gagal menyimpan foto sebelum simpan artikel:', err);
      }
    }
  }

  // Sinkronisasi Thumbnail & Galeri Foto (Permintaan 3:
  // Thumbnail yang digunakan pada berita tidak akan terganti saat user menambahkan gambar pada galeri foto,
  // thumbnail malah akan digunakan sebagai foto/galeri dengan urutan pertama).
  if (thumbPath && thumbPath !== 'assets/images/berita/hero/sorotan-utama-dunia.jpg') {
    if (currentGalleryPhotos.length > 0) {
      const existingThumbIdx = currentGalleryPhotos.findIndex(p => (p.foto === thumbPath || p.url === thumbPath));
      if (existingThumbIdx > 0) {
        // Pindahkan thumbnail ke urutan pertama #1
        const [foundThumb] = currentGalleryPhotos.splice(existingThumbIdx, 1);
        currentGalleryPhotos.unshift(foundThumb);
      } else if (existingThumbIdx === -1) {
        // Sisipkan thumbnail sebagai urutan pertama #1
        currentGalleryPhotos.unshift({
          id: null,
          foto: thumbPath,
          url: thumbPath,
          caption: caption || '',
          urutan: 1,
          uploadStatus: 'success'
        });
      }
      currentGalleryPhotos.forEach((p, i) => p.urutan = i + 1);
    }
  } else if ((!thumbPath || thumbPath === 'assets/images/berita/hero/sorotan-utama-dunia.jpg') && currentGalleryPhotos.length > 0) {
    thumbPath = currentGalleryPhotos[0].foto || currentGalleryPhotos[0].url;
  }

  const cleanGallery = currentGalleryPhotos
    .filter(p => Boolean(p.foto || p.url) && !String(p.foto).startsWith('blob:'))
    .map((p, idx) => ({
      id: p.id || null,
      foto: p.foto || p.url,
      url: p.foto || p.url,
      caption: p.caption || '',
      urutan: idx + 1
    }));

  const selectedTags = getAdminSelectedTags();

  // Tangani tanggal publikasi & penjadwalan
  let payloadPublishedAt = null;
  const statusRadio = document.querySelector('input[name="pub_status"]:checked');
  const currentRadioVal = statusRadio ? statusRadio.value : '';

  if (targetStatus === 'scheduled' || currentRadioVal === 'schedule') {
    const schedInput = document.getElementById('schedule-datetime');
    const schedVal = schedInput ? schedInput.value.trim() : '';
    if (!schedVal) {
      if (typeof showToast === 'function') {
        showToast('error', 'Waktu Jadwal Kosong', 'Silakan tentukan tanggal dan jam jadwal tayang berita.');
      } else {
        alert('Silakan tentukan tanggal dan jam jadwal tayang berita.');
      }
      if (schedInput) schedInput.focus();
      return false;
    }
    payloadPublishedAt = schedVal;
  } else {
    // Mode tanggal manual (kustom / backdate)
    const isManualDate = document.getElementById('date-mode-manual')?.checked;
    if (isManualDate) {
      const pubAtInput = document.getElementById('article-published-at');
      const manualVal = pubAtInput ? pubAtInput.value.trim() : '';
      if (manualVal) {
        payloadPublishedAt = manualVal;
      }
    }
  }

  // Tangani batas waktu tayang (auto-expire)
  let payloadExpiredAt = null;
  const isExpireEnabled = document.getElementById('check-enable-expire')?.checked;
  if (isExpireEnabled) {
    const expInput = document.getElementById('article-expired-at');
    const expVal = expInput ? expInput.value.trim() : '';
    if (expVal) {
      payloadExpiredAt = expVal;
    }
  }

  const payload = {
    title: title,
    slug: slugInput ? slugInput.value.trim() : '',
    excerpt: excerptInput ? excerptInput.value.trim() : '',
    content: content,
    caption: caption,
    tags: selectedTags.join(', '),
    kategori_id: catSelect ? (parseInt(catSelect.value) || 1) : 1,
    author_id: chosenAuthorId || 1,
    editor_id: chosenEditorId,
    status: targetStatus,
    thumbnail: thumbPath || 'assets/images/berita/hero/sorotan-utama-dunia.jpg',
    gallery: cleanGallery,
    galeri: cleanGallery
  };

  if (payloadPublishedAt !== null) {
    payload.published_at = payloadPublishedAt;
  }
  payload.expired_at = payloadExpiredAt;

  const origBtnText = submitBtn ? submitBtn.innerHTML : '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<svg class="animate-spin -ml-1 mr-1.5 h-4 w-4 text-white inline-block" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg> Menyimpan...`;
  }
  if (saveDraftBtn) saveDraftBtn.disabled = true;

  try {
    let res;
    if (editId) {
      res = await window.BuserInfoAPI.updateArticle(editId, payload);
    } else {
      res = await window.BuserInfoAPI.createArticle(payload);
    }

    if (res && res.status === 'success') {
      currentGalleryPhotos = [];
      const msg = editId ? 'Berita berhasil diperbarui.' : 'Berita berhasil ditambahkan.';
      if (typeof showToast === 'function') {
        showToast('success', 'Berhasil', msg);
      } else {
        alert(msg);
      }

      if (typeof closeModal === 'function') {
        closeModal('news-modal');
      }

      await loadLiveArticlesFromDB();
      await updateBeritaTabCounts();
      return true;
    } else {
      const errMsg = (res && res.message) ? res.message : 'Gagal menyimpan artikel.';
      if (typeof showToast === 'function') {
        showToast('error', 'Gagal Menyimpan', errMsg);
      } else {
        alert(errMsg);
      }
      return false;
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast('error', 'Kesalahan Sistem', err.message);
    } else {
      alert('Kesalahan sistem: ' + err.message);
    }
    return false;
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnText;
    }
    if (saveDraftBtn) saveDraftBtn.disabled = false;
  }
}

/**
 * Buka simulasi pratinjau berita
 */
function openArticlePreview() {
  const titleInput = document.getElementById('article-title');
  const catSelect = document.getElementById('article-category');
  const authorSelect = document.getElementById('article-author');
  const editorSelect = document.getElementById('article-editor-select');
  const previewImg = document.getElementById('thumb-preview-img');
  const editorBody = document.getElementById('editor-body');

  const prevTitle = document.getElementById('modal-prev-title');
  const prevCat = document.getElementById('modal-prev-cat');
  const prevAuthor = document.getElementById('modal-prev-author');
  const prevEditor = document.getElementById('modal-prev-editor');
  const prevEditorWrap = document.getElementById('modal-prev-editor-wrap');
  const prevImg = document.getElementById('modal-prev-img');
  const prevCaption = document.getElementById('modal-prev-caption');
  const prevBody = document.getElementById('modal-prev-body');
  const captionInput = document.getElementById('article-caption');

  if (prevTitle) prevTitle.textContent = (titleInput && titleInput.value) || 'Judul Berita Belum Diisi';
  if (prevCat && catSelect) prevCat.textContent = catSelect.options[catSelect.selectedIndex]?.text || 'Berita';
  if (prevAuthor && authorSelect) {
    const selectedOpt = authorSelect.options[authorSelect.selectedIndex];
    const optText = selectedOpt ? selectedOpt.text : 'Redaksi Japakeh Post';
    const cleanName = optText.replace(/\s*\([^)]*\)$/, '').trim();
    prevAuthor.textContent = cleanName || 'Redaksi Japakeh Post';
  }
  if (prevEditor && editorSelect) {
    const selectedEdOpt = editorSelect.options[editorSelect.selectedIndex];
    if (selectedEdOpt && selectedEdOpt.value && selectedEdOpt.value.trim() !== '') {
      const cleanEd = selectedEdOpt.text.replace(/\s*\([^)]*\)$/, '').trim();
      prevEditor.textContent = cleanEd;
      if (prevEditorWrap) prevEditorWrap.classList.remove('hidden');
    } else {
      prevEditor.textContent = '';
      if (prevEditorWrap) prevEditorWrap.classList.add('hidden');
    }
  }
  if (prevImg && previewImg) prevImg.src = previewImg.src;
  if (prevCaption) {
    const customCaption = captionInput ? captionInput.value.trim() : '';
    if (customCaption) {
      prevCaption.textContent = customCaption;
      prevCaption.style.display = '';
    } else {
      const fallbackTitle = (titleInput && titleInput.value.trim()) || 'Liputan Berita';
      prevCaption.textContent = `Dokumentasi: ${fallbackTitle} (Foto: Dok. Japakeh Post)`;
      prevCaption.style.display = '';
    }
  }
  if (prevBody && editorBody) prevBody.innerHTML = editorBody.innerHTML;

  if (typeof openModal === 'function') {
    openModal('preview-modal');
  }
}

/**
 * Cek aksi URL query params (?action=tambah atau ?edit=ID / ?id=ID)
 */
function checkUrlNewsActions() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  const editId = urlParams.get('edit') || urlParams.get('id');

  if (action === 'tambah') {
    setTimeout(openAddNewsModal, 250);
  } else if (editId) {
    setTimeout(() => openEditNewsModal(editId), 250);
  }
}

// Global window exposure for inline onclick handlers
window.applyFilters = applyFilters;
window.executeBulk = executeBulk;
window.handleDeleteRealArticle = handleDeleteRealArticle;
window.deleteArticle = handleDeleteRealArticle;
window.loadLiveArticlesFromDB = loadLiveArticlesFromDB;
window.updateBeritaTabCounts = updateBeritaTabCounts;
window.openAddNewsModal = openAddNewsModal;
window.openEditNewsModal = openEditNewsModal;
window.executeSaveNews = executeSaveNews;
window.openArticlePreview = openArticlePreview;
window.checkUrlNewsActions = checkUrlNewsActions;

