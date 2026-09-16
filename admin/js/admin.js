/**
 * JAPAKEH POST ADMIN CMS - CORE JAVASCRIPT
 * Brand: Japakeh Post (PT Japakeh Media Nusantara)
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileSidebar();
  initLiveClock();
  initNotificationDropdown();
  initUserDropdown();
  initGlobalShortcuts();
  initModals();
});

/* ==========================================
   1. MOBILE SIDEBAR DRAWER TOGGLE
   ========================================== */
function initMobileSidebar() {
  const sidebar = document.getElementById('admin-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const toggleBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('sidebar-close-btn');

  if (!sidebar) return;

  function openSidebar() {
    sidebar.classList.remove('-translate-x-full');
    if (overlay) {
      overlay.classList.remove('hidden');
      setTimeout(() => overlay.classList.add('opacity-100'), 10);
    }
    document.body.classList.add('overflow-hidden');
  }

  function closeSidebar() {
    sidebar.classList.add('-translate-x-full');
    if (overlay) {
      overlay.classList.remove('opacity-100');
      setTimeout(() => overlay.classList.add('hidden'), 200);
    }
    document.body.classList.remove('overflow-hidden');
  }

  if (toggleBtn) toggleBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay) overlay.addEventListener('click', closeSidebar);
}

/* ==========================================
   2. LIVE SYSTEM CLOCK (WIB)
   ========================================== */
function initLiveClock() {
  const clockEl = document.getElementById('live-wib-clock');
  if (!clockEl) return;

  function updateTime() {
    const now = new Date();
    const options = {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    try {
      const formatter = new Intl.DateTimeFormat('id-ID', options);
      clockEl.textContent = formatter.format(now) + ' WIB';
    } catch (e) {
      clockEl.textContent = now.toLocaleTimeString() + ' WIB';
    }
  }

  updateTime();
  setInterval(updateTime, 1000);
}

/* ==========================================
   3. NOTIFICATION DROPDOWN
   ========================================== */
function initNotificationDropdown() {
  const notifBtn = document.getElementById('notif-btn');
  const notifDropdown = document.getElementById('notif-dropdown');
  const markReadBtn = document.getElementById('mark-all-read-btn');
  const notifBadge = document.getElementById('notif-badge');

  if (!notifBtn || !notifDropdown) return;

  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close user dropdown if open
    const userDropdown = document.getElementById('user-dropdown');
    if (userDropdown) userDropdown.classList.add('hidden');

    notifDropdown.classList.toggle('hidden');
  });

  if (markReadBtn && notifBadge) {
    markReadBtn.addEventListener('click', () => {
      notifBadge.style.display = 'none';
      document.querySelectorAll('.notif-dot').forEach(dot => dot.style.display = 'none');
      showToast('success', 'Notifikasi Dibaca', 'Semua notifikasi ditandai sebagai sudah dibaca.');
    });
  }

  document.addEventListener('click', (e) => {
    if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
      notifDropdown.classList.add('hidden');
    }
  });
}

/* ==========================================
   4. USER DROPDOWN
   ========================================== */
function initUserDropdown() {
  const userBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');

  if (!userBtn || !userDropdown) return;

  userBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Close notif dropdown if open
    const notifDropdown = document.getElementById('notif-dropdown');
    if (notifDropdown) notifDropdown.classList.add('hidden');

    userDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!userDropdown.contains(e.target) && !userBtn.contains(e.target)) {
      userDropdown.classList.add('hidden');
    }
  });
}

/* ==========================================
   5. GLOBAL SHORTCUTS
   ========================================== */
function initGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl + K or Cmd + K focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('global-search-input');
      if (searchInput) {
        searchInput.focus();
        showToast('info', 'Pencarian Aktif', 'Ketik kata kunci untuk mencari berita, kategori, atau media.');
      }
    }
    // Escape closes modals and dropdowns
    if (e.key === 'Escape') {
      closeAllModals();
      document.querySelectorAll('#notif-dropdown, #user-dropdown').forEach(d => d.classList.add('hidden'));
    }
  });
}

/* ==========================================
   6. TOAST NOTIFICATION SYSTEM
   ========================================== */
function showToast(type = 'info', title = '', message = '') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: `<div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              </div>`,
    error: `<div class="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </div>`,
    warning: `<div class="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>`,
    info: `<div class="w-8 h-8 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
             <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
           </div>`
  };

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.innerHTML = `
    ${icons[type] || icons.info}
    <div class="flex-1 min-w-0">
      <h4 class="text-sm font-semibold text-gray-900">${title}</h4>
      <p class="text-xs text-gray-600 mt-0.5">${message}</p>
    </div>
    <button type="button" class="text-gray-400 hover:text-gray-600 shrink-0 p-1" onclick="this.parentElement.remove()">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

/* ==========================================
   7. CONFIRMATION MODALS SYSTEM
   ========================================== */
function initModals() {
  // Close modals on clicking elements with data-modal-close
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-modal-close]');
    if (closeBtn) {
      const modal = closeBtn.closest('.modal-container');
      if (modal) closeModal(modal);
    }
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');
}

function closeModal(modalOrId) {
  const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.classList.remove('overflow-hidden');
}

function closeAllModals() {
  document.querySelectorAll('.modal-container').forEach(modal => {
    modal.classList.add('hidden');
  });
  document.body.classList.remove('overflow-hidden');
}

/**
 * Universal confirmation modal helper
 */
function confirmAction(options = {}) {
  const {
    title = 'Konfirmasi Tindakan',
    message = 'Apakah Anda yakin ingin melanjutkan?',
    confirmText = 'Lanjutkan',
    cancelText = 'Batal',
    type = 'danger', // danger, primary, warning
    onConfirm = () => {}
  } = options;

  let modal = document.getElementById('dynamic-confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'dynamic-confirm-modal';
    modal.className = 'modal-container fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop hidden';
    document.body.appendChild(modal);
  }

  const btnBg = type === 'danger' ? 'bg-[#D71920] hover:bg-[#B80F15] text-white' : 'bg-[#0B0B0B] hover:bg-neutral-800 text-white';
  const iconHtml = type === 'danger'
    ? `<div class="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
         <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
       </div>`
    : `<div class="w-12 h-12 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center mx-auto mb-3">
         <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
       </div>`;

  modal.innerHTML = `
    <div class="bg-white rounded-lg max-w-sm w-full p-6 text-center shadow-2xl border border-gray-200 transform transition-all animate-in fade-in zoom-in-95">
      ${iconHtml}
      <h3 class="text-base font-bold text-gray-900 mb-1">${title}</h3>
      <p class="text-sm text-gray-600 mb-6">${message}</p>
      <div class="flex gap-2.5 justify-center">
        <button type="button" class="btn btn-outline flex-1" data-modal-close>${cancelText}</button>
        <button type="button" id="confirm-modal-submit-btn" class="btn ${btnBg} flex-1">${confirmText}</button>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');

  const submitBtn = modal.querySelector('#confirm-modal-submit-btn');
  submitBtn.onclick = () => {
    closeModal(modal);
    onConfirm();
  };
}

/**
 * Copy to Clipboard Helper
 */
function copyToClipboard(text, successMsg = 'Tautan berhasil disalin!') {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('success', 'Berhasil Disalin', successMsg);
    });
  } else {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
    showToast('success', 'Berhasil Disalin', successMsg);
  }
}
