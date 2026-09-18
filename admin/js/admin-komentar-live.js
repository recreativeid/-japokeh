/**
 * Japakeh Post - Live Comment Moderation Script (admin/komentar.html)
 * Handles real-time loading, tab filtering (All, Pending, Approved, Rejected, Spam),
 * live status moderation (Approve, Reject, Mark Spam, Restore to Pending), and permanent deletion via REST API / MySQL.
 */

let currentCommentTab = 'all';
let allLoadedComments = [];

document.addEventListener('DOMContentLoaded', () => {
  initCommentTabs();
  loadLiveComments();
});

function initCommentTabs() {
  const tabs = document.querySelectorAll('.comment-tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.remove('active', 'border-b-buser-red', 'text-buser-red', 'font-bold');
        t.classList.add('border-b-transparent', 'text-gray-500', 'font-medium');
      });
      tab.classList.add('active', 'border-b-buser-red', 'text-buser-red', 'font-bold');
      tab.classList.remove('border-b-transparent', 'text-gray-500', 'font-medium');

      currentCommentTab = tab.getAttribute('data-tab') || 'all';
      loadLiveComments(currentCommentTab);
    });
  });
}

async function loadLiveComments(tab = currentCommentTab) {
  const container = document.getElementById('comments-container');
  const emptyState = document.getElementById('comment-empty');
  if (!container || !window.BuserInfoAPI) return;

  container.innerHTML = `
    <div class="cms-card p-8 text-center text-gray-500 text-xs">
      <div class="inline-block animate-spin w-5 h-5 border-2 border-buser-red border-t-transparent rounded-full mb-2"></div>
      <p>Memuat data komentar dari database...</p>
    </div>
  `;
  if (emptyState) emptyState.classList.add('hidden');

  try {
    const res = await window.BuserInfoAPI.getComments({ status: tab });
    const comments = res.comments || [];
    const counts = res.counts || {};

    allLoadedComments = comments;
    updateTabBadgeCounts(counts);

    if (comments.length === 0) {
      container.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    renderCommentCards(comments, container);
  } catch (err) {
    console.error('[KomentarLive] Gagal memuat komentar:', err);
    container.innerHTML = `
      <div class="cms-card p-6 text-center text-red-600 text-xs">
        Terjadi kesalahan saat memuat komentar: ${err.message}
      </div>
    `;
  }
}

function updateTabBadgeCounts(counts) {
  const tabButtons = document.querySelectorAll('.comment-tab-btn');
  tabButtons.forEach(btn => {
    const tabType = btn.getAttribute('data-tab');
    if (tabType === 'all') btn.textContent = `Semua (${counts.all || 0})`;
    else if (tabType === 'pending') btn.textContent = `Menunggu Moderasi (${counts.pending || 0})`;
    else if (tabType === 'approved') btn.textContent = `Disetujui (${counts.approved || 0})`;
    else if (tabType === 'rejected') btn.textContent = `Ditolak (${counts.rejected || 0})`;
    else if (tabType === 'spam') btn.textContent = `Spam (${counts.spam || 0})`;
  });

  // Header pending badge
  const headerBadge = document.getElementById('header-pending-badge') || document.querySelector('header span.inline-flex');
  if (headerBadge) {
    headerBadge.textContent = `${counts.pending || 0} Menunggu Verifikasi`;
  }

  // Sidebar badge
  const sidebarNavKomentar = document.querySelector('a[href="komentar.html"] span.rounded');
  if (sidebarNavKomentar) {
    sidebarNavKomentar.textContent = counts.pending || 0;
  }
}

function renderCommentCards(comments, container) {
  container.innerHTML = '';

  comments.forEach(item => {
    const card = createCommentCardElement(item);
    container.appendChild(card);
  });
}

function createCommentCardElement(item) {
  const card = document.createElement('div');
  card.className = `cms-card p-4 sm:p-5 comment-card ${item.status === 'spam' ? 'opacity-75' : ''}`;
  card.setAttribute('data-id', item.id);
  card.setAttribute('data-status', item.status);

  // Status Badge
  let badgeHtml = '';
  if (item.status === 'approved') {
    badgeHtml = '<span class="badge-status badge-published text-[10px]">Disetujui</span>';
  } else if (item.status === 'rejected') {
    badgeHtml = '<span class="badge-status badge-draft text-[10px]">Ditolak</span>';
  } else if (item.status === 'spam') {
    badgeHtml = '<span class="badge-status bg-red-100 text-red-800 border-red-200 text-[10px]">Spam Terdeteksi</span>';
  } else {
    badgeHtml = '<span class="badge-status badge-review text-[10px]">Menunggu Moderasi</span>';
  }

  // Initial & Avatar Color
  const initials = (item.name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'U';

  let avatarBg = 'bg-neutral-200 text-neutral-700';
  if (item.status === 'approved') avatarBg = 'bg-emerald-100 text-emerald-800';
  else if (item.status === 'spam') avatarBg = 'bg-red-100 text-red-700';
  else if (item.status === 'rejected') avatarBg = 'bg-gray-200 text-gray-700';

  // Date formatted
  const dateFormatted = item.created_at
    ? new Date(item.created_at).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) + ' WIB'
    : '-';

  // Action Buttons based on status
  let actionButtonsHtml = '';
  if (item.status === 'pending') {
    actionButtonsHtml = `
      <button type="button" onclick="adminApproveComment(${item.id})" class="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
        Setujui
      </button>
      <button type="button" onclick="adminRejectComment(${item.id})" class="btn btn-outline btn-sm text-xs">
        Tolak
      </button>
      <button type="button" onclick="adminSpamComment(${item.id})" class="btn btn-outline btn-sm text-xs text-amber-600">
        Spam
      </button>
      <button type="button" onclick="adminDeleteComment(${item.id})" class="btn btn-danger-outline btn-sm text-xs">
        Hapus
      </button>
    `;
  } else if (item.status === 'approved') {
    actionButtonsHtml = `
      <button type="button" onclick="adminPendingComment(${item.id})" class="btn btn-outline btn-sm text-xs" title="Tarik dari publik kembali ke antrean moderasi">
        Batalkan
      </button>
      <button type="button" onclick="adminRejectComment(${item.id})" class="btn btn-outline btn-sm text-xs">
        Tolak
      </button>
      <button type="button" onclick="adminDeleteComment(${item.id})" class="btn btn-danger-outline btn-sm text-xs">
        Hapus
      </button>
    `;
  } else if (item.status === 'rejected') {
    actionButtonsHtml = `
      <button type="button" onclick="adminApproveComment(${item.id})" class="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
        Pulihkan & Setujui
      </button>
      <button type="button" onclick="adminPendingComment(${item.id})" class="btn btn-outline btn-sm text-xs">
        Kembalikan ke Pending
      </button>
      <button type="button" onclick="adminDeleteComment(${item.id})" class="btn btn-danger-outline btn-sm text-xs">
        Hapus
      </button>
    `;
  } else if (item.status === 'spam') {
    actionButtonsHtml = `
      <button type="button" onclick="adminPendingComment(${item.id})" class="btn btn-outline btn-sm text-xs">
        Bukan Spam
      </button>
      <button type="button" onclick="adminDeleteComment(${item.id})" class="btn btn-primary btn-sm text-xs">
        Bersihkan Permanen
      </button>
    `;
  }

  const articleLink = item.artikel_slug
    ? `<a href="../artikel.html?slug=${escapeHtml(item.artikel_slug)}" target="_blank" class="font-semibold text-buser-red hover:underline">${escapeHtml(item.artikel_title || 'Artikel')}</a>`
    : `<span class="font-semibold text-gray-700">${escapeHtml(item.artikel_title || 'Artikel')}</span>`;

  card.innerHTML = `
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div class="flex items-start space-x-3 flex-1 min-w-0">
        <div class="w-8 h-8 rounded-full ${avatarBg} font-bold text-xs flex items-center justify-center shrink-0">
          ${initials}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-bold text-xs text-gray-900">${escapeHtml(item.name)}</span>
            ${item.email ? `<span class="text-[11px] text-gray-400 font-mono">${escapeHtml(item.email)}</span>` : ''}
            ${badgeHtml}
            ${item.ip_address ? `<span class="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono hidden md:inline-block">IP: ${escapeHtml(item.ip_address)}</span>` : ''}
          </div>
          <!-- Comment Text -->
          <p class="text-xs text-gray-800 mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed break-words">
            "${escapeHtml(item.comment)}"
          </p>
          <!-- Target Article Link -->
          <div class="flex flex-wrap items-center space-x-1.5 text-[11px] text-gray-500 mt-2">
            <span>Pada artikel:</span>
            ${articleLink}
            <span>•</span>
            <span>${dateFormatted}</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-1.5 w-full sm:w-auto justify-end pt-2.5 sm:pt-1 border-t sm:border-t-0 border-gray-100">
        ${actionButtonsHtml}
      </div>
    </div>
  `;

  return card;
}

// Moderation Actions
async function adminApproveComment(id) {
  try {
    const res = await window.BuserInfoAPI.updateCommentStatus(id, 'approved');
    if (res.status === 'success') {
      showToast('success', 'Komentar Disetujui', 'Komentar kini telah tayang pada artikel publik.');
      loadLiveComments();
    } else {
      showToast('danger', 'Gagal', res.message || 'Gagal menyetujui komentar.');
    }
  } catch (e) {
    showToast('danger', 'Error', e.message);
  }
}

function adminRejectComment(id) {
  confirmAction({
    title: 'Tolak Komentar?',
    message: 'Komentar yang ditolak tidak akan tampil untuk pembaca umum.',
    confirmText: 'Tolak',
    type: 'warning',
    onConfirm: async () => {
      try {
        const res = await window.BuserInfoAPI.updateCommentStatus(id, 'rejected');
        if (res.status === 'success') {
          showToast('info', 'Komentar Ditolak', 'Status komentar diubah menjadi ditolak.');
          loadLiveComments();
        } else {
          showToast('danger', 'Gagal', res.message);
        }
      } catch (e) {
        showToast('danger', 'Error', e.message);
      }
    }
  });
}

function adminSpamComment(id) {
  confirmAction({
    title: 'Tandai Sebagai Spam?',
    message: 'Komentar ini akan ditandai spam dan disembunyikan dari publik.',
    confirmText: 'Tandai Spam',
    type: 'warning',
    onConfirm: async () => {
      try {
        const res = await window.BuserInfoAPI.updateCommentStatus(id, 'spam');
        if (res.status === 'success') {
          showToast('warning', 'Ditandai Spam', 'Pengirim ini ditambahkan ke daftar spam.');
          loadLiveComments();
        } else {
          showToast('danger', 'Gagal', res.message);
        }
      } catch (e) {
        showToast('danger', 'Error', e.message);
      }
    }
  });
}

async function adminPendingComment(id) {
  try {
    const res = await window.BuserInfoAPI.updateCommentStatus(id, 'pending');
    if (res.status === 'success') {
      showToast('info', 'Dikembalikan ke Antrean', 'Status komentar dikembalikan ke Menunggu Moderasi.');
      loadLiveComments();
    } else {
      showToast('danger', 'Gagal', res.message);
    }
  } catch (e) {
    showToast('danger', 'Error', e.message);
  }
}

function adminDeleteComment(id) {
  confirmAction({
    title: 'Hapus Komentar Permanen?',
    message: 'Tindakan ini tidak dapat dibatalkan. Apakah Anda yakin ingin menghapus data komentar ini dari sistem?',
    confirmText: 'Hapus Permanen',
    type: 'danger',
    onConfirm: async () => {
      try {
        const res = await window.BuserInfoAPI.deleteComment(id);
        if (res.status === 'success') {
          showToast('success', 'Komentar Dihapus', 'Data komentar telah dibersihkan.');
          loadLiveComments();
        } else {
          showToast('danger', 'Gagal', res.message);
        }
      } catch (e) {
        showToast('danger', 'Error', e.message);
      }
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
