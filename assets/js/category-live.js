/**
 * Japakeh Post - Handler Halaman Rubrikasi Kategori (internasional.html / kategori.html)
 * Murni membaca data langsung dari Database MySQL / REST API
 */

document.addEventListener('DOMContentLoaded', () => {
  renderCategoryPageFromDB();
});

async function renderCategoryPageFromDB() {
  if (!window.BuserInfoAPI) return;

  const urlParams = new URLSearchParams(window.location.search);
  let currentCatSlug = urlParams.get('cat') || (window.location.pathname.includes('kategori.html') ? 'daerah' : 'internasional');
  currentCatSlug = (currentCatSlug || 'daerah').toLowerCase();

  try {
    // 1. Ambil daftar seluruh kategori untuk pencocokan nama
    let categories = [];
    try {
      categories = await (window.JapakehPostAPI || window.BuserInfoAPI).getCategories();
    } catch (e) {}

    if ((!categories || categories.length === 0) && window.NewsDB && typeof window.NewsDB.getCategories === 'function') {
      categories = window.NewsDB.getCategories();
    }

    const listCats = Array.isArray(categories) ? categories : [];
    const currentCategoryObj = listCats.find(c => (c.slug || '').toLowerCase() === currentCatSlug) || {
      name_kategori: capitalizeWord(currentCatSlug),
      name: capitalizeWord(currentCatSlug),
      slug: currentCatSlug,
      deskripsi: `Kumpulan berita terverifikasi seputar isu ${currentCatSlug} dari redaksi Japakeh Post.`
    };

    const catName = currentCategoryObj.name_kategori || currentCategoryObj.name || capitalizeWord(currentCatSlug);
    const catDesc = currentCategoryObj.deskripsi || `Kumpulan berita terverifikasi seputar isu ${(catName || currentCatSlug).toLowerCase()} langsung dari reporter Japakeh Post di lapangan.`;

    // Update Header, Breadcrumb, Meta Title
    document.title = `Berita ${catName} — Japakeh Post`;
    const bCat = document.getElementById('breadcrumb-category-name');
    const pTitle = document.getElementById('category-page-title');
    const pDesc = document.getElementById('category-page-desc');
    const fTitle = document.getElementById('category-feed-title');
    const sidebarTrendingTitle = document.querySelector('aside h2');

    if (bCat) bCat.textContent = catName;
    if (pTitle) pTitle.innerHTML = `<span class="w-1.5 h-4.5 bg-buser-red rounded-full mr-2 inline-block"></span>Berita ${catName}`;
    if (pDesc) pDesc.textContent = catDesc;
    if (fTitle) fTitle.textContent = `Daftar Berita ${catName} Terkini`;
    if (sidebarTrendingTitle) sidebarTrendingTitle.textContent = `Trending ${catName}`;

    // Sorot menu navigasi aktif di top bar kategori
    highlightActiveCategoryBar(currentCatSlug);

    // Khusus Rubrik Video: Render konten langsung dari Tabel `video` (Bukan artikel teks)
    if (currentCatSlug === 'video') {
      await renderVideoRubric(catName, catDesc);
      return;
    }

    // 2. Ambil artikel dari database yang SESUAI KATEGORI INI
    let articles = [];
    try {
      const res = await (window.JapakehPostAPI || window.BuserInfoAPI).getArticles({ kategori: currentCatSlug, status: 'published', limit: 20 });
      articles = res && Array.isArray(res.articles) ? res.articles : [];
    } catch (e) {}

    if ((!articles || articles.length === 0) && window.NewsDB && typeof window.NewsDB.getByCategory === 'function') {
      articles = window.NewsDB.getByCategory(currentCatSlug);
    }

    const featuredContainer = document.getElementById('category-featured-card');
    const listContainer = document.getElementById('category-articles-list');
    const paginationNav = document.querySelector('nav[aria-label="Navigasi Halaman"]');
    const trendingSidebarContainer = document.querySelector('aside .divide-y');

    // Jika Kategori ini BELUM MEMILIKI ARTIKEL di PostgreSQL
    if (articles.length === 0) {
      if (featuredContainer) {
        featuredContainer.innerHTML = `
          <div class="p-8 sm:p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-soft">
            <div class="w-16 h-16 bg-rose-50 text-buser-red rounded-full flex items-center justify-center mx-auto mb-3">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
            </div>
            <h3 class="font-black text-slate-900 text-lg mb-1.5">Belum Ada Berita di Rubrik ${catName}</h3>
            <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
              Saat ini belum ada artikel yang diterbitkan untuk rubrik ini. Tim redaksi kami sedang menyusun dan memverifikasi laporan peristiwa terkini untuk Anda.
            </p>
            <a href="index.html" class="inline-flex items-center px-5 py-2.5 bg-buser-red text-white font-bold text-xs rounded-full hover:bg-buser-redHover transition-colors shadow-xs">
              &larr; Kembali ke Beranda
            </a>
          </div>
        `;
      }
      if (listContainer) listContainer.innerHTML = '';
      if (paginationNav) paginationNav.style.display = 'none';
      if (trendingSidebarContainer) {
        trendingSidebarContainer.innerHTML = `
          <div class="p-4 text-xs text-slate-400 text-center">
            Belum ada data trending untuk kategori ini.
          </div>
        `;
      }
      return;
    }

    // Jika ADA ARTIKEL di database:
    // A. Artikel Teratas dijadikan Featured / Hero
    const first = articles[0];
    if (featuredContainer) {
      featuredContainer.className = 'bg-white border border-slate-200 rounded-2xl overflow-hidden news-card-hover group shadow-soft';
      featuredContainer.innerHTML = `
        <div class="relative overflow-hidden aspect-[16/9] w-full bg-slate-950">
          <img src="${getCategoryThumb(first.thumbnail)}" alt="${first.title}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
          <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>
          <span class="absolute top-3 sm:top-4 left-3 sm:left-4 bg-buser-red text-white text-[11px] sm:text-xs font-bold px-3 py-1 uppercase tracking-wider rounded-full shadow-md">
            ${escapeCategoryHtml(first.name_kategori || 'Headline')}
          </span>
          <div class="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] px-3 py-1 rounded-full flex items-center space-x-1.5 border border-white/10">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="font-bold">Live</span>
          </div>
        </div>

        <div class="p-5 sm:p-7">
          <div class="flex items-center space-x-2 text-xs text-slate-500 mb-2.5">
            <span class="font-bold text-slate-800">${first.author_name || 'Redaksi Japakeh Post'}</span>
            <span>&bull;</span>
            <span>${formatCategoryDate(first.published_at)}</span>
            <span>&bull;</span>
            <span class="text-buser-red font-semibold">3 menit baca</span>
          </div>

          <h2 class="text-xl sm:text-2xl font-black text-slate-900 leading-snug group-hover:text-buser-red transition-colors mb-3">
            <a href="artikel.html?slug=${first.slug}">
              ${first.title}
            </a>
          </h2>

          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5 line-clamp-3">
            ${first.excerpt || 'Baca laporan selengkapnya seputar peristiwa terpercaya hanya di portal berita Japakeh Post.'}
          </p>

          <div class="flex items-center justify-between pt-4 border-t border-slate-100">
            <span class="text-xs font-medium text-slate-500">Kategori: <strong class="text-slate-800">${first.name_kategori || catName}</strong></span>
            <a href="artikel.html?slug=${first.slug}" class="inline-flex items-center text-xs sm:text-sm font-bold text-buser-red hover:text-buser-redHover transition-colors">
              Baca Selengkapnya
              <svg class="w-4 h-4 ml-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </a>
          </div>
        </div>
      `;
    }

    // B. Artikel lainnya dimasukkan ke list feed
    const otherArticles = articles.slice(1);
    if (listContainer) {
      listContainer.innerHTML = '';
      if (otherArticles.length === 0) {
        listContainer.innerHTML = `
          <div class="p-6 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500 shadow-soft">
            Menampilkan 1 berita utama dari database. Berita lainnya akan muncul di sini seiring penambahan artikel baru.
          </div>
        `;
        if (paginationNav) paginationNav.style.display = 'none';
      } else {
        otherArticles.forEach(item => {
          const card = document.createElement('article');
          card.className = 'bg-white border border-slate-200 rounded-xl p-3 sm:p-4 group flex flex-col sm:flex-row gap-3.5 sm:gap-4 shadow-2xs hover:border-slate-300 transition-colors';
          card.innerHTML = `
            <a href="artikel.html?slug=${item.slug}" class="sm:w-44 h-28 sm:h-28 flex-shrink-0 relative overflow-hidden rounded-lg block bg-slate-100">
              <img src="${getCategoryThumb(item.thumbnail)}" alt="${item.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
            </a>
            <div class="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <span class="text-[11px] font-bold text-[#E60000] uppercase tracking-wider block mb-1">${item.name_kategori || catName}</span>
                <h3 class="font-bold text-sm sm:text-base text-slate-900 group-hover:text-[#E60000] line-clamp-2 leading-snug mb-1 transition-colors">
                  <a href="artikel.html?slug=${item.slug}">${item.title}</a>
                </h3>
                <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-2">${item.excerpt || ''}</p>
              </div>
              <div class="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400">
                <svg class="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span>${formatCategoryDate(item.published_at)}</span>
              </div>
            </div>
          `;
          listContainer.appendChild(card);
        });
      }
    }

    // C. Sidebar Trending per Kategori (01 to 05 Style Sesuai Revisi UI SELULER)
    if (trendingSidebarContainer) {
      trendingSidebarContainer.innerHTML = '';
      articles.slice(0, 5).forEach((item, idx) => {
        const art = document.createElement('article');
        art.className = 'py-2.5 flex items-start gap-3 group border-b border-slate-100 last:border-b-0';
        art.innerHTML = `
          <span class="text-xl sm:text-2xl font-black text-[#E60000] tracking-tighter leading-none shrink-0 w-7 text-center">${String(idx + 1).padStart(2, '0')}</span>
          <div class="flex-1 min-w-0">
            <span class="text-[10px] font-bold uppercase text-[#E60000] tracking-wider block mb-0.5">${(item.name_kategori || catName).toUpperCase()}</span>
            <a href="artikel.html?slug=${item.slug}" class="block font-bold text-xs text-slate-900 group-hover:text-[#E60000] leading-snug line-clamp-2 transition-colors">
              ${item.title}
            </a>
            <div class="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
              <svg class="w-2.5 h-2.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <span>${formatCategoryDate(item.published_at)}</span>
            </div>
          </div>
        `;
        trendingSidebarContainer.appendChild(art);
      });
    }

  } catch (err) {
    console.error('[renderCategoryPageFromDB] Error:', err);
  }
}

function formatCategoryDate(dateStr) {
  if (!dateStr) return 'Baru saja';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) + ' WIB';
}

function getCategoryThumb(url) {
  return url && url.length > 5 ? url : 'assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg';
}

function escapeCategoryHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalizeWord(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function highlightActiveCategoryBar(activeSlug) {
  if (typeof highlightActiveNav === 'function') {
    highlightActiveNav();
    return;
  }
  const categoryLinks = document.querySelectorAll('.cat-nav-link');
  categoryLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.includes(`cat=${activeSlug}`)) {
      link.classList.add('active', 'bg-buser-red', 'text-white', 'shadow-xs');
      link.classList.remove('text-slate-700', 'hover:bg-rose-50', 'hover:text-buser-red');
    } else {
      link.classList.remove('active', 'bg-buser-red', 'text-white', 'shadow-xs');
      link.classList.add('text-slate-700', 'hover:bg-rose-50', 'hover:text-buser-red');
    }
  });
}

/**
 * Handler Khusus Rubrik Video (YouTube Player & Gallery Langsung dari Database)
 */
async function renderVideoRubric(catName, catDesc) {
  const featuredContainer = document.getElementById('category-featured-card');
  const listContainer = document.getElementById('category-articles-list');
  const paginationNav = document.querySelector('nav[aria-label="Navigasi Halaman"]');
  const trendingSidebarContainer = document.querySelector('aside .divide-y');
  const fTitle = document.getElementById('category-feed-title');
  const sidebarTrendingTitle = document.querySelector('aside h2');

  if (fTitle) fTitle.textContent = 'Koleksi Video Berita & Liputan Multimedia';
  if (sidebarTrendingTitle) sidebarTrendingTitle.textContent = 'Video Populer';

  try {
    const res = await (window.JapakehPostAPI || window.BuserInfoAPI).getVideos({ status: 'active' });
    const videos = (res && Array.isArray(res.videos)) ? res.videos : [];

    if (videos.length === 0) {
      if (featuredContainer) {
        featuredContainer.innerHTML = `
          <div class="p-8 sm:p-12 text-center bg-white border border-slate-200 rounded-2xl shadow-soft">
            <div class="w-16 h-16 bg-rose-50 text-buser-red rounded-full flex items-center justify-center mx-auto mb-3">
              <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </div>
            <h3 class="font-black text-slate-900 text-lg mb-1.5">Belum Ada Video di Kanal Japakeh Post</h3>
            <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
              Saat ini belum ada tayangan video yang dipublikasikan. Redaksi sedang memproduksi liputan multimedia eksklusif untuk Anda.
            </p>
            <a href="index.html" class="inline-flex items-center px-5 py-2.5 bg-buser-red text-white font-bold text-xs rounded-full hover:bg-buser-redHover transition-colors shadow-xs">
              &larr; Kembali ke Beranda
            </a>
          </div>
        `;
      }
      if (listContainer) listContainer.innerHTML = '';
      if (paginationNav) paginationNav.style.display = 'none';
      if (trendingSidebarContainer) {
        trendingSidebarContainer.innerHTML = `<div class="p-4 text-xs text-slate-400 text-center">Belum ada video trending.</div>`;
      }
      return;
    }

    // 1. Featured Main Video Player (YouTube Embed Interaktif)
    const first = videos[0];
    if (featuredContainer) {
      featuredContainer.className = 'bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-soft';
      featuredContainer.innerHTML = `
        <div id="video-main-player-wrapper" class="relative aspect-video w-full bg-black overflow-hidden shadow-inner">
          <iframe id="video-main-iframe" src="https://www.youtube-nocookie.com/embed/${first.youtube_id}?rel=0" title="${escapeCategoryHtml(first.title)}" class="w-full h-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
        <div class="p-5 sm:p-7 bg-white">
          <div class="flex items-center gap-2 mb-2.5 flex-wrap">
            <span class="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
              <svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              TAYANGAN UTAMA
            </span>
            <span class="text-xs text-slate-300">&bull;</span>
            <span class="text-xs text-slate-500 font-medium">${formatCategoryDate(first.created_at)}</span>
          </div>
          <h2 id="video-main-title" class="text-xl sm:text-2xl font-black text-slate-900 leading-snug mb-2.5">
            ${escapeCategoryHtml(first.title)}
          </h2>
          <p id="video-main-caption" class="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
            ${escapeCategoryHtml(first.caption || 'Tayangan multimedia eksklusif dari meja redaksi Japakeh Post.')}
          </p>
          <div class="flex items-center justify-between pt-3.5 border-t border-slate-100 text-xs">
            <a id="video-main-watch-link" href="${first.watch_url || `https://www.youtube.com/watch?v=${first.youtube_id}`}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center text-red-600 font-bold hover:text-red-700 transition-colors">
              <svg class="w-4 h-4 mr-1.5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              <span>Buka di YouTube</span>
            </a>
            <span class="text-slate-400 font-mono text-[11px]">YouTube ID: ${first.youtube_id}</span>
          </div>
        </div>
      `;
    }

    // 2. Daftar Video Lainnya dalam Bentuk Kartu Video Interaktif
    const otherVideos = videos.slice(1);
    if (listContainer) {
      listContainer.innerHTML = '';
      if (otherVideos.length === 0) {
        listContainer.innerHTML = `
          <div class="p-6 bg-white border border-slate-200 rounded-2xl text-center text-xs text-slate-500 shadow-soft">
            Menampilkan 1 video utama dari database. Video liputan lainnya akan muncul di sini seiring penambahan video baru di CMS Redaksi.
          </div>
        `;
      } else {
        otherVideos.forEach(v => {
          const card = document.createElement('article');
          card.className = 'bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 news-card-hover group flex flex-col sm:flex-row gap-4 sm:gap-5 shadow-xs transition-all duration-200 hover:shadow-soft cursor-pointer';
          const cleanTitle = escapeCategoryHtml(v.title);
          const cleanCaption = escapeCategoryHtml(v.caption || '');
          const thumbUrl = v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`;
          const watchUrl = v.watch_url || `https://www.youtube.com/watch?v=${v.youtube_id}`;

          card.innerHTML = `
            <div class="sm:w-56 h-36 flex-shrink-0 relative overflow-hidden rounded-xl block aspect-[16/10] sm:aspect-auto bg-slate-900 group">
              <img src="${thumbUrl}" alt="${cleanTitle}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" onerror="this.src='https://img.youtube.com/vi/${v.youtube_id}/0.jpg'" />
              <div class="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                <div class="w-11 h-11 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <svg class="w-5 h-5 fill-current ml-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
              <span class="absolute top-2.5 left-2.5 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-xs">VIDEO</span>
            </div>
            <div class="flex-1 flex flex-col justify-between">
              <div>
                <span class="text-xs text-slate-400 block mb-1">${formatCategoryDate(v.created_at)}</span>
                <h3 class="font-bold text-base sm:text-lg text-slate-900 group-hover:text-red-600 line-clamp-2 leading-snug mb-2 transition-colors">
                  ${cleanTitle}
                </h3>
                <p class="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed mb-3">
                  ${cleanCaption || 'Tayangan liputan multimedia eksklusif persembahan Japakeh Post.'}
                </p>
              </div>
              <div class="flex items-center justify-between text-xs text-red-600 font-bold pt-3 border-t border-slate-100">
                <span class="flex items-center gap-1 group-hover:underline">
                  <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Putar di Pemutar Utama
                </span>
                <span class="text-slate-400 font-normal text-[11px]">YouTube HD</span>
              </div>
            </div>
          `;

          card.addEventListener('click', () => {
            switchMainVideo(v.youtube_id, v.title, v.caption, watchUrl);
          });

          listContainer.appendChild(card);
        });
      }
    }

    // 3. Sidebar Trending Video
    if (trendingSidebarContainer) {
      trendingSidebarContainer.innerHTML = '';
      videos.forEach((v, idx) => {
        const art = document.createElement('article');
        art.className = 'py-3 flex items-start space-x-3 group cursor-pointer';
        const cleanTitle = escapeCategoryHtml(v.title);
        const thumbUrl = v.thumbnail_url || `https://img.youtube.com/vi/${v.youtube_id}/hqdefault.jpg`;
        const watchUrl = v.watch_url || `https://www.youtube.com/watch?v=${v.youtube_id}`;

        art.innerHTML = `
          <div class="w-16 h-12 rounded-lg overflow-hidden bg-black shrink-0 relative group-hover:opacity-90 transition-opacity">
            <img src="${thumbUrl}" alt="${cleanTitle}" class="w-full h-full object-cover" onerror="this.src='https://img.youtube.com/vi/${v.youtube_id}/0.jpg'" />
            <div class="absolute inset-0 bg-black/40 flex items-center justify-center">
              <svg class="w-4 h-4 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-[10px] font-black uppercase text-red-600 tracking-wider">VIDEO #${idx + 1}</span>
            <h4 class="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-red-600 line-clamp-2 leading-snug mt-0.5 transition-colors">
              ${cleanTitle}
            </h4>
          </div>
        `;

        art.addEventListener('click', () => {
          switchMainVideo(v.youtube_id, v.title, v.caption, watchUrl);
        });

        trendingSidebarContainer.appendChild(art);
      });
    }

    if (paginationNav) paginationNav.style.display = 'none';

  } catch (err) {
    console.error('[renderVideoRubric] Error:', err);
  }
}

/**
 * Ganti tayangan pada player utama di atas dan scroll halus ke player
 */
function switchMainVideo(ytId, title, caption, watchUrl) {
  const iframe = document.getElementById('video-main-iframe');
  const titleEl = document.getElementById('video-main-title');
  const captionEl = document.getElementById('video-main-caption');
  const watchLink = document.getElementById('video-main-watch-link');
  const wrapper = document.getElementById('video-main-player-wrapper');

  if (iframe) {
    iframe.src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`;
  }
  if (titleEl) titleEl.textContent = title;
  if (captionEl) captionEl.textContent = caption || 'Tayangan multimedia eksklusif dari meja redaksi Japakeh Post.';
  if (watchLink) watchLink.href = watchUrl || `https://www.youtube.com/watch?v=${ytId}`;

  if (wrapper) {
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

