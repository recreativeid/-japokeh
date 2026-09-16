    <!-- TOP NAVBAR -->
    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 z-30 shrink-0">
      <div class="flex items-center space-x-3 sm:space-x-4">
        <button id="mobile-menu-btn" class="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <div>
          <h1 class="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight"><?= esc($title ?? 'Dashboard') ?></h1>
          <p class="text-[11px] text-gray-500 hidden sm:block">Portal Redaksi Japakeh Post — PT Japakeh Media Nusantara</p>
        </div>
      </div>

      <div class="flex items-center space-x-2 sm:space-x-3">
        <span id="live-wib-clock" class="hidden xl:inline-block text-xs font-mono text-gray-500 bg-gray-50 px-2.5 py-1 rounded border border-gray-200">
          Memuat waktu...
        </span>

        <a href="<?= base_url('admin/berita?action=tambah') ?>" class="btn btn-primary btn-sm hidden sm:inline-flex">
          <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
          <span>Tambah Berita</span>
        </a>

        <!-- Notifications -->
        <div class="relative">
          <button id="notif-btn" class="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span id="notif-badge" class="absolute top-1.5 right-1.5 w-2 h-2 bg-buser-red rounded-full ring-2 ring-white"></span>
          </button>
        </div>

        <!-- User Menu -->
        <div class="relative">
          <button id="user-menu-btn" class="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-100">
            <div class="w-7 h-7 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">
              <?= strtoupper(substr(session()->get('user_name') ?? 'RD', 0, 2)) ?>
            </div>
            <span class="hidden md:inline-block text-xs font-semibold text-gray-800"><?= esc(session()->get('user_name') ?? 'Pemimpin Redaksi') ?></span>
          </button>
          <div id="user-dropdown" class="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg border border-gray-200 shadow-xl z-50 py-1 text-xs">
            <a href="<?= base_url('admin/profil') ?>" class="block px-3 py-2 text-gray-700 hover:bg-gray-50">Profil Saya</a>
            <a href="<?= base_url('admin/pengaturan') ?>" class="block px-3 py-2 text-gray-700 hover:bg-gray-50">Pengaturan</a>
            <div class="border-t border-gray-100 my-1"></div>
            <a href="<?= base_url('admin/logout') ?>" class="block px-3 py-2 text-red-600 hover:bg-red-50">Keluar</a>
          </div>
        </div>
      </div>
    </header>
