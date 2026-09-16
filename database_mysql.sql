-- =============================================================================
-- DATABASE SCHEMA & SEEDER: MySQL / MariaDB
-- Portal Berita & CMS Japakeh Post (PT Japakeh Media Nusantara)
-- Tagline: Cepat, Akurat, Terpercaya
-- Kompatibel: MySQL 5.7 / 8.0+ / MariaDB 10.4+ / phpMyAdmin
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `berita_japakehpost` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `berita_japakehpost`;

-- Drop existing tables
DROP TABLE IF EXISTS `komentar`;
DROP TABLE IF EXISTS `artikel`;
DROP TABLE IF EXISTS `video`;
DROP TABLE IF EXISTS `profil_redaksi`;
DROP TABLE IF EXISTS `iklan`;
DROP TABLE IF EXISTS `kategori`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `settings`;

-- -----------------------------------------------------------------------------
-- 1. Tabel: users (Pengguna, Redaksi, Wartawan)
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama_users` VARCHAR(150) NOT NULL,
  `email_users` VARCHAR(150) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('Administrator', 'Editor', 'Reporter') NOT NULL DEFAULT 'Reporter',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `avatar` VARCHAR(255) DEFAULT '',
  `bio` TEXT DEFAULT NULL,
  `last_login` DATETIME DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email_users`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Akun Default Administrator & Redaksi
-- Password default: admin123 atau JapakehPost#2026
-- Hash: $2y$12$AofBEg9ojNMtJtIuaYOKPuup2Q4Dgc6yzuDOfXYOYwN0Izr0BgIHq (admin123)
INSERT INTO `users` (`id`, `nama_users`, `email_users`, `password`, `role`, `status`, `avatar`, `bio`, `created_at`, `updated_at`) VALUES
(1, 'Al Bahri', 'alb4hri@gmail.com', '$2y$12$AofBEg9ojNMtJtIuaYOKPuup2Q4Dgc6yzuDOfXYOYwN0Izr0BgIHq', 'Administrator', 'active', 'assets/images/logo/favicon.webp', 'Pemimpin Umum / Pemimpin Redaksi & Penanggung Jawab PT Japakeh Media Nusantara - Japakeh Post.', NOW(), NOW()),
(2, 'Al Bahri (Official)', 'redaksi@japakehpost.com', '$2y$12$AofBEg9ojNMtJtIuaYOKPuup2Q4Dgc6yzuDOfXYOYwN0Izr0BgIHq', 'Administrator', 'active', 'assets/images/logo/favicon.webp', 'Akun resmi Meja Redaksi Japakeh Post.', NOW(), NOW()),
(3, 'Teuku Iskandar', 'iskandar@japakehpost.com', '$2y$12$AofBEg9ojNMtJtIuaYOKPuup2Q4Dgc6yzuDOfXYOYwN0Izr0BgIHq', 'Editor', 'active', '', 'Redaktur Pelaksana & Koordinator Liputan Japakeh Post.', NOW(), NOW()),
(4, 'Cut Mutia Sari', 'mutiasari@japakehpost.com', '$2y$12$AofBEg9ojNMtJtIuaYOKPuup2Q4Dgc6yzuDOfXYOYwN0Izr0BgIHq', 'Reporter', 'active', '', 'Wartawan Pendidikan, Sains, dan Daerah.', NOW(), NOW()),
(5, 'Kevin Adityawarman', 'kevin.tech@japakehpost.com', '$2y$12$AofBEg9ojNMtJtIuaYOKPuup2Q4Dgc6yzuDOfXYOYwN0Izr0BgIHq', 'Reporter', 'active', '', 'Wartawan Teknologi Informasi & Multimedia.', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 2. Tabel: kategori (12 Rubrikasi Portal Berita Sesuai Referensi Tabaca.id)
-- -----------------------------------------------------------------------------
CREATE TABLE `kategori` (
  `id_kategori` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name_kategori` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `deskripsi` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_kategori`),
  UNIQUE KEY `idx_kategori_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `kategori` (`id_kategori`, `name_kategori`, `slug`, `deskripsi`) VALUES
(1, 'Daerah', 'daerah', 'Kabar kedaerahan, otonomi daerah, gampong, dan laporan biro wilayah nusantara'),
(2, 'Nasional', 'nasional', 'Berita peristiwa nasional, kabinet pemerintahan, regulasi, dan kenegaraan'),
(3, 'Politik', 'politik', 'Dinamika keparlemenan, pilkada, verifikasi partai politik, dan kebijakan publik'),
(4, 'Hukum', 'hukum', 'Liputan penegakan hukum, kepolisian, peradilan, kejaksaan, dan keamanan masyarakat'),
(5, 'Ekonomi', 'ekonomi', 'Makroekonomi, fiskal APBD, inflasi, komoditas, dan perbankan syariah'),
(6, 'Bisnis', 'bisnis', 'Pergerakan pasar, dunia usaha, dividen perusahaan, UMKM, dan investasi'),
(7, 'Pendidikan', 'pendidikan', 'Dunia kampus perguruan tinggi, mahasiswa, beasiswa, dan inovasi kurikulum'),
(8, 'Teknologi', 'teknologi', 'Transformasi digital, inovasi sains terapan, kecerdasan buatan, dan telekomunikasi'),
(9, 'Opini', 'opini', 'Kolom gagasan, analisis kritis akademisi, praktisi, dan ruang pandang publik'),
(10, 'Foto', 'foto', 'Galeri visual jurnalistik lensa peristiwa terkini'),
(11, 'Internasional', 'internasional', 'Diplomasi dunia, geopolitik luar negeri, dan kabar mancanegara'),
(12, 'Video', 'video', 'Kanal tayangan liputan multimedia eksklusif Japakeh Post'),
(13, 'Olahraga', 'olahraga', 'Kabar kompetisi olahraga prestasi, sepak bola nasional dan internasional, PON, atlet daerah, dan kejuaraan terupdate.'),
(14, 'Tokoh', 'tokoh', 'Profil figur inspiratif, tokoh publik, birokrat berdedikasi, ulama kharismatik, dan cendekiawan penggerak kemajuan masyarakat.');

-- -----------------------------------------------------------------------------
-- 3. Tabel: artikel (Berita Lengkap)
-- -----------------------------------------------------------------------------
CREATE TABLE `artikel` (
  `id_artikel` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kategori_id` INT UNSIGNED NOT NULL,
  `author_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `thumbnail` VARCHAR(255) DEFAULT '',
  `status` ENUM('published', 'draft', 'review', 'scheduled') NOT NULL DEFAULT 'published',
  `views` INT UNSIGNED NOT NULL DEFAULT 0,
  `published_at` DATETIME DEFAULT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_artikel`),
  UNIQUE KEY `idx_artikel_slug` (`slug`),
  KEY `idx_artikel_kategori` (`kategori_id`),
  KEY `idx_artikel_author` (`author_id`),
  KEY `idx_artikel_status_date` (`status`, `published_at`),
  CONSTRAINT `fk_artikel_kategori` FOREIGN KEY (`kategori_id`) REFERENCES `kategori` (`id_kategori`) ON DELETE CASCADE,
  CONSTRAINT `fk_artikel_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Data Artikel Berita (Diimpor dari 26 Berita Terkini Referensi Tabaca.id)
-- -----------------------------------------------------------------------------
INSERT INTO `artikel` (`kategori_id`, `author_id`, `title`, `slug`, `content`, `thumbnail`, `status`, `views`, `published_at`, `updated_at`) VALUES
(1, 1, 'Bupati Tarmizi Tegaskan Satlinmas dan Pageu Gampong Ujung Tombak Keamanan Masyarakat', 'bupati-tarmizi-tegaskan-satlinmas-dan-pageu-gampong-ujung-tombak-keamanan-masyarakat', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Bupati Aceh Barat Tarmizi SP menegaskan bahwa Satuan Perlindungan Masyarakat (Satlinmas) dan relawan Satgas Pageu Gampong memegang peranan krusial sebagai ujung tombak pemeliharaan keamanan, ketenteraman, dan kenyamanan warga di tingkat akar rumput gampong.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Pernyataan tersebut ditekankan Bupati Tarmizi saat memimpin langsung apel siaga gelar pasukan di halaman Setdakab Aceh Barat yang dihadiri ratusan personel Linmas, keuchik, tuha peut, serta jajaran Forkopimda. Sinergi antara kearifan lokal \'Pageu Gampong\' dan sistem perlindungan sipil terbukti menjadi benteng paling efektif dalam meredam potensi konflik sosial dan bencana lingkungan.
      </p>
      <blockquote class="my-6 p-4 border-l-4 border-buser-red bg-red-50 italic text-gray-800 font-serif text-lg">
        "Keamanan gampong adalah pondasi utama pembangunan daerah. Jika gampong aman, tenteram, dan kompak, roda ekonomi warga pasti bergerak cepat dan barokah," tegas Al Bahri mengutip arahan Bupati Tarmizi.
      </blockquote>
      <h3 class="text-xl font-bold text-black mt-6 mb-3">Penguatan Fasilitas dan Pembinaan Berkelanjutan</h3>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Pemerintah Kabupaten berkomitmen mengalokasikan dukungan sarana penunjang operasional serta pelatihan kebencanaan terpadu bersama BPBD dan TNI-Polri. Langkah ini diapresiasi oleh seluruh aparatur gampong demi menyukseskan iklim investasi dan pariwisata yang damai di pesisir barat selatan Aceh.
      </p>', 'assets/images/berita/daerah/festival-budaya-palembang.jpg', 'published', 42800, '2026-09-11 11:44:40', NOW()),
(4, 1, 'Kapolri Mutasi 424 Pati dan Pamen Polri, Sejumlah Jabatan Strategis Berganti', 'kapolri-mutasi-424-pati-dan-pamen-polri-sejumlah-jabatan-strategis-berganti', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>JAKARTA</strong> — Kapolri Jenderal Polisi Listyo Sigit Prabowo resmi mengeluarkan surat telegram mutasi terhadap 424 perwira tinggi (Pati) dan perwira menengah (Pamen). Langkah strategis ini ditempuh dalam rangka regenerasi kepemimpinan, promosi jabatan prestasi, dan penyegaran institusi korps Bhayangkara.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Kepala Divisi Humas Polri menyampaikan bahwa rotasi berkala adalah mekanisme lumrah dalam struktur organisasi penegakan hukum modern. Prioritas kepemimpinan baru difokuskan pada pemantapan perlindungan masyarakat, penindakan kejahatan siber, serta pengamanan agenda pembangunan nasional.
      </p>', 'assets/images/berita/kriminal/rilis-mabes-polri.jpg', 'published', 39500, '2026-09-11 09:44:40', NOW()),
(2, 1, 'Prabowo Tegaskan Tidak Boleh Ada Anak-Anak Bertarung Nyawa saat ke Sekolah', 'prabowo-tegaskan-tidak-boleh-ada-anak-anak-bertarung-nyawa-saat-ke-sekolah', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>JAKARTA</strong> — Presiden RI Prabowo Subianto menegaskan pemerintah tidak akan mentolerir adanya situasi di mana anak-anak sekolah di pelosok desa harus mempertaruhkan nyawa menyeberangi jeram sungai deras demi menuntut ilmu.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Presiden memerintahkan Kementerian Pekerjaan Umum bekerja sama dengan Satuan Zeni TNI dan jajaran kepolisian untuk segera memetakan seluruh titik lintasan rawan di pedalaman Sumatra, Kalimantan, Sulawesi, hingga Papua. Pembangunan jembatan gantung perintis harus diselesaikan dengan standar keselamatan tinggi dan waktu pengerjaan cepat.
      </p>', 'assets/images/berita/nasional/konferensi-pers-istana.jpg', 'published', 35200, '2026-09-11 07:44:40', NOW()),
(7, 1, 'USK Sambut 8.000-an Mahasiswa Baru dalam PAKARMARU 2026 di Gelanggang USK', 'usk-sambut-8000-an-mahasiswa-baru-dalam-pakarmaru-2026', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>BANDA ACEH</strong> — Gelanggang Mahasiswa Universitas Syiah Kuala (USK) Darussalam dipadati ribuan mahasiswa baru lintas fakultas dalam pembukaan agenda tahunan Pembinaan Akademik dan Karakter Mahasiswa Baru (PAKARMARU) tahun akademik 2026.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Rektor USK berpesan kepada seluruh civitas akademika muda agar menjadikan momentum perkuliahan sebagai ruang pengasahan karakter moral, daya saing sains, serta kepedulian sosial terhadap kemajuan masyarakat Aceh dan Indonesia.
      </p>', 'assets/images/berita/pendidikan/wisuda-universitas-negeri.jpg', 'published', 26700, '2026-09-11 05:44:40', NOW()),
(8, 1, 'Mahasiswa di Aceh Ubah Limbah Kulit Manggis Jadi Teknologi Pengolahan Air Bersih', 'mahasiswa-di-aceh-ubah-limbah-kulit-manggis-jadi-teknologi-pengolahan-air', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Limbah kulit manggis yang kerap dibuang sia-sia berhasil disulap oleh tim peneliti muda mahasiswa di Aceh menjadi media adsorpsi karbon aktif canggih penjernih air rawa dan gambut.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Teknologi ramah lingkungan berbiaya murah ini terbukti mampu mengikat logam berat dan menurunkan tingkat keasaman (pH) air sehingga aman untuk kebutuhan harian masyarakat di kawasan perairan payau dan pesisir.
      </p>', 'assets/images/berita/teknologi/peluncuran-satelit-indonesia.jpg', 'published', 31400, '2026-09-11 03:44:40', NOW()),
(1, 1, 'Pemkab Aceh Barat Eksekusi Aset Pelabuhan Jetty, Kantor PT MPM Dikosongkan', 'pemkab-aceh-barat-eksekusi-aset-pelabuhan-jetty-kantor-pt-mpm-dikosongkan', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Tim penertiban aset Pemkab Aceh Barat didampingi aparat kepolisian dan Satpol PP berhasil menuntaskan proses pengosongan areal fasilitas perkantoran di Pelabuhan Jetty Suak Indrapuri Meulaboh secara tertib dan kondusif.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Langkah tegas ini merupakan tindak lanjut kepastian hukum penguasaan aset milik daerah guna menjamin pemasukan retribusi yang optimal bagi kemajuan pembangunan masyarakat lokal.
      </p>', 'assets/images/berita/daerah/revitalisasi-pelabuhan-banyuasin.jpg', 'published', 23100, '2026-09-11 01:44:40', NOW()),
(5, 1, 'Fiskal Terbatas, Wabup Said Fadheil Minta Perubahan APBD 2026 Harus Fokus pada Prioritas Daerah', 'fiskal-terbatas-wabup-said-fadheil-minta-perubahan-apbd-2026-harus-fokus-pada-prioritas-daerah', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Di tengah tantangan ruang fiskal daerah, Wakil Bupati Aceh Barat Said Fadheil menekankan kepada pimpinan Satuan Kerja Perangkat Kabupaten (SKPK) agar meniadakan program seremonial dan memprioritaskan anggaran pada penanganan kemiskinan ekstrem, stunting, dan infrastruktur tani.
      </p>', 'assets/images/berita/ekonomi/bursa-efek-perdagangan.jpg', 'published', 21500, '2026-09-10 23:44:40', NOW()),
(3, 1, 'PAN Aceh Barat Kebut Penguatan Struktur DPC, SK Pengurus Periode 2024-2029 Direkomendasikan', 'pan-aceh-barat-kebut-penguatan-struktur-dpc-sk-pengurus-periode-direkomendasikan', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Jajaran DPD PAN Aceh Barat menggelar konsolidasi menyeluruh guna memfinalisasi pengesahan surat keputusan pengurus Dewan Pimpinan Cabang (DPC) se-kabupaten demi memastikan soliditas kepengurusan hingga tingkat gampong.
      </p>', 'assets/images/berita/politik/koalisi-partai-politik.jpg', 'published', 18200, '2026-09-10 21:44:40', NOW()),
(6, 1, 'MK Kabulkan Gugatan Kuota Hangus, Sisa Data Wajib Bisa Dipakai Sampai Habis', 'mk-kabulkan-gugatan-kuota-hangus-sisa-data-wajib-bisa-dipakai-sampai-habis', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>JAKARTA</strong> — Kabar gembira bagi ratusan juta pengguna ponsel di tanah air. Mahkamah Konstitusi Republik Indonesia mengabulkan sebagian permohonan uji materi terkait regulasi paket kuota data internet operator telekomunikasi seluler.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Dalam pertimbangan hukumnya, majelis hakim menyatakan bahwa kuota data yang telah dibeli konsumen merupakan hak kepemilikan bernilai ekonomis yang tidak boleh dihanguskan sepihak hanya karena berakhirnya masa tenggang waktu tertentu.
      </p>', 'assets/images/berita/teknologi/regulasi-ai-indonesia.jpg', 'published', 46100, '2026-09-10 19:44:40', NOW()),
(6, 1, 'Pemkab Nagan Raya Terima Dividen Rp1,63 Miliar dan Dana Zakat Rp400 Juta dari Bank Aceh Syariah', 'pemkab-nagan-raya-terima-dividen-rp163-miliar-dan-dana-zakat-bank-aceh-syariah', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>SUKA MAKMUE</strong> — Bank Aceh Syariah Kantor Cabang Nagan Raya secara resmi menyerahkan dividen atas penyertaan modal pemerintah daerah senilai Rp1,63 miliar beserta dana zakat sebesar Rp400 juta.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Pemerintah daerah mengapresiasi kontribusi konsisten perbankan syariah kebanggaan masyarakat Aceh dalam mendongkrak penerimaan asli daerah sekaligus menyantuni ribuan mustahik di pelosok pedesaan.
      </p>', 'assets/images/berita/ekonomi/pertumbuhan-umkm-digital.jpg', 'published', 22300, '2026-09-10 17:44:40', NOW()),
(1, 1, 'Bupati Tarmizi Lantik Dr. Kurdi Sebagai Sekda Aceh Barat Definitif', 'bupati-tarmizi-lantik-dr-kurdi-sebagai-sekda-aceh-barat-definitif', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Aula Bappeda Aceh Barat menjadi saksi pelantikan Dr. Kurdi, S.T., M.T. sebagai Sekretaris Daerah Kabupaten Aceh Barat definitif oleh Bupati Tarmizi SP.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Dengan rekam jejak teknis dan kepemimpinan yang matang, Sekda baru diharapkan mampu mengorkestrasi percepatan serapan anggaran APBD, digitalisasi pelayanan publik, dan menjaga keharmonisan jajaran aparatur sipil negara.
      </p>', 'assets/images/berita/daerah/infrastruktur-lrt-sumsel.jpg', 'published', 41500, '2026-09-10 15:44:40', NOW()),
(11, 1, 'Erdogan Sebut Israel Ingin Hapus Palestina dari Agenda Dunia', 'erdogan-sebut-israel-ingin-hapus-palestina-dari-agenda-dunia', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>ANKARA</strong> — Presiden Turkiye Recep Tayyip Erdogan melancarkan kritik keras terhadap manuver agresif di kawasan Timur Tengah yang berupaya meminggirkan isu kemerdekaan Palestina dari perhatian masyarakat internasional.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Erdogan menegaskan bahwa keadilan global tidak akan pernah terwujud tanpa pengakuan berdaulat bagi bangsa Palestina dengan Yerusalem Timur sebagai ibu kota yang sah.
      </p>', 'assets/images/berita/internasional/konflik-timur-tengah.jpg', 'published', 38900, '2026-09-10 13:44:40', NOW()),
(2, 1, 'Prabowo Guyur Rp18,9 Triliun Untuk 546 Daerah Buat Gaji PPPK', 'prabowo-guyur-rp189-triliun-untuk-546-daerah-buat-gaji-pppk', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>JAKARTA</strong> — Kepastian kesejahteraan ribuan tenaga pendidik dan tenaga kesehatan honorer yang telah lolos seleksi Pegawai Pemerintah dengan Perjanjian Kerja (PPPK) terjawab tuntas setelah pemerintah menggelontorkan alokasi anggaran Rp18,9 triliun ke 546 pemerintah daerah.
      </p>', 'assets/images/berita/nasional/kebijakan-subsidi-bbm.jpg', 'published', 37100, '2026-09-10 11:44:40', NOW()),
(10, 1, '[FOTO] Satgas PRR Pusat Bersama Wabup Said Tinjau Kerusakan Desa Jambak', 'foto-satgas-prr-pusat-bersama-wabup-said-tinjau-kerusakan-desa-jambak', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Galeri foto eksklusif tim redaksi Japakeh Post mendampingi kunjungan kerja Satgas Pemulihan Pascabencana (PRR) pusat bersama Wakil Bupati Aceh Barat Said Fadheil meninjau penanganan darurat tebing pantai Desa Jambak.
      </p>', 'assets/images/berita/daerah/penanganan-banjir-sumatera.jpg', 'published', 29400, '2026-09-10 09:44:40', NOW()),
(9, 1, 'Mengembalikan Fungsi Sekolah: Mengapa Pengelolaan Makan Bergizi Gratis Harus Ditangani Ahlinya?', 'mengembalikan-fungsi-sekolah-mengapa-pengelolaan-makan-bergizi-gratis-harus-ditangani-ahlinya', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        Program pemberian makan bergizi gratis bagi jutaan pelajar tanah air adalah ikhtiar luhur menyiapkan Generasi Emas 2045. Namun, keberhasilannya sangat ditentukan oleh profesionalitas rantai pasok dan tata kelola higienitas pangan tanpa membebani fokus utama para guru dalam mengajar.
      </p>', 'assets/images/berita/pendidikan/kurikulum-merdeka-smk.jpg', 'published', 17200, '2026-09-10 07:44:40', NOW()),
(1, 1, 'Lewat Kreasi Masakan Serba Ikan, Kak Na Ajak Anak Gemar Konsumsi Ikan', 'lewat-kreasi-masakan-serba-ikan-kak-na-ajak-anak-gemar-konsumsi-ikan', '      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Ketua Forum Peningkatan Konsumsi Ikan (Forikan) Aceh Barat, Ny. Nurmaziah Tarmizi atau akrab disapa Kak Na, terus menggencarkan inovasi olahan serba ikan seperti nugget, bakso, dan abon ikan segar guna membiasakan anak-anak menyukai konsumsi ikan demi tumbuh kembang otak yang optimal.
      </p>', 'assets/images/berita/daerah/festival-budaya-palembang.jpg', 'published', 15900, '2026-09-10 05:44:40', NOW()),
(7, 1, 'Mahasiswa Kesma UTU Adakan Lomba Cerdas Cermat Antar Desa', 'mahasiswa-kesma-utu-adakan-lomba-cerdas-cermat-antar-desa', '<p class=\'mb-4\'>Ajang cerdas cermat antar gampong ini dirancang guna memotivasi semangat membaca, pemahaman wawasan kebangsaan, dan daya pikir kritis generasi muda di tingkat desa binaan kampus.</p>', 'assets/images/berita/pendidikan/kurikulum-merdeka-smk.jpg', 'published', 14300, '2026-09-10 03:44:40', NOW()),
(1, 1, 'Sekolah Rakyat Aceh Barat Ditargetkan Mulai Dibangun Oktober, Uji Sondir Dilakukan Awal September', 'sekolah-rakyat-aceh-barat-ditargetkan-mulai-dibangun-oktober-uji-sondir-dilakukan-awal-september', '<p class=\'mb-4\'>Sekolah Rakyat terintegrasi asrama ini diproyeksikan menjadi pusat pembinaan karakter unggul anak-anak yatim dan berprestasi dari keluarga prasejahtera dengan pembiayaan beasiswa penuh pemda.</p>', 'assets/images/berita/daerah/infrastruktur-lrt-sumsel.jpg', 'published', 16800, '2026-09-10 01:44:40', NOW()),
(1, 1, 'Cath Lab RSUD CND Kembali Difungsikan, Bupati Aceh Barat Targetkan Layanan Jantung Segera Berjalan', 'cath-lab-rsud-cnd-kembali-difungsikan-bupati-aceh-barat-targetkan-layanan-jantung-segera-berjalan', '<p class=\'mb-4\'>Pengaktifan kembali instalasi Cath Lab canggih ini memangkas waktu darurat penanganan serangan jantung bagi warga di delapan kabupaten/kota wilayah barat-selatan Aceh secara signifikan.</p>', 'assets/images/berita/nasional/reformasi-birokrasi-kementerian.jpg', 'published', 24800, '2026-09-09 23:44:40', NOW()),
(10, 1, '[FOTO] Mengintip Kemegahan Pesawat Jumbo Airbus A380 yang Mampir RI', 'foto-mengintip-kemegahan-pesawat-jumbo-airbus-a380-yang-mampir-ri', '<p class=\'mb-4\'>Kemegahan burung besi bertingkat ganda terbesar di dunia ini memukau para pecinta kedirgantaraan saat menyentuh landas pacu dan menjalani proses penanganan darat terpadu.</p>', 'assets/images/berita/internasional/diplomasi-ktt-global.jpg', 'published', 33800, '2026-09-09 21:44:40', NOW()),
(10, 1, '[FOTO] Kebakaran Bromo Meluas, Api Dekati Permukiman Warga', 'foto-kebakaran-bromo-meluas-api-dekati-permukiman-warga', '<p class=\'mb-4\'>Ratusan personel gabungan bergotong-royong membuat sekat bakar manual di tengah kepulan asap pekat guna melindungi desa-desa pemukiman di sekitar lereng pegunungan.</p>', 'assets/images/berita/internasional/krisis-energi-eropa.jpg', 'published', 25600, '2026-09-09 19:44:40', NOW()),
(1, 1, 'Menteri PU Tegaskan Jembatan Sikundo dan Irigasi Lhok Guci Jadi Prioritas', 'menteri-pu-tegaskan-jembatan-sikundo-dan-irigasi-lhok-guci-jadi-prioritas', '<p class=\'mb-4\'>Penyelesaian jaringan saluran sekunder irigasi Lhok Guci diproyeksikan mengairi lebih dari 10.000 hektare areal persawahan produktif sehingga memperkuat swasembada beras di Aceh.</p>', 'assets/images/berita/daerah/revitalisasi-pelabuhan-banyuasin.jpg', 'published', 21900, '2026-09-09 17:44:40', NOW()),
(1, 1, 'Gaji 3.300 Pegawai Paruh Waktu Pidie Jaya Tertunggak hingga Tiga Bulan', 'gaji-3-300-pegawai-paruh-waktu-pidie-jaya-tertunggak-hingga-tiga-bulan', '<p class=\'mb-4\'>Pemerintah Kabupaten Pidie Jaya menyatakan proses rekonsiliasi data anggaran bersama badan pengelola keuangan daerah sedang dirampungkan agar pencairan hak pegawai honorer tuntas pekan ini.</p>', 'assets/images/berita/ekonomi/inflasi-bank-indonesia.jpg', 'published', 28100, '2026-09-09 15:44:40', NOW()),
(13, 1, 'Donald Trump Ancam FIFA Tak Kudeta Gianni Infantino Jelang Piala Dunia 2026', 'donald-trump-ancam-fifa-tak-kudeta-gianni-infantino', '<p class=\'mb-4\'>Dalam wawancara eksklusif, Trump menegaskan kepemimpinan Gianni Infantino telah membawa stabilitas finansial dan kerja sama sukses bagi tuan rumah bersama Amerika Serikat, Kanada, dan Meksiko.</p>', 'assets/images/berita/olahraga/kualifikasi-piala-dunia-timnas.jpg', 'published', 34500, '2026-09-09 13:44:40', NOW()),
(13, 1, 'Pemakaman Ayah Messi Berlangsung Tertutup, Hanya Dihadiri Keluarga Dekat', 'pemakaman-ayah-messi-berlangsung-tertutup-hanya-dihadiri-keluarga', '<p class=\'mb-4\'>Keluarga besar Lionel Messi menyampaikan terima kasih mendalam atas ribuan ucapan belasungkawa dan simpati yang mengalir dari komunitas sepak bola internasional di seluruh penjuru dunia.</p>', 'assets/images/berita/olahraga/final-bulutangkis-dunia.jpg', 'published', 44200, '2026-09-09 11:44:40', NOW()),
(11, 1, 'Turki Harap Mesir Gabung ke Pakta Pertahanan Bareng Saudi dan Pakistan', 'turki-harap-mesir-gabung-ke-pakta-pertahanan-bareng-saudi-pakistan', '<p class=\'mb-4\'>Inisiatif integrasi kemitraan pertahanan ini dinilai strategis dalam menjaga stabilitas jalur perdagangan energi maritim Laut Merah dan Terusan Suez dari potensi ancaman asimetris.</p>', 'assets/images/berita/internasional/pemilu-amerika-serikat.jpg', 'published', 27400, '2026-09-09 09:44:40', NOW()),
(4, 1, 'Sidang Perdana Tipikor Proyek Fasilitas Publik Digelar di Pengadilan Negeri, Jaksa Hadirkan Saksi Kunci', 'sidang-perdana-tipikor-proyek-fasilitas-publik-digelar-di-pengadilan-negeri-jaksa-hadirkan-saksi-kunci', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Pengadilan Tindak Pidana Korupsi (Tipikor) menggelar sidang perdana pemeriksaan saksi dalam perkara dugaan penyimpangan anggaran pembangunan fasilitas publik tahun anggaran sebelumnya.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Jaksa Penuntut Umum (JPU) Kejaksaan Negeri menghadirkan empat saksi kunci yang terdiri dari tim pemeriksa teknis, konsultan pengawas, dan perwakilan dinas terkait. Majelis hakim yang memimpin jalannya persidangan menegaskan komitmen peradilan dalam menegakkan transparansi serta asas kepastian hukum tanpa intervensi pihak manapun.
      </p>
      <blockquote class="my-6 p-4 border-l-4 border-buser-red bg-red-50 italic text-gray-800 font-serif text-lg">
        "Penegakan hukum kasus tindak pidana korupsi adalah amanat konstitusi demi menyelamatkan keuangan negara dan memastikan hak-hak masyarakat atas pembangunan yang layak dapat terpenuhi secara berkeadilan," ujar jaksa dalam pembacaan keterangannya.
      </blockquote>
      <h3 class="text-xl font-bold text-black mt-6 mb-3">Pemeriksaan Dokumen Fisik dan Keterangan Ahli</h3>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Persidangan dijadwalkan berlanjut pekan depan dengan agenda mendengarkan keterangan saksi ahli konstruksi independen guna menguji kesesuaian spesifikasi volume fisik bangunan di lapangan dengan kontrak kerja.
      </p>', 'assets/images/berita/kriminal/sidang-tipikor-pn.jpg', 'published', 1420, '2026-09-10 10:15:00', NOW()),
(4, 1, 'Polda Berhasil Bongkar Jaringan Sindikat Narkotika Lintas Provinsi, Puluhan Kilogram Barang Bukti Diamankan', 'polda-berhasil-bongkar-jaringan-sindikat-narkotika-lintas-provinsi-puluhan-kilogram-barang-bukti-diamankan', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>BANDA ACEH</strong> — Tim gabungan Ditresnarkoba Polda berhasil menggagalkan upaya penyelundupan narkotika jaringan lintas provinsi setelah melakukan pengintaian intensif di jalur pesisir timur dan perbatasan wilayah.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Dalam operasi penindakan terukur tersebut, aparat mengamankan puluhan kilogram barang bukti kemasan teh cina dan membekuk tiga orang tersangka yang berperan sebagai kurir sekaligus pengendali lapangan. Kapolda mengapresiasi partisipasi proaktif masyarakat yang memberikan informasi awal pergerakan mencurigakan di area pelabuhan tikus.
      </p>
      <blockquote class="my-6 p-4 border-l-4 border-buser-red bg-red-50 italic text-gray-800 font-serif text-lg">
        "Polri tidak akan memberikan ruang sedikit pun bagi pelaku kejahatan narkotika yang merusak masa depan generasi bangsa. Kami terus perketat pengawasan jalur darat, laut, dan udara," tegas perwira humas dalam konferensi pers.
      </blockquote>
      <h3 class="text-xl font-bold text-black mt-6 mb-3">Ancaman Hukuman Maksimal</h3>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Para tersangka kini ditahan di sel Mapolda guna penyidikan mendalam dan dijerat Pasal 114 ayat (2) Jo Pasal 112 ayat (2) UU Narkotika Nomor 35 Tahun 2009 dengan ancaman pidana mati atau penjara seumur hidup.
      </p>', 'assets/images/berita/kriminal/penangkapan-sindikat-narkoba.jpg', 'published', 1890, '2026-09-11 14:30:00', NOW()),
(4, 5, 'Patroli Siber Polda Deteksi Modus Penipuan Online Baru Jelang Ramadhan, Masyarakat Diimbau Waspada', 'patroli-siber-polda-deteksi-modus-penipuan-online-baru-jelang-ramadhan-masyarakat-diimbau-waspada', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>BANDA ACEH</strong> — Unit Cyber Crime Ditreskrimsus Polda mengimbau masyarakat untuk meningkatkan kewaspadaan terhadap modus baru penipuan digital bermotif link undangan elektronik dan paket belanja online yang disisipi malware pencuri data rekening.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Berdasarkan pemantauan patroli siber, sindikat pelaku kerap menyebarkan berkas instalasi (.apk) melalui pesan singkat instan yang meminta korban mengunduh file untuk verifikasi transaksi palsu.
      </p>
      <blockquote class="my-6 p-4 border-l-4 border-buser-red bg-red-50 italic text-gray-800 font-serif text-lg">
        "Jangan pernah menekan tautan atau memasang aplikasi dari sumber yang tidak resmi. Pastikan selalu memverifikasi informasi perbankan ke kanal aduan resmi kepolisian," imbuh pimpinan patroli siber.
      </blockquote>', 'assets/images/berita/kriminal/razia-cyber-crime.jpg', 'published', 960, '2026-09-12 08:20:00', NOW()),
(13, 3, 'Kontingen Atlet Daerah Matangkan Pemusatan Latihan Menuju Pekan Olahraga Nasional', 'kontingen-atlet-daerah-matangkan-pemusatan-latihan-menuju-pekan-olahraga-nasional', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>BANDA ACEH</strong> — Komite Olahraga Nasional Indonesia (KONI) bersama dinas pemuda dan olahraga terus menggenjot pemusatan latihan daerah (Pelatda) bagi ratusan atlet dari berbagai cabang olahraga unggulan menyongsong ajang bergengsi Pekan Olahraga Nasional (PON).
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Sejumlah cabang olahraga prioritas seperti atletik, bela diri, panahan, dan dayung menunjukkan peningkatan performa signifikan berkat penerapan teknologi sport science modern serta dukungan nutrisi terpadu di bawah bimbingan pelatih berlisensi internasional.
      </p>
      <blockquote class="my-6 p-4 border-l-4 border-buser-red bg-red-50 italic text-gray-800 font-serif text-lg">
        "Disiplin, mentalitas juara, dan sportivitas tinggi adalah kunci utama meraih podium emas. Kami optimistis para atlet mampu mengukir sejarah prestasi terbaik," terang perwakilan KONI.
      </blockquote>
      <h3 class="text-xl font-bold text-black mt-6 mb-3">Uji Tanding dan Kebugaran Atlet</h3>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Selama bulan ini, rangkaian uji tanding internal dan simulasi pertandingan dengan protokol kompetisi resmi digelar untuk mengasah ketahanan fisik dan kematangan taktik atlet di arena.
      </p>', 'assets/images/berita/olahraga/pekan-olahraga-nasional.jpg', 'published', 1750, '2026-09-11 16:45:00', NOW()),
(13, 3, 'Ganda Putra Indonesia Tembus Partai Puncak Final Kejuaraan Bulutangkis Dunia BWF', 'ganda-putra-indonesia-tembus-partai-puncak-final-kejuaraan-bulutangkis-dunia-bwf', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>JAKARTA</strong> — Pasangan bulutangkis ganda putra Indonesia berhasil memastikan satu tiket di partai final kejuaraan bergengsi BWF World Tour setelah menaklukkan rival tangguh asal Asia Timur lewat duel dramatis rubber game berdurasi 78 menit.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Permainan agresif di depan net dan smes tajam yang variatif menjadi kunci kemenangan wakil Merah Putih di gim penentuan. Kemenangan ini memperpanjang tren positif skuad bulutangkis nasional di panggung internasional musim 2026.
      </p>
      <blockquote class="my-6 p-4 border-l-4 border-buser-red bg-red-50 italic text-gray-800 font-serif text-lg">
        "Kemenangan ini kami persembahkan untuk seluruh pecinta bulutangkis di Tanah Air yang tak henti memberikan doa dan dukungan semangat dari tribun maupun layar kaca," ucap atlet usai laga semifinal.
      </blockquote>', 'assets/images/berita/olahraga/final-bulutangkis-dunia.jpg', 'published', 2410, '2026-09-12 11:10:00', NOW()),
(14, 1, 'Profil Dr. Kurdi: Birokrat Inovatif Penggagas Reformasi Tata Kelola Birokrasi Responsif dan Transparan', 'profil-dr-kurdi-birokrat-inovatif-penggagas-reformasi-tata-kelola-birokrasi-responsif-dan-transparan', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Nama Dr. Kurdi, S.T., M.T. lekat dengan citra birokrat pekerja keras yang mengedepankan pendekatan solutif, cepat, dan berbasis data dalam merespons kebutuhan mendesak masyarakat di wilayah pantai barat selatan Aceh.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Sebelum resmi dipercaya memegang amanah sebagai Sekretaris Daerah (Sekda) definitif Kabupaten Aceh Barat, rekam jejaknya dalam memimpin dinas teknis telah melahirkan berbagai percepatan pembangunan sarana konektivitas jalan, jembatan gantung penghubung desa terisolir, hingga penataan ruang publik yang humanis.
      </p>
      <blockquote class="my-6 p-4 border-l-4 border-buser-red bg-red-50 italic text-gray-800 font-serif text-lg">
        "Birokrasi bukan sekadar duduk di balik meja administrasi, tetapi harus hadir langsung mendengar denyut nadi rakyat dan bergerak sigap menyelesaikan persoalan di lapangan," tutur Dr. Kurdi dalam wawancara eksklusif Japakeh Post.
      </blockquote>
      <h3 class="text-xl font-bold text-black mt-6 mb-3">Komitmen Penguatan Disiplin dan Akuntabilitas</h3>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Di bawah kepemimpinannya, koordinasi antar SKPK diperkuat melalui sistem pelaporan kinerja real-time yang memangkas hambatan birokrasi, menjadikan pelayanan umum lebih cepat dan bebas dari pungutan liar.
      </p>', 'assets/images/berita/nasional/reformasi-birokrasi-kementerian.jpg', 'published', 2130, '2026-09-10 13:00:00', NOW()),
(14, 4, 'Inspirasi Kak Na: Penggerak Edukasi Gizi Keluarga yang Membangkitkan Gemar Makan Ikan Generasi Muda', 'inspirasi-kak-na-penggerak-edukasi-gizi-keluarga-yang-membangkitkan-gemar-makan-ikan-generasi-muda', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Sosok Kak Na dikenal luas oleh kaum ibu di gampong-gampong pesisir sebagai figur penggerak kesehatan keluarga yang tak kenal lelah mengkampanyekan pentingnya konsumsi pangan bernutrisi seimbang berbahan baku lokal.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Melalui program pelatihan kreasi olahan serba ikan yang higienis dan variatif seperti nugget ikan, bakso ikan tenggiri, hingga abon tuna, ribuan anak usia dini berhasil dibebaskan dari ancaman malnutrisi dan stunting. Pendekatan ramah dan interaktif yang diterapkannya membuat para orang tua lebih termotivasi menyajikan menu sehat setiap hari.
      </p>
      <blockquote class="my-6 p-4 border-l-4 border-buser-red bg-red-50 italic text-gray-800 font-serif text-lg">
        "Anak-anak adalah masa depan peradaban kita. Memberi mereka gizi terbaik dari hasil laut nusantara adalah investasi terbesar bagi kecerdasan dan masa depan bangsa," ujar Kak Na dengan penuh ketulusan.
      </blockquote>', 'assets/images/berita/daerah/festival-budaya-palembang.jpg', 'published', 1350, '2026-09-11 09:30:00', NOW()),
(14, 1, 'Kiprah Ulama Kharismatik Pesisir Barat: Menjaga Kesejukan Dakwah dan Moderasi Umat di Era Digital', 'kiprah-ulama-kharismatik-pesisir-barat-menjaga-kesejukan-dakwah-dan-moderasi-umat-di-era-digital', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>BANDA ACEH</strong> — Menghadapi derasnya arus informasi dan polarisasi media sosial di era modern, keteladanan para pimpinan dayah dan ulama kharismatik terus menjadi oase penyejuk yang menjaga kerukunan dan persatuan umat.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Kiprah pembinaan moral para santri yang dipadukan dengan wawasan kebangsaan serta kemandirian ekonomi agrobisnis di lingkungan pesantren membuktikan bahwa tradisi keilmuan klasik mampu bertransformasi menjawab tantangan zaman tanpa kehilangan akar identitas religiusnya.
      </p>
      <blockquote class="my-6 p-4 border-l-4 border-buser-red bg-red-50 italic text-gray-800 font-serif text-lg">
        "Nasihat yang tulus dan keteladanan budi pekerti luhur selalu lebih berbobot daripada ribuan bantahan lisan di ruang publik. Jaga persaudaraan dan rawat kedamaian negeri," pesan ulama kharismatik dalam tausiyah kebangsaan.
      </blockquote>', 'assets/images/berita/nasional/konferensi-pers-istana.jpg', 'published', 1620, '2026-09-12 07:15:00', NOW()),
(12, 5, '[VIDEO] Liputan Khusus: Apel Kesiapsiagaan Satgas Linmas dan Pengamanan Terpadu Gampong', 'video-liputan-khusus-apel-kesiapsiagaan-satgas-linmas-dan-pengamanan-terpadu-gampong', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Redaksi Multimedia Japakeh Post menyajikan rangkuman liputan video eksklusif perihal apel siaga gelar pasukan Satuan Perlindungan Masyarakat (Satlinmas) dan relawan Pageu Gampong di halaman Setdakab Aceh Barat.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Simak dokumentasi kesiapan personel, simulasi evakuasi tanggap darurat bencana, serta instruksi langsung jajaran pimpinan daerah dalam memperkokoh ketenteraman lingkungan warga.
      </p>
      <div class="my-6 p-4 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center text-center space-y-3">
        <div class="w-16 h-16 rounded-full bg-buser-red flex items-center justify-center shadow-lg animate-pulse cursor-pointer">
          <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <p class="text-sm font-semibold">Tonton Tayangan Video Eksklusif (Kanal YouTube Resmi Japakeh Post)</p>
        <span class="text-xs text-slate-400">Durasi: 05:42 WIB &bull; Resolusi HD 1080p</span>
      </div>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Sinergi aparat keamanan dan aparatur gampong merupakan pilar utama kenyamanan investasi dan stabilitas sosial masyarakat pesisir barat selatan Aceh.
      </p>', 'assets/images/berita/daerah/festival-budaya-palembang.jpg', 'published', 2890, '2026-09-11 17:00:00', NOW()),
(12, 5, '[VIDEO] Dokumentasi Sains Kampus: Inovasi Olahan Kulit Manggis Jadi Penjernih Air Gambut', 'video-dokumentasi-sains-kampus-inovasi-olahan-kulit-manggis-jadi-penjernih-air-gambut', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>BANDA ACEH</strong> — Kanal video sains dan teknologi Japakeh Post menayangkan secara mendalam proses riset terapan mahasiswa dalam menyulap limbah organik kulit manggis menjadi karbon aktif penyerap logam berat dan kekeruhan air gambut.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Melalui uji laboratorium bertahap, prototipe reaktor filtrasi sederhana ini terbukti mampu mengalirkan air jernih dengan standar baku mutu kesehatan untuk komunitas perdesaan di lahan basah.
      </p>
      <div class="my-6 p-4 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center text-center space-y-3">
        <div class="w-16 h-16 rounded-full bg-buser-red flex items-center justify-center shadow-lg animate-pulse cursor-pointer">
          <svg class="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <p class="text-sm font-semibold">Tonton Dokumenter Riset Sains Terapan</p>
        <span class="text-xs text-slate-400">Durasi: 08:15 WIB &bull; Resolusi HD 1080p</span>
      </div>', 'assets/images/berita/teknologi/peluncuran-satelit-indonesia.jpg', 'published', 1980, '2026-09-12 12:40:00', NOW()),
(3, 3, 'DPRK Bahas Rancangan Regulasi Penguatan Transparansi Anggaran Pembangunan Daerah', 'dprk-bahas-rancangan-regulasi-penguatan-transparansi-anggaran-pembangunan-daerah', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Dewan Perwakilan Rakyat Kabupaten (DPRK) menggelar sidang paripurna masa sidang II dalam rangka pembahasan rancangan qanun/peraturan daerah mengenai penguatan transparansi dan akuntabilitas sistem perencanaan penganggaran daerah.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Seluruh fraksi di parlemen menyepakati bahwa keterbukaan informasi alokasi belanja modal dan bantuan sosial gampong harus dapat diakses secara mudah oleh publik melalui platform portal satu data daerah terintegrasi.
      </p>
      <blockquote class="my-6 p-4 border-l-4 border-buser-red bg-red-50 italic text-gray-800 font-serif text-lg">
        "Legislatif berkewajiban mengawal setiap rupiah dana rakyat agar tepat sasaran menjawab prioritas infrastruktur dasar dan pelayanan kesehatan," tutur pimpinan sidang.
      </blockquote>', 'assets/images/berita/politik/sidang-paripurna-dpr.jpg', 'published', 1120, '2026-09-11 11:20:00', NOW()),
(3, 3, 'Konsolidasi Lintas Fraksi Partai Sepakati Agenda Prioritas Pengentasan Kemiskinan Ekstrem', 'konsolidasi-lintas-fraksi-partai-sepakati-agenda-prioritas-pengentasan-kemiskinan-ekstrem', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>BANDA ACEH</strong> — Pimpinan fraksi-fraksi partai politik di parlemen daerah menyepakati nota kesepahaman agenda legislasi prioritas yang menitikberatkan pada percepatan intervensi kemiskinan ekstrem dan pembukaan lapangan kerja produktif.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Kesepakatan bersama ini menjadi sinyal positif stabilitas politik lokal menjelang penyusunan rencana kerja pemerintah daerah tahun anggaran berikutnya, di mana harmonisasi antara eksekutif dan legislatif menjadi prasyarat percepatan realisasi program.
      </p>', 'assets/images/berita/politik/koalisi-partai-politik.jpg', 'published', 980, '2026-09-12 09:10:00', NOW()),
(5, 3, 'Bank Indonesia Catat Inflasi Daerah Terkendali Berkat Kelancaran Rantai Pasok Komoditas Pangan', 'bank-indonesia-catat-inflasi-daerah-terkendali-berkat-kelancaran-rantai-pasok-komoditas-pangan', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>BANDA ACEH</strong> — Kantor Perwakilan Bank Indonesia melaporkan laju inflasi indeks harga konsumen (IHK) di tingkat provinsi dan kabupaten tetap berada dalam sasaran target 2,5 ± 1 persen berkat konsistensi operasi pasar terpadu Tim Pengendalian Inflasi Daerah (TPID).
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Kelancaran pasokan komoditas strategis seperti beras, cabai merah, dan minyak goreng di pasar tradisional berhasil meredam potensi gejolak harga pangan menjelang periode hari besar keagamaan nasional.
      </p>', 'assets/images/berita/ekonomi/inflasi-bank-indonesia.jpg', 'published', 1280, '2026-09-11 13:15:00', NOW()),
(5, 3, 'Nilai Ekspor Komoditas Perkebunan dan Kelautan Melonjak, Sumbang Devisa Positif di Pesisir Barat', 'nilai-ekspor-komoditas-perkebunan-dan-kelautan-melonjak-sumbang-devisa-positif-di-pesisir-barat', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>MEULABOH</strong> — Badan Pusat Statistik (BPS) merilis data kinerja neraca perdagangan yang mencatat lonjakan signifikan volume ekspor produk kelapa sawit, biji kopi Gayo, serta komoditas perikanan tangkap dari pelabuhan regional menuju pasar Asia dan Timur Tengah.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Peningkatan nilai ekspor ini berdampak langsung terhadap perbaikan Nilai Tukar Petani (NTP) dan terbukanya peluang investasi hilirisasi industri pengolahan di kawasan pesisir nusantara.
      </p>', 'assets/images/berita/ekonomi/ekspor-komoditas-sawit.jpg', 'published', 1540, '2026-09-12 10:40:00', NOW()),
(8, 5, 'Pusat Keamanan Siber Wilayah Diperkuat Guna Lindungi Data Layanan Publik Terpadu', 'pusat-keamanan-siber-wilayah-diperkuat-guna-lindungi-data-layanan-publik-terpadu', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>JAKARTA</strong> — Kementerian Komunikasi dan Digital bersama Badan Siber dan Sandi Negara (BSSN) meresmikan Computer Security Incident Response Team (CSIRT) regional untuk memproteksi infrastruktur server dan basis data administrasi kependudukan daerah dari serangan peretasan.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Penerapan arsitektur Zero Trust Security dan pemantauan ancaman secara otomatis 24 jam nonstop diharapkan menjamin keamanan transaksi layanan digital publik di era kecerdasan buatan.
      </p>', 'assets/images/berita/teknologi/pusat-keamanan-siber.jpg', 'published', 1430, '2026-09-11 15:50:00', NOW()),
(8, 5, 'Ekspansi Jaringan Satelit Komunikasi Buka Konektivitas Internet Sekolah di Wilayah Pelosok 3T', 'ekspansi-jaringan-satelit-komunikasi-buka-konektivitas-internet-sekolah-di-wilayah-pelosok-3t', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>JAKARTA</strong> — Pengoperasian penuh satelit komunikasi kapasitas tinggi buatan nasional kini telah menghubungkan ribuan titik layanan fasilitas pendidikan dan puskesmas di wilayah terdepan, terluar, dan tertinggal (3T) dengan jaringan pita lebar berkecepatan tinggi.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Pemerataan akses konektivitas digital ini memungkinkan para guru dan siswa di pedalaman memanfaatkan materi pembelajaran berbasis cloud dan mengikuti asesmen nasional secara mandiri tanpa kendala sinyal.
      </p>', 'assets/images/berita/teknologi/peluncuran-satelit-komunikasi.jpg', 'published', 1670, '2026-09-12 11:35:00', NOW()),
(11, 3, 'KTT Diplomasi Global Sepakati Resolusi Perlindungan Korban Sipil dan Koridor Kemanusiaan', 'ktt-diplomasi-global-sepakati-resolusi-perlindungan-korban-sipil-dan-koridor-kemanusiaan', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>JENEWA</strong> — Pertemuan tingkat tinggi para pemimpin diplomasi internasional di Markas PBB menghasilkan kesepakatan resolusi darurat mengenai perlindungan tanpa syarat bagi warga sipil dan fasilitas medis di wilayah konflik bersenjata global.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Delegasi Indonesia menyerukan pentingnya penegakan hukum humaniter internasional serta pembukaan akses bantuan logistik pangan dan obat-obatan secara berkelanjutan bagi jutaan pengungsi yang terdampak krisis kemanusiaan.
      </p>', 'assets/images/berita/internasional/diplomasi-ktt-global.jpg', 'published', 2050, '2026-09-11 18:20:00', NOW()),
(7, 4, 'Penguatan Kurikulum Merdeka di Sekolah Kejuruan Dorong Daya Saing dan Keterampilan Lulusan', 'penguatan-kurikulum-merdeka-di-sekolah-kejuruan-dorong-daya-saing-dan-keterampilan-lulusan', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>BANDA ACEH</strong> — Dinas Pendidikan Provinsi memperluas kemitraan strategis antara SMK unggulan dan dunia industri manufaktur terkemuka guna menyelaraskan kurikulum vokasi dengan kebutuhan riil pasar tenaga kerja era teknologi.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Program magang industri bersertifikasi kompetensi nasional dan fasilitas teaching factory terbukti meningkatkan serapan kerja lulusan sekolah kejuruan hingga mencapai angka rekor di awal tahun ini.
      </p>', 'assets/images/berita/pendidikan/kurikulum-merdeka-nasional.jpg', 'published', 1240, '2026-09-11 08:45:00', NOW()),
(2, 1, 'Pemerintah Percepat Pembangunan Infrastruktur Strategis Penghubung Pusat Pertumbuhan Ekonomi Baru', 'pemerintah-percepat-pembangunan-infrastruktur-strategis-penghubung-pusat-pertumbuhan-ekonomi-baru', '
      <p class="lead font-medium text-lg text-gray-800 leading-relaxed mb-4">
        <strong>NUSANTARA</strong> — Kementerian Pekerjaan Umum melaporkan kemajuan signifikan dalam penyelesaian jaringan jalan tol lingkar dan fasilitas konektivitas logistik pendukung Ibu Kota Nusantara (IKN) dan kawasan penyangga sekitarnya.
      </p>
      <p class="mb-4 text-gray-700 leading-relaxed">
        Presiden menekankan bahwa percepatan pembangunan infrastruktur nasional ini diarahkan untuk memeratakan kue pembangunan ekonomi luar Pulau Jawa dan menciptakan efisiensi rantai distribusi nasional.
      </p>', 'assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg', 'published', 2340, '2026-09-12 13:10:00', NOW());


-- -----------------------------------------------------------------------------
-- 4. Tabel: video (YouTube Embeds)
-- -----------------------------------------------------------------------------
CREATE TABLE `video` (
  `id_video` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `youtube_url` VARCHAR(255) NOT NULL,
  `youtube_id` VARCHAR(50) NOT NULL,
  `caption` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_video`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `video` (`id_video`, `title`, `youtube_url`, `youtube_id`, `caption`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Apel Siaga Satgas Linmas dan Pageu Gampong Kabupaten Aceh Barat', 'https://www.youtube.com/watch?v=ScMzIvxBSi4', 'ScMzIvxBSi4', 'Liputan video jurnalis Japakeh Post menyoroti apel gelar kesiapsiagaan aparat perlindungan gampong dalam menjaga kamtibmas dan mitigasi bencana.', 1, NOW(), NOW()),
(2, 'Inovasi Mahasiswa Aceh: Kulit Manggis Jadi Penjernih Air Gambut', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 'Dokumentasi riset terapan kampus mengolah limbah kulit manggis menjadi karbon aktif yang mampu menyaring air rawa menjadi air bersih layak konsumsi.', 1, NOW(), NOW()),
(3, 'Gelora Atlet Daerah Matangkan Latihan Intensif Menuju PON', 'https://www.youtube.com/watch?v=kXYiU_JCYtU', 'kXYiU_JCYtU', 'Liputan eksklusif persiapan kontingen atlet daerah dalam pemusatan latihan cabang olahraga unggulan dengan dukungan sport science terpadu.', 1, NOW(), NOW()),
(4, 'Pesona Bahari dan Keindahan Pesisir Pantai Barat Aceh', 'https://www.youtube.com/watch?v=kJQP7kiw5Fk', 'kJQP7kiw5Fk', 'Dokumentasi visual keindahan lanskap pantai, kehidupan nelayan pesisir, dan ragam potensi wisata bahari nusantara.', 1, NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 5. Tabel: komentar (Moderasi & Komentar Pembaca)
-- -----------------------------------------------------------------------------
CREATE TABLE `komentar` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `artikel_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `comment` TEXT NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'spam') NOT NULL DEFAULT 'approved',
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_komentar_artikel` (`artikel_id`),
  KEY `idx_komentar_status` (`status`),
  CONSTRAINT `fk_komentar_artikel` FOREIGN KEY (`artikel_id`) REFERENCES `artikel` (`id_artikel`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `komentar` (`id`, `artikel_id`, `name`, `email`, `comment`, `status`, `created_at`) VALUES
(1, 1, 'Teuku Munawar', 'munawar.aceh@gmail.com', 'Apresiasi tinggi untuk komitmen Pak Bupati dan tim Satgas Pageu Gampong. Keamanan desa adalah kunci utama ketenangan masyarakat beribadah dan berusaha.', 'approved', NOW()),
(2, 1, 'Rahmad Hidayat', 'rahmad.h@yahoo.com', 'Semoga sarana operasional dan pelatihan kebencanaan Linmas benar-benar terealisasi merata di setiap kecamatan.', 'approved', NOW());

-- -----------------------------------------------------------------------------
-- 6. Tabel: profil_redaksi (Susunan Redaksi PT Japakeh Media Nusantara)
-- -----------------------------------------------------------------------------
CREATE TABLE `profil_redaksi` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nama` VARCHAR(150) NOT NULL,
  `jabatan` VARCHAR(150) NOT NULL,
  `kategori` VARCHAR(100) DEFAULT 'Redaksi',
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `telepon` VARCHAR(50) DEFAULT NULL,
  `foto` VARCHAR(255) DEFAULT NULL,
  `urutan` INT DEFAULT 0,
  `status` VARCHAR(20) DEFAULT 'active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_profil_urutan` (`urutan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `profil_redaksi` (`id`, `nama`, `jabatan`, `kategori`, `keterangan`, `email`, `telepon`, `foto`, `urutan`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Drs. H. Taufik Hidayat, S.H., M.H.', 'Penasihat Hukum', 'Penasihat & Pembina', 'Advokat & Konsultan Hukum Media Pers', 'hukum@japakehpost.com', '082165071114', '', 1, 'active', NOW(), NOW()),
(2, 'Al Bahri', 'Pemimpin Umum / Direktur Utama', 'Pimpinan Perusahaan', 'PT Japakeh Media Nusantara', 'alb4hri@gmail.com', '082165071114', 'assets/images/logo/favicon.webp', 2, 'active', NOW(), NOW()),
(3, 'Al Bahri', 'Pemimpin Redaksi / Penanggung Jawab', 'Pimpinan Redaksi', 'Uji Kompetensi Wartawan Utama', 'alb4hri@gmail.com', '082165071114', 'assets/images/logo/favicon.webp', 3, 'active', NOW(), NOW()),
(4, 'Teuku Iskandar', 'Redaktur Pelaksana', 'Redaktur', 'Koordinator Meja Redaksi Japakeh Post', 'iskandar@japakehpost.com', '082165071114', '', 4, 'active', NOW(), NOW()),
(5, 'Zulfikar Maulana', 'Redaktur Daerah & Investigasi', 'Redaktur', 'Koordinator Liputan Wilayah Aceh & Nusantara', 'zulfikar@japakehpost.com', '082165071114', '', 5, 'active', NOW(), NOW()),
(6, 'Rahman Hakim, S.Sos.', 'Redaktur Politik & Hukum', 'Redaktur', 'Koresponden Kebijakan Publik & Parlemen', 'rahman.hakim@japakehpost.com', '082165071114', '', 6, 'active', NOW(), NOW()),
(7, 'M. Rizky Ramadhan, S.E.', 'Redaktur Ekonomi & Bisnis', 'Redaktur', 'Analis Pasar Modal, Keuangan & Perbankan Syariah', 'rizky.ramadhan@japakehpost.com', '082165071114', '', 7, 'active', NOW(), NOW()),
(8, 'Cut Mutia Sari, M.Pd.', 'Redaktur Pendidikan & Opini', 'Redaktur', 'Pemerhati Mutu Akademik & Budaya Literasi', 'mutiasari@japakehpost.com', '082165071114', '', 8, 'active', NOW(), NOW()),
(9, 'Kevin Adityawarman', 'Teknologi & Multimedia', 'Teknologi & Multimedia', 'Infrastruktur Web, Siber, dan Siaran Digital', 'kevin.tech@japakehpost.com', '082165071114', '', 9, 'active', NOW(), NOW());

-- -----------------------------------------------------------------------------
-- 7. Tabel: settings (Pengaturan Global Japakeh Post)
-- -----------------------------------------------------------------------------
CREATE TABLE `settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `group` VARCHAR(50) DEFAULT 'general',
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_setting_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `settings` (`setting_key`, `setting_value`, `group`) VALUES
('site_title', 'Japakeh Post — Cepat, Akurat, Terpercaya', 'general'),
('site_description', 'Portal Berita Digital Terkini Daerah, Nasional, Politik, Hukum, Ekonomi, dan Informasi Terpercaya Nusantara.', 'general'),
('company_name', 'PT Japakeh Media Nusantara', 'company'),
('hotline_phone', '082165071114', 'contact'),
('redaksi_email', 'alb4hri@gmail.com', 'contact'),
('office_address', 'Jl. Banda Aceh - Meulaboh Km. 8, Gampong Japakeh, Darul Imarah, Aceh Besar, Aceh', 'contact');

-- -----------------------------------------------------------------------------
-- 8. Tabel: iklan (Manajemen Iklan Google Ads & Banner Endorse / Sponsor)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `iklan` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `judul` VARCHAR(255) NOT NULL,
  `tipe` ENUM('google', 'banner') NOT NULL DEFAULT 'google',
  `posisi` ENUM('header', 'sidebar', 'article_middle', 'article_bottom', 'home_middle', 'footer') NOT NULL DEFAULT 'sidebar',
  `kode_html` LONGTEXT DEFAULT NULL,
  `gambar` VARCHAR(255) DEFAULT NULL,
  `link_tujuan` VARCHAR(255) DEFAULT NULL,
  `keterangan` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `urutan` INT DEFAULT 0,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_iklan_posisi_status` (`posisi`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `iklan` (`id`, `judul`, `tipe`, `posisi`, `kode_html`, `gambar`, `link_tujuan`, `keterangan`, `is_active`, `urutan`, `created_at`, `updated_at`) VALUES
(1, 'Sponsor Resmi Japakeh Post — Bank Syariah Indonesia', 'banner', 'header', NULL, 'assets/images/berita/nasional/kantor-pusat-bsi-landmark-aceh.jpg', 'https://bankbsi.co.id', 'Mitra Finansial & Perbankan Syariah Mitra Redaksi', 1, 1, NOW(), NOW()),
(2, 'Google AdSense — Sidebar Responsive Display', 'google', 'sidebar', '<ins class=\"adsbygoogle\" style=\"display:block\" data-ad-client=\"ca-pub-1234567890123456\" data-ad-slot=\"9876543210\" data-ad-format=\"auto\" data-full-width-responsive=\"true\"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>', NULL, NULL, 'Slot iklan sidebar otomatis Google AdSense', 1, 2, NOW(), NOW()),
(3, 'Google AdSense — Artikel Tengah (In-Article)', 'google', 'article_middle', '<ins class=\"adsbygoogle\" style=\"display:block; text-align:center;\" data-ad-layout=\"in-article\" data-ad-format=\"fluid\" data-ad-client=\"ca-pub-1234567890123456\" data-ad-slot=\"5432109876\"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>', NULL, NULL, 'Slot iklan di sela paragraf artikel berita', 1, 3, NOW(), NOW()),
(4, 'Banner Promo UMKM Aceh & Kuliner Khas Nusantara', 'banner', 'home_middle', NULL, 'assets/images/berita/ekonomi/panen-kopi-gayo-organik.jpg', 'https://japakehpost.com', 'Banner kemitraan promosi UMKM daerah', 1, 4, NOW(), NOW());

SET FOREIGN_KEY_CHECKS = 1;