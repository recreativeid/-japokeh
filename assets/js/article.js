/**
 * Japakeh Post - Article Detail Page Script
 * Menghubungkan halaman artikel (artikel.html) langsung ke backend MySQL / REST API.
 * Mendukung pembacaan artikel via query string (?id=X atau ?slug=Y), fallback artikel terbaru,
 * view count updater, bookmark offline, dan sistem komentar live.
 */

document.addEventListener('DOMContentLoaded', () => {
  initShareButtons();
  initArticlePage();
  initReadingProgressBar();
});

let currentFontSize = 'md'; // 'sm', 'md', 'lg'

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getInitials(name) {
  if (!name) return 'JP';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDateIndo(dateStr) {
  if (!dateStr) return 'Baru saja';
  const safeStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(safeStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }) + ' | ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const safeStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(safeStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getThumb(url) {
  return url && url.length > 5 ? url : 'assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg';
}

async function initArticlePage() {
  const urlParams = new URLSearchParams(window.location.search);
  const slugParam = urlParams.get('slug');
  const idParam = urlParams.get('id');

  // Load trending sidebar dinamis dari database
  renderArticleTrending();

  if (!window.BuserInfoAPI) {
    showArticleNotFound('Koneksi Gagal', 'Tidak dapat terhubung ke server berita. Silakan muat ulang halaman atau periksa koneksi internet Anda.');
    return;
  }

  // 1. Jika ada parameter slug dari database
  if (slugParam) {
    try {
      if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getArticleBySlug === 'function') {
        const liveArticle = await window.BuserInfoAPI.getArticleBySlug(slugParam);
        if (liveArticle && liveArticle.title) {
          renderLiveArticleDetail(liveArticle);
          return;
        }
      }
    } catch (e) {
      console.warn('[article.js] Slug query failed:', e);
    }

    showArticleNotFound('Berita Tidak Ditemukan', 'Artikel dengan tautan tersebut tidak ditemukan atau belum dipublikasikan oleh redaksi.');
    return;
  }

  // 2. Jika ada parameter ID berupa angka
  if (idParam && /^\d+$/.test(idParam)) {
    try {
      if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getArticleById === 'function') {
        const liveArticle = await window.BuserInfoAPI.getArticleById(idParam);
        if (liveArticle && liveArticle.title) {
          renderLiveArticleDetail(liveArticle);
          return;
        }
      }
    } catch (e) {
      console.warn('[article.js] ID query failed:', e);
    }

    showArticleNotFound('Berita Tidak Ditemukan', 'Artikel yang Anda cari tidak ditemukan atau telah dihapus.');
    return;
  }

  // 3. Jika tanpa parameter slug/ID atau ID dummy (seperti int-01), coba tampilkan artikel terbaru dari DB
  try {
    if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getArticles === 'function') {
      const res = await window.BuserInfoAPI.getArticles({ limit: 1, status: 'published' });
      const articles = res.articles || [];
      if (articles.length > 0) {
        renderLiveArticleDetail(articles[0]);
        return;
      }
    }
  } catch (e) {
    console.warn('[article.js] Fetch latest article failed:', e);
  }

  // 4. Jika di database belum ada artikel sama sekali
  showArticleNotFound('Belum Ada Berita Tersedia', 'Saat ini belum ada berita atau artikel yang dipublikasikan oleh redaksi. Silakan kembali ke Beranda untuk melihat pembaruan mendatang.');
}

function showArticleNotFound(title = 'Berita Tidak Ditemukan', message = 'Maaf, artikel yang Anda cari tidak ditemukan atau belum dipublikasikan oleh redaksi.') {
  document.title = `${title} — Japakeh Post`;

  const mainArticle = document.querySelector('article.lg\\:col-span-8');
  if (mainArticle) {
    mainArticle.innerHTML = `
      <div class="py-12 sm:py-16 px-4 text-center bg-white border border-slate-200 rounded-2xl shadow-soft">
        <div class="w-16 h-16 bg-rose-50 text-buser-red rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        </div>
        <h1 class="text-xl sm:text-2xl font-black text-slate-900 mb-2">${escapeHtml(title)}</h1>
        <p class="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
          ${escapeHtml(message)}
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <a href="index.html" class="inline-flex items-center px-5 py-2.5 bg-buser-red hover:bg-buser-redHover text-white text-xs font-bold rounded-full transition-colors shadow-xs">
            &larr; Kembali ke Beranda
          </a>
          <a href="internasional.html" class="inline-flex items-center px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-full transition-colors">
            Lihat Rubrik Berita
          </a>
        </div>
      </div>
    `;
  }

  // Sembunyikan section terkait & komentar jika artikel tidak ditemukan
  const relatedSection = document.getElementById('related-articles-grid')?.closest('section');
  if (relatedSection) relatedSection.style.display = 'none';

  const commentSection = document.getElementById('article-comment-section');
  if (commentSection) commentSection.style.display = 'none';
}

function renderLiveArticleDetail(article) {
  document.title = `${article.title} — Japakeh Post`;
  updateMetaTags(article);

  const breadcrumbCat = document.getElementById('article-breadcrumb-cat');
  const breadcrumbTitle = document.getElementById('article-breadcrumb-title');
  if (breadcrumbCat) {
    breadcrumbCat.textContent = article.name_kategori || 'Nasional';
    breadcrumbCat.href = `internasional.html?cat=${encodeURIComponent(article.kategori_slug || 'nasional')}`;
  }
  if (breadcrumbTitle) {
    breadcrumbTitle.textContent = article.title;
  }

  const catBadge = document.getElementById('article-cat-badge');
  const headline = document.getElementById('article-headline');
  const excerpt = document.getElementById('article-excerpt');

  const authorName = document.getElementById('article-author');
  const authorRole = document.getElementById('article-author-role');
  const authorImg = document.getElementById('article-author-img');
  const authorInitials = document.getElementById('article-author-initials');

  const editorContainer = document.getElementById('article-editor-container');
  const editorSeparator = document.getElementById('article-author-editor-separator');
  const editorName = document.getElementById('article-editor-name');
  const editorRole = document.getElementById('article-editor-role');
  const editorImg = document.getElementById('article-editor-img');
  const editorInitials = document.getElementById('article-editor-initials');

  const bottomAuthorName = document.getElementById('article-author-bottom-name');
  const bottomAuthorRole = document.getElementById('article-author-bottom-role');
  const bottomAuthorBio = document.getElementById('article-author-bottom-bio');
  const bottomAuthorImg = document.getElementById('article-author-bottom-img');
  const bottomAuthorInitials = document.getElementById('article-author-bottom-initials');

  const signoffAuthor = document.getElementById('article-signoff-author');
  const signoffEditor = document.getElementById('article-signoff-editor');
  const legacyEditor = document.getElementById('article-editor');

  const dateStr = document.getElementById('article-date');
  const heroImg = document.getElementById('article-hero-img');
  const heroCaption = document.getElementById('article-hero-caption');
  const bodyContent = document.getElementById('article-body-content');
  const viewsCount = document.getElementById('article-views');

  if (catBadge) catBadge.textContent = (article.name_kategori || 'NASIONAL').toUpperCase();
  if (headline) headline.textContent = article.title;
  if (excerpt) {
    const cleanExcerpt = (article.excerpt || '').trim();
    if (cleanExcerpt && cleanExcerpt !== article.title) {
      excerpt.textContent = cleanExcerpt;
      excerpt.classList.remove('hidden');
    } else {
      excerpt.textContent = '';
      excerpt.classList.add('hidden');
    }
  }

  // Author details (Penulis)
  const authorDisplayName = article.author_name || 'Al Bahri';
  const authorDisplayRole = article.author_role ? (article.author_role === 'Reporter' ? 'Wartawan Japakeh Post' : (article.author_role === 'Administrator' ? 'Pemimpin Redaksi' : article.author_role)) : 'Wartawan Japakeh Post';
  const authorDisplayBio = article.author_bio || 'Jurnalis dan redaksi Japakeh Post yang berfokus pada liputan mendalam, investigasi, dan akurasi informasi publik di Aceh dan sekitarnya.';
  const authorInitialStr = getInitials(authorDisplayName);

  if (authorName) authorName.textContent = authorDisplayName;
  if (authorRole) authorRole.textContent = authorDisplayRole;
  if (authorInitials) authorInitials.textContent = authorInitialStr;

  if (authorImg) {
    if (article.author_avatar && article.author_avatar.trim() !== '') {
      authorImg.src = article.author_avatar;
      authorImg.alt = authorDisplayName;
      authorImg.classList.remove('hidden');
      if (authorInitials) authorInitials.classList.add('hidden');
    } else {
      authorImg.src = '';
      authorImg.classList.add('hidden');
      if (authorInitials) authorInitials.classList.remove('hidden');
    }
    if (authorImg.parentElement) {
      authorImg.parentElement.title = `Penulis: ${authorDisplayName}`;
    }
  }

  // Bottom Author Card
  if (bottomAuthorName) bottomAuthorName.textContent = authorDisplayName;
  if (bottomAuthorRole) bottomAuthorRole.textContent = authorDisplayRole;
  if (bottomAuthorBio) bottomAuthorBio.textContent = authorDisplayBio;
  if (bottomAuthorInitials) bottomAuthorInitials.textContent = authorInitialStr;
  if (bottomAuthorImg) {
    if (article.author_avatar && article.author_avatar.trim() !== '') {
      bottomAuthorImg.src = article.author_avatar;
      bottomAuthorImg.alt = authorDisplayName;
      bottomAuthorImg.classList.remove('hidden');
      if (bottomAuthorInitials) bottomAuthorInitials.classList.add('hidden');
    } else {
      bottomAuthorImg.src = '';
      bottomAuthorImg.classList.add('hidden');
      if (bottomAuthorInitials) bottomAuthorInitials.classList.remove('hidden');
    }
  }

  // Editor details (Redaktur)
  const hasEditor = Boolean(
    article.editor_id && 
    article.editor_name && 
    String(article.editor_name).trim() !== '' &&
    String(article.editor_id) !== '0' &&
    String(article.editor_id) !== 'null'
  );

  const editorAvatarBox = document.getElementById('article-editor-avatar-box');

  if (hasEditor) {
    const editorDisplayName = String(article.editor_name).trim();
    const editorDisplayRole = article.editor_role ? (article.editor_role === 'Administrator' ? 'Pemimpin Redaksi' : article.editor_role) : 'Redaktur Pelaksana';
    const editorInitialStr = getInitials(editorDisplayName);

    if (editorContainer) editorContainer.classList.remove('hidden');
    if (editorSeparator) editorSeparator.classList.remove('hidden');
    if (editorAvatarBox) editorAvatarBox.classList.remove('hidden');
    if (editorName) editorName.textContent = editorDisplayName;
    if (editorRole) editorRole.textContent = editorDisplayRole;
    if (editorInitials) editorInitials.textContent = editorInitialStr;

    if (editorImg) {
      if (article.editor_avatar && article.editor_avatar.trim() !== '') {
        editorImg.src = article.editor_avatar;
        editorImg.alt = editorDisplayName;
        editorImg.classList.remove('hidden');
        if (editorInitials) editorInitials.classList.add('hidden');
      } else {
        editorImg.src = '';
        editorImg.classList.add('hidden');
        if (editorInitials) editorInitials.classList.remove('hidden');
      }
    }
    if (editorAvatarBox) {
      editorAvatarBox.title = `Editor: ${editorDisplayName}`;
    }

    if (signoffEditor) signoffEditor.textContent = editorDisplayName;
    if (legacyEditor) legacyEditor.textContent = editorDisplayName;
  } else {
    if (editorContainer) editorContainer.classList.add('hidden');
    if (editorSeparator) editorSeparator.classList.add('hidden');
    if (editorAvatarBox) editorAvatarBox.classList.add('hidden');
    if (editorName) editorName.textContent = '';
    if (editorRole) editorRole.textContent = '';
    if (editorInitials) editorInitials.textContent = '';
    if (editorImg) {
      editorImg.src = '';
      editorImg.classList.add('hidden');
    }

    if (signoffEditor) signoffEditor.textContent = '— (Penanggung Jawab Langsung)';
    if (legacyEditor) legacyEditor.textContent = '— (Penanggung Jawab Langsung)';
  }
  if (dateStr) {
    dateStr.textContent = formatDateIndo(article.published_at);
  }
  if (viewsCount) {
    const prevSep = viewsCount.previousElementSibling;
    if (prevSep && prevSep.textContent.includes('•')) {
      prevSep.remove();
    }
    viewsCount.remove();
  }
  if (heroImg) {
    heroImg.src = getThumb(article.thumbnail);
    heroImg.alt = article.title;
  }
  if (heroCaption) {
    const rawCaption = (article.caption || '').trim();
    if (rawCaption) {
      heroCaption.textContent = rawCaption;
    } else {
      heroCaption.textContent = `Dokumentasi Liputan: ${article.title} (Foto: Dok. Japakeh Post)`;
    }
  }

  // Setup Galeri Foto (Slider & Grid dengan Thumbnails di bawah foto)
  setupArticleGallery(article);

  if (bodyContent) {
    const rawContent = article.content || '<p>Tidak ada isi artikel yang tersedia.</p>';
    bodyContent.innerHTML = rawContent.replace(/(src=["'])\.\.\/assets\//g, '$1assets/');
    enhanceLinkCards(bodyContent);
    injectInArticleAd(bodyContent);
  }

  // Tags (Tabaca Style Dynamic Real Tags)
  const tagsContainer = document.getElementById('article-tags-container');
  if (tagsContainer) {
    let rawTags = [];
    if (Array.isArray(article.tag_list) && article.tag_list.length > 0) {
      rawTags = article.tag_list;
    } else if (typeof article.tags === 'string' && article.tags.trim() !== '') {
      rawTags = article.tags.split(',').map(t => t.trim()).filter(Boolean);
    } else if (Array.isArray(article.tags) && article.tags.length > 0) {
      rawTags = article.tags;
    }

    if (rawTags.length === 0) {
      rawTags = [article.name_kategori || 'Berita'];
      const words = (article.title || '').replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length >= 4);
      if (words.length > 0) rawTags.push(words[0]);
      if (words.length > 1) rawTags.push(words[1]);
      rawTags.push('Japakeh Post');
    }

    const uniqueTags = [...new Set(rawTags.map(t => String(t).trim()))].filter(Boolean);

    tagsContainer.innerHTML = uniqueTags.map(tag => `
      <a href="cari.html?q=${encodeURIComponent(tag)}" class="inline-flex items-center bg-slate-100 hover:bg-buser-red hover:text-white text-slate-700 text-xs px-3.5 py-1.5 rounded-full font-medium transition-colors shadow-2xs">
        #${escapeHtml(tag)}
      </a>
    `).join('');
  }

  // Reader Controls & Comments
  initFontSizeControls();
  initArticleBookmark(article.slug || article.id_artikel);
  initShareButtons(article);
  initReactions();
  renderRelatedArticles(article);
  renderRecentArticles(article.slug);
  renderSidebarPilihanRedaksi(article.slug);
  loadArticleComments(article.id_artikel, article.slug);
  initCommentForm(article.id_artikel, article.slug);
}

/**
 * Setup & Inisialisasi Galeri Foto Berita (Slider & Grid Synchronized)
 * Referensi UI & Penempatan: https://tabaca.id (Slider utama + Thumbnail track persis di bawah foto)
 */
function setupArticleGallery(article) {
  const singleMedia = document.getElementById('article-single-media');
  const galleryContainer = document.getElementById('article-gallery-container');
  if (!galleryContainer) return;

  // Ekstraksi item galeri dari artikel
  let galleryItems = [];
  const rawGallery = article.galeri || article.gallery || [];
  if (Array.isArray(rawGallery) && rawGallery.length > 0) {
    galleryItems = rawGallery.map((item, idx) => {
      if (typeof item === 'string') {
        return {
          id: idx + 1,
          url: item,
          caption: '',
          urutan: idx + 1
        };
      }
      return {
        id: item.id || (idx + 1),
        url: item.url || item.foto || item.foto_url || item.image || '',
        caption: (item.caption || item.keterangan || '').trim(),
        urutan: parseInt(item.urutan) || (idx + 1)
      };
    }).filter(item => Boolean(item.url));
  }

  // Fallback ke data seed JSON jika database belum menyimpan galeri untuk artikel ini
  if (galleryItems.length === 0 && window.ARTICLES_DATA && Array.isArray(window.ARTICLES_DATA)) {
    const matchedSeed = window.ARTICLES_DATA.find(s => 
      (article.slug && s.slug === article.slug) || 
      (article.id_artikel && (s.id == article.id_artikel || s.id_artikel == article.id_artikel)) ||
      (article.id && (s.id == article.id || s.id_artikel == article.id))
    );
    if (matchedSeed && (matchedSeed.gallery || matchedSeed.galeri)) {
      const seedGal = matchedSeed.gallery || matchedSeed.galeri;
      galleryItems = seedGal.map((item, idx) => ({
        id: idx + 1,
        url: typeof item === 'string' ? item : (item.url || item.foto || item.foto_url || item.image || ''),
        caption: typeof item === 'string' ? '' : (item.caption || item.keterangan || ''),
        urutan: idx + 1
      })).filter(item => Boolean(item.url));
    }
  }

  // Pastikan thumbnail berita menjadi foto pembuka (#1) galeri
  if (galleryItems.length > 0 && article.thumbnail && !article.thumbnail.includes('sorotan-utama-dunia')) {
    const cleanThumb = article.thumbnail.trim();
    const thumbIdx = galleryItems.findIndex(g => (g.url === cleanThumb || g.url.endsWith(cleanThumb) || cleanThumb.endsWith(g.url)));
    if (thumbIdx > 0) {
      const [chosen] = galleryItems.splice(thumbIdx, 1);
      galleryItems.unshift(chosen);
    } else if (thumbIdx === -1) {
      galleryItems.unshift({
        id: 0,
        url: cleanThumb,
        caption: (article.caption || '').trim(),
        urutan: 1
      });
    }
  }

  // Jika bukan artikel galeri, biarkan mode media tunggal aktif
  if (galleryItems.length === 0) {
    if (singleMedia) singleMedia.classList.remove('hidden');
    galleryContainer.classList.add('hidden');
    return;
  }

  // Sembunyikan media tunggal, aktifkan galeri
  if (singleMedia) singleMedia.classList.add('hidden');
  galleryContainer.classList.remove('hidden');

  // DOM Elemen
  const badgeCount = document.getElementById('gallery-badge-count');
  const toggleSlider = document.getElementById('gallery-toggle-slider');
  const toggleGrid = document.getElementById('gallery-toggle-grid');
  const openLightboxBtn = document.getElementById('gallery-open-lightbox');
  const sliderView = document.getElementById('gallery-slider-view');
  const gridView = document.getElementById('gallery-grid-view');
  const gridContainer = document.getElementById('gallery-grid-container');

  const mainImg = document.getElementById('gallery-main-img');
  const slideCounter = document.getElementById('gallery-slide-counter');
  const zoomTrigger = document.getElementById('gallery-zoom-trigger');
  const prevBtn = document.getElementById('gallery-prev-btn');
  const nextBtn = document.getElementById('gallery-next-btn');
  const mainCaption = document.getElementById('gallery-main-caption');

  const thumbPrevBtn = document.getElementById('gallery-thumb-prev-btn');
  const thumbNextBtn = document.getElementById('gallery-thumb-next-btn');
  const thumbsTrack = document.getElementById('gallery-thumbnails-track');

  // Lightbox Elemen
  const lightboxModal = document.getElementById('gallery-lightbox-modal');
  const lightboxMainImg = document.getElementById('lightbox-main-img');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
  const lightboxPrevBtn = document.getElementById('lightbox-prev-btn');
  const lightboxNextBtn = document.getElementById('lightbox-next-btn');

  const total = galleryItems.length;
  let activeIndex = 0;

  if (badgeCount) {
    badgeCount.textContent = `GALERI FOTO (${total} Foto)`;
  }

  // Render Thumbnail Slider Track (berada persis di bawah foto & keterangan)
  if (thumbsTrack) {
    thumbsTrack.innerHTML = '';
    galleryItems.forEach((item, idx) => {
      const thumbBtn = document.createElement('button');
      thumbBtn.type = 'button';
      thumbBtn.className = `gallery-thumb-item shrink-0 relative w-20 sm:w-24 h-14 sm:h-16 rounded-lg overflow-hidden border-2 transition-all cursor-pointer select-none bg-slate-900 group ${
        idx === activeIndex 
          ? 'active border-buser-red ring-2 ring-buser-red/40 scale-100 opacity-100 shadow-xs' 
          : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'
      }`;
      thumbBtn.dataset.index = idx;
      thumbBtn.title = item.caption || `Foto ${idx + 1}`;

      const img = document.createElement('img');
      img.src = getThumb(item.url);
      img.alt = `Thumbnail ${idx + 1}`;
      img.className = 'w-full h-full object-cover pointer-events-none';
      img.loading = 'lazy';
      img.onerror = () => { img.src = 'assets/images/berita/hero/sorotan-utama-dunia.jpg'; };

      const numBadge = document.createElement('span');
      numBadge.className = 'absolute bottom-1 right-1 bg-black/75 backdrop-blur-2xs text-white text-[10px] font-bold px-1.5 py-0.2 rounded shadow-2xs';
      numBadge.textContent = `#${idx + 1}`;

      thumbBtn.appendChild(img);
      thumbBtn.appendChild(numBadge);

      thumbBtn.addEventListener('click', () => {
        goToSlide(idx);
      });

      thumbsTrack.appendChild(thumbBtn);
    });
  }

  // Render Grid View
  if (gridContainer) {
    gridContainer.innerHTML = '';
    galleryItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'bg-white rounded-xl overflow-hidden border border-slate-200 shadow-2xs hover:shadow-md transition-all group flex flex-col cursor-pointer';
      card.innerHTML = `
        <div class="relative overflow-hidden aspect-[16/9] bg-slate-900">
          <img src="${escapeHtml(getThumb(item.url))}" alt="Foto ${idx + 1}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.src='assets/images/berita/hero/sorotan-utama-dunia.jpg'" />
          <span class="absolute top-2 left-2 bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-full border border-white/10">
            Foto ${idx + 1}/${total}
          </span>
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
            <span class="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white p-2.5 rounded-full shadow-md">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"/></svg>
            </span>
          </div>
        </div>
        <div class="p-3 flex-1 flex flex-col justify-between bg-white">
          <p class="text-xs text-slate-700 leading-relaxed line-clamp-3">
            ${escapeHtml(item.caption || `Dokumentasi lensa foto ke-${idx + 1}`)}
          </p>
          <span class="text-[11px] text-buser-red font-semibold mt-2.5 inline-flex items-center gap-1 group-hover:underline">
            Lihat Layar Penuh &rarr;
          </span>
        </div>
      `;
      card.addEventListener('click', () => {
        openLightbox(idx);
      });
      gridContainer.appendChild(card);
    });
  }

  // Fungsi perpindahan slide
  function goToSlide(index) {
    if (index < 0) index = total - 1;
    if (index >= total) index = 0;
    activeIndex = index;
    const cur = galleryItems[activeIndex];

    if (mainImg) {
      mainImg.classList.add('slide-fade');
      const tempImg = new Image();
      tempImg.onload = () => {
        mainImg.src = getThumb(cur.url);
        mainImg.alt = cur.caption || `Foto ${activeIndex + 1}`;
        mainImg.classList.remove('slide-fade');
      };
      tempImg.onerror = () => {
        mainImg.src = getThumb(cur.url);
        mainImg.classList.remove('slide-fade');
      };
      tempImg.src = getThumb(cur.url);
    }

    if (slideCounter) {
      slideCounter.textContent = `Foto ${activeIndex + 1} dari ${total}`;
    }

    if (mainCaption) {
      const captionText = cur.caption ? cur.caption : `Dokumentasi foto ke-${activeIndex + 1} liputan ${article.title}`;
      mainCaption.textContent = captionText;
    }

    // Sinkronisasi thumbnail aktif
    if (thumbsTrack) {
      const allThumbs = thumbsTrack.querySelectorAll('.gallery-thumb-item');
      allThumbs.forEach((btn, idx) => {
        if (idx === activeIndex) {
          btn.classList.add('active', 'border-buser-red', 'ring-2', 'ring-buser-red/40', 'opacity-100', 'shadow-xs');
          btn.classList.remove('border-slate-200', 'opacity-60');
          // Smooth scroll thumbnail aktif ke tengah viewport track
          btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } else {
          btn.classList.remove('active', 'border-buser-red', 'ring-2', 'ring-buser-red/40', 'opacity-100', 'shadow-xs');
          btn.classList.add('border-slate-200', 'opacity-60');
        }
      });
    }

    // Sinkronisasi modal lightbox jika sedang terbuka
    if (lightboxModal && !lightboxModal.classList.contains('hidden')) {
      syncLightbox();
    }
  }

  // Navigasi horizontal track thumbnail
  if (thumbPrevBtn && thumbsTrack) {
    thumbPrevBtn.addEventListener('click', () => {
      thumbsTrack.scrollBy({ left: -220, behavior: 'smooth' });
    });
  }
  if (thumbNextBtn && thumbsTrack) {
    thumbNextBtn.addEventListener('click', () => {
      thumbsTrack.scrollBy({ left: 220, behavior: 'smooth' });
    });
  }

  // Tombol navigasi prev & next slider utama
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(activeIndex - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(activeIndex + 1);
    });
  }

  // Buka lightbox saat klik foto utama atau ikon zoom
  if (mainImg) {
    mainImg.addEventListener('click', () => openLightbox(activeIndex));
  }
  if (zoomTrigger) {
    zoomTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(activeIndex);
    });
  }
  if (openLightboxBtn) {
    openLightboxBtn.addEventListener('click', () => openLightbox(activeIndex));
  }

  // Pengalih Tampilan (Slider vs Grid)
  if (toggleSlider && toggleGrid && sliderView && gridView) {
    toggleSlider.addEventListener('click', () => {
      sliderView.classList.remove('hidden');
      sliderView.classList.add('block');
      gridView.classList.remove('block');
      gridView.classList.add('hidden');

      toggleSlider.className = 'px-2.5 py-1 text-xs font-bold rounded-md transition-all bg-white text-slate-900 shadow-2xs flex items-center gap-1';
      toggleGrid.className = 'px-2.5 py-1 text-xs font-medium rounded-md transition-all text-slate-600 hover:text-slate-900 flex items-center gap-1';
    });

    toggleGrid.addEventListener('click', () => {
      sliderView.classList.remove('block');
      sliderView.classList.add('hidden');
      gridView.classList.remove('hidden');
      gridView.classList.add('block');

      toggleGrid.className = 'px-2.5 py-1 text-xs font-bold rounded-md transition-all bg-white text-slate-900 shadow-2xs flex items-center gap-1';
      toggleSlider.className = 'px-2.5 py-1 text-xs font-medium rounded-md transition-all text-slate-600 hover:text-slate-900 flex items-center gap-1';
    });
  }

  // Fungsi Lightbox Fullscreen
  function syncLightbox() {
    const cur = galleryItems[activeIndex];
    if (lightboxMainImg) {
      lightboxMainImg.src = getThumb(cur.url);
      lightboxMainImg.alt = cur.caption || `Foto ${activeIndex + 1}`;
    }
    if (lightboxCounter) {
      lightboxCounter.textContent = `Foto ${activeIndex + 1} dari ${total}`;
    }
    if (lightboxCaption) {
      lightboxCaption.textContent = cur.caption || `Dokumentasi foto ke-${activeIndex + 1} liputan ${article.title}`;
    }
  }

  function openLightbox(index) {
    activeIndex = index;
    syncLightbox();
    if (lightboxModal) {
      lightboxModal.classList.remove('hidden');
      lightboxModal.classList.add('flex');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeLightbox() {
    if (lightboxModal) {
      lightboxModal.classList.add('hidden');
      lightboxModal.classList.remove('flex');
      document.body.style.overflow = '';
    }
  }

  if (lightboxCloseBtn) {
    lightboxCloseBtn.addEventListener('click', closeLightbox);
  }
  if (lightboxPrevBtn) {
    lightboxPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(activeIndex - 1);
    });
  }
  if (lightboxNextBtn) {
    lightboxNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      goToSlide(activeIndex + 1);
    });
  }
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal || e.target.id === 'lightbox-main-img') {
        // Jangan close jika klik langsung pada foto
      } else if (e.target.closest('#lightbox-prev-btn') || e.target.closest('#lightbox-next-btn') || e.target.closest('#lightbox-caption')) {
        // Kontrol internal
      } else {
        closeLightbox();
      }
    });
  }

  // Navigasi Keyboard (Arrow Left / Right & Escape)
  window.addEventListener('keydown', (e) => {
    const isLightboxOpen = lightboxModal && !lightboxModal.classList.contains('hidden');
    if (isLightboxOpen) {
      if (e.key === 'Escape') {
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        goToSlide(activeIndex - 1);
      } else if (e.key === 'ArrowRight') {
        goToSlide(activeIndex + 1);
      }
    } else {
      const rect = galleryContainer.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (inView && sliderView && !sliderView.classList.contains('hidden')) {
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (!['input', 'textarea'].includes(activeTag)) {
          if (e.key === 'ArrowLeft') {
            goToSlide(activeIndex - 1);
          } else if (e.key === 'ArrowRight') {
            goToSlide(activeIndex + 1);
          }
        }
      }
    }
  });

  // Dukungan Swipe Touch Mobile pada Slider Utama
  let touchStartX = 0;
  let touchEndX = 0;
  if (sliderView) {
    sliderView.addEventListener('touchstart', (e) => {
      if (e.changedTouches && e.changedTouches.length > 0) {
        touchStartX = e.changedTouches[0].screenX;
      }
    }, { passive: true });
    sliderView.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length > 0) {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (diff > 45) {
          goToSlide(activeIndex - 1);
        } else if (diff < -45) {
          goToSlide(activeIndex + 1);
        }
      }
    }, { passive: true });
  }

  // Dukungan Swipe Touch Mobile pada Lightbox
  if (lightboxModal) {
    lightboxModal.addEventListener('touchstart', (e) => {
      if (e.changedTouches && e.changedTouches.length > 0) {
        touchStartX = e.changedTouches[0].screenX;
      }
    }, { passive: true });
    lightboxModal.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length > 0) {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (diff > 45) {
          goToSlide(activeIndex - 1);
        } else if (diff < -45) {
          goToSlide(activeIndex + 1);
        }
      }
    }, { passive: true });
  }

  // Inisialisasi awal ke slide pertama
  goToSlide(0);
}

/* --------------------------------------------------------------------------
   Link Card Enhancer (FR-14/FR-15/FR-16) — sanitasi + normalisasi kartu hasil editor
   Kartu tetap <a> native agar crawlable. Dipanggil SETELAH innerHTML,
   SEBELUM injectInArticleAd agar iklan tidak tersisip di tengah node kartu.
   -------------------------------------------------------------------------- */
function enhanceLinkCards(bodyContent) {
  if (!bodyContent) return;
  const scopeUrl = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? window.location.origin
    : '';

  function isExternal(href) {
    try {
      const u = new URL(href, scopeUrl || undefined);
      if (!scopeUrl) return /^https?:\/\//i.test(href);
      return u.origin !== scopeUrl;
    } catch (e) {
      return /^https?:\/\//i.test(href);
    }
  }

  // 1. Normalisasi kartu editor (a.jp-link-card)
  const cards = bodyContent.querySelectorAll('a.jp-link-card');
  cards.forEach((a) => {
    const rawHref = a.getAttribute('href') || a.dataset.url || '';
    if (!/^https?:\/\//i.test(rawHref)) {
      // href berbahaya -> degrade ke teks polos
      const span = document.createElement('span');
      span.textContent = a.textContent || rawHref || '';
      a.replaceWith(span);
      return;
    }
    a.setAttribute('href', rawHref);
    a.setAttribute('target', '_blank');
    const external = isExternal(rawHref);
    a.setAttribute('rel', external ? 'noopener noreferrer nofollow' : 'noopener noreferrer');

    // pastikan struktur body minimal ada (data-* sudah di-embed saat insert)
    if (!a.querySelector('.jp-link-card__body')) {
      const title = a.dataset.title || a.textContent || rawHref;
      const body = document.createElement('span');
      body.className = 'jp-link-card__body';
      const site = document.createElement('span');
      site.className = 'jp-link-card__site';
      site.textContent = a.dataset.site || '';
      const t = document.createElement('span');
      t.className = 'jp-link-card__title';
      t.textContent = title;
      body.appendChild(site);
      body.appendChild(t);
      if (a.dataset.desc) {
        const d = document.createElement('span');
        d.className = 'jp-link-card__desc';
        d.textContent = a.dataset.desc;
        body.appendChild(d);
      }
      a.textContent = '';
      const imgSrc = a.dataset.image || '';
      if (/^https?:\/\//i.test(imgSrc)) {
        const img = document.createElement('img');
        img.className = 'jp-link-card__img';
        img.src = imgSrc;
        img.alt = title;
        img.loading = 'lazy';
        img.setAttribute('onerror', 'this.remove()');
        a.appendChild(img);
      }
      a.appendChild(body);
    }

    // pastikan img lazy + aman
    const img = a.querySelector('img.jp-link-card__img');
    if (img) {
      const src = img.getAttribute('src') || '';
      if (!/^https?:\/\//i.test(src)) {
        img.remove();
        a.classList.add('no-img');
      } else {
        img.setAttribute('loading', 'lazy');
        img.setAttribute('onerror', 'this.remove()');
        if (!img.getAttribute('alt')) {
          img.setAttribute('alt', a.dataset.title || '');
        }
      }
    } else {
      a.classList.add('no-img');
    }
  });

  // 2. Link polos: samakan perilaku eksternal (target/rel) tanpa mengubah tampilan (FR-06 kompatibel)
  // Catatan: selector dikecualikan dari [data-jp-link] agar tidak double-track dengan kartu.
  const plainLinks = bodyContent.querySelectorAll('a:not(.jp-link-card):not([data-jp-link])');
  plainLinks.forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (!/^https?:\/\//i.test(href)) return;
    if (isExternal(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });

  // 3. Metrik klik dasar (CTR kartu vs teks)
  if (!bodyContent.dataset.jpLinkTracked) {
    bodyContent.dataset.jpLinkTracked = '1';
    bodyContent.addEventListener('click', (e) => {
      const a = e.target && e.target.closest ? e.target.closest('a[data-jp-link="card"], a:not(.jp-link-card)') : null;
      if (!a || !bodyContent.contains(a)) return;
      try {
        const kind = a.classList.contains('jp-link-card') ? 'card' : 'text';
        if (window.console && window.console.debug) {
          window.console.debug('[link-card] click', kind, a.href);
        }
        document.dispatchEvent(new CustomEvent('jp:link-click', {
          detail: { kind, href: a.getAttribute('href') || '' }
        }));
      } catch (err) { /* abaikan */ }
    });
  }
}

/**
 * Sisipkan Slot Iklan Artikel di Akhir Bacaan (Sebelum Bagikan Berita Ini)
 */
function injectInArticleAd(bodyContent) {
  const adSlot = document.querySelector('[data-ad-slot="article_middle"]');
  if (!adSlot || !bodyContent) return;

  // Iklan diletakkan tepat di akhir konten berita sebelum bar bagikan berita
  bodyContent.after(adSlot);
}

async function renderArticleTrending() {
  const container = document.getElementById('article-trending-feed');
  if (!container) return;

  try {
    let articles = [];
    if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getArticles === 'function') {
      const res = await window.BuserInfoAPI.getArticles({ limit: 5, status: 'published' });
      articles = res.articles || [];
    }

    if (!articles || articles.length === 0) {
      container.innerHTML = `
        <div class="py-6 text-center text-xs text-slate-400">
          Belum ada berita populer saat ini.
        </div>
      `;
      return;
    }

    container.innerHTML = articles.map((item, idx) => `
      <div class="list-popular-tabaca group">
        <span class="popular-counter ${idx >= 3 ? 'rank-other' : ''}">${idx + 1}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="post-category-pill">${escapeHtml(item.name_kategori || 'Berita').toUpperCase()}</span>
            <time class="text-[10px] text-slate-400 font-medium">${formatDateShort(item.published_at)}</time>
          </div>
          <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="block font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-buser-red leading-snug line-clamp-2 transition-colors">
            ${escapeHtml(item.title)}
          </a>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="py-4 text-center text-xs text-slate-400">Belum ada data populer saat ini.</div>`;
  }
}

/* --------------------------------------------------------------------------
   Font Size Resizing (A- / Normal / A+)
   -------------------------------------------------------------------------- */
function initFontSizeControls() {
  const btnSm = document.getElementById('font-decrease-btn');
  const btnMd = document.getElementById('font-reset-btn');
  const btnLg = document.getElementById('font-increase-btn');
  const contentBody = document.getElementById('article-body-content');

  if (!contentBody) return;

  function setSize(size) {
    currentFontSize = size;
    contentBody.classList.remove('article-text-sm', 'article-text-md', 'article-text-lg');
    contentBody.classList.add(`article-text-${size}`);

    [btnSm, btnMd, btnLg].forEach(b => {
      if (b) {
        b.classList.remove('bg-buser-red', 'text-white', 'font-bold', 'border-buser-red');
        b.classList.add('bg-white', 'text-slate-700', 'border-slate-200');
      }
    });

    const activeBtn = size === 'sm' ? btnSm : (size === 'md' ? btnMd : btnLg);
    if (activeBtn) {
      activeBtn.classList.remove('bg-white', 'text-slate-700', 'border-slate-200');
      activeBtn.classList.add('bg-buser-red', 'text-white', 'font-bold', 'border-buser-red');
    }
  }

  if (btnSm) btnSm.addEventListener('click', () => setSize('sm'));
  if (btnMd) btnMd.addEventListener('click', () => setSize('md'));
  if (btnLg) btnLg.addEventListener('click', () => setSize('lg'));

  setSize('md');
}

/* --------------------------------------------------------------------------
   Bookmark State Toggle
   -------------------------------------------------------------------------- */
function initArticleBookmark(articleId) {
  const bookmarkBtn = document.getElementById('article-bookmark-btn');
  const bookmarkText = document.getElementById('article-bookmark-text');
  const bookmarkIcon = document.getElementById('article-bookmark-icon');

  if (!bookmarkBtn) return;

  function syncState() {
    const active = window.isBookmarked(articleId);
    if (active) {
      bookmarkBtn.classList.add('bg-red-50', 'border-buser-red', 'text-buser-red');
      if (bookmarkText) bookmarkText.textContent = 'Tersimpan';
      if (bookmarkIcon) {
        bookmarkIcon.innerHTML = `<path fill="currentColor" stroke="none" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />`;
      }
    } else {
      bookmarkBtn.classList.remove('bg-red-50', 'border-buser-red', 'text-buser-red');
      if (bookmarkText) bookmarkText.textContent = 'Simpan Berita';
      if (bookmarkIcon) {
        bookmarkIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />`;
      }
    }
  }

  syncState();

  bookmarkBtn.addEventListener('click', () => {
    window.toggleBookmark(articleId);
    syncState();
  });
}

/* --------------------------------------------------------------------------
   Share Buttons & Dynamic Open Graph DOM Synchronization
   -------------------------------------------------------------------------- */
function updateMetaTags(article) {
  if (!article || !article.title) return;

  const rawExcerpt = (article.excerpt || '').trim();
  let cleanExcerpt = rawExcerpt;
  if (!cleanExcerpt && article.content) {
    cleanExcerpt = article.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleanExcerpt.length > 170) {
      cleanExcerpt = cleanExcerpt.substring(0, 167) + '...';
    }
  }
  if (!cleanExcerpt) {
    cleanExcerpt = 'Baca berita dan laporan terkini, akurat, dan terpercaya di portal berita Japakeh Post.';
  }

  // Buat URL absolut untuk thumbnail berita
  const thumbRelative = getThumb(article.thumbnail);
  const absoluteImageUrl = new URL(thumbRelative, window.location.origin).href;
  const canonicalUrl = window.location.href;

  const setMeta = (selector, attr, val) => {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement('meta');
      const isProp = selector.includes('property=');
      if (isProp) {
        const m = selector.match(/meta\[property="([^"]+)"\]/);
        if (m) el.setAttribute('property', m[1]);
      } else {
        const m = selector.match(/meta\[name="([^"]+)"\]/);
        if (m) el.setAttribute('name', m[1]);
      }
      document.head.appendChild(el);
    }
    el.setAttribute(attr, val);
  };

  setMeta('meta[name="description"]', 'content', cleanExcerpt);
  setMeta('meta[property="og:title"]', 'content', article.title);
  setMeta('meta[property="og:description"]', 'content', cleanExcerpt);
  setMeta('meta[property="og:image"]', 'content', absoluteImageUrl);
  setMeta('meta[property="og:image:secure_url"]', 'content', absoluteImageUrl);
  setMeta('meta[property="og:url"]', 'content', canonicalUrl);
  setMeta('meta[name="twitter:title"]', 'content', article.title);
  setMeta('meta[name="twitter:description"]', 'content', cleanExcerpt);
  setMeta('meta[name="twitter:image"]', 'content', absoluteImageUrl);

  let canonicalEl = document.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonicalUrl);
}

function initShareButtons(article) {
  let rawTitle = (article && article.title) ? article.title.trim() : '';
  if (!rawTitle) {
    const hl = document.getElementById('article-headline');
    if (hl && hl.textContent.trim()) {
      rawTitle = hl.textContent.trim();
    } else {
      rawTitle = (document.title || '').replace(/\s*[—–-]\s*Japakeh Post.*$/i, '').trim();
    }
  }

  // Fungsi pembuat URL share yang selalu segar & unik setiap kali tombol ditekan
  const buildFreshShareUrl = () => {
    let base = window.location.href;
    if (base.includes('artikel.html')) {
      base = base.replace('artikel.html', 'artikel.php');
    }
    // Hapus parameter v= lama jika ada di URL
    base = base.replace(/([?&])v=[^&]*(&|$)/, '$1').replace(/[?&]$/, '');

    // Stempel waktu saat tombol ditekan (presisi detik + 3 digit acak agar 100% unik per klik)
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const randSuffix = Math.floor(Math.random() * 900 + 100);
    const freshVersion = `${timeStamp}${randSuffix}`;

    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}v=${freshVersion}`;
  };

  // Set href awal untuk fallback (misal klik kanan -> 'Copy link address')
  const updateInitialHrefs = () => {
    const initialUrl = buildFreshShareUrl();
    const waMsg = `${rawTitle}\n\n${initialUrl}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waMsg)}`;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(initialUrl)}`;
    const twUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(rawTitle)}&url=${encodeURIComponent(initialUrl)}`;
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(initialUrl)}&text=${encodeURIComponent(rawTitle)}`;

    const setBtn = (id, href) => {
      const el = document.getElementById(id);
      if (el) el.href = href;
    };

    setBtn('share-wa', waUrl);
    setBtn('share-fb', fbUrl);
    setBtn('share-tw', twUrl);
    setBtn('share-tg', tgUrl);
    setBtn('share-wa-bottom', waUrl);
    setBtn('share-fb-bottom', fbUrl);
    setBtn('share-tw-bottom', twUrl);
    setBtn('share-tg-bottom', tgUrl);
  };

  updateInitialHrefs();

  // Handler klik dinamis per platform agar SETIAP KLIK menghasilkan URL baru yang fresh
  const bindDynamicClick = (id, platform) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const freshUrl = buildFreshShareUrl();
      let targetUrl = '';
      if (platform === 'wa') {
        const waMsg = `${rawTitle}\n\n${freshUrl}`;
        targetUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waMsg)}`;
      } else if (platform === 'fb') {
        targetUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(freshUrl)}`;
      } else if (platform === 'tw') {
        targetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(rawTitle)}&url=${encodeURIComponent(freshUrl)}`;
      } else if (platform === 'tg') {
        targetUrl = `https://t.me/share/url?url=${encodeURIComponent(freshUrl)}&text=${encodeURIComponent(rawTitle)}`;
      }
      if (targetUrl) {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    });
  };

  bindDynamicClick('share-wa', 'wa');
  bindDynamicClick('share-fb', 'fb');
  bindDynamicClick('share-tw', 'tw');
  bindDynamicClick('share-tg', 'tg');
  bindDynamicClick('share-wa-bottom', 'wa');
  bindDynamicClick('share-fb-bottom', 'fb');
  bindDynamicClick('share-tw-bottom', 'tw');
  bindDynamicClick('share-tg-bottom', 'tg');

  // Aksi Salin Tautan Dinamis (Menyertakan judul berita + tautan ke clipboard)
  const copyAction = (e) => {
    e.preventDefault();
    const freshUrl = buildFreshShareUrl();
    const textToCopy = rawTitle ? `${rawTitle}\n\n${freshUrl}` : freshUrl;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => {
          if (typeof window.showToast === 'function') {
            window.showToast('Judul dan tautan berita berhasil disalin ke clipboard!', 'success');
          } else {
            alert('Judul dan tautan berita berhasil disalin!');
          }
        })
        .catch(() => {
          fallbackCopyText(textToCopy);
        });
    } else {
      fallbackCopyText(textToCopy);
    }
  };

  const copyTop = document.getElementById('share-copy');
  const copyBottom = document.getElementById('share-copy-bottom');
  if (copyTop) copyTop.onclick = copyAction;
  if (copyBottom) copyBottom.onclick = copyAction;
}

function fallbackCopyText(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    if (typeof window.showToast === 'function') {
      window.showToast('Judul dan tautan berita berhasil disalin ke clipboard!', 'success');
    } else {
      alert('Judul dan tautan berita berhasil disalin!');
    }
  } catch (err) {
    prompt('Salin tautan berita berikut:', text);
  }
  document.body.removeChild(ta);
}

/* --------------------------------------------------------------------------
   Reading Progress Bar
   -------------------------------------------------------------------------- */
function initReadingProgressBar() {
  const bar = document.getElementById('reading-progress-bar');
  if (!bar) return;

  window.addEventListener('scroll', () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (totalHeight <= 0) return;
    const progress = (window.scrollY / totalHeight) * 100;
    bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  });
}

/* --------------------------------------------------------------------------
   Related Articles (Tabaca Style 3-Col Grid dengan Multi-Tier Relevance Engine)
   -------------------------------------------------------------------------- */
async function renderRelatedArticles(articleInput, categorySlugInput) {
  const container = document.getElementById('related-articles-grid');
  const section = container ? container.closest('section') : null;
  if (!container) return;

  // Normalisasi input (bisa objek article utuh atau string slug)
  const isObj = typeof articleInput === 'object' && articleInput !== null;
  const currentSlug = isObj ? (articleInput.slug || '') : String(articleInput || '');
  const currentCatSlug = isObj ? (articleInput.kategori_slug || '') : String(categorySlugInput || '');
  const currentTitle = isObj ? (articleInput.title || '') : '';

  // Ekstraksi tag artikel saat ini
  let targetTags = [];
  if (isObj) {
    if (Array.isArray(articleInput.tag_list) && articleInput.tag_list.length > 0) {
      targetTags = articleInput.tag_list;
    } else if (typeof articleInput.tags === 'string' && articleInput.tags.trim() !== '') {
      targetTags = articleInput.tags.split(',').map(t => t.trim()).filter(Boolean);
    } else if (Array.isArray(articleInput.tags)) {
      targetTags = articleInput.tags;
    }
  }

  // Tampilkan indikator loading halus jika grid masih kosong
  if (!container.children.length) {
    container.innerHTML = `
      <div class="col-span-1 sm:col-span-2 md:col-span-3 py-6 text-center text-xs text-slate-400">
        <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-buser-red inline-block" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        Memuat rekomendasi berita terkait...
      </div>
    `;
  }

  try {
    let related = [];

    // 1. Prioritas Utama: Panggil API Backend Rekomendasi Cerdas (GET /api/artikel.php?related_to=...)
    if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getRelatedArticles === 'function' && currentSlug) {
      try {
        const apiRelated = await window.BuserInfoAPI.getRelatedArticles(currentSlug, { limit: 6 });
        if (Array.isArray(apiRelated) && apiRelated.length > 0) {
          related = apiRelated;
        }
      } catch (err) {
        console.warn('[article.js] API getRelatedArticles gagal, menggunakan fallback klien:', err);
      }
    }

    // 2. Fallback Klien Cerdas jika endpoint API belum mengembalikan kandidat
    if (related.length === 0 && window.BuserInfoAPI && typeof window.BuserInfoAPI.getArticles === 'function') {
      const res = await window.BuserInfoAPI.getArticles({ limit: 60, status: 'published' });
      const allArticles = res && Array.isArray(res.articles) ? res.articles : [];

      const targetTagsLower = targetTags.map(t => String(t).toLowerCase().trim()).filter(Boolean);
      const stopWords = [
        'dan','yang','untuk','pada','ke','dari','di','ini','itu','dengan','adalah','akan','bisa',
        'oleh','karena','maka','bagi','foto','video','juga','telah','lebih','saat','hari',
        'menjadi','resmi','terbaru','terkini','siap','sudah','dalam','kita','kami','mereka'
      ];
      const titleKeywords = (currentTitle || '')
        .toLowerCase()
        .replace(/[^\w\s]/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 4 && !stopWords.includes(w));

      // Scoring multi-tier di sisi klien
      const scored = allArticles
        .filter(item => item.slug !== currentSlug)
        .map(item => {
          let score = 0;
          let matchedTags = [];

          // A. Tag match (+50 poin per tag cocok)
          const itemTags = Array.isArray(item.tag_list)
            ? item.tag_list
            : (typeof item.tags === 'string' ? item.tags.split(',').map(t => t.trim()) : []);

          itemTags.forEach(t => {
            const tl = String(t).toLowerCase().trim();
            if (targetTagsLower.includes(tl)) {
              score += 50;
              matchedTags.push(t);
            }
          });

          // B. Kategori match (+30 poin jika se-rubrik)
          const sameCat = (item.kategori_slug && currentCatSlug && item.kategori_slug === currentCatSlug) ||
                          (item.name_kategori && isObj && item.name_kategori === articleInput.name_kategori);
          if (sameCat) {
            score += 30;
          }

          // C. Kata kunci judul (+15 poin per kata kunci cocok)
          const itemTitleLower = (item.title || '').toLowerCase();
          titleKeywords.forEach(kw => {
            if (itemTitleLower.includes(kw)) {
              score += 15;
            }
          });

          // D. Freshness & views boost
          const views = typeof item.views === 'number' ? item.views : (parseInt(String(item.views || '0').replace(/\D/g, ''), 10) || 0);
          score += Math.min(5, views / 2500);

          return {
            ...item,
            relevance_score: score,
            matched_tags: [...new Set(matchedTags)],
            same_category: sameCat
          };
        });

      // Urutkan berdasarkan skor tertinggi, lalu tanggal terbaru
      scored.sort((a, b) => {
        if (b.relevance_score !== a.relevance_score) {
          return b.relevance_score - a.relevance_score;
        }
        return new Date(b.published_at || 0) - new Date(a.published_at || 0);
      });

      related = scored;
    }

    // 3. Filter duplikat dan pastikan tidak memunculkan artikel yang sedang dibaca
    const filtered = related.filter(item => item.slug !== currentSlug);

    // 4. Jika benar-benar belum ada data artikel sama sekali di sistem
    if (filtered.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }

    // Pastikan section selalu aktif dan tampil anggun
    if (section) section.style.display = '';

    // Ambil 3 artikel terbaik untuk tata letak 3-kolom Tabaca
    const displayList = filtered.slice(0, 3);

    container.innerHTML = displayList.map(item => {
      const catName = escapeHtml(item.name_kategori || 'BERITA').toUpperCase();
      const firstMatchedTag = Array.isArray(item.matched_tags) && item.matched_tags.length > 0 ? item.matched_tags[0] : null;

      return `
        <article class="bg-white border border-slate-200/90 rounded-2xl overflow-hidden group flex flex-col justify-between shadow-2xs hover:shadow-md hover:border-buser-red/40 transition-all duration-300">
          <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="block overflow-hidden relative aspect-video bg-slate-900">
            <img src="${getThumb(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span class="absolute top-2.5 left-2.5 px-2.5 py-1 bg-buser-red text-white text-[10px] font-black tracking-wider uppercase rounded-md shadow-xs">
              ${catName}
            </span>
          </a>
          <div class="p-4 flex flex-col flex-1 justify-between">
            <div>
              ${firstMatchedTag ? `
                <div class="flex items-center gap-1.5 mb-2">
                  <span class="inline-flex items-center text-[10px] font-bold text-buser-red bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                    #${escapeHtml(firstMatchedTag)}
                  </span>
                  <span class="text-[10px] text-slate-400 font-medium">Topik Serupa</span>
                </div>
              ` : ''}
              <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="block font-bold text-xs sm:text-sm text-slate-900 group-hover:text-buser-red line-clamp-2 leading-snug mb-2.5 transition-colors">
                ${escapeHtml(item.title)}
              </a>
            </div>
            <div class="flex items-center justify-between gap-1.5 pt-2.5 border-t border-slate-100 mt-auto">
              <span class="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                ${formatDateShort(item.published_at)}
              </span>
              <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="text-[11px] font-bold text-buser-red hover:underline flex items-center gap-0.5">
                Baca Berita &rarr;
              </a>
            </div>
          </div>
        </article>
      `;
    }).join('');
  } catch (err) {
    console.warn('[article.js] Error rendering related articles:', err);
  }
}

/* --------------------------------------------------------------------------
   Recent Articles / Berita Terkini (Tabaca Style Horizontal List)
   -------------------------------------------------------------------------- */
async function renderRecentArticles(currentSlug) {
  const container = document.getElementById('recent-articles-list');
  const section = container ? container.closest('section') : null;
  if (!container) return;

  try {
    let all = [];
    if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getArticles === 'function') {
      const res = await window.BuserInfoAPI.getArticles({ limit: 6, status: 'published' });
      all = res && Array.isArray(res.articles) ? res.articles : [];
    }

    const recent = all.filter(item => item.slug !== currentSlug).slice(0, 5);
    if (recent.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }

    if (section) section.style.display = '';
    container.innerHTML = recent.map(item => {
      const rawExcerpt = item.excerpt || (item.content ? item.content.replace(/<[^>]+>/g, ' ').trim() : '');
      const cleanExcerpt = rawExcerpt && rawExcerpt.length > 110 ? rawExcerpt.substring(0, 107) + '...' : rawExcerpt;

      return `
        <div class="recent-post-row group">
          <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="block w-full aspect-[16/10] sm:aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 shrink-0 shadow-2xs">
            <img src="${getThumb(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'">
          </a>
          <div class="min-w-0 flex flex-col justify-center">
            <div class="flex items-center gap-2 mb-1 sm:mb-1.5">
              <span class="post-category-pill">${escapeHtml(item.name_kategori || 'Berita').toUpperCase()}</span>
              <time class="text-[10px] sm:text-[11px] text-slate-400 font-medium">${formatDateShort(item.published_at)}</time>
            </div>
            <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="block font-bold text-xs sm:text-sm md:text-[15px] text-slate-900 group-hover:text-buser-red line-clamp-2 leading-snug transition-colors">
              ${escapeHtml(item.title)}
            </a>
            ${cleanExcerpt ? `<p class="text-xs text-slate-500 line-clamp-1 mt-1 hidden sm:block leading-relaxed">${escapeHtml(cleanExcerpt)}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    if (section) section.style.display = 'none';
  }
}

/* --------------------------------------------------------------------------
   Sidebar Pilihan Redaksi (Tabaca Style Thumbnail List)
   -------------------------------------------------------------------------- */
async function renderSidebarPilihanRedaksi(currentSlug) {
  const container = document.getElementById('article-pilihan-feed');
  if (!container) return;

  try {
    let articles = [];
    if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getArticles === 'function') {
      const res = await window.BuserInfoAPI.getArticles({ limit: 6, status: 'published' });
      articles = res.articles || [];
    }

    const filtered = articles.filter(a => a.slug !== currentSlug).slice(0, 4);
    if (filtered.length === 0) {
      container.innerHTML = '<div class="py-4 text-center text-xs text-slate-400">Belum ada berita pilihan.</div>';
      return;
    }

    container.innerHTML = filtered.map(item => `
      <div class="list-thumb-item group">
        <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="block aspect-[4/3] rounded-lg overflow-hidden bg-slate-900 shrink-0 shadow-2xs">
          <img src="${getThumb(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'">
        </a>
        <div class="min-w-0">
          <div class="mb-1">
            <span class="post-category-pill text-[9px] py-0.5 px-2">${escapeHtml(item.name_kategori || 'Berita').toUpperCase()}</span>
          </div>
          <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="block font-bold text-xs text-slate-900 group-hover:text-buser-red line-clamp-2 leading-snug transition-colors">
            ${escapeHtml(item.title)}
          </a>
          <time class="block text-[10px] text-slate-400 mt-1">${formatDateShort(item.published_at)}</time>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '';
  }
}

/* --------------------------------------------------------------------------
   Reactions & Reader Comments
   -------------------------------------------------------------------------- */
function initReactions() {
  const reactionBtns = document.querySelectorAll('.reaction-btn');
  reactionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const countEl = btn.querySelector('.reaction-count');
      if (countEl) {
        let current = parseInt(countEl.textContent, 10) || 0;
        countEl.textContent = current + 1;
        btn.classList.add('border-buser-red', 'bg-red-50', 'text-buser-red');
        window.showToast('Terima kasih atas reaksi Anda!', 'success');
      }
    });
  });
}

async function loadArticleComments(articleId, slug) {
  const commentList = document.getElementById('comment-list');
  if (!commentList) return;

  if (!window.BuserInfoAPI) return;

  try {
    const res = await window.BuserInfoAPI.getComments({
      artikel_id: articleId || '',
      slug: slug || ''
    });

    const comments = Array.isArray(res) ? res : (res.comments || []);

    if (comments.length === 0) {
      commentList.innerHTML = `
        <div class="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
          Belum ada komentar yang dipublikasikan. Jadilah yang pertama memberikan tanggapan!
        </div>
      `;
      return;
    }

    commentList.innerHTML = comments.map(c => {
      const dateStr = c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) + ' WIB' : 'Baru saja';

      const initial = (c.name || 'P').charAt(0).toUpperCase();

      return `
        <div class="p-4 bg-slate-50/80 border border-slate-200 rounded-xl shadow-2xs transition-all hover:bg-white hover:shadow-xs">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2.5">
              <span class="w-7 h-7 rounded-full bg-rose-50 text-buser-red font-black text-xs flex items-center justify-center">
                ${initial}
              </span>
              <span class="font-bold text-xs text-slate-900">${escapeHtmlComment(c.name)}</span>
            </div>
            <span class="text-[11px] text-slate-400 font-mono">${dateStr}</span>
          </div>
          <p class="text-xs text-slate-700 leading-relaxed pl-9">${escapeHtmlComment(c.comment)}</p>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.warn('[Article] Gagal memuat komentar:', err);
  }
}

function initCommentForm(articleId, slug) {
  const form = document.getElementById('comment-form');
  if (!form) return;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('comment-name');
    const emailInput = document.getElementById('comment-email');
    const textInput = document.getElementById('comment-text');
    const submitBtn = form.querySelector('button[type="submit"]');

    const name = nameInput ? nameInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const text = textInput ? textInput.value.trim() : '';

    if (!name || !text) {
      if (window.showToast) window.showToast('Nama dan isi komentar wajib diisi.', 'info');
      return;
    }

    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Kirim Komentar';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `Mengirim...`;
    }

    try {
      if (window.BuserInfoAPI) {
        const res = await window.BuserInfoAPI.submitComment({
          artikel_id: articleId,
          slug: slug,
          name: name,
          email: email,
          comment: text
        });

        if (res.status === 'success' || res.success) {
          if (nameInput) nameInput.value = '';
          if (emailInput) emailInput.value = '';
          if (textInput) textInput.value = '';

          if (window.showToast) {
            window.showToast('Komentar berhasil dikirim dan menunggu moderasi redaksi!', 'success');
          }

          let feedback = document.getElementById('comment-feedback');
          if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'comment-feedback';
            form.appendChild(feedback);
          }
          feedback.className = 'mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm';
          feedback.innerHTML = `<strong>Terima kasih!</strong> Komentar Anda telah diterima dan akan tayang setelah diverifikasi oleh tim moderasi redaksi Japakeh Post.`;
          setTimeout(() => { if (feedback) feedback.remove(); }, 10000);
        } else {
          if (window.showToast) window.showToast(res.message || 'Gagal mengirim komentar.', 'danger');
        }
      }
    } catch (err) {
      if (window.showToast) window.showToast('Terjadi kesalahan saat mengirim komentar.', 'danger');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    }
  };
}

function escapeHtmlComment(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
