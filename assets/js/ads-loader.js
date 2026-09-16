/**
 * Japakeh Post - Automated Advertisement Loader
 * Menampilkan Iklan Google Ads & Banner Endorse di Slot Website Berita
 */

(function() {
  'use strict';

  const AdsLoader = {
    async init() {
      // Tunggu DOM siap
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.loadAllSlots());
      } else {
        this.loadAllSlots();
      }
    },

    async loadAllSlots() {
      const slotElements = document.querySelectorAll('[data-ad-slot]');
      if (!slotElements || slotElements.length === 0) return;

      try {
        const response = await (window.BuserInfoAPI || window.JapakehPostAPI).getAds({ status: 'active' });
        const ads = response?.ads || [];
        
        slotElements.forEach(container => {
          const position = container.getAttribute('data-ad-slot');
          this.renderSlot(container, position, ads);
        });
      } catch (err) {
        console.warn('[AdsLoader] Gagal memuat iklan:', err);
      }
    },

    renderSlot(container, position, allAds) {
      // Filter iklan aktif untuk posisi ini
      const adsForPosition = allAds.filter(a => a.posisi === position && a.is_active == 1);
      if (adsForPosition.length === 0) {
        // Jika tidak ada iklan aktif di slot ini, sembunyikan atau biarkan placeholder opsional
        const showPlaceholder = container.getAttribute('data-ad-placeholder') === 'true';
        if (!showPlaceholder) {
          container.style.display = 'none';
        }
        return;
      }

      container.style.display = '';

      // Sistem Prioritas:
      // Prioritas 1: Banner Endorse / Sponsor Langsung
      // Prioritas 2: Google AdSense
      let selectedAd = adsForPosition.find(a => a.tipe === 'banner');
      if (!selectedAd) {
        selectedAd = adsForPosition.find(a => a.tipe === 'google');
      }
      if (!selectedAd) {
        selectedAd = adsForPosition[0];
      }

      container.innerHTML = '';

      if (selectedAd.tipe === 'banner') {
        this.renderBannerAd(container, selectedAd, position);
      } else if (selectedAd.tipe === 'google') {
        this.renderGoogleAd(container, selectedAd, position);
      }
    },

    renderBannerAd(container, ad, position) {
      const wrapper = document.createElement('div');
      wrapper.className = 'japakeh-ad-unit japakeh-ad-banner relative group overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs my-4 transition-all hover:shadow-md';
      
      const badge = `
        <div class="flex items-center justify-between px-3 py-1.5 bg-slate-50/90 border-b border-slate-100 text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
          <span class="flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Iklan Sponsor Resmi</span>
          </span>
          <span class="text-[9px] text-slate-400 font-normal truncate max-w-[150px]">${ad.judul ? this.escapeHtml(ad.judul) : 'Japakeh Post'}</span>
        </div>
      `;

      const link = ad.link_tujuan || '#';
      const imgSrc = ad.gambar || 'assets/images/berita/nasional/kantor-pusat-bsi-landmark-aceh.jpg';
      
      // Pengaturan tinggi dan wadah fleksibel proporsional (Opsi 2: object-contain tanpa terpotong)
      let containerHeight = 'h-[100px] sm:h-[140px]';
      if (position === 'sidebar') {
        containerHeight = 'h-[250px] sm:h-[280px]';
      } else if (position === 'article_middle' || position === 'home_middle' || position === 'article_bottom') {
        containerHeight = 'h-[140px] sm:h-[180px]';
      } else if (position === 'footer') {
        containerHeight = 'h-[100px] sm:h-[130px]';
      }

      wrapper.innerHTML = `
        ${badge}
        <a href="${this.escapeHtml(link)}" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center relative overflow-hidden bg-slate-50/90 group ${containerHeight}">
          <img src="${this.escapeHtml(imgSrc)}" alt="${this.escapeHtml(ad.judul || 'Iklan Sponsor')}" 
               class="max-h-full max-w-full w-auto h-auto object-contain object-center transition-transform duration-300 group-hover:scale-[1.01]"
               loading="lazy"
               onerror="this.onerror=null; this.src='assets/images/logo/favicon.webp'; this.className='w-14 h-14 mx-auto opacity-30 object-contain';">
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>
        </a>
      `;

      container.appendChild(wrapper);
    },

    renderGoogleAd(container, ad, position) {
      const wrapper = document.createElement('div');
      wrapper.className = 'japakeh-ad-unit japakeh-ad-google relative overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 p-3 text-center my-4 shadow-xs';

      const badge = `
        <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
          <span class="flex items-center space-x-1">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
            <span>Google Ads</span>
          </span>
          <span class="text-[9px] text-slate-400">Japakeh Post Ads Network</span>
        </div>
      `;

      wrapper.innerHTML = badge + `<div class="japakeh-adsbygoogle-slot w-full overflow-hidden flex justify-center items-center min-h-[90px]">${ad.kode_html || ''}</div>`;
      container.appendChild(wrapper);

      // Eksekusi script di dalam kode_html jika ada (misal adsbygoogle.push)
      try {
        const scripts = wrapper.querySelectorAll('script');
        scripts.forEach(oldScript => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
          newScript.textContent = oldScript.textContent;
          oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        // Trigger adsbygoogle jika ada script Google AdSense
        if (window.adsbygoogle) {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (e) {}
        }
      } catch (err) {
        console.warn('[AdsLoader] Error saat menginisiasi script Google Ads:', err);
      }
    },

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };

  window.JapakehAdsLoader = AdsLoader;
  AdsLoader.init();
})();
