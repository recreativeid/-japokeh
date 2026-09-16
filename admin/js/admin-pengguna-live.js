/**
 * Japakeh Post - Live Users Management Script (admin/pengguna.html)
 * Mengelola seluruh akun pengguna CMS, hak akses (role), password, dan status via REST API & MySQL.
 */

let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
  initUsersLive();
});

function initUsersLive() {
  const btnAdd = document.getElementById('btn-add-user');
  const form = document.getElementById('user-form');
  const btnGenPass = document.getElementById('btn-generate-pass');

  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      openUserModal(null);
    });
  }

  if (form) {
    form.addEventListener('submit', handleUserFormSubmit);
  }

  if (btnGenPass) {
    btnGenPass.addEventListener('click', generateRandomPassword);
  }

  loadLiveUsers();
}

/**
 * Memuat daftar seluruh pengguna sistem
 */
async function loadLiveUsers() {
  const tbody = document.getElementById('user-table-body');
  const countHeader = document.getElementById('user-count-header');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-8 text-center text-gray-500">
        <div class="inline-block animate-spin w-5 h-5 border-2 border-buser-red border-t-transparent rounded-full mb-2"></div>
        <p class="text-xs">Memuat daftar akun pengguna dari database...</p>
      </td>
    </tr>
  `;

  try {
    if (!window.BuserInfoAPI || !window.BuserInfoAPI.getUsers) {
      throw new Error('API Client belum terpasang dengan benar');
    }

    const users = await window.BuserInfoAPI.getUsers();
    allUsers = users || [];

    if (countHeader) {
      countHeader.textContent = `${allUsers.length} Akun Terdaftar`;
    }

    if (allUsers.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-gray-400">
            <svg class="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            <p class="text-xs font-semibold">Belum ada akun pengguna CMS</p>
            <p class="text-[11px] text-gray-400 mt-0.5">Klik "Tambah Pengguna" untuk mendaftarkan akun baru.</p>
          </td>
        </tr>
      `;
      return;
    }

    renderUserRows(allUsers, tbody);
  } catch (err) {
    console.error('[Pengguna] Gagal memuat data:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-red-500">
          <p class="text-xs font-semibold">Gagal memuat daftar pengguna</p>
          <p class="text-[11px] text-gray-500 mt-1">${err.message || 'Terjadi kesalahan pada koneksi server.'}</p>
          <button type="button" onclick="loadLiveUsers()" class="mt-3 btn btn-outline btn-sm">Coba Lagi</button>
        </td>
      </tr>
    `;
  }
}

/**
 * Render baris tabel pengguna secara dinamis
 */
function renderUserRows(users, tbody) {
  tbody.innerHTML = '';

  const currentUser = (window.BuserInfoAPI && window.BuserInfoAPI.getUser) ? window.BuserInfoAPI.getUser() : null;

  const roleBadges = {
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

  users.forEach((user, idx) => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-gray-50 transition-colors';

    const isSelf = currentUser && (String(currentUser.id) === String(user.id) || currentUser.email_users === user.email_users);
    const initials = getInitials(user.nama_users || 'User');
    const avatarColor = avatarColors[idx % avatarColors.length];
    const roleBadge = roleBadges[user.role] || 'bg-gray-100 text-gray-700';
    const isActive = (user.status || 'active').toLowerCase() === 'active';
    const statusBadge = isActive
      ? '<span class="badge-status badge-published">Aktif</span>'
      : '<span class="badge-status badge-draft">Nonaktif</span>';

    const formattedLogin = formatDateTime(user.last_login);
    const toggleText = isActive ? 'Nonaktifkan' : 'Aktifkan';
    const toggleColor = isActive ? 'text-amber-600 hover:text-amber-800 hover:bg-amber-50' : 'text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50';

    tr.innerHTML = `
      <td class="py-3 px-4">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-full ${avatarColor} text-xs font-bold flex items-center justify-center shrink-0">
            ${escapeHtml(initials)}
          </div>
          <div>
            <div class="font-bold text-gray-900 flex items-center space-x-1.5">
              <span>${escapeHtml(user.nama_users)}</span>
              ${isSelf ? '<span class="px-1.5 py-0.2 text-[9px] font-bold bg-neutral-800 text-white rounded">Anda</span>' : ''}
            </div>
            <div class="text-[10px] text-gray-400">ID: U-${String(user.id).padStart(3, '0')}</div>
          </div>
        </div>
      </td>
      <td class="py-3 px-4 text-gray-600 font-mono text-xs">${escapeHtml(user.email_users)}</td>
      <td class="py-3 px-4">
        <span class="inline-block px-2 py-0.5 font-semibold ${roleBadge} rounded text-[11px]">${escapeHtml(user.role || 'Reporter')}</span>
      </td>
      <td class="py-3 px-4">${statusBadge}</td>
      <td class="py-3 px-4 text-gray-500 text-xs">${formattedLogin}</td>
      <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
        <button type="button" class="btn-edit p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 text-xs font-medium">Edit</button>
        <button type="button" class="btn-role p-1.5 text-gray-600 hover:text-gray-800 rounded hover:bg-gray-100 text-xs font-medium">Ubah Role</button>
        ${!isSelf ? `
          <button type="button" class="btn-toggle p-1.5 ${toggleColor} rounded text-xs font-medium">${toggleText}</button>
          <button type="button" class="btn-delete p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50 text-xs font-medium">Hapus</button>
        ` : ''}
      </td>
    `;

    // Event listeners
    tr.querySelector('.btn-edit').addEventListener('click', () => openUserModal(user));
    tr.querySelector('.btn-role').addEventListener('click', () => openChangeRoleModal(user));
    
    const btnToggle = tr.querySelector('.btn-toggle');
    if (btnToggle) {
      btnToggle.addEventListener('click', () => toggleUserStatus(user.id, user.nama_users, user.status));
    }

    const btnDelete = tr.querySelector('.btn-delete');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => deleteUser(user.id, user.nama_users));
    }

    tbody.appendChild(tr);
  });
}

/**
 * Buka modal tambah atau edit pengguna
 */
function openUserModal(user = null) {
  const modalTitle = document.getElementById('user-modal-title');
  const idInput = document.getElementById('user-id-input');
  const nameInput = document.getElementById('user-name-input');
  const emailInput = document.getElementById('user-email-input');
  const roleSelect = document.getElementById('user-role-select');
  const passInput = document.getElementById('user-pass-input');
  const passLabel = document.getElementById('user-pass-label');

  if (!modalTitle || !nameInput || !emailInput || !passInput) return;

  if (user) {
    modalTitle.textContent = 'Edit Pengguna: ' + user.nama_users;
    if (idInput) idInput.value = user.id;
    nameInput.value = user.nama_users || '';
    emailInput.value = user.email_users || '';
    if (roleSelect) roleSelect.value = user.role || 'Reporter';
    passInput.value = '';
    passInput.placeholder = 'Biarkan kosong jika tidak ingin mengubah password';
    passInput.required = false;
    if (passLabel) passLabel.textContent = 'Ganti Password (Opsional)';
  } else {
    modalTitle.textContent = 'Tambah Pengguna Baru';
    if (idInput) idInput.value = '';
    nameInput.value = '';
    emailInput.value = '';
    if (roleSelect) roleSelect.value = 'Reporter';
    generateRandomPassword();
    passInput.required = true;
    if (passLabel) passLabel.textContent = 'Password Sementara';
  }

  if (typeof openModal === 'function') {
    openModal('user-modal');
  } else {
    const m = document.getElementById('user-modal');
    if (m) m.classList.remove('hidden');
  }
}

/**
 * Acak password baru
 */
function generateRandomPassword() {
  const passInput = document.getElementById('user-pass-input');
  if (!passInput) return;
  const num = Math.floor(1000 + Math.random() * 9000);
  passInput.value = 'Buser#' + num;
}

/**
 * Submit form tambah / edit pengguna
 */
async function handleUserFormSubmit(e) {
  e.preventDefault();

  const idInput = document.getElementById('user-id-input');
  const nameInput = document.getElementById('user-name-input');
  const emailInput = document.getElementById('user-email-input');
  const roleSelect = document.getElementById('user-role-select');
  const passInput = document.getElementById('user-pass-input');

  const id = idInput ? idInput.value : '';
  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const role = roleSelect ? roleSelect.value : 'Reporter';
  const password = passInput ? passInput.value.trim() : '';

  if (!name || !email) {
    if (typeof showToast === 'function') showToast('error', 'Validasi Gagal', 'Nama dan email wajib diisi!');
    return;
  }

  if (!id && !password) {
    if (typeof showToast === 'function') showToast('error', 'Validasi Gagal', 'Password wajib diisi untuk pengguna baru!');
    return;
  }

  if (typeof closeModal === 'function') {
    closeModal('user-modal');
  } else {
    const m = document.getElementById('user-modal');
    if (m) m.classList.add('hidden');
  }

  try {
    let res;
    if (id) {
      const payload = { name, email, role };
      if (password) payload.password = password;
      res = await window.BuserInfoAPI.updateUser(id, payload);
    } else {
      res = await window.BuserInfoAPI.createUser({ name, email, role, password });
    }

    if (res && res.status === 'success') {
      if (typeof showToast === 'function') {
        showToast('success', 'Berhasil', id ? 'Data pengguna berhasil diperbarui.' : `Pengguna "${name}" berhasil ditambahkan.`);
      }
      loadLiveUsers();
    } else {
      if (typeof showToast === 'function') {
        showToast('error', 'Gagal', (res && res.message) ? res.message : 'Gagal menyimpan pengguna.');
      }
    }
  } catch (err) {
    console.error('[Pengguna] Error submit:', err);
    if (typeof showToast === 'function') showToast('error', 'Kesalahan Server', err.message);
  }
}

/**
 * Modal cepat ubah hak akses (role)
 */
function openChangeRoleModal(user) {
  const roles = ['Administrator', 'Editor', 'Reporter'];
  const otherRoles = roles.filter(r => r !== user.role);

  const roleOptions = roles.map(r => `
    <label class="flex items-center space-x-2.5 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
      <input type="radio" name="quick_role_choice" value="${r}" ${r === user.role ? 'checked' : ''} class="text-buser-red focus:ring-buser-red">
      <span class="text-xs font-semibold text-gray-800">${r}</span>
    </label>
  `).join('');

  if (typeof confirmAction === 'function') {
    let modal = document.getElementById('role-change-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'role-change-modal';
      modal.className = 'modal-container fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop hidden';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
        <h3 class="text-sm font-bold text-gray-900 mb-1">Ubah Hak Akses: ${escapeHtml(user.nama_users)}</h3>
        <p class="text-xs text-gray-500 mb-4">Pilih peran sistem baru untuk akun ini:</p>
        <div class="space-y-2 mb-5">
          ${roleOptions}
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-outline btn-sm" data-modal-close>Batal</button>
          <button type="button" id="btn-submit-change-role" class="btn btn-primary btn-sm">Simpan Peran</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    const submitBtn = modal.querySelector('#btn-submit-change-role');
    submitBtn.onclick = async () => {
      const selected = modal.querySelector('input[name="quick_role_choice"]:checked');
      if (!selected) return;
      const newRole = selected.value;

      if (typeof closeModal === 'function') closeModal(modal);
      else modal.classList.add('hidden');

      try {
        const res = await window.BuserInfoAPI.changeUserRole(user.id, newRole);
        if (res && res.status === 'success') {
          showToast('success', 'Peran Diperbarui', `Role ${user.nama_users} berhasil diubah ke ${newRole}.`);
          loadLiveUsers();
        } else {
          showToast('error', 'Gagal', (res && res.message) ? res.message : 'Gagal mengubah peran.');
        }
      } catch (err) {
        showToast('error', 'Kesalahan Server', err.message);
      }
    };
  }
}

/**
 * Toggle status aktif / nonaktif pengguna
 */
function toggleUserStatus(id, name, currentStatus) {
  const isCurrentlyActive = (currentStatus || 'active').toLowerCase() === 'active';
  const targetAction = isCurrentlyActive ? 'Nonaktifkan' : 'Aktifkan Kembali';
  const confirmType = isCurrentlyActive ? 'warning' : 'primary';

  if (typeof confirmAction === 'function') {
    confirmAction({
      title: `${targetAction} Akun Pengguna?`,
      message: isCurrentlyActive
        ? `Pengguna "${name}" tidak akan dapat login lagi ke sistem CMS sampai diaktifkan kembali.`
        : `Pengguna "${name}" akan diizinkan kembali masuk ke panel admin CMS.`,
      confirmText: targetAction,
      type: confirmType,
      onConfirm: async () => {
        try {
          const res = await window.BuserInfoAPI.toggleUserStatus(id);
          if (res && res.status === 'success') {
            showToast('warning', 'Status Pengguna Diperbarui', `Akses untuk ${name} kini ${res.data.status === 'active' ? 'Aktif' : 'Nonaktif'}.`);
            loadLiveUsers();
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
 * Hapus akun pengguna CMS
 */
function deleteUser(id, name) {
  if (typeof confirmAction === 'function') {
    confirmAction({
      title: `Hapus Akun Pengguna?`,
      message: `Akun "${name}" akan dihapus secara permanen dari basis data sistem.`,
      confirmText: 'Hapus Permanen',
      type: 'danger',
      onConfirm: async () => {
        try {
          const res = await window.BuserInfoAPI.deleteUser(id);
          if (res && res.status === 'success') {
            showToast('success', 'Pengguna Dihapus', `Akun ${name} telah berhasil dihapus permanen.`);
            loadLiveUsers();
          } else {
            showToast('error', 'Gagal Menghapus', (res && res.message) ? res.message : 'Akun pengguna tidak dapat dihapus.');
          }
        } catch (err) {
          showToast('error', 'Kesalahan Server', err.message);
        }
      }
    });
  }
}

/**
 * Helper: Format Tanggal dan Jam
 */
function formatDateTime(dtStr) {
  if (!dtStr) return '-';
  try {
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return dtStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const day = d.getDate();
    const mon = months[d.getMonth()];
    const yr = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${mon} ${yr}, ${hh}:${mm} WIB`;
  } catch (e) {
    return dtStr;
  }
}

/**
 * Helper: Ambil inisial nama
 */
function getInitials(name) {
  if (!name) return 'US';
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

window.loadLiveUsers = loadLiveUsers;
