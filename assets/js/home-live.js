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
    // A. DESKTOP LIVE RENDERING (Pre-session 100% desktop fidelity)
    // =========================================================================
    renderDesktopHeroSection(articles, trendingArticles);
    renderDesktopBeritaTerkini(articles);
    renderDesktopTrending(trendingArticles);
    await renderDesktopCategorySections(articles);

    // =========================================================================
    // B. MOBILE LIVE RENDERING (Approved mobile-first revisions)
    // =========================================================================
    try { setupMobileHeroCarousel(articles); } catch (e) { console.error('[setupMobileHeroCarousel] Error:', e); }
    try { renderMobileBeritaTerbaru(articles); } catch (e) { console.error('[renderMobileBeritaTerbaru] Error:', e); }
    try { renderMobileBeritaPopuler(trendingArticles); } catch (e) { console.error('[renderMobileBeritaPopuler] Error:', e); }
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

// Breaking News Ticker
function renderTicker(articles) {
  const track = document.getElementById('breaking-ticker-track');
  if (!track || !articles || articles.length === 0) return;

  const tickerArticles = articles.slice(0, 8);
  let html = '';
  tickerArticles.forEach(item => {
    html += `
      <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="hover:text-buser-red transition-colors inline-block whitespace-nowrap mr-8">
        ${escapeHtml(item.title)}
      </a>
    `;
  });
  track.innerHTML = html;
}

// Empty state fallback
function showEmptyState() {
  const container = document.getElementById('live-berita-terkini-feed');
  if (container) {
    container.innerHTML = `
      <div class="text-center py-12 bg-white rounded-2xl border border-slate-200">
        <p class="text-slate-500 font-medium">Belum ada berita yang diterbitkan saat ini.</p>
      </div>
    `;
  }
}

// =============================================================================
// 1. DESKTOP HERO SECTION (Antaranews 8-col Slider + 4-col Terpopuler)
// =============================================================================
let topSliderInterval = null;
let topSliderIsPaused = false;
let topSliderCurrentIndex = 0;

function renderDesktopHeroSection(articles, trendingArticles = []) {
  const heroSection = document.getElementById('home-hero-section');
  if (!heroSection || !articles || articles.length === 0) return;

  if (topSliderInterval) {
    clearInterval(topSliderInterval);
    topSliderInterval = null;
  }

  const sliderArticles = articles.slice(0, Math.min(5, articles.length));
  const sideArticles = (trendingArticles && trendingArticles.length > 0)
    ? trendingArticles.slice(0, 4)
    : (articles.length > sliderArticles.length ? articles.slice(sliderArticles.length, sliderArticles.length + 4) : []);

  const hasMultiple = sliderArticles.length > 1;

  let slidesHtml = '';
  sliderArticles.forEach((item, index) => {
    const catName = (item.name_kategori || 'BERITA UTAMA').toUpperCase();
    const author = item.author_name || 'Redaksi Japakeh Post';
    const pubDate = formatDateIndo(item.published_at);
    const excerpt = item.excerpt || 'Baca laporan selengkapnya seputar peristiwa terpercaya hanya di portal berita Japakeh Post.';
    const link = `artikel.html?slug=${encodeURIComponent(item.slug)}`;

    slidesHtml += `
      <div class="top-slider-item w-full h-full flex-shrink-0 relative overflow-hidden group/slide select-none" data-slide-index="${index}">
        <a href="${link}" class="block w-full h-full">
          <img src="${getThumb(item.thumbnail)}" 
               alt="${escapeHtml(item.title)}" 
               class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/slide:scale-105"
               onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
        </a>
        <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none"></div>

        <div class="absolute bottom-0 inset-x-0 p-4 sm:p-5 lg:p-6 z-20 flex flex-col justify-end pointer-events-auto">
          <div class="mb-1.5">
            <a href="internasional.html?cat=${encodeURIComponent(item.kategori_slug || 'berita')}" 
               class="inline-block bg-buser-red hover:bg-buser-redHover text-white text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm transition-colors">
              ${escapeHtml(catName)}
            </a>
          </div>

          <div class="flex items-center space-x-2 text-[11px] text-slate-300 mb-1.5">
            <span class="font-bold text-white">${escapeHtml(author)}</span>
            <span>&bull;</span>
            <span>${pubDate}</span>
            <span>&bull;</span>
            <span class="text-rose-300 font-semibold">3 menit baca</span>
          </div>

          <h2 class="text-base sm:text-xl lg:text-2xl font-black text-white leading-tight mb-1.5 sm:mb-2 drop-shadow-md group-hover/slide:text-rose-200 transition-colors line-clamp-2">
            <a href="${link}">
              ${escapeHtml(item.title)}
            </a>
          </h2>

          <p class="text-xs sm:text-[13px] text-slate-200 line-clamp-2 leading-relaxed hidden sm:block max-w-xl mb-2">
            ${escapeHtml(excerpt)}
          </p>

          <div class="flex items-center justify-between pt-2 border-t border-white/15 text-xs">
            <div class="flex items-center space-x-1.5">
              <span class="text-[10px] bg-white/15 backdrop-blur-md text-white px-2 py-0.5 rounded-full font-medium">#${escapeHtml(item.name_kategori || 'Headline')}</span>
              <span class="text-[10px] bg-buser-red text-white px-2 py-0.5 rounded-full font-bold">#JapakehPost</span>
            </div>
            <a href="${link}" class="inline-flex items-center text-xs font-bold text-rose-300 hover:text-white transition-colors group/cta">
              Baca Selengkapnya
              <svg class="w-3 h-3 ml-1 transition-transform group-hover/cta:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    `;
  });

  let dotsHtml = '';
  sliderArticles.forEach((_, idx) => {
    dotsHtml += `
      <button type="button" 
              class="top-slider-dot ${idx === 0 ? 'active' : ''}" 
              data-dot-index="${idx}" 
              aria-label="Ke Sorotan Berita ${idx + 1}">
      </button>
    `;
  });

  const controlsHtml = hasMultiple ? `
    <button type="button" 
            class="top-slider-prev absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/60 hover:bg-buser-red text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 shadow-xl border border-white/15 hover:scale-110 opacity-85 hover:opacity-100 focus:outline-none" 
            aria-label="Berita Sebelumnya">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <button type="button" 
            class="top-slider-next absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900/60 hover:bg-buser-red text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 shadow-xl border border-white/15 hover:scale-110 opacity-85 hover:opacity-100 focus:outline-none" 
            aria-label="Berita Selanjutnya">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
      </svg>
    </button>
    <div class="top-slider-dots absolute bottom-2.5 sm:bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-1.5 bg-slate-950/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
      ${dotsHtml}
    </div>
  ` : '';

  const sliderContainerHtml = `
    <div class="${sideArticles.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col">
      <div id="top-slider" 
           class="relative overflow-hidden rounded-2xl bg-slate-900 shadow-sm hover:shadow-md transition-shadow group select-none w-full h-[320px] sm:h-[360px] lg:h-[390px]">
        <div class="top-slider-track flex w-full h-full transition-transform duration-500 ease-out" style="transform: translateX(0%);">
          ${slidesHtml}
        </div>
        ${controlsHtml}
      </div>
    </div>
  `;

  let sidebarHtml = '';
  if (sideArticles.length > 0) {
    let sideItemsHtml = '';
    sideArticles.forEach((item, index) => {
      const link = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
      const pubDate = formatDateOnlyIndo(item.published_at || item.date);
      sideItemsHtml += `
        <article class="py-2 first:pt-0 last:pb-0 flex items-center gap-2.5 group">
          <span class="w-5 h-5 rounded-full bg-rose-50 text-buser-red font-black text-[10px] flex items-center justify-center flex-shrink-0 border border-rose-200/60 group-hover:bg-buser-red group-hover:text-white transition-all shadow-2xs">
            ${index + 1}
          </span>
          <a href="${link}" class="w-18 sm:w-20 h-13 sm:h-14 flex-shrink-0 relative overflow-hidden rounded-lg block bg-slate-100 shadow-2xs">
            <img src="${getThumb(item.thumbnail)}" 
                 alt="${escapeHtml(item.title)}" 
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                 onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
          </a>
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-1 text-[9.5px] text-slate-400 mb-0.5">
              <span class="font-bold text-buser-red uppercase tracking-wider">${escapeHtml(item.name_kategori || 'News')}</span>
              <span>&bull;</span>
              <span class="whitespace-nowrap text-slate-500">${pubDate}</span>
            </div>
            <h4 class="font-bold text-xs sm:text-[12.5px] text-slate-900 group-hover:text-buser-red leading-snug line-clamp-2 transition-colors">
              <a href="${link}">${escapeHtml(item.title)}</a>
            </h4>
          </div>
        </article>
      `;
    });

    sidebarHtml = `
      <aside class="lg:col-span-4 flex flex-col h-full">
        <div class="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-soft flex flex-col justify-between h-full">
          <div>
            <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div class="flex items-center space-x-2">
                <span class="w-1.5 h-4 bg-buser-red rounded-full inline-block"></span>
                <h3 class="font-black text-xs sm:text-sm uppercase tracking-tight text-slate-900">Terpopuler</h3>
              </div>
              <span class="text-[9px] bg-rose-50 text-buser-red border border-rose-200 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                TRENDING
              </span>
            </div>
            <div class="divide-y divide-slate-100" id="live-trending-feed">
              ${sideItemsHtml}
            </div>
          </div>
          <div class="pt-1.5 mt-1.5 border-t border-slate-100 text-center">
            <a href="internasional.html" class="inline-flex items-center text-[10px] font-bold text-buser-red hover:text-buser-redHover uppercase tracking-wider transition-colors group">
              <span>Lihat Semua Berita Terpopuler</span>
              <svg class="w-2.5 h-2.5 ml-1 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </aside>
    `;
  }

  heroSection.className = 'grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-stretch';
  heroSection.innerHTML = sliderContainerHtml + sidebarHtml;

  if (hasMultiple) {
    initTopSlider(sliderArticles.length);
  }
}

function initTopSlider(totalSlides) {
  const sliderEl = document.getElementById('top-slider');
  if (!sliderEl || totalSlides <= 1) return;

  const trackEl = sliderEl.querySelector('.top-slider-track');
  const dots = sliderEl.querySelectorAll('.top-slider-dot');
  const prevBtn = sliderEl.querySelector('.top-slider-prev');
  const nextBtn = sliderEl.querySelector('.top-slider-next');

  topSliderCurrentIndex = 0;
  topSliderIsPaused = false;

  function updateSlide(newIndex) {
    topSliderCurrentIndex = (newIndex + totalSlides) % totalSlides;
    if (trackEl) {
      trackEl.style.transform = `translateX(-${topSliderCurrentIndex * 100}%)`;
    }
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === topSliderCurrentIndex);
    });
  }

  function nextSlide() { updateSlide(topSliderCurrentIndex + 1); }
  function prevSlide() { updateSlide(topSliderCurrentIndex - 1); }

  function startAutoplay() {
    if (topSliderInterval) clearInterval(topSliderInterval);
    topSliderInterval = setInterval(() => {
      if (!topSliderIsPaused) nextSlide();
    }, 6000);
  }

  function stopAutoplay() {
    if (topSliderInterval) {
      clearInterval(topSliderInterval);
      topSliderInterval = null;
    }
  }

  if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); });
  if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); });

  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetIndex = parseInt(dot.getAttribute('data-dot-index'), 10);
      if (!isNaN(targetIndex)) updateSlide(targetIndex);
    });
  });

  sliderEl.addEventListener('mouseenter', () => { topSliderIsPaused = true; });
  sliderEl.addEventListener('mouseleave', () => { topSliderIsPaused = false; });

  startAutoplay();
}

// =============================================================================
// 2. DESKTOP BERITA TERKINI & TRENDING
// =============================================================================
function renderDesktopBeritaTerkini(articles) {
  const feedContainer = document.getElementById('live-berita-terkini-feed');
  if (!feedContainer) return;

  feedContainer.innerHTML = '';
  const MAX_TERKINI = 10;
  const list = (articles || []).slice(0, MAX_TERKINI);
  if (list.length === 0) return;

  const leftCount = Math.ceil(list.length / 2);
  const leftArticles = list.slice(0, leftCount);
  const rightArticles = list.slice(leftCount);

  function createCardHtml(item) {
    const link = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
    const cat = escapeHtml(item.name_kategori || 'Nasional');
    const author = escapeHtml(item.author_name || 'Redaksi');
    const date = formatDateOnlyIndo(item.published_at);

    return `
      <article class="bg-white border border-slate-200/90 hover:border-buser-red/40 rounded-xl p-3 sm:p-3.5 flex items-center gap-3 sm:gap-3.5 shadow-2xs hover:shadow-md transition-all group">
        <a href="${link}" class="w-24 sm:w-28 lg:w-32 h-18 sm:h-20 lg:h-22 shrink-0 relative overflow-hidden rounded-xl block bg-slate-100 shadow-2xs">
          <img src="${getThumb(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
          <span class="absolute top-1.5 left-1.5 bg-buser-red text-white text-[8px] font-bold px-2 py-0.5 uppercase tracking-wider rounded-md shadow-xs">${cat}</span>
        </a>
        <div class="flex-1 min-w-0 flex flex-col justify-between h-full py-0.5">
          <div>
            <div class="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] text-slate-400 mb-1">
              <span class="font-semibold text-slate-600 truncate max-w-[95px]">${author}</span>
              <span>&bull;</span>
              <span class="whitespace-nowrap">${date}</span>
            </div>
            <h3 class="font-bold text-xs sm:text-[13px] lg:text-[13.5px] text-slate-900 group-hover:text-buser-red line-clamp-2 leading-snug transition-colors">
              <a href="${link}">
                ${escapeHtml(item.title)}
              </a>
            </h3>
          </div>
          <div class="flex items-center justify-end pt-1.5 mt-1 border-t border-slate-100 text-[10px]">
            <a href="${link}" class="font-bold text-buser-red hover:underline inline-flex items-center gap-1">
              <span>Baca Selengkapnya</span>
              <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  feedContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5 items-start';
  feedContainer.innerHTML = `
    <div class="space-y-3 flex flex-col">
      ${leftArticles.map(createCardHtml).join('')}
    </div>
    <div class="space-y-3 flex flex-col">
      ${rightArticles.map(createCardHtml).join('')}
    </div>
  `;
}

function renderDesktopTrending(articles) {
  const trendingContainer = document.getElementById('live-trending-feed');
  if (!trendingContainer) return;

  trendingContainer.innerHTML = '';
  const trendingList = (articles || []).slice(0, 4);

  trendingList.forEach((item, index) => {
    const link = `artikel.html?slug=${encodeURIComponent(item.slug)}`;
    const pubDate = formatDateOnlyIndo(item.published_at || item.date);
    const art = document.createElement('article');
    art.className = 'py-2 first:pt-0 last:pb-0 flex items-center gap-2.5 group';
    art.innerHTML = `
      <span class="w-5 h-5 rounded-full bg-rose-50 text-buser-red font-black text-[10px] flex items-center justify-center flex-shrink-0 border border-rose-200/60 group-hover:bg-buser-red group-hover:text-white transition-all shadow-2xs">
        ${index + 1}
      </span>
      <a href="${link}" class="w-20 sm:w-22 h-14 sm:h-15 flex-shrink-0 relative overflow-hidden rounded-lg block bg-slate-100 shadow-2xs">
        <img src="${getThumb(item.thumbnail)}" 
             alt="${escapeHtml(item.title)}" 
             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
             onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
      </a>
      <div class="flex-1 min-w-0">
        <div class="flex items-center space-x-1 text-[9.5px] text-slate-400 mb-0.5">
          <span class="font-bold text-buser-red uppercase tracking-wider">${escapeHtml(item.name_kategori || 'News')}</span>
          <span>&bull;</span>
          <span class="whitespace-nowrap text-slate-500">${pubDate}</span>
        </div>
        <h4 class="font-bold text-xs sm:text-[12.5px] text-slate-900 group-hover:text-buser-red leading-snug line-clamp-2 transition-colors">
          <a href="${link}">${escapeHtml(item.title)}</a>
        </h4>
      </div>
    `;
    trendingContainer.appendChild(art);
  });
}

async function renderDesktopCategorySections(articles) {
  const container = document.getElementById('live-category-sections');
  if (!container) return;

  container.innerHTML = '';

  // 1. Ambil daftar seluruh kategori dari Database (REST API) secara dinamis
  let dbCategories = [];
  if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getCategories === 'function') {
    try {
      const res = await window.BuserInfoAPI.getCategories();
      if (Array.isArray(res) && res.length > 0) {
        dbCategories = res;
      }
    } catch (e) {
      console.warn('[renderDesktopCategorySections] Gagal fetch kategori dari API:', e);
    }
  }

  // Fallback kategori bawaan jika API offline
  if (dbCategories.length === 0) {
    const defaultCats = window.JAPAKEH_CATEGORIES || window.BUSER_CATEGORIES || [];
    dbCategories = defaultCats.filter(c => c.id !== 'home' && c.slug !== 'home').map((c, i) => ({
      id_kategori: i + 1,
      name_kategori: c.name,
      slug: c.slug
    }));
  }

  // 2. Kumpulkan seluruh kategori unik (sinkronisasi Database + data Artikel aktif)
  const categoryMap = new Map();

  // Masukkan dari database terlebih dahulu
  dbCategories.forEach(cat => {
    const slug = (cat.slug || '').toLowerCase().trim();
    if (slug && slug !== 'home' && slug !== 'opini') {
      categoryMap.set(slug, {
        id_kategori: cat.id_kategori || 999,
        name_kategori: cat.name_kategori || cat.name || (slug.charAt(0).toUpperCase() + slug.slice(1)),
        slug: slug
      });
    }
  });

  // Masukkan kategori tambahan yang ditemukan dari data artikel aktif
  (articles || []).forEach(art => {
    const rawSlug = (art.kategori_slug || art.categorySlug || art.name_kategori || art.category || '').toLowerCase().trim();
    const rawName = art.name_kategori || art.category || rawSlug;
    if (rawSlug && rawSlug !== 'home' && rawSlug !== 'opini' && !categoryMap.has(rawSlug)) {
      categoryMap.set(rawSlug, {
        id_kategori: art.id_kategori || art.kategori_id || 999,
        name_kategori: rawName.charAt(0).toUpperCase() + rawName.slice(1),
        slug: rawSlug
      });
    }
  });

  // Pastikan rubrik Video dan Foto selalu terdaftar
  if (!categoryMap.has('video')) {
    categoryMap.set('video', { id_kategori: 9998, name_kategori: 'Video', slug: 'video' });
  }
  if (!categoryMap.has('foto')) {
    categoryMap.set('foto', { id_kategori: 9999, name_kategori: 'Foto', slug: 'foto' });
  }

  // 3. Pisahkan kategori umum dengan Video dan Foto
  const PRIMARY_ORDER = [
    'daerah', 'nasional', 'politik', 'hukum', 'ekonomi', 
    'bisnis', 'pendidikan', 'teknologi', 'olahraga', 'internasional', 'tokoh'
  ];

  const normalCategories = [];
  let videoCat = null;
  let fotoCat = null;

  categoryMap.forEach((catObj, slug) => {
    if (slug === 'video') {
      videoCat = catObj;
    } else if (slug === 'foto') {
      fotoCat = catObj;
    } else {
      normalCategories.push(catObj);
    }
  });

  // Urutkan kategori umum: Prioritas redaksi terlebih dahulu, lalu kategori baru tambahan dari DB/Admin
  normalCategories.sort((a, b) => {
    const idxA = PRIMARY_ORDER.indexOf(a.slug);
    const idxB = PRIMARY_ORDER.indexOf(b.slug);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return (a.id_kategori || 999) - (b.id_kategori || 999);
  });

  // OTOMATIS TAMPILKAN VIDEO & FOTO DI PALING AKHIR BARISAN (meskipun kategori bertambah)
  const sortedCategories = [...normalCategories];
  if (videoCat) sortedCategories.push(videoCat);
  if (fotoCat) sortedCategories.push(fotoCat);

  // 4. Kelompokkan artikel berdasarkan slug kategori
  const articlesByCategory = {};
  (articles || []).forEach(art => {
    const catSlug = (art.kategori_slug || art.categorySlug || art.name_kategori || art.category || '').toLowerCase().trim();
    if (!articlesByCategory[catSlug]) articlesByCategory[catSlug] = [];
    articlesByCategory[catSlug].push(art);
  });

  // 5. Siapkan data terbaik untuk Video dan Foto
  let videoItem = (articlesByCategory['video'] && articlesByCategory['video'][0]) || null;
  if (!videoItem && window.BuserInfoAPI && typeof window.BuserInfoAPI.getVideos === 'function') {
    try {
      const res = await window.BuserInfoAPI.getVideos({ status: 'active', limit: 1 });
      if (res && res.videos && res.videos.length > 0) {
        const v = res.videos[0];
        videoItem = {
          title: cleanMediaTitle(v.judul || v.title),
          thumbnail: v.thumbnail || (v.youtube_id ? `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg` : ''),
          author_name: v.penulis || 'Redaksi Japakeh Post',
          published_at: v.created_at || '2026-09-10 14:00:00',
          slug: v.slug || '',
          duration: v.durasi || '02:15'
        };
      }
    } catch (e) {}
  }
  if (!videoItem) {
    videoItem = {
      title: 'Penerbangan Drone Pantau Kondisi Tanggul Pasca Banjir Surut',
      thumbnail: 'assets/images/berita/daerah/penanganan-banjir-sumatera.jpg',
      author_name: 'Redaksi Japakeh Post',
      published_at: '2026-09-10 14:00:00',
      slug: 'video-dokumentasi-sains-kampus-inovasi-olahan-kulit-manggis-jadi-penjernih-air-gambut',
      duration: '01:45'
    };
  }

  let fotoItem = (articlesByCategory['foto'] && articlesByCategory['foto'][0]) || null;
  if (!fotoItem) {
    const photoArticles = (articles || []).filter(a => {
      const cat = String(a.name_kategori || a.category || '').toLowerCase();
      return cat.includes('foto') || cat.includes('galeri');
    });
    if (photoArticles.length > 0) {
      fotoItem = photoArticles[0];
    } else {
      fotoItem = {
        title: 'Parade Budaya Nusantara Meriahkan HUT Aceh',
        thumbnail: 'assets/images/berita/daerah/festival-budaya-palembang.jpg',
        author_name: 'Zulkifli M. (Pewarta Foto)',
        published_at: '2026-09-10 10:00:00',
        slug: 'festival-budaya-dan-pawai-adat-di-tanah-rencong'
      };
    }
  }

  // 6. Bangun HTML untuk masing-masing kartu kategori
  let cardsHtml = '';
  let validCategoryCount = 0;

  sortedCategories.forEach(catObj => {
    const catName = catObj.name_kategori;
    const catSlug = catObj.slug;

    // A. KARTU KHUSUS: BERITA VIDEO (Di paling akhir barisan)
    if (catSlug === 'video') {
      validCategoryCount++;
      const videoLink = videoItem.slug ? `artikel.html?slug=${encodeURIComponent(videoItem.slug)}` : 'internasional.html?cat=video';
      const videoPubDate = formatDateOnlyIndo(videoItem.published_at || videoItem.date);
      const videoAuthor = videoItem.author_name || videoItem.author || 'Redaksi Japakeh';
      const videoTitle = cleanMediaTitle(videoItem.title);

      cardsHtml += `
        <article class="bg-white border border-slate-200/90 hover:border-buser-red/40 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full">
          <div>
            <!-- Header Kategori Video (Tanpa tombol Lihat Semua di atas) -->
            <div class="flex items-center space-x-1.5 pb-2 mb-2.5 border-b border-slate-100">
              <span class="w-1.5 h-3.5 bg-buser-red rounded-full inline-block"></span>
              <h3 class="font-black text-xs sm:text-[13px] uppercase tracking-tight text-slate-900">Video</h3>
            </div>

            <!-- Thumbnail Video (Ukuran Layout Ditinggikan) -->
            <a href="${videoLink}" class="block relative overflow-hidden rounded-xl h-44 sm:h-48 lg:h-52 w-full bg-slate-100 mb-2.5 shadow-2xs">
              <img src="${getThumb(videoItem.thumbnail || videoItem.image)}" 
                   alt="${escapeHtml(videoTitle)}" 
                   class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                   onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
            </a>

            <!-- Meta Video -->
            <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1.5">
              <span class="font-semibold text-slate-600 truncate max-w-[85px]">${escapeHtml(videoAuthor)}</span>
              <span>&bull;</span>
              <span class="whitespace-nowrap">${videoPubDate}</span>
            </div>

            <!-- Judul Video -->
            <h4 class="font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-buser-red leading-snug line-clamp-3 transition-colors">
              <a href="${videoLink}">${escapeHtml(videoTitle)}</a>
            </h4>
          </div>

          <!-- Tombol Aksi Video: Lihat Semua Video -->
          <div class="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
            <a href="internasional.html?cat=video" class="font-bold text-buser-red hover:text-buser-redHover inline-flex items-center gap-1 group/btn">
              <span>Lihat Semua Video</span>
              <svg class="w-2.5 h-2.5 transition-transform group-hover/btn:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>
        </article>
      `;
      return;
    }

    // B. KARTU KHUSUS: BERITA FOTO (Di paling akhir barisan)
    if (catSlug === 'foto') {
      validCategoryCount++;
      const fotoLink = fotoItem.slug ? `artikel.html?slug=${encodeURIComponent(fotoItem.slug)}` : 'internasional.html?cat=foto';
      const fotoPubDate = formatDateOnlyIndo(fotoItem.published_at || fotoItem.date);
      const fotoAuthor = fotoItem.author_name || fotoItem.author || 'Foto: Redaksi';
      const fotoTitle = cleanMediaTitle(fotoItem.title);

      cardsHtml += `
        <article class="bg-white border border-slate-200/90 hover:border-buser-red/40 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full">
          <div>
            <!-- Header Kategori Foto (Tanpa tombol Lihat Semua di atas) -->
            <div class="flex items-center space-x-1.5 pb-2 mb-2.5 border-b border-slate-100">
              <span class="w-1.5 h-3.5 bg-buser-red rounded-full inline-block"></span>
              <h3 class="font-black text-xs sm:text-[13px] uppercase tracking-tight text-slate-900">Foto</h3>
            </div>

            <!-- Thumbnail Foto (Ukuran Layout Ditinggikan) -->
            <a href="${fotoLink}" class="block relative overflow-hidden rounded-xl h-44 sm:h-48 lg:h-52 w-full bg-slate-100 mb-2.5 shadow-2xs">
              <img src="${getThumb(fotoItem.thumbnail || fotoItem.image)}" 
                   alt="${escapeHtml(fotoTitle)}" 
                   class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                   onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
            </a>

            <!-- Meta Foto -->
            <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1.5">
              <span class="font-semibold text-slate-600 truncate max-w-[85px]">${escapeHtml(fotoAuthor)}</span>
              <span>&bull;</span>
              <span class="whitespace-nowrap">${fotoPubDate}</span>
            </div>

            <!-- Judul Foto -->
            <h4 class="font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-buser-red leading-snug line-clamp-3 transition-colors">
              <a href="${fotoLink}">${escapeHtml(fotoTitle)}</a>
            </h4>
          </div>

          <!-- Tombol Aksi Foto: Lihat Semua Foto -->
          <div class="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
            <a href="internasional.html?cat=foto" class="font-bold text-buser-red hover:text-buser-redHover inline-flex items-center gap-1 group/btn">
              <span>Lihat Semua Foto</span>
              <svg class="w-2.5 h-2.5 transition-transform group-hover/btn:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
            </a>
          </div>
        </article>
      `;
      return;
    }

    // C. KARTU BERITA KATEGORI UMUM (Dinamis dari Database / Admin)
    const catArticles = articlesByCategory[catSlug] || [];
    const item = catArticles.length > 0 ? catArticles[0] : {
      title: `Kabar terbaru dan perkembangan seputar rubrik ${catName}`,
      thumbnail: 'assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg',
      author_name: 'Redaksi Japakeh Post',
      published_at: new Date().toISOString(),
      slug: ''
    };

    validCategoryCount++;

    const link = item.slug ? `artikel.html?slug=${encodeURIComponent(item.slug)}` : `internasional.html?cat=${encodeURIComponent(catSlug)}`;
    const pubDate = formatDateOnlyIndo(item.published_at || item.date);
    const author = item.author_name || item.author || 'Redaksi';
    const itemTitle = cleanMediaTitle(item.title);

    cardsHtml += `
      <article class="bg-white border border-slate-200/90 hover:border-buser-red/40 rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group h-full">
        <div>
          <!-- Header Kategori (Tanpa tombol Lihat Semua di atas) -->
          <div class="flex items-center space-x-1.5 pb-2 mb-2.5 border-b border-slate-100">
            <span class="w-1.5 h-3.5 bg-buser-red rounded-full inline-block"></span>
            <h3 class="font-black text-xs sm:text-[13px] uppercase tracking-tight text-slate-900">${escapeHtml(catName)}</h3>
          </div>

          <!-- 1 Berita Utama Kategori (Ukuran Layout Ditinggikan) -->
          <a href="${link}" class="block relative overflow-hidden rounded-xl h-44 sm:h-48 lg:h-52 w-full bg-slate-100 mb-2.5 shadow-2xs">
            <img src="${getThumb(item.thumbnail || item.image)}" 
                 alt="${escapeHtml(itemTitle)}" 
                 class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                 onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
          </a>

          <!-- Meta Berita -->
          <div class="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1.5">
            <span class="font-semibold text-slate-600 truncate max-w-[85px]">${escapeHtml(author)}</span>
            <span>&bull;</span>
            <span class="whitespace-nowrap">${pubDate}</span>
          </div>

          <!-- Judul Berita -->
          <h4 class="font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-buser-red leading-snug line-clamp-3 transition-colors">
            <a href="${link}">${escapeHtml(itemTitle)}</a>
          </h4>
        </div>

        <!-- Tombol Aksi Berita (Baca Selengkapnya) -->
        <div class="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-[10.5px]">
          <a href="${link}" class="font-bold text-buser-red hover:text-buser-redHover inline-flex items-center gap-1 group/btn">
            <span>Baca Selengkapnya</span>
            <svg class="w-2.5 h-2.5 transition-transform group-hover/btn:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
          </a>
        </div>
      </article>
    `;
  });

  if (validCategoryCount === 0) return;

  const sectionWrapper = document.createElement('section');
  sectionWrapper.className = 'w-full my-2';
  sectionWrapper.innerHTML = `
    <!-- Grid 5 Kolom per Baris di Desktop, Otomatis Lanjut ke Baris Berikutnya (Video & Foto di Akhir) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-4.5 items-stretch">
      ${cardsHtml}
    </div>
  `;

  container.appendChild(sectionWrapper);
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

      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E60000]/90 text-white flex items-center justify-center shadow-lg group-hover:scale-115 group-hover:bg-[#E60000] transition-all">
          <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>

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
    const p2 = 'Galeri foto ini didokumentasikan oleh pewarta foto Japakeh Post dengan standar ketat integritas visual jurnalistik tanpa manipulasi konten peristiwa.';
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
