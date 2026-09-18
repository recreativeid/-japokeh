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

-- Akun Default Administrator
-- 1. Al Bahri (alb4hri@gmail.com) - Password: admin123
-- 6. Admin (admin@admin.com) - Password: admin123#
INSERT INTO `users` (`id`, `nama_users`, `email_users`, `password`, `role`, `status`, `avatar`, `bio`, `created_at`, `updated_at`) VALUES
(1, 'Al Bahri', 'alb4hri@gmail.com', '$2y$12$AofBEg9ojNMtJtIuaYOKPuup2Q4Dgc6yzuDOfXYOYwN0Izr0BgIHq', 'Administrator', 'active', 'assets/images/logo/favicon.webp', 'Pemimpin Umum / Pemimpin Redaksi & Penanggung Jawab PT Japakeh Media Nusantara - Japakeh Post.', NOW(), NOW()),
(6, 'Admin', 'admin@admin.com', '$2y$12$W3M5cQ6PxY2KtGa8A9oa6uy0Ud9IbcRKko83xcfxf5VEFU0ip98qm', 'Administrator', 'active', 'assets/images/logo/favicon.webp', 'Administrator Sistem Portal Japakeh Post.', NOW(), NOW());

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
(14, 'Tokoh', 'tokoh', 'Profil figur inspiratif, tokoh publik, birokrat berdedikasi, ulama kharismatik, dan cendekiawan penggerak kemajuan masyarakat.'),
(15, 'Editorial', 'editorial', 'Sikap resmi dewan redaksi, tajuk rencana, pandangan institusional Japakeh Post terhadap dinamika peristiwa strategis.');

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