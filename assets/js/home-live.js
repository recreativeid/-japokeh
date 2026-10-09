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

    if (articles.length === 0) {
      await showEmptyState();
      return;
    }

    // Sort popular articles by views / score for Trending & Populer sections
    const trendingArticles = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0));

    // 1. BREAKING NEWS TICKER (Moving ticker based on Berita Terpopuler)
    renderTicker(trendingArticles);

    // =========================================================================
    // A. DESKTOP LIVE RENDERING (Strictly Matching UI DESKTOP.jpeg)
    // =========================================================================
    renderDesktopHeroSection(articles, trendingArticles);
    renderDesktopBeritaTerkini(articles);
    await renderDesktopBottomSection(articles);

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
    await showEmptyState();
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
// BREAKING NEWS TICKER (Smooth Infinite Moving Marquee based on Berita Terpopuler)
// =============================================================================
let tickerAnimId = null;
let tickerOffset = 0;
let isTickerPaused = false;
let isTickerDragging = false;
let tickerStartX = 0;
let tickerDragStartOffset = 0;
let tickerHalfWidth = 0;
const TICKER_SPEED = 0.85; // Pixels per frame (~50px/sec, comfortable reading speed)

function renderTicker(articles) {
  const track = document.getElementById('breaking-ticker-track');
  const nextBtn = document.getElementById('ticker-next-btn');
  if (!track || !articles || articles.length === 0) return;

  // Ensure articles are sorted by views (highest views first = Berita Terpopuler)
  const popularArticles = [...articles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  if (popularArticles.length === 0) return;

  // Build items HTML
  function buildItemHtml(item, rank) {
    const cat = escapeHtml(item.name_kategori || item.category || 'Terkini');
    const title = escapeHtml(item.title);
    const slug = encodeURIComponent(item.slug || '');
    return `
      <a href="artikel.html?slug=${slug}" class="ticker-item inline-flex items-center text-xs sm:text-[13px] font-semibold text-slate-800 hover:text-[#E60000] mr-6 sm:mr-8 transition-colors group shrink-0 select-none py-0.5">
        <span class="inline-flex items-center justify-center bg-red-50 text-[#E60000] border border-red-200/80 text-[10px] font-extrabold px-1.5 py-0.5 rounded mr-2 uppercase tracking-wider group-hover:bg-[#E60000] group-hover:text-white transition-colors">
          #${rank} Populer
        </span>
        <span class="text-slate-500 text-[11px] font-bold mr-1.5 uppercase">[${cat}]</span>
        <span class="group-hover:text-[#E60000] group-hover:underline text-slate-900">${title}</span>
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-slate-300 ml-6 sm:ml-8 shrink-0"></span>
      </a>
    `;
  }

  // Multi-repeat to guarantee seamless infinite loop
  const repeats = popularArticles.length <= 3 ? 4 : 2;
  let singleSetHtml = '';
  popularArticles.forEach((item, idx) => {
    singleSetHtml += buildItemHtml(item, idx + 1);
  });

  let fullHtml = '';
  for (let r = 0; r < repeats; r++) {
    fullHtml += singleSetHtml;
  }

  track.innerHTML = fullHtml;
  track.style.animation = 'none'; // Disable CSS keyframe to avoid conflict with requestAnimationFrame
  track.style.opacity = '1';

  // Calculate halfWidth for infinite seamless loop
  function updateTickerWidth() {
    if (track) {
      tickerHalfWidth = track.scrollWidth / repeats;
    }
  }

  // Initial calculation + update after brief delay for webfonts rendering
  updateTickerWidth();
  setTimeout(updateTickerWidth, 300);
  window.addEventListener('resize', updateTickerWidth);

  // Animation Loop (requestAnimationFrame for 60fps/120fps hardware-accelerated movement)
  if (tickerAnimId) cancelAnimationFrame(tickerAnimId);

  function tickerStep() {
    if (!isTickerPaused && !isTickerDragging && tickerHalfWidth > 0) {
      tickerOffset += TICKER_SPEED;
      if (tickerOffset >= tickerHalfWidth) {
        tickerOffset -= tickerHalfWidth;
      }
      track.style.transform = `translate3d(-${tickerOffset.toFixed(2)}px, 0, 0)`;
    }
    tickerAnimId = requestAnimationFrame(tickerStep);
  }
  tickerAnimId = requestAnimationFrame(tickerStep);

  // Pause on mouse hover so user can comfortably read and click
  const wrapper = track.closest('.ticker-wrapper') || track.parentElement;
  if (wrapper && !wrapper.dataset.tickerHoverBound) {
    wrapper.dataset.tickerHoverBound = 'true';
    wrapper.addEventListener('mouseenter', () => { isTickerPaused = true; });
    wrapper.addEventListener('mouseleave', () => { if (!isTickerDragging) isTickerPaused = false; });

    // Touch support for mobile devices
    wrapper.addEventListener('touchstart', (e) => {
      isTickerPaused = true;
      isTickerDragging = true;
      tickerStartX = e.touches[0].clientX;
      tickerDragStartOffset = tickerOffset;
    }, { passive: true });

    wrapper.addEventListener('touchmove', (e) => {
      if (!isTickerDragging) return;
      const currentX = e.touches[0].clientX;
      const diff = tickerStartX - currentX;
      tickerOffset = tickerDragStartOffset + diff;
      if (tickerOffset < 0) tickerOffset += tickerHalfWidth;
      if (tickerOffset >= tickerHalfWidth) tickerOffset -= tickerHalfWidth;
      track.style.transform = `translate3d(-${tickerOffset.toFixed(2)}px, 0, 0)`;
    }, { passive: true });

    wrapper.addEventListener('touchend', () => {
      isTickerDragging = false;
      isTickerPaused = false;
    });
  }

  // Next button click: Smoothly advance forward to next popular headline
  if (nextBtn && !nextBtn.dataset.tickerBound) {
    nextBtn.dataset.tickerBound = 'true';
    nextBtn.addEventListener('click', () => {
      tickerOffset += 280;
      if (tickerOffset >= tickerHalfWidth) tickerOffset -= tickerHalfWidth;
      track.style.transform = `translate3d(-${tickerOffset.toFixed(2)}px, 0, 0)`;
    });
  }

  // Page visibility: Pause when switching tabs to save battery and CPU
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isTickerPaused = true;
    } else {
      isTickerPaused = false;
    }
  });
}

// Empty state fallback ketika artikel di database kosong
async function showEmptyState() {
  // 1. Sembunyikan Running Ticker
  const tickerContainer = document.getElementById('breaking-news-container');
  if (tickerContainer) tickerContainer.style.display = 'none';

  // 2. Sembunyikan Desktop Hero & Terpopuler (col-span-7 dan col-span-5)
  const desktopHero = document.getElementById('desktop-hero-section');
  if (desktopHero) desktopHero.style.display = 'none';

  // 3. Render Empty State pada Desktop Berita Terbaru Section
  const desktopTerbaru = document.getElementById('desktop-berita-terbaru-section');
  if (desktopTerbaru) {
    desktopTerbaru.innerHTML = `
      <div class="col-span-full py-16 px-6 text-center bg-white border border-slate-200 rounded-2xl shadow-soft my-4">
        <div class="w-16 h-16 bg-rose-50 text-[#E60000] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <h2 class="text-xl sm:text-2xl font-black text-slate-900 mb-2">Belum Ada Berita yang Dipublikasikan</h2>
        <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
          Saat ini belum ada berita atau artikel yang diterbitkan oleh redaksi Japakeh Post. Silakan kembali lagi nanti untuk membaca liputan peristiwa terkini.
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <a href="internasional.html?cat=video" class="inline-flex items-center px-5 py-2.5 bg-[#E60000] hover:bg-red-700 text-white text-xs font-bold rounded-full transition-colors shadow-xs">
            Lihat Tayangan Video Redaksi &rarr;
          </a>
        </div>
      </div>
    `;
  }

  // 4. Desktop Bottom Section: Editorial & Foto disembunyikan jika kosong, tapi Video memuat dari DB jika ada
  const editorialCard = document.getElementById('desktop-editorial-card');
  if (editorialCard && editorialCard.parentElement) {
    editorialCard.parentElement.style.display = 'none';
  }
  const fotoCard = document.getElementById('desktop-foto-card');
  if (fotoCard && fotoCard.parentElement) {
    fotoCard.parentElement.style.display = 'none';
  }

  let liveVideos = [];
  if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getVideos === 'function') {
    try {
      const res = await window.BuserInfoAPI.getVideos({ status: 'active', limit: 1 });
      if (res && Array.isArray(res.videos) && res.videos.length > 0) {
        liveVideos = res.videos;
      }
    } catch (e) {}
  }
  const videoCard = document.getElementById('desktop-video-card');
  if (videoCard) {
    if (liveVideos.length > 0) {
      renderDesktopSingleVideo(liveVideos[0]);
    } else if (videoCard.parentElement) {
      videoCard.parentElement.style.display = 'none';
    }
  }

  // 5. Mobile Sections: Sembunyikan carousel, populer, dan tampilkan empty state di terbaru
  const mobileHero = document.getElementById('mobile-hero-container');
  if (mobileHero) mobileHero.style.display = 'none';

  const mobilePopuler = document.getElementById('mobile-populer-container');
  if (mobilePopuler) mobilePopuler.style.display = 'none';

  const mobileTerbaru = document.getElementById('mobile-terbaru-container');
  if (mobileTerbaru) {
    mobileTerbaru.innerHTML = `
      <div class="py-12 px-4 text-center bg-white border border-slate-200 rounded-2xl shadow-soft my-2">
        <div class="w-12 h-12 bg-rose-50 text-[#E60000] rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <h3 class="text-base font-black text-slate-900 mb-1.5">Belum Ada Berita</h3>
        <p class="text-xs text-slate-500 max-w-xs mx-auto mb-4 leading-relaxed">
          Saat ini redaksi belum mempublikasikan berita terbaru di portal Japakeh Post.
        </p>
        <a href="internasional.html?cat=video" class="inline-flex items-center px-4 py-2 bg-[#E60000] text-white text-xs font-bold rounded-full transition-colors shadow-xs">
          Lihat Kanal Video &rarr;
        </a>
      </div>
    `;
  }

  const specialGrid = document.getElementById('home-foto-video-editorial-grid') || document.getElementById('home-special-cards-grid');
  if (specialGrid) {
    const parentSection = specialGrid.closest('section');
    if (parentSection) parentSection.style.display = 'none';
  }

  const mobileFotoSec = document.getElementById('home-foto-section') || document.querySelector('#mobile-home-container section:has(#home-foto-grid)');
  if (mobileFotoSec) mobileFotoSec.style.display = 'none';

  try {
    await renderVideoSection([]);
  } catch (e) {}

  try {
    setupModals();
  } catch (e) {}
}

// Render 1 video untuk Desktop Video Card dari data aktif API
function renderDesktopSingleVideo(v) {
  const videoCard = document.getElementById('desktop-video-card');
  if (!videoCard) return;
  if (videoCard.parentElement) videoCard.parentElement.style.display = '';

  const thumb = v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`;
  const title = cleanMediaTitle(v.title);
  const duration = v.durasi || '02:00';
  const date = formatDateOnlyIndo(v.created_at);
  const time = formatTimeIndo(v.created_at);

  videoCard.innerHTML = `
    <div>
      <div class="relative rounded-lg overflow-hidden aspect-video bg-black group cursor-pointer shadow-2xs" id="desktop-video-player-trigger">
        <img src="${thumb}" alt="${escapeHtml(title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90" />
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-11 h-11 rounded-full bg-black/70 group-hover:bg-[#E60000] text-white flex items-center justify-center transition-all shadow-md">
            <svg class="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <span class="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">${escapeHtml(duration)}</span>
      </div>
      <h3 class="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 mt-2.5 mb-1 hover:text-[#E60000] transition-colors">
        <a href="internasional.html?cat=video">${escapeHtml(title)}</a>
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
        url: v.watch_url || `https://www.youtube.com/watch?v=${v.youtube_id}`,
        thumb: thumb,
        durasi: duration,
        date: date,
        desc: v.caption || `Laporan video eksklusif Japakeh Post mengenai "${title}".`,
        author: 'Redaksi Japakeh Post',
        slug: ''
      });
    });
  }
}

// =============================================================================
// 1. DESKTOP HERO & TERPOPULER (col-span-7 Hero + col-span-5 01-05 Terpopuler)
// =============================================================================
function renderDesktopHeroSection(articles, trendingArticles = []) {
  if (!articles || articles.length === 0) return;

  const desktopHero = document.getElementById('desktop-hero-section');
  if (desktopHero) desktopHero.style.display = '';

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
    heroExcerpt.textContent = heroArticle.excerpt || '';
  }
  if (heroDate) heroDate.textContent = formatDateOnlyIndo(heroArticle.published_at || heroArticle.date);
  if (heroTime) heroTime.textContent = formatTimeIndo(heroArticle.published_at || heroArticle.date || heroArticle.time);

  // 2. Terpopuler Ranked List 01-05 (Right col-span-5)
  const terpopulerContainer = document.getElementById('desktop-terpopuler-list');
  if (terpopulerContainer) {
    const pool = (trendingArticles && trendingArticles.length > 0) ? trendingArticles : articles;
    let popularList = pool.filter(a => a.slug !== heroArticle.slug);
    if (popularList.length === 0 && articles.length > 0) {
      popularList = [heroArticle];
    } else if (popularList.length < 5) {
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
    } else {
      terpopulerContainer.innerHTML = '<p class="text-xs text-slate-400 py-4 text-center">Belum ada berita terpopuler</p>';
    }
  }
}

// =============================================================================
// 2. DESKTOP BERITA TERBARU (2 Columns of 5 Horizontal Cards = 10 Total)
// =============================================================================
function renderDesktopBeritaTerkini(articles) {
  const feedContainer = document.getElementById('live-berita-terkini-feed');
  const sectionEl = document.getElementById('desktop-berita-terbaru-section');
  if (!feedContainer || !articles || articles.length === 0) return;

  const heroArticle = articles.find(a => a.isHero) || articles[0];
  const list = articles.filter(a => a.slug !== heroArticle.slug).slice(0, 10);
  if (list.length === 0) {
    if (sectionEl) sectionEl.style.display = 'none';
    return;
  }
  if (sectionEl) sectionEl.style.display = '';

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
async function renderDesktopBottomSection(articles) {
  if (!articles || articles.length === 0) return;

  // 1. EDITORIAL
  const editorialCard = document.getElementById('desktop-editorial-card');
  if (editorialCard) {
    const editItem = articles.find(a => {
      const cat = (a.name_kategori || a.category || '').toLowerCase();
      return cat.includes('editorial') || cat.includes('opini');
    });

    if (editItem) {
      if (editorialCard.parentElement) editorialCard.parentElement.style.display = '';
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
    } else if (editorialCard.parentElement) {
      editorialCard.parentElement.style.display = 'none';
    }
  }

  // 2. BERITA VIDEO (Murni dari Database Video atau Artikel Kategori Video)
  const videoCard = document.getElementById('desktop-video-card');
  if (videoCard) {
    let videoItem = null;

    if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getVideos === 'function') {
      try {
        const res = await window.BuserInfoAPI.getVideos({ status: 'active', limit: 1 });
        if (res && Array.isArray(res.videos) && res.videos.length > 0) {
          const v = res.videos[0];
          videoItem = {
            title: cleanMediaTitle(v.title),
            thumbnail: v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`,
            duration: v.durasi || '02:00',
            url: v.watch_url || `https://www.youtube.com/watch?v=${v.youtube_id}`,
            date: formatDateOnlyIndo(v.created_at),
            time: formatTimeIndo(v.created_at),
            author: 'Redaksi Japakeh Post',
            desc: v.caption || `Laporan video eksklusif Japakeh Post: "${v.title}".`,
            slug: ''
          };
        }
      } catch (e) {
        console.warn('[renderDesktopBottomSection] Error fetching video:', e);
      }
    }

    if (!videoItem) {
      const artVideo = articles.find(a => {
        const cat = (a.name_kategori || a.category || '').toLowerCase();
        return cat.includes('video') || a.youtube_id || a.youtube_url;
      });
      if (artVideo) {
        videoItem = {
          title: cleanMediaTitle(artVideo.title),
          thumbnail: getThumb(artVideo.thumbnail || artVideo.image),
          duration: artVideo.duration || artVideo.durasi || '02:00',
          url: artVideo.video_url || artVideo.url || artVideo.youtube_url || '',
          date: formatDateOnlyIndo(artVideo.published_at || artVideo.date),
          time: formatTimeIndo(artVideo.published_at || artVideo.date || artVideo.time),
          author: artVideo.author || 'Redaksi Japakeh Post',
          desc: artVideo.excerpt || artVideo.content || '',
          slug: artVideo.slug || ''
        };
      }
    }

    if (videoItem) {
      if (videoCard.parentElement) videoCard.parentElement.style.display = '';
      const link = videoItem.slug ? `artikel.html?slug=${encodeURIComponent(videoItem.slug)}` : 'internasional.html?cat=video';
      const thumb = videoItem.thumbnail;
      const title = videoItem.title;
      const duration = videoItem.duration;
      const date = videoItem.date;
      const time = videoItem.time;

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
            url: videoItem.url,
            thumb: thumb,
            durasi: duration,
            date: date,
            desc: videoItem.desc,
            author: videoItem.author,
            slug: videoItem.slug
          });
        });
      }
    } else if (videoCard.parentElement) {
      videoCard.parentElement.style.display = 'none';
    }
  }

  // 3. BERITA FOTO (Murni dari Database Artikel Kategori Foto)
  const fotoCard = document.getElementById('desktop-foto-card');
  if (fotoCard) {
    const fotoItem = articles.find(a => {
      const cat = (a.name_kategori || a.category || '').toLowerCase();
      return cat.includes('foto') || cat.includes('galeri');
    });

    if (fotoItem) {
      if (fotoCard.parentElement) fotoCard.parentElement.style.display = '';
      const link = `artikel.html?slug=${encodeURIComponent(fotoItem.slug)}`;
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
                <svg class="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
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
    } else if (fotoCard.parentElement) {
      fotoCard.parentElement.style.display = 'none';
    }
  }

  // 4. Periksa apakah ada kartu media bawah yang tampil
  const bottomSec = document.getElementById('desktop-bottom-media-section');
  if (bottomSec) {
    const editVisible = editorialCard && editorialCard.parentElement && editorialCard.parentElement.style.display !== 'none';
    const vidVisible = videoCard && videoCard.parentElement && videoCard.parentElement.style.display !== 'none';
    const fotoVisible = fotoCard && fotoCard.parentElement && fotoCard.parentElement.style.display !== 'none';
    const totalVisible = (editVisible ? 1 : 0) + (vidVisible ? 1 : 0) + (fotoVisible ? 1 : 0);

    if (totalVisible === 0) {
      bottomSec.style.display = 'none';
    } else {
      bottomSec.style.display = '';
      if (totalVisible === 1) {
        bottomSec.className = 'grid grid-cols-1 md:grid-cols-1 gap-6 items-stretch pt-2 max-w-md';
      } else if (totalVisible === 2) {
        bottomSec.className = 'grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch pt-2';
      } else {
        bottomSec.className = 'grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-2';
      }
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

// Mobile Rubrik Khusus: Berita Foto, Video & Editorial
async function renderSpecialCardsSection(articles) {
  const container = document.getElementById('home-foto-video-editorial-grid') || document.getElementById('home-special-cards-grid');
  if (!container) return;

  const sectionEl = container.closest('section');

  // 1. DATA BERITA FOTO (dari database)
  const photoArticles = (articles || []).filter(a => {
    const cat = String(a.name_kategori || a.category || a.categorySlug || '').toLowerCase();
    return cat.includes('foto') || cat.includes('galeri');
  });
  const photoItem = photoArticles.length > 0 ? photoArticles[0] : null;

  // 2. DATA BERITA VIDEO (dari database video)
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
  const videoItem = (videos && videos.length > 0) ? videos[0] : null;

  // 3. DATA EDITORIAL (dari database artikel)
  const editorialArticles = (articles || []).filter(a => {
    const cat = String(a.name_kategori || a.category || a.categorySlug || a.kategori_slug || '').toLowerCase().trim();
    return cat === 'editorial' || cat.includes('editorial') || cat.includes('tajuk');
  });
  const editorialItem = editorialArticles.length > 0 ? editorialArticles[0] : null;

  if (!photoItem && !videoItem && !editorialItem) {
    if (sectionEl) sectionEl.style.display = 'none';
    container.innerHTML = '';
    return;
  }
  if (sectionEl) sectionEl.style.display = '';

  const activeCols = (photoItem ? 1 : 0) + (videoItem ? 1 : 0) + (editorialItem ? 1 : 0);
  container.className = `grid grid-cols-1 sm:grid-cols-${activeCols} gap-2 sm:gap-3 items-stretch`;
  container.innerHTML = '';

  // A. Render Foto jika ada di database
  if (photoItem) {
    const photoTitle = cleanMediaTitle(photoItem.title || 'Dokumentasi Foto');
    const photoThumb = getThumb(photoItem.thumbnail || photoItem.image);
    const photoDate = photoItem.date || formatDateOnlyIndo(photoItem.published_at);
    const photoAuthor = photoItem.author_name || photoItem.author || 'Pewarta Foto';

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
        desc: photoItem.content || photoItem.excerpt || photoItem.description || `Dokumentasi foto eksklusif Japakeh Post: ${photoTitle}.`,
        slug: photoItem.slug || ''
      });
    });
    container.appendChild(fotoCol);
  }

  // B. Render Video jika ada di database
  if (videoItem) {
    const videoTitle = cleanMediaTitle(videoItem.judul || videoItem.title || 'Liputan Berita Video');
    const videoThumb = getThumb(videoItem.thumbnail || videoItem.thumbnail_url || (videoItem.youtube_id ? `https://img.youtube.com/vi/${videoItem.youtube_id}/hqdefault.jpg` : ''));
    const videoDuration = videoItem.durasi || videoItem.duration || '02:00';
    const videoDate = formatDateOnlyIndo(videoItem.created_at || videoItem.published_at);
    const videoUrl = videoItem.video_url || videoItem.watch_url || (videoItem.youtube_id ? `https://www.youtube.com/watch?v=${videoItem.youtube_id}` : '');

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
        url: videoUrl,
        thumb: videoThumb,
        durasi: videoDuration,
        date: videoDate,
        desc: videoItem.keterangan || videoItem.caption || videoItem.excerpt || `Laporan video eksklusif Japakeh Post mengenai "${videoTitle}".`,
        author: videoItem.penulis || 'Redaksi Japakeh Post',
        slug: videoItem.slug || ''
      });
    });
    container.appendChild(videoCol);
  }

  // C. Render Editorial jika ada di database
  if (editorialItem) {
    const editorialTitle = cleanMediaTitle(editorialItem.title || 'Tajuk Rencana Editorial');
    const editorialThumb = getThumb(editorialItem.thumbnail || editorialItem.image);
    const editorialDate = editorialItem.date || formatDateOnlyIndo(editorialItem.published_at);
    const editorialAuthor = editorialItem.author_name || editorialItem.author || 'Dewan Redaksi';
    const editorialSlug = editorialItem.slug || '';

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
}

// Mobile Berita Foto (3 items horizontal compact)
function renderFotoSection(articles) {
  const container = document.getElementById('home-foto-grid');
  if (!container) return;

  const sectionEl = document.getElementById('home-foto-section') || container.closest('section');

  const photoArticles = (articles || []).filter(a => {
    const cat = String(a.name_kategori || a.category || '').toLowerCase();
    return cat.includes('foto') || cat.includes('galeri');
  });

  if (photoArticles.length === 0) {
    if (sectionEl) sectionEl.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  if (sectionEl) sectionEl.style.display = '';
  const displayPhotos = photoArticles.slice(0, 3);
  container.className = `grid grid-cols-${displayPhotos.length} gap-2`;
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

  const sectionEl = document.getElementById('home-video-section') || container.closest('section');

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
    if (sectionEl) sectionEl.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  if (sectionEl) sectionEl.style.display = '';
  const displayVideos = videos.slice(0, 3);
  container.className = `grid grid-cols-${displayVideos.length} gap-2`;
  container.innerHTML = '';

  displayVideos.forEach((v) => {
    const rawTitle = v.judul || v.title || 'Liputan Berita Video';
    const title = cleanMediaTitle(rawTitle);
    const thumb = getThumb(v.thumbnail || v.thumbnail_url || (v.youtube_id ? `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg` : ''));
    const duration = v.durasi || v.duration || '02:00';
    const date = formatDateOnlyIndo(v.created_at || v.published_at);

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
        url: v.video_url || v.watch_url || (v.youtube_id ? `https://www.youtube.com/watch?v=${v.youtube_id}` : ''),
        thumb: thumb,
        durasi: duration,
        date: date,
        desc: v.keterangan || v.caption || v.description || v.excerpt || `Laporan video jurnalisme Japakeh Post seputar "${title}". Sajian investigasi dan dokumentasi visual terpercaya untuk masyarakat.`,
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
