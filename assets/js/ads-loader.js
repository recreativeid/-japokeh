/**
 * Japakeh Post - Automated Advertisement Loader
 * Menampilkan Iklan Google Ads & Banner Sponsor di Slot Website Berita
 * 
 * Kebijakan Tata Letak Sesuai Permintaan Redaksi:
 * 1. Slot Header dihapus di semua device agar berita dan foto utama tidak terhalang.
 * 2. Pada Desktop & Tablet: Iklan dipusatkan di Sidebar Samping (dimensi terkontrol max-w-[320px], max-h-[350px]).
 * 3. Pada Mobile / HP: Iklan tampil di alur bacaan (sela / bawah artikel atau beranda) secara full-width (max-h-[130px]).
 * 4. Filter Target Halaman: Halaman Beranda (home) vs Halaman Artikel (article).
 * 5. Smart Mapping Lintas Device: Iklan target "Semua Device" di Desktop tampil di Sidebar, di Mobile tampil di Bawah/Sela Berita.
 */

(function() {
  'use strict';

  let cachedAds = null;
  let currentIsMobile = window.innerWidth < 768;
  let resizeTimer = null;

  const AdsLoader = {
    async init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.loadAllSlots());
      } else {
        this.loadAllSlots();
      }

      // Pantau perubahan ukuran layar (Desktop <-> Mobile)
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          const isMobileNow = window.innerWidth < 768;
          if (isMobileNow !== currentIsMobile) {
            currentIsMobile = isMobileNow;
            this.renderAllFromCache();
          }
        }, 200);
      });
    },

    getCurrentPageType() {
      const path = (window.location.pathname || '').toLowerCase();
      if (
        path.includes('artikel') ||
        path.includes('kategori') ||
        path.includes('internasional') ||
        !!document.getElementById('article-headline') ||
        !!document.getElementById('category-page-title') ||
        !!document.getElementById('category-articles-list')
      ) {
        return 'article';
      }
      return 'home';
    },

    async loadAllSlots() {
      const slotElements = document.querySelectorAll('[data-ad-slot]');
      if (!slotElements || slotElements.length === 0) return;

      if (!cachedAds || cachedAds.length === 0) {
        try {
          const api = window.BuserInfoAPI || window.JapakehPostAPI;
          if (api && typeof api.getAds === 'function') {
            const response = await api.getAds({ status: 'active' });
            cachedAds = response?.ads || [];
          } else {
            // Fallback fetch langsung jika API client belum termuat
            const res = await fetch('api/iklan.php?status=active');
            const json = await res.json();
            cachedAds = json?.data?.ads || [];
          }
        } catch (err) {
          console.warn('[AdsLoader] Menggunakan cache lokal atau fallback:', err);
          cachedAds = [];
        }
      }

      this.renderAllFromCache();
    },

    renderAllFromCache() {
      const slotElements = document.querySelectorAll('[data-ad-slot]');
      if (!slotElements) return;

      const isMobile = window.innerWidth < 768;
      const currentPage = this.getCurrentPageType();
      const allAds = Array.isArray(cachedAds) ? cachedAds : [];

      slotElements.forEach(container => {
        const position = container.getAttribute('data-ad-slot');
        this.renderSlot(container, position, allAds, isMobile, currentPage);
      });
    },

    renderSlot(container, position, allAds, isMobile, currentPage) {
      // Hentikan timer rotasi sebelumnya jika ada
      if (container._adRotationInterval) {
        clearInterval(container._adRotationInterval);
        container._adRotationInterval = null;
      }

      // 1. Aturan Desktop & Tablet (Layar Lebar):
      // Hanya izinkan slot 'sidebar', 'sidebar_middle', 'sidebar_bottom', 'home_middle', dan 'footer'.
      // Slot dalam artikel disembunyikan di desktop agar alur bacaan dan foto utama berita tidak tersaingi!
      if (!isMobile && (position === 'article_middle' || position === 'article_bottom')) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
      }

      // 2. Aturan Mobile / HP (Layar Sempit):
      // Slot sidebar samping disembunyikan di mobile karena kolom sidebar terlempar ke dasar halaman
      if (isMobile && (position === 'sidebar' || position === 'sidebar_middle' || position === 'sidebar_bottom')) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
      }

      // 3. Filter Iklan yang Cocok untuk Slot Ini
      let matchingAds = allAds.filter(a => {
        if (a.is_active != 1) return false;

        // A. Target Halaman (Beranda vs Artikel)
        const adPage = a.target_page || 'article';
        if (adPage !== 'all' && adPage !== currentPage) {
          return false;
        }

        // B. Target Perangkat (Ketat: Desktop vs Mobile)
        const dev = a.target_device || 'desktop';
        if (isMobile) {
          if (dev !== 'mobile' && dev !== 'all') return false;
        } else {
          if (dev !== 'desktop' && dev !== 'all') return false;
        }

        // C. Posisi Persis Sesuai Slot
        return a.posisi === position;
      });

      if (matchingAds.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
      }

      // 4. Urutkan Prioritas Berdasarkan Angka Urutan
      matchingAds.sort((a, b) => {
        // Angka urutan lebih kecil = prioritas lebih tinggi (1 lebih tinggi dari 2)
        const orderA = (a.urutan !== undefined && a.urutan !== null) ? Number(a.urutan) : 999;
        const orderB = (b.urutan !== undefined && b.urutan !== null) ? Number(b.urutan) : 999;
        if (orderA !== orderB) return orderA - orderB;

        // Banner Sponsor didahulukan daripada Google Ads jika prioritas urutan sama
        if (a.tipe === 'banner' && b.tipe !== 'banner') return -1;
        if (a.tipe !== 'banner' && b.tipe === 'banner') return 1;

        return 0;
      });

      const topAd = matchingAds[0];
      const topOrder = (topAd.urutan !== undefined && topAd.urutan !== null) ? Number(topAd.urutan) : 999;

      // 5. Cek Mode Penayangan: Eksklusif vs Rotasi Bersama
      // Jika iklan teratas adalah EKSKLUSIF, slot dikuasai 100% oleh iklan tersebut
      const isExclusive = (topAd.mode_tayang || 'exclusive') === 'exclusive';

      if (isExclusive) {
        container.style.display = '';
        container.innerHTML = '';
        this.renderAdItem(container, topAd, position, isMobile);
        return;
      }

      // Jika Iklan Teratas memilih ROTASI BERSAMA:
      // Kumpulkan iklan-iklan yang mengaktifkan mode rotasi di urutan prioritas yang sama
      const rotationAds = matchingAds.filter(a => {
        const aOrder = (a.urutan !== undefined && a.urutan !== null) ? Number(a.urutan) : 999;
        return (a.mode_tayang === 'rotation') && (aOrder <= topOrder + 1);
      });

      if (rotationAds.length <= 1) {
        container.style.display = '';
        container.innerHTML = '';
        this.renderAdItem(container, rotationAds[0] || topAd, position, isMobile);
        return;
      }

      // --- LOGIKA ROTASI WAKTU BERKALA (Auto-Rotate Per 12 Detik) ---
      let currentIndex = 0;
      container.style.display = '';
      container.innerHTML = '';

      // Wrapper rotasi dengan efek transisi opacity halus
      const rotWrapper = document.createElement('div');
      rotWrapper.className = 'japakeh-ad-rotating w-full transition-opacity duration-300 opacity-100';
      container.appendChild(rotWrapper);

      // Render pertama
      this.renderAdItem(rotWrapper, rotationAds[currentIndex], position, isMobile);

      // Jalankan interval rotasi waktu berkala (12 detik per sponsor)
      container._adRotationInterval = setInterval(() => {
        // Fade out
        rotWrapper.style.opacity = '0';

        setTimeout(() => {
          currentIndex = (currentIndex + 1) % rotationAds.length;
          rotWrapper.innerHTML = '';
          this.renderAdItem(rotWrapper, rotationAds[currentIndex], position, isMobile);
          // Fade in
          rotWrapper.style.opacity = '1';
        }, 300);
      }, 12000);
    },

    /**
     * Dispatcher render banner vs google
     */
    renderAdItem(targetElement, ad, position, isMobile) {
      if (ad.tipe === 'banner') {
        this.renderBannerAd(targetElement, ad, position, isMobile);
      } else if (ad.tipe === 'google') {
        this.renderGoogleAd(targetElement, ad, position, isMobile);
      }
    },

    /**
     * Render Banner Sponsor Murni (Tanpa Card Box & Tanpa Header Embel-embel)
     */
    renderBannerAd(container, ad, position, isMobile) {
      const link = ad.link_tujuan || '#';
      let imgSrc = ad.gambar || 'assets/images/berita/nasional/kantor-pusat-bsi-landmark-aceh.jpg';
      if (typeof imgSrc === 'string' && imgSrc.startsWith('../')) {
        imgSrc = imgSrc.replace(/^\.\.\/+/, '');
      }
      const altText = ad.judul || 'Banner Iklan';

      // Wrapper murni tanpa border/card/badge
      const wrapper = document.createElement('div');
      wrapper.className = 'japakeh-ad-raw w-full my-3 sm:my-4 flex justify-center items-center overflow-hidden';

      // Tag anchor
      const anchor = document.createElement('a');
      anchor.href = link;
      anchor.target = link.startsWith('http') ? '_blank' : '_self';
      anchor.rel = 'noopener noreferrer';
      anchor.className = 'block w-full text-center transition-opacity hover:opacity-95';

      // Elemen gambar banner responsif
      const img = document.createElement('img');
      img.src = imgSrc;
      img.alt = altText;
      img.loading = 'lazy';

      if (isMobile) {
        // TAMPILAN MOBILE: Format Full-Width Responsif & Gambar 100% Utuh Tanpa Terpotong
        // Menggunakan object-contain + max-h fleksibel agar poster persegi, flyer, maupun banner landscape tampil utuh dan teks terbaca jelas
        img.className = 'w-full max-w-md h-auto max-h-[320px] sm:max-h-[380px] object-contain mx-auto block rounded-lg shadow-xs';
      } else {
        // TAMPILAN DESKTOP & TABLET: Disesuaikan Berdasarkan Slot
        if (position === 'home_middle' || position === 'footer') {
          // Slot Horizontal Lebar (Beranda Tengah & Footer): Membentang proporsional hingga lebar konten
          img.className = 'w-full max-w-4xl h-auto max-h-[260px] object-contain mx-auto block rounded-xl shadow-xs';
        } else {
          // Slot Kolom Sidebar Samping: Pas memenuhi lebar widget sidebar (300-360px) tanpa menyaingi foto utama berita
          img.className = 'w-full max-w-[360px] h-auto max-h-[480px] object-contain mx-auto block rounded-xl shadow-xs';
        }
      }

      img.onerror = () => {
        wrapper.style.display = 'none';
      };

      anchor.appendChild(img);
      wrapper.appendChild(anchor);
      container.appendChild(wrapper);
    },

    /**
     * Render Google AdSense Murni
     */
    renderGoogleAd(container, ad, position, isMobile) {
      const wrapper = document.createElement('div');
      wrapper.className = 'japakeh-ad-raw w-full my-3 sm:my-4 flex justify-center items-center overflow-hidden';

      const adBox = document.createElement('div');
      adBox.className = isMobile 
        ? 'w-full flex justify-center items-center overflow-x-hidden'
        : 'max-w-[320px] w-full flex justify-center items-center overflow-x-hidden mx-auto';
      adBox.innerHTML = ad.kode_html || '';

      wrapper.appendChild(adBox);
      container.appendChild(wrapper);

      // Eksekusi script jika ada (adsbygoogle dsb)
      try {
        const scripts = adBox.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.textContent = oldScript.textContent;
          oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        if (window.adsbygoogle) {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (e) {}
        }
      } catch (err) {
        console.warn('[AdsLoader] Error inisiasi Google AdSense:', err);
      }
    }
  };

  window.JapakehAdsLoader = AdsLoader;
  AdsLoader.init();
})();
