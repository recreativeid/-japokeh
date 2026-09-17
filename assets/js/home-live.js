/**
 * Japakeh Post - Unified Home Live Controller (Desktop 100% Restored + Mobile Optimized)
 * Seamlessly delivers the rich 2-column desktop layout (Slider + Pilihan Redaksi + Terkini + Sidebar + Categories)
 * while preserving the mobile-first enhancements (compact single carousel, max 5 news, 3-col horizontal shorts foto & video).
 */

document.addEventListener('DOMContentLoaded', () => {
  renderAllLiveContentFromDB();
});

async function renderAllLiveContentFromDB() {
  if (!window.BuserInfoAPI) return;

  try {
    const data = await window.BuserInfoAPI.getArticles({ limit: 100, status: 'published' });
    const rawArticles = data.articles || [];
    const articles = rawArticles.map(a => ({
      ...a,
      id: a.id || a.id_artikel,
      views: typeof a.views === 'number' ? a.views : (parseInt(String(a.views || '0').replace(/\D/g, ''), 10) || 0),
      title: cleanMediaTitle(a.title)
    }));

    // 1. BREAKING NEWS TICKER (Shared across all viewports)
    renderTicker(articles);

    if (articles.length === 0) {
      showEmptyState();
      return;
    }

    // Sort popular articles by views / score for Trending & Populer sections
    const trendingArticles = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0));

    // =========================================================================
    // A. DESKTOP LIVE RENDERING (Strictly Matching UI DESKTOP.jpeg)
    // =========================================================================
    renderDesktopHeroSection(articles, trendingArticles);
    renderDesktopBeritaTerkini(articles);
    renderDesktopBottomSection(articles);

    // =========================================================================
    // B. MOBILE LIVE RENDERING (Approved mobile-first revisions)
    // =========================================================================
    try { setupMobileHeroCarousel(articles); } catch (e) { console.error('[setupMobileHeroCarousel] Error:', e); }
    try { renderMobileBeritaTerbaru(articles); } catch (e) { console.error('[renderMobileBeritaTerbaru] Error:', e); }
    try { renderMobileBeritaPopuler(trendingArticles); } catch (e) { console.error('[renderMobileBeritaPopuler] Error:', e); }
    try { await renderSpecialCardsSection(articles); } catch (e) { console.error('[renderSpecialCardsSection] Error:', e); }
    try { renderFotoSection(articles); } catch (e) { console.error('[renderFotoSection] Error:', e); }
    try { renderVideoSection(articles); } catch (e) { console.error('[renderVideoSection] Error:', e); }
    try { setupModals(); } catch (e) { console.error('[setupModals] Error:', e); }

  } catch (err) {
    console.error('[renderAllLiveContentFromDB] Error:', err);
  }
}

// =============================================================================
// SHARED UTILITIES & FORMATTERS
// =============================================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cleanMediaTitle(title) {
  if (!title) return '';
  let clean = String(title)
    .replace(/\[\s*(FOTO|VIDEO)\s*\]\s*/gi, '')
    .trim();
  if (/\.(webp|jpg|jpeg|png|gif|mp4|webm)$/i.test(clean)) {
    clean = clean
      .replace(/^[\d\.\-\s\/]+/, '')
      .replace(/\.(webp|jpg|jpeg|png|gif|mp4|webm)$/i, '')
      .replace(/[-_]+/g, ' ')
      .trim();
  }
  return clean;
}

function formatDateIndo(dateStr) {
  if (!dateStr) return 'Baru saja';
  const safeStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(safeStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) + ' • ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

function formatDateOnlyIndo(dateStr) {
  if (!dateStr) return '10 September 2026';
  const safeStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(safeStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

function formatTimeIndo(dateStr) {
  if (!dateStr) return '09:00 WIB';
  const safeStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(safeStr);
  if (isNaN(d.getTime())) return '09:00 WIB';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

function getThumb(url) {
  return url && url.length > 5 ? url : 'assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg';
}

function getCategoryBadgeClasses(catName) {
  const norm = String(catName || '').toLowerCase().trim();
  if (norm.includes('daerah') || norm.includes('breaking') || norm.includes('headline')) {
    return 'bg-buser-red text-white font-black';
  }
  if (norm.includes('nasional') || norm.includes('politik') || norm.includes('hukum')) {
    return 'bg-black text-white font-bold';
  }
  return 'bg-buser-red text-white font-bold';
}

function getCategoryAccentClass(catName) {
  return { bar: '', dot: 'bg-buser-red', link: 'text-buser-red hover:text-buser-redHover' };
}

function getTrendingNumberClass(index) {
  if (index === 0) return 'text-buser-red';
  if (index === 1) return 'text-red-700';
  if (index === 2) return 'text-gray-800';
  return 'text-gray-400';
}

function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/i);
  return match ? match[1] : null;
}

// =============================================================================
// BREAKING NEWS TICKER (Matching UI DESKTOP.jpeg Single Headline Rotator)
// =============================================================================
let tickerArticlesList = [];
let tickerCurrentIdx = 0;
let tickerTimer = null;

function renderTicker(articles) {
  const track = document.getElementById('breaking-ticker-track');
  const nextBtn = document.getElementById('ticker-next-btn');
  if (!track || !articles || articles.length === 0) return;

  tickerArticlesList = articles.slice(0, 10);
  tickerCurrentIdx = 0;

  function showTickerItem(idx) {
    if (!tickerArticlesList || tickerArticlesList.length === 0) return;
    tickerCurrentIdx = (idx + tickerArticlesList.length) % tickerArticlesList.length;
    const item = tickerArticlesList[tickerCurrentIdx];
    track.style.opacity = '0';
    setTimeout(() => {
      track.innerHTML = `
        <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="hover:text-[#E60000] transition-colors truncate block">
          ${escapeHtml(item.title)}
        </a>
      `;
      track.style.opacity = '1';
    }, 150);
  }

  showTickerItem(0);

  if (tickerTimer) clearInterval(tickerTimer);
  tickerTimer = setInterval(() => {
    showTickerItem(tickerCurrentIdx + 1);
  }, 6000);

  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = 'true';
    nextBtn.addEventListener('click', () => {
      showTickerItem(tickerCurrentIdx + 1);
      if (tickerTimer) {
        clearInterval(tickerTimer);
        tickerTimer = setInterval(() => {
          showTickerItem(tickerCurrentIdx + 1);
        }, 6000);
      }
    });
  }
}

// Empty state fallback
function showEmptyState() {
  const container = document.getElementById('live-berita-terkini-feed');
  if (container) {
    container.innerHTML = `
      <div class="col-span-full text-center py-12 bg-white rounded-2xl border border-slate-200">
        <p class="text-slate-500 font-medium">Belum ada berita yang diterbitkan saat ini.</p>
      </div>
    `;
  }
}

// =============================================================================
// 1. DESKTOP HERO & TERPOPULER (col-span-7 Hero + col-span-5 01-05 Terpopuler)
// =============================================================================
function renderDesktopHeroSection(articles, trendingArticles = []) {
  if (!articles || articles.length === 0) return;

  // 1. Hero Article (Left col-span-7)
  const heroArticle = articles.find(a => a.isHero) || articles[0];
  const heroLink = document.getElementById('desktop-hero-link');
  const heroImg = document.getElementById('desktop-hero-img');
  const heroCat = document.getElementById('desktop-hero-cat');
  const heroTitle = document.getElementById('desktop-hero-title');
  const heroExcerpt = document.getElementById('desktop-hero-excerpt');
  const heroDate = document.getElementById('desktop-hero-date');
  const heroTime = document.getElementById('desktop-hero-time');

  const hLinkUrl = `artikel.html?slug=${encodeURIComponent(heroArticle.slug)}`;
  const hCat = (heroArticle.name_kategori || heroArticle.category || 'DAERAH').toUpperCase();

  if (heroLink) heroLink.href = hLinkUrl;
  if (heroImg) {
    heroImg.src = getThumb(heroArticle.thumbnail || heroArticle.image);
    heroImg.alt = heroArticle.title;
  }
  if (heroCat) heroCat.textContent = hCat;
  if (heroTitle) {
    heroTitle.href = hLinkUrl;
    heroTitle.textContent = heroArticle.title;
  }
  if (heroExcerpt) {
    heroExcerpt.textContent = heroArticle.excerpt || 'Ratusan warga di beberapa gampong di Kabupaten Pidie Jaya masih bertahan di posko pengungsian.';
  }
  if (heroDate) heroDate.textContent = formatDateOnlyIndo(heroArticle.published_at || heroArticle.date);
  if (heroTime) heroTime.textContent = formatTimeIndo(heroArticle.published_at || heroArticle.date || heroArticle.time);

  // 2. Terpopuler Ranked List 01-05 (Right col-span-5)
  const terpopulerContainer = document.getElementById('desktop-terpopuler-list');
  if (terpopulerContainer) {
    const pool = (trendingArticles && trendingArticles.length > 0) ? trendingArticles : articles;
    let popularList = pool.filter(a => a.slug !== heroArticle.slug);
    if (popularList.length < 5) {
      const extra = articles.filter(a => a.slug !== heroArticle.slug && !popularList.some(p => p.slug === a.slug));
      popularList = popularList.concat(extra);
    }
    const top5 = popularList.slice(0, 5);

    let popHtml = '';
    top5.forEach((item, idx) => {
      const rankNum = String(idx + 1).padStart(2, '0');
      const link = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
      const thumb = getThumb(item.thumbnail || item.image);
      const cat = escapeHtml((item.name_kategori || item.category || item.categorySlug || 'BERITA').toUpperCase());
      const date = formatDateOnlyIndo(item.published_at || item.date);
      const time = formatTimeIndo(item.published_at || item.date || item.time);

      popHtml += `
        <article class="flex items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0 group">
          <span class="text-[#E60000] font-extrabold text-2xl sm:text-3xl w-8 text-center shrink-0">${rankNum}</span>
          <a href="${link}" class="w-24 h-16 sm:w-26 sm:h-17 shrink-0 rounded-lg overflow-hidden block bg-slate-100 shadow-2xs">
            <img src="${thumb}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
          </a>
          <div class="flex-1 min-w-0">
            <span class="text-[#E60000] font-bold text-[10.5px] uppercase tracking-wider block mb-0.5">${cat}</span>
            <h3 class="font-bold text-xs lg:text-[12px] text-slate-900 leading-snug line-clamp-2 hover:text-[#E60000] transition-colors mb-1">
              <a href="${link}">${escapeHtml(item.title)}</a>
            </h3>
            <div class="text-[10px] text-slate-400 flex items-center gap-1">
              <svg class="w-2.5 h-2.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>${date} | ${time}</span>
            </div>
          </div>
        </article>
      `;
    });
    if (popHtml) {
      terpopulerContainer.innerHTML = popHtml;
    }
  }
}

// =============================================================================
// 2. DESKTOP BERITA TERBARU (2 Columns of 5 Horizontal Cards = 10 Total)
// =============================================================================
function renderDesktopBeritaTerkini(articles) {
  const feedContainer = document.getElementById('live-berita-terkini-feed');
  if (!feedContainer || !articles || articles.length === 0) return;

  const heroArticle = articles.find(a => a.isHero) || articles[0];
  const list = articles.filter(a => a !== heroArticle).slice(0, 10);
  if (list.length === 0) return;

  const leftCount = Math.ceil(list.length / 2);
  const leftArticles = list.slice(0, leftCount);
  const rightArticles = list.slice(leftCount);

  function createCardHtml(item) {
    const link = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
    const cat = escapeHtml((item.name_kategori || item.category || 'BERITA').toUpperCase());
    const date = formatDateOnlyIndo(item.published_at || item.date);
    const time = formatTimeIndo(item.published_at || item.date || item.time);
    const thumb = getThumb(item.thumbnail || item.image);

    return `
      <article class="flex items-center gap-3.5 group">
        <a href="${link}" class="w-36 sm:w-40 h-22 sm:h-24 shrink-0 rounded-lg overflow-hidden block bg-slate-100 shadow-2xs">
          <img src="${thumb}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
        </a>
        <div class="flex-1 min-w-0">
          <span class="text-[#E60000] font-bold text-[11px] uppercase tracking-wider block mb-1">${cat}</span>
          <h3 class="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-[#E60000] transition-colors mb-1.5">
            <a href="${link}">${escapeHtml(item.title)}</a>
          </h3>
          <div class="text-[11px] text-slate-400 flex items-center gap-1.5">
            <svg class="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>${date} | ${time}</span>
          </div>
        </div>
      </article>
    `;
  }

  feedContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 items-start';
  feedContainer.innerHTML = `
    <div class="space-y-4 flex flex-col" id="berita-terbaru-col-left">
      ${leftArticles.map(createCardHtml).join('')}
    </div>
    <div class="space-y-4 flex flex-col" id="berita-terbaru-col-right">
      ${rightArticles.map(createCardHtml).join('')}
    </div>
  `;
}

// =============================================================================
// 3. DESKTOP BOTTOM SECTION (Editorial, Berita Video, Berita Foto)
// =============================================================================
function renderDesktopBottomSection(articles) {
  if (!articles || articles.length === 0) return;

  // 1. EDITORIAL
  const editorialCard = document.getElementById('desktop-editorial-card');
  if (editorialCard) {
    const editItem = articles.find(a => {
      const cat = (a.name_kategori || a.category || '').toLowerCase();
      return cat.includes('editorial') || cat.includes('opini');
    }) || articles.find(a => a.id === 117) || articles[articles.length - 1];

    if (editItem) {
      const link = `artikel.html?slug=${encodeURIComponent(editItem.slug)}`;
      const thumb = getThumb(editItem.thumbnail || editItem.image);
      const title = cleanMediaTitle(editItem.title);
      const date = formatDateOnlyIndo(editItem.published_at || editItem.date);
      const time = formatTimeIndo(editItem.published_at || editItem.date || editItem.time);

      editorialCard.className = 'bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col justify-between flex-1';
      editorialCard.innerHTML = `
        <div>
          <div class="relative rounded-lg overflow-hidden aspect-video bg-black group cursor-pointer shadow-2xs" onclick="window.location.href='${link}'">
            <img src="${thumb}" alt="${escapeHtml(title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90" onerror="this.src='assets/images/berita/pendidikan/kurikulum-merdeka-smk.jpg'" />
            <div class="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-black/70 backdrop-blur-xs flex items-center justify-center text-amber-300 shadow-md">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </div>
            <span class="absolute bottom-2 left-2 bg-[#E60000] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-xs tracking-wider">TAJUK RENCANA</span>
          </div>
          <h3 class="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 mt-2.5 mb-1 hover:text-[#E60000] transition-colors">
            <a href="${link}">${escapeHtml(title)}</a>
          </h3>
        </div>
        <div>
          <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[10.5px] text-slate-400">
            <span class="flex items-center gap-1">
              <svg class="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>${date} | ${time}</span>
            </span>
          </div>
          <div class="text-right mt-2">
            <a href="${link}" class="text-xs font-bold text-[#E60000] hover:text-red-700 inline-flex items-center gap-1">
              <span>Baca Selengkapnya</span>
              <span>&rarr;</span>
            </a>
          </div>
        </div>
      `;
    }
  }

  // 2. BERITA VIDEO
  const videoCard = document.getElementById('desktop-video-card');
  if (videoCard) {
    const videoItem = articles.find(a => {
      const cat = (a.name_kategori || a.category || '').toLowerCase();
      return cat.includes('video') || a.youtube_id || a.youtube_url;
    }) || articles.find(a => a.id === 46) || {
      title: 'Bupati Tinjau Lokasi Banjir di Meureudu',
      thumbnail: 'assets/images/berita/daerah/revitalisasi-pelabuhan-banyuasin.jpg',
      duration: '02:48',
      slug: 'video-penanganan-cepat-tanggap-banjir-pidie-jaya-dan-bantuan-dapur-umum',
      date: '10 September 2026',
      time: '14:20 WIB',
      author: 'Al Bahri'
    };

    const link = videoItem.slug ? `artikel.html?slug=${encodeURIComponent(videoItem.slug)}` : 'internasional.html?cat=video';
    const thumb = getThumb(videoItem.thumbnail || videoItem.image);
    const title = cleanMediaTitle(videoItem.title);
    const duration = videoItem.duration || videoItem.durasi || '02:48';
    const date = formatDateOnlyIndo(videoItem.published_at || videoItem.date);
    const time = formatTimeIndo(videoItem.published_at || videoItem.date || videoItem.time);

    videoCard.innerHTML = `
      <div>
        <div class="relative rounded-lg overflow-hidden aspect-video bg-black group cursor-pointer shadow-2xs" id="desktop-video-player-trigger">
          <img src="${thumb}" alt="${escapeHtml(title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90" onerror="this.src='assets/images/berita/daerah/revitalisasi-pelabuhan-banyuasin.jpg'" />
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-11 h-11 rounded-full bg-black/70 group-hover:bg-[#E60000] text-white flex items-center justify-center transition-all shadow-md">
              <svg class="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <span class="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">${escapeHtml(duration)}</span>
        </div>
        <h3 class="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 mt-2.5 mb-1 hover:text-[#E60000] transition-colors">
          <a href="${link}">${escapeHtml(title)}</a>
        </h3>
      </div>
      <div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[10.5px] text-slate-400">
          <span class="flex items-center gap-1">
            <svg class="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>${date} | ${time}</span>
          </span>
        </div>
        <div class="text-right mt-2">
          <a href="internasional.html?cat=video" class="text-xs font-bold text-[#E60000] hover:text-red-700 inline-flex items-center gap-1">
            <span>Lihat Semua Video</span>
            <span>&rarr;</span>
          </a>
        </div>
      </div>
    `;

    const videoTrigger = document.getElementById('desktop-video-player-trigger');
    if (videoTrigger) {
      videoTrigger.addEventListener('click', () => {
        openVideoModal({
          title: title,
          url: videoItem.video_url || videoItem.url || videoItem.youtube_url || '',
          thumb: thumb,
          durasi: duration,
          date: date,
          desc: videoItem.excerpt || videoItem.content || `Laporan video eksklusif Japakeh Post mengenai "${title}".`,
          author: videoItem.author || videoItem.author_name || 'Redaksi Japakeh Post',
          slug: videoItem.slug || ''
        });
      });
    }
  }

  // 3. BERITA FOTO
  const fotoCard = document.getElementById('desktop-foto-card');
  if (fotoCard) {
    const fotoItem = articles.find(a => {
      const cat = (a.name_kategori || a.category || '').toLowerCase();
      return cat.includes('foto') || cat.includes('galeri');
    }) || articles.find(a => a.id === 118 || a.id === 48) || {
      title: 'Proses Evakuasi Warga Terdampak Banjir',
      thumbnail: 'assets/images/berita/daerah/festival-budaya-palembang.jpg',
      slug: 'proses-evakuasi-warga-terdampak-banjir',
      date: '09 September 2026',
      time: '16:35 WIB',
      author: 'Pewarta Foto Redaksi'
    };

    const link = fotoItem.slug ? `artikel.html?slug=${encodeURIComponent(fotoItem.slug)}` : 'internasional.html?cat=foto';
    const thumb = getThumb(fotoItem.thumbnail || fotoItem.image);
    const title = cleanMediaTitle(fotoItem.title);
    const date = formatDateOnlyIndo(fotoItem.published_at || fotoItem.date);
    const time = formatTimeIndo(fotoItem.published_at || fotoItem.date || fotoItem.time);

    fotoCard.innerHTML = `
      <div>
        <div class="relative rounded-lg overflow-hidden aspect-video bg-black group cursor-pointer shadow-2xs" id="desktop-foto-player-trigger">
          <img src="${thumb}" alt="${escapeHtml(title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90" onerror="this.src='assets/images/berita/daerah/festival-budaya-palembang.jpg'" />
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-11 h-11 rounded-full bg-black/70 group-hover:bg-[#E60000] text-white flex items-center justify-center transition-all shadow-md">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
          </div>
        </div>
        <h3 class="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 mt-2.5 mb-1 hover:text-[#E60000] transition-colors">
          <a href="${link}">${escapeHtml(title)}</a>
        </h3>
      </div>
      <div>
        <div class="flex items-center justify-between pt-2 border-t border-slate-100 text-[10.5px] text-slate-400">
          <span class="flex items-center gap-1">
            <svg class="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>${date} | ${time}</span>
          </span>
        </div>
        <div class="text-right mt-2">
          <a href="internasional.html?cat=foto" class="text-xs font-bold text-[#E60000] hover:text-red-700 inline-flex items-center gap-1">
            <span>Lihat Semua Foto</span>
            <span>&rarr;</span>
          </a>
        </div>
      </div>
    `;

    const fotoTrigger = document.getElementById('desktop-foto-player-trigger');
    if (fotoTrigger) {
      fotoTrigger.addEventListener('click', () => {
        openFotoModal({
          title: title,
          img: thumb,
          date: date,
          desc: fotoItem.excerpt || fotoItem.content || `Dokumentasi foto eksklusif Japakeh Post: ${title}.`,
          author: fotoItem.author || fotoItem.author_name || 'Pewarta Foto Redaksi',
          slug: fotoItem.slug || ''
        });
      });
    }
  }
}

// =============================================================================
// MOBILE HERO CAROUSEL STATE & LOGIC
// =============================================================================
let heroCarouselSlides = [];
let heroCarouselIndex = 0;
let heroCarouselTimer = null;

function setupMobileHeroCarousel(articles) {
  const heroCard = document.getElementById('home-hero-card');
  if (!heroCard || !articles || articles.length === 0) return;

  let headlineList = articles.filter(a => a.isHero || a.isTrending);
  if (headlineList.length < 5) {
    const fillers = articles.filter(a => !headlineList.includes(a));
    headlineList = [...headlineList, ...fillers];
  }
  heroCarouselSlides = headlineList.slice(0, 5);
  heroCarouselIndex = 0;

  const dotsContainer = document.getElementById('hero-carousel-dots');
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    heroCarouselSlides.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `hero-dot-indicator ${idx === 0 ? 'active' : ''}`;
      dot.setAttribute('aria-label', `Slide ${idx + 1}`);
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        goToHeroSlide(idx);
      });
      dotsContainer.appendChild(dot);
    });
  }

  const prevBtn = document.getElementById('hero-prev-btn');
  const nextBtn = document.getElementById('hero-next-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToHeroSlide((heroCarouselIndex - 1 + heroCarouselSlides.length) % heroCarouselSlides.length);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToHeroSlide((heroCarouselIndex + 1) % heroCarouselSlides.length);
    });
  }

  renderHeroSlide(0);
  startHeroTimer();

  heroCard.addEventListener('mouseenter', stopHeroTimer);
  heroCard.addEventListener('mouseleave', startHeroTimer);
}

function renderHeroSlide(index) {
  if (!heroCarouselSlides || heroCarouselSlides.length === 0) return;
  const item = heroCarouselSlides[index];
  if (!item) return;

  const heroLink = document.getElementById('home-hero-link');
  const heroImg = document.getElementById('home-hero-img');
  const heroCat = document.getElementById('home-hero-category');
  const heroTitle = document.getElementById('home-hero-title');
  const heroExcerpt = document.getElementById('home-hero-excerpt');
  const heroDate = document.getElementById('home-hero-date');

  const linkUrl = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
  const catName = (item.name_kategori || item.category || 'DAERAH').toUpperCase();

  if (heroLink) heroLink.href = linkUrl;
  if (heroImg) {
    heroImg.src = getThumb(item.thumbnail);
    heroImg.alt = item.title;
  }
  if (heroCat) heroCat.textContent = catName;
  if (heroTitle) {
    heroTitle.innerHTML = `<a href="${linkUrl}" class="hover:text-red-200 transition-colors">${escapeHtml(item.title)}</a>`;
  }
  if (heroExcerpt) {
    heroExcerpt.textContent = item.excerpt || 'Baca laporan selengkapnya di portal Japakeh Post.';
  }
  if (heroDate) {
    heroDate.textContent = formatDateOnlyIndo(item.published_at);
  }

  const dots = document.querySelectorAll('#hero-carousel-dots .hero-dot-indicator');
  dots.forEach((d, idx) => {
    d.classList.toggle('active', idx === index);
  });
}

function goToHeroSlide(index) {
  heroCarouselIndex = index;
  renderHeroSlide(heroCarouselIndex);
  startHeroTimer();
}

function startHeroTimer() {
  stopHeroTimer();
  heroCarouselTimer = setInterval(() => {
    if (heroCarouselSlides && heroCarouselSlides.length > 1) {
      heroCarouselIndex = (heroCarouselIndex + 1) % heroCarouselSlides.length;
      renderHeroSlide(heroCarouselIndex);
    }
  }, 5000);
}

function stopHeroTimer() {
  if (heroCarouselTimer) {
    clearInterval(heroCarouselTimer);
    heroCarouselTimer = null;
  }
}

// Mobile Berita Terbaru (Max 5 items)
function renderMobileBeritaTerbaru(articles) {
  const feedContainer = document.getElementById('home-berita-terbaru-grid');
  if (!feedContainer || !articles || articles.length === 0) return;

  feedContainer.innerHTML = '';
  const list = articles.slice(0, 5);

  list.forEach(item => {
    const link = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
    const catName = (item.name_kategori || item.category || 'BERITA').toUpperCase();
    const pubDate = formatDateOnlyIndo(item.published_at);
    const pubTime = formatTimeIndo(item.published_at);

    const art = document.createElement('article');
    art.className = 'flex items-center gap-2.5 sm:gap-3 group py-1';
    art.innerHTML = `
      <a href="${link}" class="w-20 sm:w-24 h-14 sm:h-16 rounded-md overflow-hidden shrink-0 bg-slate-100 block">
        <img src="${getThumb(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
      </a>
      <div class="flex-1 min-w-0">
        <span class="text-[10px] font-bold text-[#E60000] uppercase tracking-wider block mb-0.5">${escapeHtml(catName)}</span>
        <h3 class="font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-[#E60000] leading-snug line-clamp-2 transition-colors">
          <a href="${link}">${escapeHtml(item.title)}</a>
        </h3>
        <div class="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-400 mt-1">
          <svg class="w-2.5 h-2.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>${pubDate} | ${pubTime}</span>
        </div>
      </div>
    `;
    feedContainer.appendChild(art);
  });
}

// Mobile Berita Populer (Max 5 items)
function renderMobileBeritaPopuler(articles) {
  const feedContainer = document.getElementById('home-berita-populer-list');
  if (!feedContainer || !articles || articles.length === 0) return;

  feedContainer.innerHTML = '';
  const list = articles.slice(0, 5);

  list.forEach(item => {
    const link = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
    const catName = (item.name_kategori || item.category || 'POPULER').toUpperCase();
    const pubDate = formatDateOnlyIndo(item.published_at);
    const pubTime = formatTimeIndo(item.published_at);

    const art = document.createElement('article');
    art.className = 'flex items-center gap-2.5 sm:gap-3 group py-1';
    art.innerHTML = `
      <a href="${link}" class="w-20 sm:w-24 h-14 sm:h-16 rounded-md overflow-hidden shrink-0 bg-slate-100 block">
        <img src="${getThumb(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
      </a>
      <div class="flex-1 min-w-0">
        <span class="text-[10px] font-bold text-[#E60000] uppercase tracking-wider block mb-0.5">${escapeHtml(catName)}</span>
        <h3 class="font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-[#E60000] leading-snug line-clamp-2 transition-colors">
          <a href="${link}">${escapeHtml(item.title)}</a>
        </h3>
        <div class="flex items-center gap-1 text-[9px] sm:text-[10px] text-slate-400 mt-1">
          <svg class="w-2.5 h-2.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <span>${pubDate} | ${pubTime}</span>
        </div>
      </div>
    `;
    feedContainer.appendChild(art);
  });
}

// Mobile Rubrik Khusus: Berita Foto, Video & Editorial (3 Card Horizontal dalam 1 Baris dengan Judul Masing-masing Terpisah)
async function renderSpecialCardsSection(articles) {
  const container = document.getElementById('home-foto-video-editorial-grid') || document.getElementById('home-special-cards-grid');
  if (!container) return;

  container.className = 'grid grid-cols-3 gap-2 sm:gap-3 items-stretch';
  container.innerHTML = '';

  // 1. DATA BERITA FOTO
  const photoArticles = (articles || []).filter(a => {
    const cat = String(a.name_kategori || a.category || a.categorySlug || '').toLowerCase();
    return cat.includes('foto') || cat.includes('galeri');
  });

  const photoItem = photoArticles.length > 0 ? photoArticles[0] : {
    title: 'Parade Budaya Nusantara Meriahkan HUT Aceh',
    thumbnail: 'assets/images/berita/daerah/festival-budaya-palembang.jpg',
    category: 'FOTO',
    author: 'Zulkifli M.',
    date: '10 September 2026',
    slug: 'festival-budaya-dan-pawai-adat-di-tanah-rencong',
    excerpt: 'Ratusan peserta menampilkan pakaian tradisional Aceh yang memukau ribuan penonton di sepanjang jalan protokol Banda Aceh.'
  };

  const photoTitle = cleanMediaTitle(photoItem.title || 'Dokumentasi Foto Japakeh');
  const photoThumb = getThumb(photoItem.thumbnail || photoItem.image);
  const photoDate = photoItem.date || formatDateOnlyIndo(photoItem.published_at);
  const photoAuthor = photoItem.author_name || photoItem.author || 'Pewarta Foto';

  // 2. DATA BERITA VIDEO
  let videos = [];
  if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getVideos === 'function') {
    try {
      const res = await window.BuserInfoAPI.getVideos({ status: 'active', limit: 1 });
      if (res && res.videos && res.videos.length > 0) {
        videos = res.videos;
      }
    } catch (e) {
      console.warn('[renderSpecialCardsSection] API getVideos error:', e);
    }
  }

  const videoItem = (videos && videos.length > 0) ? videos[0] : {
    id: 1,
    judul: 'Penerbangan Drone Pantau Kondisi Tanggul Pasca Banjir Surut',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: 'assets/images/berita/daerah/penanganan-banjir-sumatera.jpg',
    durasi: '01:45',
    keterangan: 'Laporan visual udara memetakan titik tanggul dan permukiman warga untuk memastikan percepatan bantuan logistik dan pemulihan infrastruktur.',
    created_at: '2026-09-10 14:00:00'
  };

  const videoTitle = cleanMediaTitle(videoItem.judul || videoItem.title || 'Liputan Berita Video');
  const videoThumb = getThumb(videoItem.thumbnail || videoItem.image);
  const videoDuration = videoItem.durasi || videoItem.duration || '02:00';
  const videoDate = formatDateOnlyIndo(videoItem.created_at || videoItem.published_at);

  // 3. DATA EDITORIAL
  const editorialArticles = (articles || []).filter(a => {
    const cat = String(a.name_kategori || a.category || a.categorySlug || a.kategori_slug || '').toLowerCase().trim();
    return cat === 'editorial' || cat.includes('editorial') || cat.includes('tajuk');
  });

  const editorialItem = editorialArticles.length > 0 ? editorialArticles[0] : {
    title: 'Kebijakan Anggaran Besar Tak Berbanding dengan Dampak',
    thumbnail: 'assets/images/berita/pendidikan/kurikulum-merdeka-smk.jpg',
    category: 'Editorial',
    author: 'Dewan Redaksi',
    date: '10 September 2026',
    slug: 'kebijakan-anggaran-besar-tak-berbanding-dengan-dampak',
    excerpt: 'Sudah saatnya pemerintah dan seluruh pemangku kepentingan memiliki ukuran mekanisme pengelolaan anggaran yang terukur dan akuntabel.'
  };

  const editorialTitle = cleanMediaTitle(editorialItem.title || 'Tajuk Rencana Editorial');
  const editorialThumb = getThumb(editorialItem.thumbnail || editorialItem.image);
  const editorialDate = editorialItem.date || formatDateOnlyIndo(editorialItem.published_at);
  const editorialAuthor = editorialItem.author_name || editorialItem.author || 'Dewan Redaksi';
  const editorialSlug = editorialItem.slug || '';

  // === BANGUN 3 CARD DENGAN JUDUL MASING-MASING TERPISAH & BENTUK PERSEGI PANJANG HORIZONTAL ===

  // A. KOLOM / CARD BERITA FOTO
  const fotoCol = document.createElement('div');
  fotoCol.className = 'flex flex-col h-full';
  fotoCol.innerHTML = `
    <div class="flex items-center gap-1 sm:gap-1.5 pb-1 mb-1">
      <span class="w-1 h-3 sm:h-3.5 bg-[#E60000] rounded-xs inline-block shrink-0"></span>
      <h3 class="text-[9.5px] sm:text-xs font-black uppercase tracking-tight text-slate-900 truncate">
        BERITA FOTO
      </h3>
    </div>
    <article class="bg-white border border-slate-200/90 hover:border-[#E60000]/40 rounded-lg sm:rounded-xl p-1.5 sm:p-2 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between flex-1 group cursor-pointer" role="button" tabindex="0" aria-label="Lihat Foto: ${escapeHtml(photoTitle)}">
      <div>
        <div class="special-media-thumb relative overflow-hidden rounded-md aspect-[16/10] w-full bg-slate-900 shadow-2xs group/thumb">
          <img src="${photoThumb}" alt="${escapeHtml(photoTitle)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
          <div class="absolute top-1 right-1 z-10 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/65 backdrop-blur-xs flex items-center justify-center text-white shadow-xs">
            <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
          </div>
        </div>
        <h4 class="font-bold text-[9.5px] sm:text-[11px] text-slate-900 leading-snug line-clamp-2 mt-1.5 group-hover:text-[#E60000] transition-colors">
          ${escapeHtml(photoTitle)}
        </h4>
      </div>
      <div class="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-400 mt-1 pt-1 border-t border-slate-100">
        <span class="truncate">${escapeHtml(photoAuthor)}</span>
      </div>
    </article>
  `;

  fotoCol.querySelector('article').addEventListener('click', () => {
    openFotoModal({
      title: photoTitle,
      img: photoThumb,
      date: photoDate,
      author: photoAuthor,
      desc: photoItem.content || photoItem.excerpt || photoItem.description || `Dokumentasi jurnalistik foto Japakeh Post meliput peristiwa "${photoTitle}" secara aktual dan berimbang langsung dari lapangan.`,
      slug: photoItem.slug || ''
    });
  });
  container.appendChild(fotoCol);

  // B. KOLOM / CARD BERITA VIDEO
  const videoCol = document.createElement('div');
  videoCol.className = 'flex flex-col h-full';
  videoCol.innerHTML = `
    <div class="flex items-center gap-1 sm:gap-1.5 pb-1 mb-1">
      <span class="w-1 h-3 sm:h-3.5 bg-[#E60000] rounded-xs inline-block shrink-0"></span>
      <h3 class="text-[9.5px] sm:text-xs font-black uppercase tracking-tight text-slate-900 truncate">
        BERITA VIDEO
      </h3>
    </div>
    <article class="bg-white border border-slate-200/90 hover:border-[#E60000]/40 rounded-lg sm:rounded-xl p-1.5 sm:p-2 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between flex-1 group cursor-pointer" role="button" tabindex="0" aria-label="Tonton Video: ${escapeHtml(videoTitle)}">
      <div>
        <div class="special-media-thumb relative overflow-hidden rounded-md aspect-[16/10] w-full bg-slate-900 shadow-2xs group/thumb">
          <img src="${videoThumb}" alt="${escapeHtml(videoTitle)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/70 group-hover:bg-[#E60000] text-white flex items-center justify-center transition-all shadow-md">
              <svg class="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <span class="absolute bottom-1 right-1 bg-black/80 text-white text-[7px] sm:text-[8px] font-mono px-1 py-0.2 rounded font-bold">${escapeHtml(videoDuration)}</span>
        </div>
        <h4 class="font-bold text-[9.5px] sm:text-[11px] text-slate-900 leading-snug line-clamp-2 mt-1.5 group-hover:text-[#E60000] transition-colors">
          ${escapeHtml(videoTitle)}
        </h4>
      </div>
      <div class="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-400 mt-1 pt-1 border-t border-slate-100">
        <span class="truncate">Redaksi Japakeh</span>
      </div>
    </article>
  `;

  videoCol.querySelector('article').addEventListener('click', () => {
    openVideoModal({
      title: videoTitle,
      url: videoItem.video_url || videoItem.url || '',
      thumb: videoThumb,
      durasi: videoDuration,
      date: videoDate,
      desc: videoItem.keterangan || videoItem.description || videoItem.excerpt || `Laporan video jurnalisme Japakeh Post seputar "${videoTitle}". Sajian investigasi dan dokumentasi visual terpercaya untuk masyarakat.`,
      author: videoItem.penulis || 'Redaksi Japakeh Post',
      slug: videoItem.slug || ''
    });
  });
  container.appendChild(videoCol);

  // C. KOLOM / CARD EDITORIAL
  const editorialCol = document.createElement('div');
  editorialCol.className = 'flex flex-col h-full';
  editorialCol.innerHTML = `
    <div class="flex items-center gap-1 sm:gap-1.5 pb-1 mb-1">
      <span class="w-1 h-3 sm:h-3.5 bg-[#E60000] rounded-xs inline-block shrink-0"></span>
      <h3 class="text-[9.5px] sm:text-xs font-black uppercase tracking-tight text-slate-900 truncate">
        EDITORIAL
      </h3>
    </div>
    <article class="bg-white border border-slate-200/90 hover:border-[#E60000]/40 rounded-lg sm:rounded-xl p-1.5 sm:p-2 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between flex-1 group cursor-pointer" role="button" tabindex="0" aria-label="Baca Editorial: ${escapeHtml(editorialTitle)}">
      <div>
        <div class="special-media-thumb relative overflow-hidden rounded-md aspect-[16/10] w-full bg-slate-900 shadow-2xs group/thumb">
          <img src="${editorialThumb}" alt="${escapeHtml(editorialTitle)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
          <div class="absolute top-1 right-1 z-10 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-black/65 backdrop-blur-xs flex items-center justify-center text-amber-300 shadow-xs">
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </div>
        </div>
        <h4 class="font-bold text-[9.5px] sm:text-[11px] text-slate-900 leading-snug line-clamp-2 mt-1.5 group-hover:text-[#E60000] transition-colors">
          ${escapeHtml(editorialTitle)}
        </h4>
      </div>
      <div class="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-400 mt-1 pt-1 border-t border-slate-100">
        <span class="truncate">${escapeHtml(editorialAuthor)}</span>
      </div>
    </article>
  `;

  editorialCol.querySelector('article').addEventListener('click', () => {
    if (editorialSlug) {
      window.location.href = `artikel.html?slug=${encodeURIComponent(editorialSlug)}`;
    } else {
      window.location.href = 'internasional.html?cat=editorial';
    }
  });
  container.appendChild(editorialCol);
}

// Mobile Berita Foto (3 items horizontal compact)
function renderFotoSection(articles) {
  const container = document.getElementById('home-foto-grid');
  if (!container) return;

  const photoArticles = (articles || []).filter(a => {
    const cat = String(a.name_kategori || a.category || '').toLowerCase();
    return cat.includes('foto') || cat.includes('galeri');
  });

  const displayPhotos = photoArticles.length >= 2 
    ? photoArticles.slice(0, 3)
    : [
        {
          title: 'Parade Budaya Nusantara Meriahkan HUT Aceh',
          thumbnail: 'assets/images/berita/daerah/festival-budaya-palembang.jpg',
          category: 'FOTO',
          author: 'Zulkifli M.',
          date: '10 September 2026',
          slug: 'festival-budaya-dan-pawai-adat-di-tanah-rencong',
          excerpt: 'Ratusan peserta menampilkan pakaian tradisional Aceh yang memukau ribuan penonton di sepanjang jalan protokol Banda Aceh.'
        },
        {
          title: 'Antrean Warga Menyeberang Jembatan Darurat Pasca Banjir',
          thumbnail: 'assets/images/berita/daerah/penanganan-banjir-sumatera.jpg',
          category: 'FOTO',
          author: 'Irfan Dani',
          date: '10 September 2026',
          slug: 'banjir-di-pidie-jaya-warga-masih-bertahan-di-posko-pengungsian',
          excerpt: 'Kondisi penyeberangan darurat yang dipadati masyarakat saat arus lalu lintas kembali pulih pasca banjir surut.'
        },
        {
          title: 'Infrastruktur Jalan Tol Sigli-Banda Aceh Rampung',
          thumbnail: 'assets/images/berita/daerah/infrastruktur-lrt-sumsel.jpg',
          category: 'FOTO',
          author: 'M. Nazar',
          date: '10 September 2026',
          slug: 'jalan-penghubung-kecamatan-kembali-dibuka-bertahap',
          excerpt: 'Pemandangan udara jalur konektivitas strategis yang mempercepat distribusi barang dan mobilitas masyarakat Aceh.'
        }
      ];

  container.className = 'grid grid-cols-3 gap-2';
  container.innerHTML = '';

  displayPhotos.forEach((item) => {
    const rawTitle = item.title || 'Dokumentasi Foto Japakeh';
    const title = cleanMediaTitle(rawTitle);
    const thumb = getThumb(item.thumbnail);
    const date = item.date || formatDateOnlyIndo(item.published_at);
    const author = item.author_name || item.author || 'Foto: Redaksi Japakeh';

    const card = document.createElement('article');
    card.className = 'foto-card-item relative overflow-hidden bg-slate-900 group cursor-pointer shadow-2xs hover:shadow-md transition-all duration-300';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Lihat Foto: ${escapeHtml(title)}`);

    card.innerHTML = `
      <img src="${thumb}" alt="${escapeHtml(title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent pointer-events-none"></div>

      <div class="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
        <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6z"/></svg>
      </div>

      <div class="absolute bottom-0 inset-x-0 p-1.5 sm:p-2 z-10 flex flex-col justify-end pointer-events-none">
        <span class="text-[8px] font-black uppercase tracking-wider text-rose-300 mb-0.5">FOTO</span>
        <h3 class="font-bold text-[10px] sm:text-xs text-white leading-tight line-clamp-2 drop-shadow-md group-hover:text-red-200 transition-colors">${escapeHtml(title)}</h3>
        <div class="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-300 mt-0.5">
          <span class="truncate">${escapeHtml(author)}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openFotoModal({
        title: title,
        img: thumb,
        date: date,
        author: author,
        desc: item.content || item.excerpt || item.description || `Dokumentasi jurnalistik foto Japakeh Post meliput peristiwa "${title}" secara aktual dan berimbang langsung dari lapangan.`,
        slug: item.slug || ''
      });
    });

    container.appendChild(card);
  });
}

// Mobile Berita Video (3 items horizontal compact)
async function renderVideoSection(articles) {
  const container = document.getElementById('home-video-grid');
  if (!container) return;

  let videos = [];
  if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getVideos === 'function') {
    try {
      const res = await window.BuserInfoAPI.getVideos({ status: 'active', limit: 6 });
      if (res && res.videos && res.videos.length > 0) {
        videos = res.videos;
      }
    } catch (e) {
      console.warn('[renderVideoSection] API error:', e);
    }
  }

  if (videos.length === 0) {
    videos = [
      {
        id: 1,
        judul: 'Penerbangan Drone Pantau Kondisi Tanggul Pasca Banjir Surut',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail: 'assets/images/berita/daerah/penanganan-banjir-sumatera.jpg',
        durasi: '01:45',
        keterangan: 'Laporan visual udara memetakan titik tanggul dan permukiman warga untuk memastikan percepatan bantuan logistik dan pemulihan infrastruktur.',
        created_at: '2026-09-10 14:00:00'
      },
      {
        id: 2,
        judul: 'Uji Coba Transportasi Publik Modern di Koridor Banda Aceh',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail: 'assets/images/berita/daerah/infrastruktur-lrt-sumsel.jpg',
        durasi: '02:15',
        keterangan: 'Simulasi operasional armada baru yang ramah disabilitas dan terintegrasi sistem tiket digital nontunai.',
        created_at: '2026-09-10 11:30:00'
      },
      {
        id: 3,
        judul: 'Karnaval Budaya Tradisional Pesisir Meriahkan Hari Jadi Daerah',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail: 'assets/images/berita/daerah/festival-budaya-palembang.jpg',
        durasi: '03:10',
        keterangan: 'Dokumentasi eksklusif pawai budaya daerah yang memadukan keindahan busana adat, tarian tradisional, dan antusiasme ribuan penonton.',
        created_at: '2026-09-10 09:15:00'
      }
    ];
  }

  const displayVideos = videos.slice(0, 3);
  container.className = 'grid grid-cols-3 gap-2';
  container.innerHTML = '';

  displayVideos.forEach((v) => {
    const rawTitle = v.judul || v.title || 'Liputan Berita Video';
    const title = cleanMediaTitle(rawTitle);
    const thumb = getThumb(v.thumbnail);
    const duration = v.durasi || v.duration || '02:00';
    const date = formatDateOnlyIndo(v.created_at);

    const card = document.createElement('article');
    card.className = 'video-card-item relative overflow-hidden bg-slate-900 group cursor-pointer shadow-2xs hover:shadow-md transition-all duration-300';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Tonton Video: ${escapeHtml(title)}`);

    card.innerHTML = `
      <img src="${thumb}" alt="${escapeHtml(title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent pointer-events-none"></div>

      <div class="absolute top-1.5 right-1.5 z-10">
        <span class="bg-black/75 backdrop-blur-xs text-white text-[8px] sm:text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">${escapeHtml(duration)}</span>
      </div>

      <div class="absolute bottom-0 inset-x-0 p-1.5 sm:p-2 z-10 flex flex-col justify-end pointer-events-none">
        <span class="text-[8px] font-black uppercase tracking-wider text-rose-300 mb-0.5">VIDEO</span>
        <h3 class="font-bold text-[10px] sm:text-xs text-white leading-tight line-clamp-2 drop-shadow-md group-hover:text-red-200 transition-colors">${escapeHtml(title)}</h3>
        <div class="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-300 mt-0.5">
          <span class="truncate">Redaksi Japakeh</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openVideoModal({
        title: title,
        url: v.video_url || v.url || '',
        thumb: thumb,
        durasi: duration,
        date: date,
        desc: v.keterangan || v.description || v.excerpt || `Laporan video jurnalisme Japakeh Post seputar "${title}". Sajian investigasi dan dokumentasi visual terpercaya untuk masyarakat.`,
        author: v.penulis || 'Redaksi Japakeh Post',
        slug: v.slug || ''
      });
    });

    container.appendChild(card);
  });
}

// =============================================================================
// 4. MODALS LOGIC (Foto & Video Interactive Player & Tall Architecture)
// =============================================================================
function setupModals() {
  const closeVideoBtn = document.getElementById('close-video-modal-btn');
  const videoBackdrop = document.getElementById('video-modal-backdrop');
  if (closeVideoBtn) closeVideoBtn.addEventListener('click', closeVideoModal);
  if (videoBackdrop) videoBackdrop.addEventListener('click', closeVideoModal);

  const closeFotoBtn = document.getElementById('close-foto-modal-btn');
  const fotoBackdrop = document.getElementById('foto-modal-backdrop');
  if (closeFotoBtn) closeFotoBtn.addEventListener('click', closeFotoModal);
  if (fotoBackdrop) fotoBackdrop.addEventListener('click', closeFotoModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeVideoModal();
      closeFotoModal();
    }
  });
}

function openVideoModal(item) {
  const modal = document.getElementById('video-modal');
  if (!modal) return;

  const playerContainer = document.getElementById('video-modal-player-container');
  const titleEl = document.getElementById('video-modal-title');
  const dateEl = document.getElementById('video-modal-date');
  const descEl = document.getElementById('video-modal-desc');
  const authorEl = document.getElementById('video-modal-author');
  const linkEl = document.getElementById('video-modal-link');

  if (titleEl) titleEl.textContent = item.title;
  if (dateEl) dateEl.textContent = item.date;
  if (authorEl) authorEl.textContent = item.author;

  if (descEl) {
    const p1 = item.desc;
    const p2 = 'Liputan visual ini dihimpun secara langsung oleh tim redaksi Japakeh Post di lokasi peristiwa guna menghadirkan perspektif mendalam, akurat, dan dapat dipertanggungjawabkan sesuai kaidah jurnalistik.';
    descEl.innerHTML = `<p>${escapeHtml(p1)}</p><p class="text-slate-400 pt-1">${p2}</p>`;
  }

  if (linkEl) {
    if (item.slug) {
      linkEl.href = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
      linkEl.style.display = 'inline-flex';
    } else {
      linkEl.href = 'internasional.html?cat=video';
      linkEl.style.display = 'inline-flex';
    }
  }

  if (playerContainer) {
    playerContainer.innerHTML = '';
    const ytId = extractYouTubeId(item.url);
    if (ytId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`;
      iframe.title = item.title;
      iframe.className = 'w-full h-full';
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('allowfullscreen', 'true');
      playerContainer.appendChild(iframe);
    } else if (item.url && item.url.match(/\.(mp4|webm|ogg)$/i)) {
      const videoEl = document.createElement('video');
      videoEl.src = item.url;
      videoEl.poster = item.thumb;
      videoEl.controls = true;
      videoEl.autoplay = true;
      videoEl.className = 'w-full h-full object-contain';
      playerContainer.appendChild(videoEl);
    } else {
      renderInteractiveVideoPlayer(playerContainer, item.thumb, item.title);
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function renderInteractiveVideoPlayer(container, thumb, title) {
  container.innerHTML = `
    <div class="relative w-full h-full bg-slate-950 flex items-center justify-center group overflow-hidden">
      <img src="${thumb}" alt="${escapeHtml(title)}" class="w-full h-full object-contain opacity-80" />
      <div class="absolute inset-0 bg-black/40 backdrop-blur-2xs flex flex-col items-center justify-center p-4 text-center">
        <div class="w-14 h-14 rounded-full bg-[#E60000] text-white flex items-center justify-center shadow-2xl mb-3 animate-pulse">
          <svg class="w-6 h-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <p class="text-sm font-bold text-white max-w-md">${escapeHtml(title)}</p>
        <span class="text-xs text-rose-300 mt-1 font-semibold">Video Sedang Diputar (Simulasi Player)</span>
      </div>
    </div>
  `;
}

function closeVideoModal() {
  const modal = document.getElementById('video-modal');
  if (!modal) return;

  const playerContainer = document.getElementById('video-modal-player-container');
  if (playerContainer) playerContainer.innerHTML = '';

  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
}

function openFotoModal(item) {
  const modal = document.getElementById('foto-modal');
  if (!modal) return;

  const imgEl = document.getElementById('foto-modal-img');
  const titleEl = document.getElementById('foto-modal-title');
  const dateEl = document.getElementById('foto-modal-date');
  const descEl = document.getElementById('foto-modal-desc');
  const authorEl = document.getElementById('foto-modal-author');
  const linkEl = document.getElementById('foto-modal-link');

  if (imgEl) {
    imgEl.src = item.img;
    imgEl.alt = item.title;
  }
  if (titleEl) titleEl.textContent = item.title;
  if (dateEl) dateEl.textContent = item.date;
  if (authorEl) authorEl.textContent = item.author;

  if (descEl) {
    const p1 = item.desc;
    const p2 = 'Dokumentasi foto ini diliput oleh pewarta foto Japakeh Post dengan standar ketat integritas visual jurnalistik tanpa manipulasi konten peristiwa.';
    descEl.innerHTML = `<p>${escapeHtml(p1)}</p><p class="text-slate-400 pt-1">${p2}</p>`;
  }

  if (linkEl) {
    if (item.slug) {
      linkEl.href = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
      linkEl.style.display = 'inline-flex';
    } else {
      linkEl.href = 'internasional.html?cat=foto';
      linkEl.style.display = 'inline-flex';
    }
  }

  modal.classList.remove('hidden');
  modal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeFotoModal() {
  const modal = document.getElementById('foto-modal');
  if (!modal) return;

  modal.classList.add('hidden');
  modal.classList.remove('flex');
  document.body.style.overflow = '';
}
