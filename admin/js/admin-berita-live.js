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

  const visibleCheckboxes = tableBody.querySelectorAll('tr:not(.hidden) .row-checkbox');
  if (visibleCheckboxes.length === 0) {
    checkAll.checked = false;
  } else {
    checkAll.checked = Array.from(visibleCheckboxes).every(cb => cb.checked);
  }
}

/**
 * Perbarui Floating Bulk Action Bar
 */
function updateBulkBar() {
  const bulkBar = document.getElementById('bulk-action-bar');
  const selectedCount = document.getElementById('selected-count');
  if (!bulkBar || !selectedCount) return;

  const checked = document.querySelectorAll('#news-table-body .row-checkbox:checked');
  if (checked.length > 0) {
    bulkBar.classList.remove('hidden');
    selectedCount.textContent = checked.length;
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
 * Muat Penulis Real ke Dropdown Filter berdasarkan data artikel
 */
function populateAuthorFilter(articles) {
  const authorSelect = document.getElementById('filter-author');
  if (!authorSelect || !Array.isArray(articles) || articles.length === 0) return;

  const currentVal = authorSelect.value.toLowerCase().trim();
  const authors = Array.from(new Set(articles.map(a => (a.author_name || '').trim()).filter(Boolean)));
  if (authors.length === 0) return;

  authorSelect.innerHTML = '<option value="">Semua Penulis</option>';
  authors.forEach(auth => {
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
      const dateFormatted = item.published_at 
        ? new Date(item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) 
        : '-';

      const dateIso = item.published_at ? item.published_at.substring(0, 10) : '';

      const thumbUrl = item.thumbnail && item.thumbnail.startsWith('assets/') 
        ? `../${item.thumbnail}` 
        : (item.thumbnail || '../assets/images/berita/hero/sorotan-utama-dunia.jpg');

      const st = (item.status || 'draft').toLowerCase().trim();
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

      const tr = document.createElement('tr');
      tr.className = 'hover:bg-gray-50/80 transition-colors news-row';
      tr.setAttribute('data-status', st);
      tr.setAttribute('data-category', (item.name_kategori || 'Umum').toLowerCase().trim());
      tr.setAttribute('data-author', (item.author_name || 'Redaksi').toLowerCase().trim());
      tr.setAttribute('data-date', dateIso);

      tr.innerHTML = `
        <td class="py-3 px-4">
          <input type="checkbox" value="${item.id_artikel}" class="row-checkbox w-4 h-4 rounded border-gray-300 text-buser-red focus:ring-buser-red cursor-pointer">
        </td>
        <td class="py-3 px-4">
          <img src="${thumbUrl}" alt="Thumb" class="w-14 h-10 object-cover rounded border border-gray-200" onerror="this.src='../assets/images/berita/hero/sorotan-utama-dunia.jpg'">
        </td>
        <td class="py-3 px-4 font-semibold text-gray-900 max-w-sm">
          <a href="../artikel.html?slug=${item.slug}" target="_blank" class="hover:text-buser-red transition-colors line-clamp-2">
            ${item.title}
          </a>
        </td>
        <td class="py-3 px-4">
          <span class="inline-block px-2 py-0.5 font-medium bg-red-50 text-buser-red rounded">${item.name_kategori || 'Umum'}</span>
        </td>
        <td class="py-3 px-4 font-medium text-gray-700">${item.author_name || 'Redaksi'}</td>
        <td class="py-3 px-4">
          ${statusBadge}
        </td>
        <td class="py-3 px-4 text-gray-500">${dateFormatted}</td>
        <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
          <a href="../artikel.html?slug=${item.slug}" target="_blank" class="p-1.5 text-gray-500 hover:text-gray-900 rounded hover:bg-gray-100 inline-block" title="Pratinjau">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
          </a>
          <button type="button" onclick="openEditNewsModal(${item.id_artikel})" class="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 inline-block" title="Edit Berita">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button type="button" onclick="handleDeleteRealArticle(${item.id_artikel})" class="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50 inline-block" title="Hapus">
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
  const count = checkedBoxes.length;
  if (count === 0) return;

  const actionName = action === 'publish' ? 'menerbitkan' : (action === 'draft' ? 'memindahkan ke draft' : 'menghapus');
  const ids = checkedBoxes.map(cb => cb.value);

  const doBulk = async () => {
    try {
      if (action === 'delete') {
        for (const id of ids) {
          await window.BuserInfoAPI.deleteArticle(id);
        }
      } else {
        const newStatus = action === 'publish' ? 'published' : 'draft';
        for (const id of ids) {
          await window.BuserInfoAPI.updateArticle(id, { status: newStatus });
        }
      }

      if (typeof showToast === 'function') {
        showToast('success', 'Tindakan Berhasil', `${count} berita berhasil di-${actionName}.`);
      } else {
        alert(`${count} berita berhasil diproses.`);
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

  // Sisipkan Link
  const btnLink = document.getElementById('btn-insert-link');
  if (btnLink) {
    btnLink.addEventListener('click', (e) => {
      e.preventDefault();
      const url = prompt('Masukkan tautan URL:', 'https://');
      if (url) document.execCommand('createLink', false, url);
    });
  }

  // Sisipkan Gambar Konten
  const btnImg = document.getElementById('btn-insert-image');
  if (btnImg) {
    btnImg.addEventListener('click', (e) => {
      e.preventDefault();
      const imgUrl = prompt('Masukkan URL gambar artikel:');
      if (imgUrl) document.execCommand('insertImage', false, imgUrl);
    });
  }

  // Embed YouTube Video
  const btnVideo = document.getElementById('btn-insert-video');
  if (btnVideo) {
    btnVideo.addEventListener('click', (e) => {
      e.preventDefault();
      const videoId = prompt('Masukkan YouTube Video ID (misal: dQw4w9WgXcQ):');
      if (videoId) {
        const embedHtml = `<div class="aspect-video my-4"><iframe class="w-full h-full rounded-lg" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe></div><p></p>`;
        document.execCommand('insertHTML', false, embedHtml);
      }
    });
  }

  // Toggle Accordion SEO
  if (btnToggleSeo && seoContent) {
    btnToggleSeo.addEventListener('click', () => {
      seoContent.classList.toggle('hidden');
      if (seoChevron) seoChevron.classList.toggle('rotate-180');
    });
  }

  // Toggle Opsi Jadwal Tayang
  if (radios && scheduleBox) {
    radios.forEach(r => {
      r.addEventListener('change', () => {
        if (radioSchedule && radioSchedule.checked) {
          scheduleBox.classList.remove('hidden');
        } else {
          scheduleBox.classList.add('hidden');
        }
      });
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
          if (previewImg) previewImg.src = '../' + uploadedThumbnailUrl;
          if (typeof showToast === 'function') {
            showToast('success', 'Gambar Berhasil Diunggah', 'Thumbnail tersimpan.');
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
      if (previewImg) previewImg.src = '../' + uploadedThumbnailUrl;
      if (typeof showToast === 'function') {
        showToast('info', 'Thumbnail Direset', 'Thumbnail kembali ke gambar default.');
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
  if (editorBody) editorBody.innerHTML = '<p>Tulis konten naskah berita di sini...</p>';
  if (previewImg) previewImg.src = '../assets/images/berita/hero/sorotan-utama-dunia.jpg';
  if (statusPublishRadio) statusPublishRadio.checked = true;
  if (scheduleBox) scheduleBox.classList.add('hidden');
  if (catSelect && catSelect.options.length > 1) catSelect.selectedIndex = 1;
  if (saveStatusText) saveStatusText.textContent = 'Siap menambahkan artikel baru';
  if (submitBtn) submitBtn.innerHTML = 'Terbitkan Berita';

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
  const editorBody = document.getElementById('editor-body');
  const previewImg = document.getElementById('thumb-preview-img');
  const catSelect = document.getElementById('article-category');
  const authorSelect = document.getElementById('article-author');
  const scheduleBox = document.getElementById('schedule-picker-box');
  const saveStatusText = document.getElementById('save-status-text');
  const submitBtn = document.getElementById('btn-submit-publish');

  if (idInput) idInput.value = id;
  if (modalTitle) modalTitle.textContent = `Edit Berita #${id}`;
  if (modalSubtitle) modalSubtitle.textContent = 'Perbarui naskah berita, rubrikasi, atau status publikasi';
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
    if (editorBody) editorBody.innerHTML = article.content || '<p></p>';

    const catId = article.kategori_id || article.id_kategori;
    if (catSelect && catId) {
      catSelect.value = catId;
    }

    if (authorSelect && article.author_name) {
      for (let opt of authorSelect.options) {
        if (opt.text.includes(article.author_name) || opt.value.includes(article.author_name)) {
          opt.selected = true;
          break;
        }
      }
    }

    if (article.thumbnail) {
      uploadedThumbnailUrl = article.thumbnail;
      if (previewImg) {
        previewImg.src = article.thumbnail.startsWith('assets/') ? '../' + article.thumbnail : article.thumbnail;
      }
    }

    const rawStatus = (article.status || 'draft').toLowerCase().trim();
    let radioVal = 'publish';
    if (rawStatus === 'draft') radioVal = 'draft';
    else if (rawStatus === 'review') radioVal = 'review';
    else if (rawStatus === 'scheduled') radioVal = 'schedule';

    const stRadio = document.querySelector(`input[name="pub_status"][value="${radioVal}"]`);
    if (stRadio) stRadio.checked = true;
    if (scheduleBox) {
      if (radioVal === 'schedule') scheduleBox.classList.remove('hidden');
      else scheduleBox.classList.add('hidden');
    }

    updateWordCount();
    if (saveStatusText) {
      saveStatusText.textContent = 'Terakhir disimpan ' + (article.updated_at ? new Date(article.updated_at).toLocaleTimeString('id-ID') : '-');
    }
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

  const content = editorBody ? editorBody.innerHTML.trim() : '';
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

  const payload = {
    title: title,
    slug: slugInput ? slugInput.value.trim() : '',
    excerpt: excerptInput ? excerptInput.value.trim() : '',
    content: content,
    kategori_id: catSelect ? (parseInt(catSelect.value) || 1) : 1,
    author_id: 1,
    status: targetStatus,
    thumbnail: thumbPath || 'assets/images/berita/hero/sorotan-utama-dunia.jpg'
  };

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
  const previewImg = document.getElementById('thumb-preview-img');
  const editorBody = document.getElementById('editor-body');

  const prevTitle = document.getElementById('modal-prev-title');
  const prevCat = document.getElementById('modal-prev-cat');
  const prevAuthor = document.getElementById('modal-prev-author');
  const prevImg = document.getElementById('modal-prev-img');
  const prevBody = document.getElementById('modal-prev-body');

  if (prevTitle) prevTitle.textContent = (titleInput && titleInput.value) || 'Judul Berita Belum Diisi';
  if (prevCat && catSelect) prevCat.textContent = catSelect.options[catSelect.selectedIndex]?.text || 'Berita';
  if (prevAuthor && authorSelect) prevAuthor.textContent = authorSelect.options[authorSelect.selectedIndex]?.text || 'Redaksi Japakeh Post';
  if (prevImg && previewImg) prevImg.src = previewImg.src;
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

