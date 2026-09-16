/**
 * Japakeh Post - Live Authors Management Script (admin/penulis.html)
 * Mengelola tim jurnalis, wartawan, dan redaktur secara dinamis melalui REST API & MySQL.
 */

let allAuthors = [];

document.addEventListener('DOMContentLoaded', () => {
  initAuthorsLive();
});

function initAuthorsLive() {
  const btnAdd = document.getElementById('btn-add-author');
  const form = document.getElementById('author-form');

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openAuthorModal(null);
    });
  }

  if (form) {
    form.addEventListener('submit', handleAuthorFormSubmit);
  }

  loadLiveAuthors();
}

/**
 * Memuat daftar seluruh penulis dari backend REST API
 */
async function loadLiveAuthors() {
  const tbody = document.getElementById('author-table-body');
  const countHeader = document.getElementById('author-count-header');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-8 text-center text-gray-500">
        <div class="inline-block animate-spin w-5 h-5 border-2 border-buser-red border-t-transparent rounded-full mb-2"></div>
        <p class="text-xs">Memuat data wartawan & redaksi dari server...</p>
      </td>
    </tr>
  `;

  try {
    if (!window.BuserInfoAPI || !window.BuserInfoAPI.getAuthors) {
      throw new Error('API Client belum terpasang dengan benar');
    }

    const authors = await window.BuserInfoAPI.getAuthors();
    allAuthors = authors || [];

    if (countHeader) {
      countHeader.textContent = `Daftar Wartawan Terdaftar (${allAuthors.length} Akun)`;
    }

    if (allAuthors.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-gray-400">
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            <p class="text-xs font-semibold">Belum ada data penulis terdaftar</p>
            <p class="text-[11px] text-gray-400 mt-0.5">Klik tombol "Tambah Penulis" untuk menambahkan jurnalis baru.</p>
          </td>
        </tr>
      `;
      return;
    }

    renderAuthorRows(allAuthors, tbody);
  } catch (err) {
    console.error('[Penulis] Gagal memuat data:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-red-500">
          <p class="text-xs font-semibold">Gagal memuat data penulis</p>
          <p class="text-[11px] text-gray-500 mt-1">${err.message || 'Terjadi kesalahan pada koneksi server.'}</p>
          <button type="button" onclick="loadLiveAuthors()" class="mt-3 btn btn-outline btn-sm">Coba Lagi</button>
        </td>
      </tr>
    `;
  }
}

/**
 * Render baris tabel penulis secara dinamis
 */
function renderAuthorRows(authors, tbody) {
  tbody.innerHTML = '';

  const roleColors = {
    'Administrator': 'bg-red-100 text-buser-red',
    'Editor': 'bg-blue-100 text-blue-800',
    'Reporter': 'bg-emerald-100 text-emerald-800'
  };

  const avatarColors = [
    'bg-black text-white ring-2 ring-red-600/30',
    'bg-blue-600 text-white',
    'bg-emerald-600 text-white',
    'bg-amber-600 text-white',
    'bg-purple-600 text-white',
    'bg-rose-600 text-white'
  ];

  authors.forEach((author, index) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50 transition-colors';

    const initials = getInitials(author.nama_users || 'Penulis');
    const avatarColor = avatarColors[index % avatarColors.length];
    const roleBadge = roleColors[author.role] || 'bg-gray-100 text-gray-800';
    const isActive = (author.status || 'active').toLowerCase() === 'active';
    const statusBadge = isActive
      ? '<span class="badge-status badge-published">Aktif</span>'
      : '<span class="badge-status badge-draft">Nonaktif</span>';

    const toggleText = isActive ? 'Nonaktifkan' : 'Aktifkan';
    const toggleColor = isActive ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50' : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50';

    tr.innerHTML = `
      <td class="py-3 px-4">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full ${avatarColor} text-xs font-bold flex items-center justify-center shrink-0">
            ${escapeHtml(initials)}
          </div>
          <div class="min-w-0">
            <div class="font-bold text-gray-900 truncate">${escapeHtml(author.nama_users)}</div>
            <div class="text-[10px] text-gray-400">ID: W-${String(author.id).padStart(3, '0')}</div>
          </div>
        </div>
      </td>
      <td class="py-3 px-4 text-gray-600 font-mono">${escapeHtml(author.email_users)}</td>
      <td class="py-3 px-4">
        <span class="inline-block px-2 py-0.5 font-semibold ${roleBadge} rounded text-[11px]">${escapeHtml(author.role || 'Reporter')}</span>
      </td>
      <td class="py-3 px-4 font-bold text-gray-900">${parseInt(author.total_artikel || 0)} berita</td>
      <td class="py-3 px-4">${statusBadge}</td>
      <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
        <button type="button" class="btn-view p-1.5 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100 text-xs font-medium">Lihat</button>
        <button type="button" class="btn-edit p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 text-xs font-medium">Edit</button>
        <button type="button" class="btn-toggle p-1.5 ${toggleColor} rounded text-xs font-medium">${toggleText}</button>
        <button type="button" class="btn-delete p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50 text-xs font-medium">Hapus</button>
      </td>
    `;

    // Event Listeners
    tr.querySelector('.btn-view').addEventListener('click', () => viewAuthorDetail(author.id));
    tr.querySelector('.btn-edit').addEventListener('click', () => openAuthorModal(author));
    tr.querySelector('.btn-toggle').addEventListener('click', () => toggleAuthorStatus(author.id, author.nama_users, author.status));
    tr.querySelector('.btn-delete').addEventListener('click', () => deleteAuthor(author.id, author.nama_users));

    tbody.appendChild(tr);
  });
}

/**
 * Buka modal tambah atau edit penulis
 */
function openAuthorModal(author = null) {
  const modalTitle = document.getElementById('author-modal-title');
  const idInput = document.getElementById('author-id-input');
  const nameInput = document.getElementById('author-name-input');
  const emailInput = document.getElementById('author-email-input');
  const roleSelect = document.getElementById('author-role-select');
  const bioInput = document.getElementById('author-bio-input');

  if (!modalTitle || !nameInput || !emailInput) return;

  if (author) {
    modalTitle.textContent = 'Edit Penulis: ' + author.nama_users;
    if (idInput) idInput.value = author.id;
    nameInput.value = author.nama_users || '';
    emailInput.value = author.email_users || '';
    if (roleSelect) roleSelect.value = author.role || 'Reporter';
    if (bioInput) bioInput.value = author.bio || '';
  } else {
    modalTitle.textContent = 'Tambah Penulis Baru';
    if (idInput) idInput.value = '';
    nameInput.value = '';
    emailInput.value = '';
    if (roleSelect) roleSelect.value = 'Reporter';
    if (bioInput) bioInput.value = '';
  }

  if (typeof openModal === 'function') {
    openModal('author-modal');
  } else {
    const m = document.getElementById('author-modal');
    if (m) m.classList.remove('hidden');
  }
}

/**
 * Tangani submit form penulis (Create atau Update)
 */
async function handleAuthorFormSubmit(e) {
  e.preventDefault();

  const idInput = document.getElementById('author-id-input');
  const nameInput = document.getElementById('author-name-input');
  const emailInput = document.getElementById('author-email-input');
  const roleSelect = document.getElementById('author-role-select');
  const bioInput = document.getElementById('author-bio-input');

  const id = idInput ? idInput.value : '';
  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const role = roleSelect ? roleSelect.value : 'Reporter';
  const bio = bioInput ? bioInput.value.trim() : '';

  if (!name || !email) {
    if (typeof showToast === 'function') {
      showToast('error', 'Validasi Gagal', 'Nama dan email wajib diisi!');
    } else {
      alert('Nama dan email wajib diisi!');
    }
    return;
  }

  if (typeof closeModal === 'function') {
    closeModal('author-modal');
  } else {
    const m = document.getElementById('author-modal');
    if (m) m.classList.add('hidden');
  }

  try {
    let res;
    if (id) {
      // Update data penulis
      res = await window.BuserInfoAPI.updateAuthor(id, {
        name,
        email,
        role,
        bio
      });
    } else {
      // Tambah penulis baru
      res = await window.BuserInfoAPI.createAuthor({
        name,
        email,
        role,
        bio
      });
    }

    if (res && res.status === 'success') {
      if (typeof showToast === 'function') {
        showToast('success', 'Berhasil', id ? 'Data penulis berhasil diperbarui.' : 'Penulis baru berhasil ditambahkan.');
      }
      loadLiveAuthors();
    } else {
      if (typeof showToast === 'function') {
        showToast('error', 'Gagal', (res && res.message) ? res.message : 'Gagal menyimpan data penulis.');
      }
    }
  } catch (err) {
    console.error('[Penulis] Gagal simpan:', err);
    if (typeof showToast === 'function') {
      showToast('error', 'Kesalahan Server', err.message || 'Gagal menyimpan data penulis.');
    }
  }
}

/**
 * Toggle status aktif / nonaktif penulis
 */
function toggleAuthorStatus(id, name, currentStatus) {
  const isCurrentlyActive = (currentStatus || 'active').toLowerCase() === 'active';
  const targetAction = isCurrentlyActive ? 'Nonaktifkan' : 'Aktifkan Kembali';
  const confirmType = isCurrentlyActive ? 'danger' : 'primary';

  if (typeof confirmAction === 'function') {
    confirmAction({
      title: `${targetAction} Akun Penulis?`,
      message: isCurrentlyActive
        ? `Akun "${name}" akan dinonaktifkan sementara dan tidak dapat membuat artikel baru.`
        : `Akun "${name}" akan diaktifkan kembali dan dapat mengakses editorial.`,
      confirmText: targetAction,
      type: confirmType,
      onConfirm: async () => {
        try {
          const res = await window.BuserInfoAPI.toggleAuthorStatus(id);
          if (res && res.status === 'success') {
            showToast('info', 'Status Penulis Diperbarui', `Akun ${name} kini ${res.data.status === 'active' ? 'Aktif' : 'Nonaktif'}.`);
            loadLiveAuthors();
          } else {
            showToast('error', 'Gagal', (res && res.message) ? res.message : 'Gagal mengubah status penulis.');
          }
        } catch (err) {
          showToast('error', 'Kesalahan Server', err.message);
        }
      }
    });
  }
}

/**
 * Hapus akun penulis permanen
 */
function deleteAuthor(id, name) {
  if (typeof confirmAction === 'function') {
    confirmAction({
      title: `Hapus Akun Penulis?`,
      message: `Akun jurnalis "${name}" akan dihapus permanen dari sistem. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Hapus Permanen',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await window.BuserInfoAPI.deleteAuthor(id);
          if (res && res.status === 'success') {
            showToast('success', 'Penulis Dihapus', `Akun ${name} telah berhasil dihapus.`);
            loadLiveAuthors();
          } else {
            showToast('error', 'Gagal Menghapus', (res && res.message) ? res.message : 'Penulis tidak dapat dihapus.');
          }
        } catch (err) {
          showToast('error', 'Kesalahan Server', err.message);
        }
      }
    });
  }
}

/**
 * Tampilkan modal detail informasi penulis
 */
async function viewAuthorDetail(id) {
  try {
    const author = await window.BuserInfoAPI.getAuthorById(id);
    if (!author) {
      if (typeof showToast === 'function') showToast('error', 'Gagal', 'Data penulis tidak ditemukan.');
      return;
    }

    const modal = document.getElementById('author-detail-modal');
    const nameEl = document.getElementById('view-author-name');
    const roleEl = document.getElementById('view-author-role');
    const emailEl = document.getElementById('view-author-email');
    const bioEl = document.getElementById('view-author-bio');
    const countEl = document.getElementById('view-author-count');
    const initialsEl = document.getElementById('view-author-initials');
    const articlesListEl = document.getElementById('view-author-articles');

    if (nameEl) nameEl.textContent = author.nama_users;
    if (roleEl) roleEl.textContent = author.role || 'Reporter';
    if (emailEl) emailEl.textContent = author.email_users;
    if (bioEl) bioEl.textContent = author.bio || '(Belum ada biodata profil)';
    if (countEl) countEl.textContent = `${parseInt(author.total_artikel || 0)} Berita`;
    if (initialsEl) initialsEl.textContent = getInitials(author.nama_users);

    if (articlesListEl) {
      if (author.recent_articles && author.recent_articles.length > 0) {
        articlesListEl.innerHTML = author.recent_articles.map(a => `
          <li class="py-1.5 border-b border-gray-100 flex items-center justify-between text-xs">
            <span class="font-medium text-gray-800 truncate mr-2">${escapeHtml(a.title)}</span>
            <span class="text-[10px] text-gray-400 whitespace-nowrap">${a.status}</span>
          </li>
        `).join('');
      } else {
        articlesListEl.innerHTML = `<li class="py-2 text-xs text-gray-400 italic">Belum ada artikel yang dipublikasikan.</li>`;
      }
    }

    if (typeof openModal === 'function') {
      openModal('author-detail-modal');
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
 * Helper: Ambil inisial nama
 */
function getInitials(name) {
  if (!name) return 'AR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.loadLiveAuthors = loadLiveAuthors;
