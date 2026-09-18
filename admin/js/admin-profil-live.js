/**
 * Japakeh Post - Live Editorial Profile Management Script (admin/profil.html & admin/profil-redaksi.html)
 * Mengelola Susunan Dewan Redaksi & Profil Anggota Redaksi secara interaktif (CRUD) via REST API & MySQL.
 */

let allProfiles = [];
let currentFilterCategory = '';
let currentFilterStatus = '';
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  initEditorialProfileApp();
});

function initEditorialProfileApp() {
  // Tab Navigation (Susunan Redaksi vs Akun Saya)
  initTabNavigation();

  // Inisialisasi CRUD Susunan Redaksi
  initRedaksiCrud();

  // Inisialisasi Form Biodata & Password Akun Pribadi
  initPersonalProfile();

  // Muat data awal profil redaksi
  loadLiveRedaksi();
}

/**
 * Inisialisasi tab navigasi antara CRUD Susunan Redaksi dan Akun Pribadi
 */
function initTabNavigation() {
  const tabBtns = document.querySelectorAll('.profile-tab-btn');
  const tabPanes = document.querySelectorAll('.profile-tab-pane');

  if (!tabBtns.length || !tabPanes.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');

      tabBtns.forEach(b => {
        b.classList.remove('active', 'border-buser-red', 'text-buser-red', 'font-bold');
        b.classList.add('border-transparent', 'text-gray-500', 'font-medium');
      });

      btn.classList.add('active', 'border-buser-red', 'text-buser-red', 'font-bold');
      btn.classList.remove('border-transparent', 'text-gray-500', 'font-medium');

      tabPanes.forEach(pane => {
        if (pane.id === targetId) {
          pane.classList.remove('hidden');
        } else {
          pane.classList.add('hidden');
        }
      });
    });
  });
}

/**
 * Inisialisasi Tombol & Event Listener CRUD Susunan Redaksi
 */
function initRedaksiCrud() {
  const btnAdd = document.getElementById('btn-add-redaksi');
  const form = document.getElementById('redaksi-form');
  const searchInput = document.getElementById('search-redaksi-input');
  const categorySelect = document.getElementById('filter-redaksi-kategori');
  const statusSelect = document.getElementById('filter-redaksi-status');
  const fotoInput = document.getElementById('redaksi-foto-file');

  if (btnAdd) {
    btnAdd.addEventListener('click', () => openRedaksiModal(null));
  }

  const btnReset = document.getElementById('btn-reset-default-redaksi');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      const confirmReset = () => {
        if (typeof showToast === 'function') {
          showToast('info', 'Mereset Data', 'Sedang memulihkan profil redaksi bawaan...');
        }
        window.BuserInfoAPI.resetRedaksiDefaults().then(res => {
          if (res && res.status === 'success') {
            if (typeof showToast === 'function') {
              showToast('success', 'Berhasil Direset', 'Susunan dewan redaksi telah dipulihkan ke 9 profil standar.');
            }
            loadLiveRedaksi();
          } else {
            if (typeof showToast === 'function') {
              showToast('error', 'Gagal Reset', (res && res.message) ? res.message : 'Gagal mereset data redaksi.');
            }
          }
        }).catch(err => {
          if (typeof showToast === 'function') {
            showToast('error', 'Kesalahan', err.message || 'Terjadi kesalahan sistem.');
          }
        });
      };

      if (typeof confirmAction === 'function') {
        confirmAction({
          title: 'Reset Susunan Redaksi Awal?',
          message: 'Tindakan ini akan menggantikan data redaksi saat ini dengan 9 profil susunan redaksi standar bawaan. Lanjutkan?',
          confirmText: 'Ya, Reset ke Default',
          type: 'warning',
          onConfirm: confirmReset
        });
      } else {
        if (window.confirm('Reset data redaksi ke susunan 9 profil standar bawaan?')) {
          confirmReset();
        }
      }
    });
  }

  if (form) {
    form.addEventListener('submit', handleRedaksiFormSubmit);
  }

  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentSearchQuery = e.target.value.trim();
        filterAndRenderProfiles();
      }, 250);
    });
  }

  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      currentFilterCategory = e.target.value;
      filterAndRenderProfiles();
    });
  }

  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      currentFilterStatus = e.target.value;
      filterAndRenderProfiles();
    });
  }

  // Upload foto anggota redaksi
  if (fotoInput) {
    fotoInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const previewImg = document.getElementById('redaksi-foto-preview');
      const hiddenUrlInput = document.getElementById('redaksi-foto-url');

      try {
        if (typeof showToast === 'function') {
          showToast('info', 'Mengunggah Foto', 'Sedang memproses foto anggota redaksi...');
        }
        const res = await window.BuserInfoAPI.uploadRedaksiFoto(file);
        if (res && res.status === 'success' && res.data && res.data.foto_url) {
          if (hiddenUrlInput) hiddenUrlInput.value = res.data.foto_url;
          if (previewImg) {
            previewImg.src = '../' + res.data.foto_url;
            previewImg.classList.remove('hidden');
          }
          if (typeof showToast === 'function') {
            showToast('success', 'Foto Berhasil Diunggah', 'Foto profil anggota redaksi siap disimpan.');
          }
        } else {
          throw new Error(res.message || 'Gagal mengunggah foto');
        }
      } catch (err) {
        if (typeof showToast === 'function') {
          showToast('error', 'Gagal Unggah', err.message || 'Gagal memproses file foto.');
        }
      }
    });
  }
}

/**
 * Muat daftar profil redaksi dari REST API
 */
async function loadLiveRedaksi() {
  const tbody = document.getElementById('redaksi-table-body');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="py-10 text-center text-gray-500">
        <div class="inline-block animate-spin w-5 h-5 border-2 border-buser-red border-t-transparent rounded-full mb-2"></div>
        <p class="text-xs">Memuat data susunan dewan redaksi...</p>
      </td>
    </tr>
  `;

  try {
    if (!window.BuserInfoAPI || !window.BuserInfoAPI.getRedaksi) {
      throw new Error('API Client Profil Redaksi belum tersedia');
    }

    const res = await window.BuserInfoAPI.getRedaksi();
    allProfiles = (res && res.profiles) ? res.profiles : [];

    // Update Counter Stats
    updateStatsDisplay(res && res.stats ? res.stats : null, allProfiles);

    // Populate Kategori Filter jika belum ada
    populateCategoryDropdown(allProfiles);

    filterAndRenderProfiles();
  } catch (err) {
    console.error('[Profil Redaksi] Gagal memuat data:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-10 text-center text-red-500">
          <p class="text-xs font-semibold">Gagal memuat data profil redaksi</p>
          <p class="text-[11px] text-gray-500 mt-1">${escapeHtml(err.message || 'Terjadi kesalahan koneksi server')}</p>
          <button type="button" onclick="loadLiveRedaksi()" class="mt-3 btn btn-outline btn-sm">Coba Lagi</button>
        </td>
      </tr>
    `;
  }
}

/**
 * Filter data di memori dan render ke tabel
 */
function filterAndRenderProfiles() {
  const tbody = document.getElementById('redaksi-table-body');
  if (!tbody) return;

  let filtered = [...allProfiles];

  // Filter Search
  if (currentSearchQuery) {
    const q = currentSearchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      (p.nama && p.nama.toLowerCase().includes(q)) ||
      (p.jabatan && p.jabatan.toLowerCase().includes(q)) ||
      (p.kategori && p.kategori.toLowerCase().includes(q)) ||
      (p.keterangan && p.keterangan.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  }

  // Filter Kategori
  if (currentFilterCategory) {
    filtered = filtered.filter(p => p.kategori && p.kategori.toLowerCase() === currentFilterCategory.toLowerCase());
  }

  // Filter Status
  if (currentFilterStatus) {
    filtered = filtered.filter(p => (p.status || 'active').toLowerCase() === currentFilterStatus.toLowerCase());
  }

  const countBadge = document.getElementById('redaksi-count-badge');
  if (countBadge) {
    countBadge.textContent = `${filtered.length} Anggota`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-gray-400">
          <svg class="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          <p class="text-xs font-semibold text-gray-600">Tidak ada profil redaksi yang cocok</p>
          <p class="text-[11px] text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
        </td>
      </tr>
    `;
    return;
  }

  renderProfileRows(filtered, tbody);
}

/**
 * Render baris tabel profil redaksi
 */
function renderProfileRows(profiles, tbody) {
  tbody.innerHTML = '';

  const categoryBadges = {
    'Pimpinan Perusahaan': 'bg-purple-100 text-purple-800 border-purple-200',
    'Pimpinan Redaksi': 'bg-red-100 text-buser-red border-red-200 font-bold',
    'Penasihat & Pembina': 'bg-amber-100 text-amber-800 border-amber-200',
    'Redaktur': 'bg-blue-100 text-blue-800 border-blue-200',
    'Biro & Perwakilan Daerah': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Teknologi & Multimedia': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  profiles.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50/80 transition-colors group';

    const isActive = (item.status || 'active').toLowerCase() === 'active';
    const initials = getInitials(item.nama);
    const catBadge = categoryBadges[item.kategori] || 'bg-gray-100 text-gray-700 border-gray-200';

    const statusBadge = isActive
      ? `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
           <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span> Aktif
         </span>`
      : `<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
           <span class="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span> Nonaktif
         </span>`;

    const toggleText = isActive ? 'Nonaktifkan' : 'Aktifkan';
    const toggleHover = isActive
      ? 'text-amber-700 hover:text-amber-900 hover:bg-amber-50'
      : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50';
    const toggleIcon = isActive
      ? `<svg class="w-3 h-3 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>`
      : `<svg class="w-3 h-3 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

    // Avatar preview
    let avatarMarkup = '';
    if (item.foto && item.foto.trim() !== '') {
      const src = item.foto.startsWith('http') ? item.foto : '../' + item.foto;
      avatarMarkup = `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.nama)}" class="w-9 h-9 rounded-full object-cover ring-2 ring-gray-200 shrink-0">`;
    } else {
      const bgColors = ['bg-neutral-900 text-white ring-red-500/30', 'bg-red-700 text-white', 'bg-blue-700 text-white', 'bg-emerald-700 text-white'];
      const bg = bgColors[index % bgColors.length];
      avatarMarkup = `<div class="w-9 h-9 rounded-full ${bg} font-black text-xs flex items-center justify-center shrink-0 ring-2">${escapeHtml(initials)}</div>`;
    }

    tr.innerHTML = `
      <!-- MOBILE CARD VIEW (md:hidden, NO HORIZONTAL SWIPING) -->
      <td class="md:hidden block w-full p-4 border-0">
        <div class="space-y-3">
          <!-- Top: Order + Avatar + Name + Status -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center space-x-2.5 min-w-0">
              <span class="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">#${item.urutan || (index + 1)}</span>
              ${avatarMarkup}
              <div class="min-w-0">
                <div class="font-bold text-gray-900 text-xs truncate">${escapeHtml(item.nama)}</div>
                <div class="text-[10px] text-gray-500 truncate">${escapeHtml(item.jabatan)}</div>
              </div>
            </div>
            ${statusBadge}
          </div>

          <!-- Middle: Kategori + Telepon -->
          <div class="flex flex-wrap items-center justify-between gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-xs">
            <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${catBadge}">
              ${escapeHtml(item.kategori || 'Redaksi')}
            </span>
            <span class="font-mono text-gray-500 text-[11px]">${escapeHtml(item.telepon || '-')}</span>
          </div>

          <!-- Bottom: Action Buttons full width without swiping! -->
          <div class="pt-2 border-t border-gray-100 grid grid-cols-4 gap-1.5">
            <button type="button" class="btn-view btn btn-outline btn-sm justify-center text-xs py-1.5" title="Lihat Profil">Lihat</button>
            <button type="button" class="btn-edit btn btn-sm justify-center text-xs py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200" title="Edit Profil">Edit</button>
            <button type="button" class="btn-toggle btn btn-sm justify-center text-xs py-1.5 ${toggleHover} border border-gray-200" title="${toggleText}">${toggleText}</button>
            <button type="button" class="btn-delete btn btn-sm justify-center text-xs py-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200" title="Hapus">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </td>

      <!-- DESKTOP TABLE VIEW (hidden md:table-cell) -->
      <td class="hidden md:table-cell py-3.5 px-4">
        <span class="font-mono text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">#${item.urutan || (index + 1)}</span>
      </td>
      <td class="hidden md:table-cell py-3.5 px-4">
        <div class="flex items-center space-x-3">
          ${avatarMarkup}
          <div class="min-w-0">
            <div class="font-bold text-gray-900 text-xs truncate group-hover:text-buser-red transition-colors">${escapeHtml(item.nama)}</div>
            <div class="text-[10px] text-gray-500 truncate">${escapeHtml(item.email || 'Email redaksi belum diatur')}</div>
          </div>
        </div>
      </td>
      <td class="hidden md:table-cell py-3.5 px-4">
        <div class="font-bold text-xs text-gray-900">${escapeHtml(item.jabatan)}</div>
        <div class="text-[10px] text-gray-500">${escapeHtml(item.keterangan || '-')}</div>
      </td>
      <td class="hidden md:table-cell py-3.5 px-4">
        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${catBadge}">
          ${escapeHtml(item.kategori || 'Redaksi')}
        </span>
      </td>
      <td class="hidden md:table-cell py-3.5 px-4 text-gray-600 text-xs font-mono">
        ${escapeHtml(item.telepon || '-')}
      </td>
      <td class="hidden md:table-cell py-3.5 px-4">
        ${statusBadge}
      </td>
      <td class="hidden md:table-cell py-2.5 px-4 text-right">
        <!-- Layout Tombol Aksi: Kotak 4 Bagian (Kiri Atas: Lihat, Kanan Atas: Edit, Kiri Bawah: Nonaktifkan, Kanan Bawah: Hapus) -->
        <div class="inline-block w-full sm:w-48 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs text-left">
          <!-- Baris Atas: Kiri = Lihat, Kanan = Edit -->
          <div class="grid grid-cols-2 divide-x divide-gray-200 border-b border-gray-200">
            <button type="button" class="btn-view py-1.5 px-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors" title="Lihat Profil Lengkap">
              <svg class="w-3 h-3 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span>Lihat</span>
            </button>
            <button type="button" class="btn-edit py-1.5 px-2 text-blue-700 hover:text-blue-900 hover:bg-blue-50 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors" title="Edit Profil Redaksi">
              <svg class="w-3 h-3 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              <span>Edit</span>
            </button>
          </div>
          <!-- Baris Bawah: Kiri = Nonaktifkan/Aktifkan, Kanan = Hapus -->
          <div class="grid grid-cols-2 divide-x divide-gray-200">
            <button type="button" class="btn-toggle py-1.5 px-1.5 ${toggleHover} text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors" title="${toggleText}">
              ${toggleIcon}
              <span class="truncate">${toggleText}</span>
            </button>
            <button type="button" class="btn-delete py-1.5 px-2 text-red-600 hover:text-white hover:bg-red-600 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all" title="Hapus Profil Redaksi">
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <span>Hapus</span>
            </button>
          </div>
        </div>
      </td>
    `;

    // Event Listeners pada Tombol Aksi (both mobile and desktop)
    tr.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', () => viewRedaksiDetail(item.id)));
    tr.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', () => openRedaksiModal(item)));
    tr.querySelectorAll('.btn-toggle').forEach(b => b.addEventListener('click', () => toggleRedaksiStatus(item.id, item.nama, item.status)));
    tr.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', () => deleteRedaksi(item.id, item.nama)));

    tbody.appendChild(tr);
  });
}

/**
 * Buka modal tambah atau edit anggota redaksi
 */
function openRedaksiModal(profile = null) {
  const modal = document.getElementById('redaksi-modal');
  const titleEl = document.getElementById('redaksi-modal-title');
  const idInput = document.getElementById('redaksi-id-input');
  const namaInput = document.getElementById('redaksi-nama-input');
  const jabatanInput = document.getElementById('redaksi-jabatan-input');
  const kategoriInput = document.getElementById('redaksi-kategori-input');
  const keteranganInput = document.getElementById('redaksi-keterangan-input');
  const emailInput = document.getElementById('redaksi-email-input');
  const teleponInput = document.getElementById('redaksi-telepon-input');
  const urutanInput = document.getElementById('redaksi-urutan-input');
  const statusInput = document.getElementById('redaksi-status-input');
  const fotoUrlInput = document.getElementById('redaksi-foto-url');
  const fotoPreview = document.getElementById('redaksi-foto-preview');
  const fotoFile = document.getElementById('redaksi-foto-file');
  const btnModalDel = document.getElementById('btn-modal-delete-redaksi');

  if (!modal || !namaInput || !jabatanInput) return;

  if (fotoFile) fotoFile.value = '';

  if (profile) {
    if (titleEl) titleEl.textContent = 'Edit Anggota Redaksi: ' + profile.nama;
    if (idInput) idInput.value = profile.id;
    namaInput.value = profile.nama || '';
    jabatanInput.value = profile.jabatan || '';
    if (kategoriInput) kategoriInput.value = profile.kategori || 'Redaksi';
    if (keteranganInput) keteranganInput.value = profile.keterangan || '';
    if (emailInput) emailInput.value = profile.email || '';
    if (teleponInput) teleponInput.value = profile.telepon || '';
    if (urutanInput) urutanInput.value = profile.urutan || 0;
    if (statusInput) statusInput.value = profile.status || 'active';
    if (fotoUrlInput) fotoUrlInput.value = profile.foto || '';

    if (btnModalDel) {
      btnModalDel.classList.remove('hidden');
      btnModalDel.onclick = () => {
        deleteRedaksi(profile.id, profile.nama);
      };
    }

    if (fotoPreview) {
      if (profile.foto && profile.foto.trim() !== '') {
        fotoPreview.src = profile.foto.startsWith('http') ? profile.foto : '../' + profile.foto;
        fotoPreview.classList.remove('hidden');
      } else {
        fotoPreview.src = '';
        fotoPreview.classList.add('hidden');
      }
    }
  } else {
    if (titleEl) titleEl.textContent = 'Tambah Anggota Profil Redaksi';
    if (idInput) idInput.value = '';
    namaInput.value = '';
    jabatanInput.value = '';
    if (kategoriInput) kategoriInput.value = 'Redaksi';
    if (keteranganInput) keteranganInput.value = '';
    if (emailInput) emailInput.value = '';
    if (teleponInput) teleponInput.value = '';

    if (btnModalDel) {
      btnModalDel.classList.add('hidden');
    }
    
    // Auto next urutan
    const maxUrutan = allProfiles.reduce((max, p) => Math.max(max, parseInt(p.urutan || 0)), 0);
    if (urutanInput) urutanInput.value = maxUrutan + 1;
    if (statusInput) statusInput.value = 'active';
    if (fotoUrlInput) fotoUrlInput.value = '';
    if (fotoPreview) {
      fotoPreview.src = '';
      fotoPreview.classList.add('hidden');
    }
  }

  if (typeof openModal === 'function') {
    openModal('redaksi-modal');
  } else {
    modal.classList.remove('hidden');
  }
}

/**
 * Handle form submit (Create or Update)
 */
async function handleRedaksiFormSubmit(e) {
  e.preventDefault();

  const idInput = document.getElementById('redaksi-id-input');
  const namaInput = document.getElementById('redaksi-nama-input');
  const jabatanInput = document.getElementById('redaksi-jabatan-input');
  const kategoriInput = document.getElementById('redaksi-kategori-input');
  const keteranganInput = document.getElementById('redaksi-keterangan-input');
  const emailInput = document.getElementById('redaksi-email-input');
  const teleponInput = document.getElementById('redaksi-telepon-input');
  const urutanInput = document.getElementById('redaksi-urutan-input');
  const statusInput = document.getElementById('redaksi-status-input');
  const fotoUrlInput = document.getElementById('redaksi-foto-url');

  const id = idInput ? idInput.value : '';
  const nama = namaInput ? namaInput.value.trim() : '';
  const jabatan = jabatanInput ? jabatanInput.value.trim() : '';
  const kategori = kategoriInput ? kategoriInput.value.trim() : 'Redaksi';
  const keterangan = keteranganInput ? keteranganInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const telepon = teleponInput ? teleponInput.value.trim() : '';
  const urutan = urutanInput ? parseInt(urutanInput.value || 0) : 0;
  const status = statusInput ? statusInput.value : 'active';
  const foto = fotoUrlInput ? fotoUrlInput.value.trim() : '';

  if (!nama || !jabatan) {
    if (typeof showToast === 'function') {
      showToast('error', 'Validasi Gagal', 'Nama lengkap dan jabatan di redaksi wajib diisi.');
    } else {
      alert('Nama lengkap dan jabatan di redaksi wajib diisi.');
    }
    return;
  }

  if (typeof closeModal === 'function') {
    closeModal('redaksi-modal');
  } else {
    const m = document.getElementById('redaksi-modal');
    if (m) m.classList.add('hidden');
  }

  const payload = {
    nama,
    jabatan,
    kategori,
    keterangan,
    email,
    telepon,
    urutan,
    status,
    foto
  };

  try {
    let res;
    if (id) {
      res = await window.BuserInfoAPI.updateRedaksi(id, payload);
    } else {
      res = await window.BuserInfoAPI.createRedaksi(payload);
    }

    if (res && res.status === 'success') {
      if (typeof showToast === 'function') {
        showToast('success', 'Berhasil', id ? 'Profil redaksi berhasil diperbarui.' : 'Anggota redaksi baru berhasil ditambahkan.');
      }
      loadLiveRedaksi();
    } else {
      if (typeof showToast === 'function') {
        showToast('error', 'Gagal', (res && res.message) ? res.message : 'Gagal menyimpan profil redaksi.');
      }
    }
  } catch (err) {
    console.error('[Profil Redaksi] Gagal simpan:', err);
    if (typeof showToast === 'function') {
      showToast('error', 'Kesalahan Server', err.message || 'Terjadi kesalahan sistem.');
    }
  }
}

/**
 * Toggle status aktif/nonaktif profil redaksi
 */
function toggleRedaksiStatus(id, nama, currentStatus) {
  const isCurrentlyActive = (currentStatus || 'active').toLowerCase() === 'active';
  const actionText = isCurrentlyActive ? 'Nonaktifkan' : 'Aktifkan Kembali';
  const confirmType = isCurrentlyActive ? 'danger' : 'primary';

  if (typeof confirmAction === 'function') {
    confirmAction({
      title: `${actionText} Profil Redaksi?`,
      message: isCurrentlyActive
        ? `Profil "${nama}" akan dinonaktifkan sementara dan tidak akan tampil di boks redaksi publik.`
        : `Profil "${nama}" akan diaktifkan kembali dan tampil di boks susunan redaksi portal berita.`,
      confirmText: actionText,
      type: confirmType,
      onConfirm: async () => {
        try {
          const res = await window.BuserInfoAPI.toggleRedaksiStatus(id);
          if (res && res.status === 'success') {
            showToast('info', 'Status Profil Diperbarui', res.message);
            loadLiveRedaksi();
          } else {
            showToast('error', 'Gagal', (res && res.message) ? res.message : 'Gagal mengubah status.');
          }
        } catch (err) {
          showToast('error', 'Kesalahan Server', err.message);
        }
      }
    });
  }
}

/**
 * Hapus profil redaksi permanen
 */
function deleteRedaksi(id, nama) {
  const executeDelete = async () => {
    try {
      const res = await window.BuserInfoAPI.deleteRedaksi(id);
      if (res && res.status === 'success') {
        if (typeof showToast === 'function') {
          showToast('success', 'Profil Dihapus', `Data profil "${nama}" telah berhasil dihapus dari sistem.`);
        }
        // Tutup modal jika sedang terbuka
        if (typeof closeModal === 'function') {
          closeModal('redaksi-modal');
          closeModal('redaksi-detail-modal');
        }
        const m1 = document.getElementById('redaksi-modal');
        const m2 = document.getElementById('redaksi-detail-modal');
        if (m1) m1.classList.add('hidden');
        if (m2) m2.classList.add('hidden');

        loadLiveRedaksi();
      } else {
        if (typeof showToast === 'function') {
          showToast('error', 'Gagal Menghapus', (res && res.message) ? res.message : 'Profil redaksi tidak dapat dihapus.');
        }
      }
    } catch (err) {
      if (typeof showToast === 'function') {
        showToast('error', 'Kesalahan Server', err.message);
      }
    }
  };

  if (typeof confirmAction === 'function') {
    confirmAction({
      title: 'Hapus Anggota Redaksi?',
      message: `Profil "${nama}" akan dihapus permanen dari susunan dewan redaksi. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Permanen',
      type: 'danger',
      onConfirm: executeDelete
    });
  } else {
    if (window.confirm(`Hapus permanen profil "${nama}" dari susunan redaksi?`)) {
      executeDelete();
    }
  }
}

/**
 * Tampilkan modal detail profil anggota redaksi
 */
async function viewRedaksiDetail(id) {
  try {
    const item = await window.BuserInfoAPI.getRedaksiById(id);
    if (!item) {
      if (typeof showToast === 'function') showToast('error', 'Gagal', 'Profil redaksi tidak ditemukan.');
      return;
    }

    const modal = document.getElementById('redaksi-detail-modal');
    const nameEl = document.getElementById('view-redaksi-nama');
    const roleEl = document.getElementById('view-redaksi-jabatan');
    const catEl = document.getElementById('view-redaksi-kategori');
    const noteEl = document.getElementById('view-redaksi-keterangan');
    const emailEl = document.getElementById('view-redaksi-email');
    const phoneEl = document.getElementById('view-redaksi-telepon');
    const orderEl = document.getElementById('view-redaksi-urutan');
    const statusEl = document.getElementById('view-redaksi-status');
    const avatarContainer = document.getElementById('view-redaksi-avatar-wrap');
    const btnViewDel = document.getElementById('btn-view-delete-redaksi');
    const btnViewEdit = document.getElementById('btn-view-edit-redaksi');

    if (nameEl) nameEl.textContent = item.nama;
    if (roleEl) roleEl.textContent = item.jabatan;
    if (catEl) catEl.textContent = item.kategori || 'Redaksi';
    if (noteEl) noteEl.textContent = item.keterangan || '(Tidak ada keterangan tambahan)';
    if (emailEl) emailEl.textContent = item.email || '-';
    if (phoneEl) phoneEl.textContent = item.telepon || '-';
    if (orderEl) orderEl.textContent = `#${item.urutan || 0}`;

    const isActive = (item.status || 'active').toLowerCase() === 'active';
    if (statusEl) {
      statusEl.className = isActive 
        ? 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800'
        : 'px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700';
      statusEl.textContent = isActive ? 'Status: Aktif' : 'Status: Nonaktif';
    }

    if (avatarContainer) {
      if (item.foto && item.foto.trim() !== '') {
        const src = item.foto.startsWith('http') ? item.foto : '../' + item.foto;
        avatarContainer.innerHTML = `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.nama)}" class="w-16 h-16 rounded-full object-cover ring-4 ring-red-500/20 shadow-md">`;
      } else {
        avatarContainer.innerHTML = `
          <div class="w-16 h-16 rounded-full bg-neutral-900 text-white font-black text-xl flex items-center justify-center ring-4 ring-red-500/20 shadow-md">
            ${escapeHtml(getInitials(item.nama))}
          </div>
        `;
      }
    }

    // Sambungkan tombol Hapus & Edit di dalam modal detail
    if (btnViewDel) {
      btnViewDel.onclick = () => {
        deleteRedaksi(item.id, item.nama);
      };
    }

    if (btnViewEdit) {
      btnViewEdit.onclick = () => {
        if (typeof closeModal === 'function') closeModal('redaksi-detail-modal');
        if (modal) modal.classList.add('hidden');
        openRedaksiModal(item);
      };
    }

    if (typeof openModal === 'function') {
      openModal('redaksi-detail-modal');
    } else if (modal) {
      modal.classList.remove('hidden');
    }
  } catch (err) {
    if (typeof showToast === 'function') {
      showToast('error', 'Gagal Memuat Detail', err.message);
    }
  }
}

/**
 * Update display statistik ringkas
 */
function updateStatsDisplay(stats, profiles) {
  const statTotal = document.getElementById('stat-redaksi-total');
  const statActive = document.getElementById('stat-redaksi-active');
  const statLeadership = document.getElementById('stat-redaksi-leadership');
  const statReporters = document.getElementById('stat-redaksi-reporters');

  const total = stats ? parseInt(stats.total || 0) : profiles.length;
  const active = stats ? parseInt(stats.active_count || 0) : profiles.filter(p => (p.status || 'active').toLowerCase() === 'active').length;
  
  const leadershipCount = profiles.filter(p => {
    const k = (p.kategori || '').toLowerCase();
    return k.includes('pimpinan') || k.includes('penasihat') || k.includes('pembina');
  }).length;

  const reportersCount = profiles.filter(p => {
    const k = (p.kategori || '').toLowerCase();
    return k.includes('redaktur') || k.includes('biro') || k.includes('wartawan') || k.includes('koresponden');
  }).length;

  if (statTotal) statTotal.textContent = total;
  if (statActive) statActive.textContent = active;
  if (statLeadership) statLeadership.textContent = leadershipCount;
  if (statReporters) statReporters.textContent = reportersCount;
}

/**
 * Isi dropdown filter kategori secara dinamis dari data yang ada
 */
function populateCategoryDropdown(profiles) {
  const select = document.getElementById('filter-redaksi-kategori');
  if (!select) return;

  const cats = Array.from(new Set(profiles.map(p => p.kategori).filter(Boolean)));
  
  // Simpan nilai yang sedang terpilih
  const currentVal = select.value;

  select.innerHTML = '<option value="">Semua Divisi / Kategori</option>';
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  select.value = currentVal;
}

/**
 * Inisialisasi Pengaturan Akun Pribadi Redaksi (CRUD Akun Saya)
 */
function initPersonalProfile() {
  const bioForm = document.getElementById('profile-bio-form');
  const passForm = document.getElementById('profile-pass-form');
  const avatarFileInput = document.getElementById('user-avatar-file-input');
  const btnDeleteAvatar = document.getElementById('btn-delete-avatar');
  const btnResetBio = document.getElementById('btn-reset-bio');
  const togglePassCheck = document.getElementById('toggle-profile-pass');

  // Ambil data user aktif saat ini dari sesi server
  loadCurrentUserData();

  // 1. Upload Avatar Profil Pengguna
  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        if (typeof showToast === 'function') {
          showToast('info', 'Mengunggah Foto', 'Sedang memproses foto profil akun Anda...');
        }
        const res = await window.BuserInfoAPI.uploadMyAvatar(file);
        if (res && res.status === 'success') {
          if (typeof showToast === 'function') {
            showToast('success', 'Foto Diperbarui', 'Foto profil akun Anda telah berhasil diperbarui.');
          }
          loadCurrentUserData();
        } else {
          throw new Error(res.message || 'Gagal mengunggah foto avatar.');
        }
      } catch (err) {
        if (typeof showToast === 'function') {
          showToast('error', 'Gagal Unggah Avatar', err.message);
        }
      }
    });
  }

  // 2. Hapus / Reset Foto Avatar Pengguna
  if (btnDeleteAvatar) {
    btnDeleteAvatar.addEventListener('click', () => {
      const execDelete = async () => {
        try {
          const res = await window.BuserInfoAPI.deleteMyAvatar();
          if (res && res.status === 'success') {
            if (typeof showToast === 'function') {
              showToast('success', 'Foto Dihapus', 'Foto profil akun Anda telah dikembalikan ke inisial standar.');
            }
            loadCurrentUserData();
          } else {
            throw new Error(res.message || 'Gagal menghapus avatar');
          }
        } catch (err) {
          if (typeof showToast === 'function') {
            showToast('error', 'Gagal', err.message);
          }
        }
      };

      if (typeof confirmAction === 'function') {
        confirmAction({
          title: 'Hapus Foto Profil?',
          message: 'Foto profil akun Anda akan dihapus dan diganti dengan inisial huruf standar.',
          confirmText: 'Hapus Foto',
          type: 'danger',
          onConfirm: execDelete
        });
      } else {
        if (window.confirm('Hapus foto profil dan kembalikan ke inisial default?')) {
          execDelete();
        }
      }
    });
  }

  // 3. Reset Bio Singkat
  if (btnResetBio) {
    btnResetBio.addEventListener('click', () => {
      const bioInput = document.getElementById('bio-bio-input') || (bioForm ? bioForm.querySelector('textarea') : null);
      if (bioInput) {
        bioInput.value = '';
        bioInput.focus();
        if (typeof showToast === 'function') {
          showToast('info', 'Bio Dikosongkan', 'Klik "Simpan Perubahan Biodata" untuk menyimpan.');
        }
      }
    });
  }

  // 4. Toggle Tampilkan / Sembunyikan Password
  if (togglePassCheck) {
    togglePassCheck.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      ['pass-current-input', 'pass-new-input', 'pass-confirm-input'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
          input.type = isChecked ? 'text' : 'password';
        }
      });
    });
  }

  // 5. Submit Form Biodata Diri (Update Profile)
  if (bioForm) {
    bioForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('bio-nama-input') || bioForm.querySelector('input[type="text"]');
      const emailInput = document.getElementById('bio-email-input') || bioForm.querySelector('input[type="email"]');
      const bioInput = document.getElementById('bio-bio-input') || bioForm.querySelector('textarea');

      const nama = nameInput ? nameInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const bio = bioInput ? bioInput.value.trim() : '';

      if (!nama || !email) {
        if (typeof showToast === 'function') {
          showToast('error', 'Validasi Gagal', 'Nama lengkap dan email tidak boleh kosong.');
        }
        return;
      }

      const saveBtn = document.getElementById('btn-save-bio');
      const originalText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>Menyimpan...</span>';
      }

      try {
        const res = await window.BuserInfoAPI.updateMyProfile({ nama, email, bio });
        if (res && res.status === 'success') {
          if (typeof showToast === 'function') {
            showToast('success', 'Biodata Disimpan', 'Data profil akun redaksi Anda telah berhasil diperbarui di server.');
          }

          loadCurrentUserData();
        } else {
          if (typeof showToast === 'function') {
            showToast('error', 'Gagal Simpan', (res && res.message) ? res.message : 'Gagal memperbarui profil.');
          }
        }
      } catch (err) {
        if (typeof showToast === 'function') {
          showToast('error', 'Kesalahan Server', err.message);
        }
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalText;
        }
      }
    });
  }

  // 6. Submit Form Ubah Kata Sandi (Update Password)
  if (passForm) {
    passForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const currentPassEl = document.getElementById('pass-current-input');
      const newPassEl = document.getElementById('pass-new-input');
      const confirmPassEl = document.getElementById('pass-confirm-input');

      const currentPass = currentPassEl ? currentPassEl.value : '';
      const newPass = newPassEl ? newPassEl.value : '';
      const confirmPass = confirmPassEl ? confirmPassEl.value : '';

      if (!currentPass || !newPass) {
        if (typeof showToast === 'function') {
          showToast('error', 'Validasi', 'Kata sandi saat ini dan kata sandi baru harus diisi.');
        }
        return;
      }

      if (newPass.length < 8) {
        if (typeof showToast === 'function') {
          showToast('error', 'Kata Sandi Terlalu Pendek', 'Kata sandi baru minimal 8 karakter.');
        }
        return;
      }

      if (newPass !== confirmPass) {
        if (typeof showToast === 'function') {
          showToast('error', 'Kata Sandi Tidak Cocok', 'Konfirmasi kata sandi baru tidak sesuai.');
        }
        return;
      }

      const passBtn = document.getElementById('btn-save-pass');
      const originalBtnText = passBtn ? passBtn.innerHTML : '';
      if (passBtn) {
        passBtn.disabled = true;
        passBtn.innerHTML = '<span>Memperbarui...</span>';
      }

      try {
        const res = await window.BuserInfoAPI.updateMyPassword({
          current_password: currentPass,
          new_password: newPass,
          confirm_password: confirmPass
        });

        if (res && res.status === 'success') {
          if (typeof showToast === 'function') {
            showToast('success', 'Kata Sandi Diperbarui', 'Kata sandi akun Anda berhasil diubah.');
          }
          passForm.reset();
        } else {
          if (typeof showToast === 'function') {
            showToast('error', 'Gagal Ubah Sandi', (res && res.message) ? res.message : 'Gagal mengubah kata sandi.');
          }
        }
      } catch (err) {
        if (typeof showToast === 'function') {
          showToast('error', 'Kesalahan Server', err.message);
        }
      } finally {
        if (passBtn) {
          passBtn.disabled = false;
          passBtn.innerHTML = originalBtnText;
        }
      }
    });
  }
}

/**
 * Muat profil user dari sesi aktif API dan perbarui tampilan DOM
 */
async function loadCurrentUserData() {
  try {
    if (!window.BuserInfoAPI || !window.BuserInfoAPI.me) return;
    const user = await window.BuserInfoAPI.me();
    if (!user) return;

    const displayName = user.nama_users || user.name || 'Al Bahri';
    const displayEmail = user.email_users || user.email || 'alb4hri@gmail.com';
    const displayRole = (user.role === 'admin' || user.role === 'Administrator') 
      ? 'Administrator / Pemimpin Redaksi' 
      : (user.role || 'Redaksi');

    // 1. Perbarui Form Input Biodata
    const nameInput = document.getElementById('bio-nama-input');
    const emailInput = document.getElementById('bio-email-input');
    const bioInput = document.getElementById('bio-bio-input');

    if (nameInput) nameInput.value = displayName;
    if (emailInput) emailInput.value = displayEmail;
    if (bioInput) bioInput.value = user.bio || '';

    // 2. Perbarui Header Card Akun
    const userTitleEl = document.getElementById('current-user-fullname');
    if (userTitleEl) userTitleEl.textContent = displayName;

    const userRoleEl = document.getElementById('current-user-role');
    if (userRoleEl) userRoleEl.textContent = displayRole;

    const userEmailEl = document.getElementById('current-user-email');
    if (userEmailEl) userEmailEl.textContent = displayEmail;

    const userIdEl = document.getElementById('current-user-id');
    if (userIdEl) userIdEl.textContent = `#${user.id || 1}`;

    const userBioEl = document.getElementById('current-user-bio');
    if (userBioEl) {
      userBioEl.textContent = user.bio && user.bio.trim() !== '' 
        ? user.bio 
        : 'Biodata redaksi belum diatur. Silakan perbarui melalui formulir di bawah.';
    }

    const userArtCount = document.getElementById('current-user-article-count');
    if (userArtCount && user.total_artikel !== undefined) {
      userArtCount.textContent = `${user.total_artikel} Berita`;
    }

    const userCreatedEl = document.getElementById('current-user-created-at');
    if (userCreatedEl && user.created_at) {
      try {
        const d = new Date(user.created_at);
        userCreatedEl.textContent = d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch (e) {
        userCreatedEl.textContent = user.created_at;
      }
    }

    // 3. Perbarui Avatar Display di Header & Sidebar
    const avatarImg = document.getElementById('current-user-avatar-img');
    const initialsEl = document.getElementById('current-user-initials');
    const userInitials = getInitials(displayName);

    if (user.avatar && user.avatar.trim() !== '') {
      const avatarSrc = user.avatar.startsWith('http') ? user.avatar : '../' + user.avatar;
      if (avatarImg) {
        avatarImg.src = avatarSrc;
        avatarImg.classList.remove('hidden');
      }
      if (initialsEl) initialsEl.classList.add('hidden');
    } else {
      if (avatarImg) {
        avatarImg.src = '';
        avatarImg.classList.add('hidden');
      }
      if (initialsEl) {
        initialsEl.textContent = userInitials;
        initialsEl.classList.remove('hidden');
      }
    }

    // Perbarui Teks Nama & Role Pengguna di Navbar / Sidebar Global
    document.querySelectorAll('.user-display-name, #sidebar-user-name').forEach(el => {
      el.textContent = displayName;
    });

    document.querySelectorAll('.user-display-role, #sidebar-user-role').forEach(el => {
      el.textContent = displayRole;
    });

    document.querySelectorAll('.user-display-avatar').forEach(el => {
      if (user.avatar && user.avatar.trim() !== '') {
        const avatarSrc = user.avatar.startsWith('http') ? user.avatar : '../' + user.avatar;
        el.innerHTML = `<img src="${avatarSrc}" alt="${escapeHtml(displayName)}" class="w-full h-full object-cover rounded-full">`;
      } else {
        el.textContent = userInitials;
      }
    });

  } catch (e) {
    console.warn('[Profil Live] Gagal memuat profil user:', e);
  }
}

/**
 * Helpers
 */
function getInitials(name) {
  if (!name) return 'RD';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.loadLiveRedaksi = loadLiveRedaksi;
