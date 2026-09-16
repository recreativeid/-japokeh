/**
 * Japakeh Post - Article Detail Page Script
 * Menghubungkan halaman artikel (artikel.html) langsung ke backend MySQL / REST API.
 * Mendukung pembacaan artikel via query string (?id=X atau ?slug=Y), fallback artikel terbaru,
 * view count updater, bookmark offline, dan sistem komentar live.
 */

document.addEventListener('DOMContentLoaded', () => {
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

function formatDateIndo(dateStr) {
  if (!dateStr) return 'Baru saja';
  const safeStr = typeof dateStr === 'string' ? dateStr.replace(' ', 'T') : dateStr;
  const d = new Date(safeStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  }) + ' - ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
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

    if (window.NewsDB && typeof window.NewsDB.getBySlug === 'function') {
      const localArt = window.NewsDB.getBySlug(slugParam);
      if (localArt) {
        renderLiveArticleDetail(localArt);
        return;
      }
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

    if (window.NewsDB && typeof window.NewsDB.getById === 'function') {
      const localArt = window.NewsDB.getById(idParam);
      if (localArt) {
        renderLiveArticleDetail(localArt);
        return;
      }
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

  if (window.NewsDB && typeof window.NewsDB.getAll === 'function') {
    const list = window.NewsDB.getAll();
    if (list.length > 0) {
      renderLiveArticleDetail(list[0]);
      return;
    }
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
  const editorName = document.getElementById('article-editor');
  const dateStr = document.getElementById('article-date');
  const heroImg = document.getElementById('article-hero-img');
  const heroCaption = document.getElementById('article-hero-caption');
  const bodyContent = document.getElementById('article-body-content');
  const viewsCount = document.getElementById('article-views');

  if (catBadge) catBadge.textContent = (article.name_kategori || 'NASIONAL').toUpperCase();
  if (headline) headline.textContent = article.title;
  if (excerpt) excerpt.textContent = article.excerpt || article.title;
  if (authorName) authorName.textContent = article.author_name || 'Al Bahri';
  if (authorRole) authorRole.textContent = 'Redaksi Japakeh Post';
  if (editorName) editorName.textContent = 'Pemimpin Redaksi Japakeh Post';
  if (dateStr) {
    dateStr.textContent = formatDateIndo(article.published_at);
  }
  if (viewsCount) {
    const v = article.views || 1;
    viewsCount.innerHTML = `
      <svg class="w-3.5 h-3.5 mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>
      ${Number(v).toLocaleString('id-ID')} pembaca
    `;
  }
  if (heroImg) {
    heroImg.src = getThumb(article.thumbnail);
    heroImg.alt = article.title;
  }
  if (heroCaption) {
    heroCaption.textContent = `Dokumentasi Liputan: ${article.title} (Foto: Dok. Japakeh Post)`;
  }
  if (bodyContent) {
    bodyContent.innerHTML = article.content || '<p>Tidak ada isi artikel yang tersedia.</p>';
  }

  // Tags
  const tagsContainer = document.getElementById('article-tags-container');
  if (tagsContainer) {
    const tags = [article.name_kategori, 'JapakehPostUpdate', 'BeritaTerkini'].filter(Boolean);
    tagsContainer.innerHTML = tags.map(tag => `
      <a href="cari.html?q=${encodeURIComponent(tag)}" class="inline-block bg-slate-100 hover:bg-buser-red hover:text-white text-slate-700 text-xs px-3.5 py-1.5 rounded-full font-medium transition-colors">
        #${escapeHtml(tag)}
      </a>
    `).join('');
  }

  // Reader Controls & Comments
  initFontSizeControls();
  initArticleBookmark(article.slug || article.id_artikel);
  initShareButtons({ title: article.title });
  initReactions();
  renderRelatedArticles(article.slug, article.kategori_slug);
  loadArticleComments(article.id_artikel, article.slug);
  initCommentForm(article.id_artikel, article.slug);
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
    if ((!articles || articles.length === 0) && window.NewsDB && typeof window.NewsDB.getAll === 'function') {
      articles = window.NewsDB.getAll().filter(a => a.isTrending || true).slice(0, 5);
    }

    if (articles.length === 0) {
      container.innerHTML = `
        <div class="py-6 text-center text-xs text-slate-400">
          Belum ada berita trending saat ini.
        </div>
      `;
      return;
    }

    container.innerHTML = articles.map((item, idx) => `
      <article class="py-2.5 flex items-start gap-3 group border-b border-slate-100 last:border-b-0">
        <span class="text-xl sm:text-2xl font-black text-[#E60000] tracking-tighter leading-none shrink-0 w-7 text-center">${String(idx + 1).padStart(2, '0')}</span>
        <div class="flex-1 min-w-0">
          <span class="text-[10px] font-bold uppercase text-[#E60000] tracking-wider block mb-0.5">${escapeHtml(item.name_kategori || 'Berita').toUpperCase()}</span>
          <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="block font-bold text-xs text-slate-900 group-hover:text-[#E60000] leading-snug line-clamp-2 transition-colors">
            ${escapeHtml(item.title)}
          </a>
          <div class="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
            <svg class="w-2.5 h-2.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>${formatDateIndo(item.published_at)}</span>
          </div>
        </div>
      </article>
    `).join('');
  } catch (err) {
    container.innerHTML = `<div class="py-4 text-center text-xs text-slate-400">Belum ada data trending saat ini.</div>`;
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
      if (b) b.classList.remove('bg-buser-red', 'text-white', 'font-bold');
    });

    if (size === 'sm' && btnSm) btnSm.classList.add('bg-buser-red', 'text-white', 'font-bold');
    if (size === 'md' && btnMd) btnMd.classList.add('bg-buser-red', 'text-white', 'font-bold');
    if (size === 'lg' && btnLg) btnLg.classList.add('bg-buser-red', 'text-white', 'font-bold');
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
   Share Buttons
   -------------------------------------------------------------------------- */
function initShareButtons(article) {
  const currentUrl = encodeURIComponent(window.location.href);
  const title = encodeURIComponent(article.title);

  const waBtn = document.getElementById('share-wa');
  const fbBtn = document.getElementById('share-fb');
  const twBtn = document.getElementById('share-tw');
  const tgBtn = document.getElementById('share-tg');
  const copyBtn = document.getElementById('share-copy');

  if (waBtn) waBtn.href = `https://api.whatsapp.com/send?text=${title}%20${currentUrl}`;
  if (fbBtn) fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${currentUrl}`;
  if (twBtn) twBtn.href = `https://twitter.com/intent/tweet?text=${title}&url=${currentUrl}`;
  if (tgBtn) tgBtn.href = `https://t.me/share/url?url=${currentUrl}&text=${title}`;

  if (copyBtn) {
    copyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          window.showToast('Tautan berita berhasil disalin!', 'success');
        })
        .catch(() => {
          window.showToast('Gagal menyalin tautan.', 'info');
        });
    });
  }
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
   Related Articles (Dinamis dari Database PostgreSQL)
   -------------------------------------------------------------------------- */
async function renderRelatedArticles(currentSlug, categorySlug) {
  const container = document.getElementById('related-articles-grid');
  const section = container ? container.closest('section') : null;
  if (!container) return;

  try {
    let all = [];
    if (window.BuserInfoAPI && typeof window.BuserInfoAPI.getArticles === 'function') {
      const res = await window.BuserInfoAPI.getArticles({
        kategori: categorySlug || '',
        limit: 5,
        status: 'published'
      });
      all = res && Array.isArray(res.articles) ? res.articles : [];
    }

    if ((!all || all.length === 0) && window.NewsDB && typeof window.NewsDB.getAll === 'function') {
      all = window.NewsDB.getAll();
    }

    const related = all.filter(item => item.slug !== currentSlug).slice(0, 4);

    if (related.length === 0) {
      if (section) section.style.display = 'none';
      return;
    }

    if (section) section.style.display = '';
    container.innerHTML = related.map(item => `
      <article class="bg-white border border-slate-200 rounded-xl overflow-hidden group flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-colors">
        <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="block overflow-hidden relative aspect-video bg-slate-900">
          <img src="${getThumb(item.thumbnail)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" onerror="this.src='assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg'" />
          <span class="absolute top-2 left-2 bg-[#E60000] text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-xs">
            ${escapeHtml(item.name_kategori || 'Berita')}
          </span>
        </a>
        <div class="p-3.5 flex flex-col flex-1 justify-between">
          <div>
            <a href="artikel.html?slug=${encodeURIComponent(item.slug)}" class="block font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#E60000] line-clamp-2 leading-snug mb-1.5 transition-colors">
              ${escapeHtml(item.title)}
            </a>
            <p class="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed">
              ${escapeHtml(item.excerpt || item.title)}
            </p>
          </div>
          <div class="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-400 pt-2 border-t border-slate-100 mt-auto">
            <svg class="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span>${formatDateIndo(item.published_at)}</span>
          </div>
        </div>
      </article>
    `).join('');
  } catch (err) {
    if (section) section.style.display = 'none';
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
