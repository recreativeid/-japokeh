/**
 * Japakeh Post - Admin Dashboard Live Synchronizer
 * Mengintegrasikan kartu ringkasan, diagram Chart.js, progres kategori, dan tabel berita terbaru ke database riil.
 */

let livePublicationChart = null;
let liveChartData = null;

document.addEventListener('DOMContentLoaded', () => {
  initDashboardLive();
});

async function initDashboardLive() {
  if (!window.BuserInfoAPI) {
    console.warn('[DashboardLive] window.BuserInfoAPI tidak ditemukan.');
    return;
  }

  try {
    const data = await window.BuserInfoAPI.getDashboardStats();
    if (!data) return;

    // 1. Perbarui 4 Kartu Metrik Utama
    updateMetricCards(data.counts);

    // 2. Perbarui Notifikasi Header
    updateNotificationDropdown(data.counts);

    // 3. Render Distribusi Kategori Riil
    renderCategoryDistribution(data.categories);

    // 4. Inisialisasi & Render Grafik Statistik Riil
    liveChartData = data.chart_stats;
    initOrUpdatePublicationChart(liveChartData, '7d');

    // 5. Render Tabel 5 Berita Terbaru Riil
    renderRecentNewsTable(data.recent_news);

  } catch (err) {
    console.error('[DashboardLive] Gagal sinkronisasi dashboard:', err);
  }
}

// 1. Update Kartu Metrik
function updateMetricCards(counts) {
  if (!counts) return;

  const totalEl = document.getElementById('stat-total-berita');
  const totalSubEl = document.getElementById('stat-total-sub');
  if (totalEl) totalEl.textContent = Number(counts.total || 0).toLocaleString('id-ID');
  if (totalSubEl) {
    totalSubEl.innerHTML = `
      <svg class="w-3.5 h-3.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
      <span>+${counts.this_month || 0} bulan ini</span>
    `;
  }

  const draftEl = document.getElementById('stat-draft-berita');
  if (draftEl) draftEl.textContent = Number(counts.draft || 0).toLocaleString('id-ID');

  const terbitEl = document.getElementById('stat-terbit-berita');
  const terbitSubEl = document.getElementById('stat-terbit-sub');
  if (terbitEl) terbitEl.textContent = Number(counts.published || 0).toLocaleString('id-ID');
  if (terbitSubEl) terbitSubEl.textContent = `${counts.published_percentage || 0}% dari total artikel`;

  const reviewEl = document.getElementById('stat-review-berita');
  if (reviewEl) reviewEl.textContent = Number(counts.review || 0).toLocaleString('id-ID');
}

// 2. Update Notifikasi
function updateNotificationDropdown(counts) {
  const notifReviewText = document.getElementById('notif-review-text');
  const notifBadge = document.getElementById('notif-badge');

  const reviewCount = counts.review || 0;
  if (notifReviewText) {
    notifReviewText.textContent = `${reviewCount} Berita menunggu review`;
  }

  if (notifBadge) {
    if (reviewCount > 0) {
      notifBadge.classList.remove('hidden');
    } else {
      notifBadge.classList.add('hidden');
    }
  }

  // Update badge sidebar komentar
  const komentarSidebarBadge = document.querySelector('a[href="komentar.html"] span.rounded');
  if (komentarSidebarBadge && counts.pending_comments !== undefined) {
    komentarSidebarBadge.textContent = counts.pending_comments;
  }
}

// 3. Render Distribusi Kategori
function renderCategoryDistribution(categories) {
  const container = document.getElementById('category-distribution-container');
  if (!container || !categories) return;

  container.innerHTML = '';

  if (categories.length === 0) {
    container.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center">Belum ada kategori terdata.</p>';
    return;
  }

  categories.forEach(cat => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'space-y-1';
    itemDiv.innerHTML = `
      <div class="flex justify-between text-xs font-semibold">
        <span class="text-gray-700">${cat.name}</span>
        <span class="text-gray-900">${cat.count} artikel (${cat.percentage}%)</span>
      </div>
      <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div class="h-2 rounded-full transition-all duration-500" style="width: ${cat.percentage}%; background-color: ${cat.color};"></div>
      </div>
    `;
    container.appendChild(itemDiv);
  });
}

// 4. Inisialisasi / Update Chart.js
function initOrUpdatePublicationChart(chartStats, initialRange = '7d') {
  const canvas = document.getElementById('publicationChart');
  if (!canvas || !chartStats) return;

  const currentStats = chartStats[initialRange] || {
    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
    published: [0, 0, 0, 0, 0, 0, 0],
    drafts: [0, 0, 0, 0, 0, 0, 0],
    updated: [0, 0, 0, 0, 0, 0, 0]
  };

  if (livePublicationChart) {
    livePublicationChart.data.labels = currentStats.labels;
    livePublicationChart.data.datasets[0].data = currentStats.published;
    livePublicationChart.data.datasets[1].data = currentStats.drafts;
    livePublicationChart.data.datasets[2].data = currentStats.updated;
    livePublicationChart.update();
    return;
  }

  const ctx = canvas.getContext('2d');
  livePublicationChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: currentStats.labels,
      datasets: [
        {
          label: 'Berita Diterbitkan',
          data: currentStats.published,
          backgroundColor: '#D71920',
          borderRadius: 4,
          barPercentage: 0.6
        },
        {
          label: 'Draft',
          data: currentStats.drafts,
          backgroundColor: '#6B7280',
          borderRadius: 4,
          barPercentage: 0.6
        },
        {
          label: 'Berita Diperbarui',
          data: currentStats.updated,
          backgroundColor: '#0B0B0B',
          borderRadius: 4,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { family: 'Inter', size: 11, weight: '500' }
          }
        },
        tooltip: {
          backgroundColor: '#0B0B0B',
          titleFont: { family: 'Inter', size: 12, weight: '700' },
          bodyFont: { family: 'Inter', size: 11 },
          padding: 10,
          cornerRadius: 6
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#6B7280' }
        },
        y: {
          beginAtZero: true,
          grid: { color: '#F3F4F6' },
          ticks: { 
            font: { family: 'Inter', size: 11 }, 
            color: '#6B7280', 
            precision: 0,
            stepSize: 1 
          }
        }
      }
    }
  });

  // Filter Buttons Event Listener
  document.querySelectorAll('.chart-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-filter-btn').forEach(b => {
        b.classList.remove('bg-white', 'text-gray-900', 'shadow-sm');
        b.classList.add('text-gray-600');
      });
      btn.classList.add('bg-white', 'text-gray-900', 'shadow-sm');
      btn.classList.remove('text-gray-600');

      const range = btn.getAttribute('data-range');
      if (liveChartData && liveChartData[range] && livePublicationChart) {
        livePublicationChart.data.labels = liveChartData[range].labels;
        livePublicationChart.data.datasets[0].data = liveChartData[range].published;
        livePublicationChart.data.datasets[1].data = liveChartData[range].drafts;
        livePublicationChart.data.datasets[2].data = liveChartData[range].updated;
        livePublicationChart.update();
      }
    });
  });
}

// 5. Render 5 Berita Terbaru Masuk
function renderRecentNewsTable(articles) {
  const tbody = document.getElementById('recent-news-tbody');
  if (!tbody) return;

  if (!articles || articles.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-gray-400">
          Belum ada artikel terbaru yang dimasukkan.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = '';

  articles.forEach(item => {
    const dateFormatted = item.published_at 
      ? new Date(item.published_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '-';

    const thumbUrl = item.thumbnail && item.thumbnail.startsWith('assets/') 
      ? `../${item.thumbnail}` 
      : (item.thumbnail || '../assets/images/berita/hero/sorotan-utama-dunia.jpg');

    let statusBadge = '';
    const st = (item.status || '').toLowerCase();
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
    tr.className = 'hover:bg-gray-50/80 transition-colors';
    tr.innerHTML = `
      <td class="py-3 px-4">
        <img src="${thumbUrl}" alt="Thumb" class="w-14 h-10 object-cover rounded border border-gray-200" onerror="this.src='../assets/images/berita/hero/sorotan-utama-dunia.jpg'">
      </td>
      <td class="py-3 px-4 font-semibold text-gray-900 max-w-xs">
        <a href="berita.html?edit=${item.id_artikel}" class="hover:text-buser-red transition-colors line-clamp-2">
          ${item.title}
        </a>
        <span class="text-[10px] text-gray-400 font-mono mt-0.5 block truncate">slug: ${item.slug}</span>
      </td>
      <td class="py-3 px-4">
        <span class="inline-block px-2 py-0.5 font-medium bg-red-50 text-buser-red rounded">${item.name_kategori}</span>
      </td>
      <td class="py-3 px-4 font-medium text-gray-700">
        ${item.author_name}
      </td>
      <td class="py-3 px-4">
        ${statusBadge}
      </td>
      <td class="py-3 px-4 text-gray-500 whitespace-nowrap">
        ${dateFormatted}
      </td>
      <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
        <a href="../artikel.html?slug=${item.slug}" target="_blank" class="p-1.5 text-gray-500 hover:text-gray-900 rounded hover:bg-gray-100 inline-block" title="Lihat Pratinjau">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        </a>
        <a href="berita.html?edit=${item.id_artikel}" class="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 inline-block" title="Edit Artikel">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        </a>
        <button type="button" onclick="handleDeleteDashboardArticle(${item.id_artikel})" class="p-1.5 text-red-600 hover:text-red-800 rounded hover:bg-red-50 inline-block" title="Hapus">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Handle Hapus Artikel dari Dashboard
async function handleDeleteDashboardArticle(id) {
  const doDelete = async () => {
    const res = await window.BuserInfoAPI.deleteArticle(id);
    if (res && res.status === 'success') {
      if (typeof showToast === 'function') {
        showToast('success', 'Berhasil', 'Artikel berhasil dihapus');
      } else {
        alert('Artikel berhasil dihapus');
      }
      initDashboardLive();
    } else {
      const msg = res?.message || 'Gagal menghapus artikel.';
      if (typeof showToast === 'function') {
        showToast('error', 'Gagal', msg);
      } else {
        alert(msg);
      }
    }
  };

  if (typeof confirmAction === 'function') {
    confirmAction({
      title: 'Hapus Artikel?',
      message: 'Artikel akan dihapus secara permanen dari database. Lanjutkan?',
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
