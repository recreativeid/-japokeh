<?php
/**
 * Migration & Seeder: Tabel iklan
 * Japakeh Post News Portal - PT Japakeh Media Nusantara
 */

require_once __DIR__ . '/../config/database.php';

try {
    $db = Database::getConnection();

    echo "Membuat tabel 'iklan' jika belum ada...\n";

    $sql = "
    CREATE TABLE IF NOT EXISTS `iklan` (
        `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
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
        KEY `idx_iklan_posisi_status` (`posisi`, `is_active`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $db->exec($sql);
    echo "✔ Tabel 'iklan' berhasil dibuat atau sudah ada.\n";

    // Cek apakah tabel kosong
    $count = (int)$db->query("SELECT COUNT(*) FROM `iklan`")->fetchColumn();
    if ($count === 0) {
        echo "Menambahkan data awal contoh iklan (Google Ads & Banner Sponsor)...\n";

        $seedData = [
            [
                'judul'       => 'Sponsor Resmi Japakeh Post — Bank Syariah Indonesia',
                'tipe'        => 'banner',
                'posisi'      => 'header',
                'kode_html'   => null,
                'gambar'      => 'assets/images/berita/nasional/kantor-pusat-bsi-landmark-aceh.jpg',
                'link_tujuan' => 'https://bankbsi.co.id',
                'keterangan'  => 'Mitra Finansial & Perbankan Syariah Mitra Redaksi',
                'is_active'   => 1,
                'urutan'      => 1
            ],
            [
                'judul'       => 'Google AdSense — Sidebar Responsive Display',
                'tipe'        => 'google',
                'posisi'      => 'sidebar',
                'kode_html'   => '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-1234567890123456" data-ad-slot="9876543210" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>',
                'gambar'      => null,
                'link_tujuan' => null,
                'keterangan'  => 'Slot iklan sidebar otomatis Google AdSense',
                'is_active'   => 1,
                'urutan'      => 2
            ],
            [
                'judul'       => 'Google AdSense — Artikel Tengah (In-Article)',
                'tipe'        => 'google',
                'posisi'      => 'article_middle',
                'kode_html'   => '<ins class="adsbygoogle" style="display:block; text-align:center;" data-ad-layout="in-article" data-ad-format="fluid" data-ad-client="ca-pub-1234567890123456" data-ad-slot="5432109876"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>',
                'gambar'      => null,
                'link_tujuan' => null,
                'keterangan'  => 'Slot iklan di sela paragraf artikel berita',
                'is_active'   => 1,
                'urutan'      => 3
            ],
            [
                'judul'       => 'Banner Promo UMKM Aceh & Kuliner Khas Nusantara',
                'tipe'        => 'banner',
                'posisi'      => 'home_middle',
                'kode_html'   => null,
                'gambar'      => 'assets/images/berita/ekonomi/panen-kopi-gayo-organik.jpg',
                'link_tujuan' => 'https://japakehpost.com',
                'keterangan'  => 'Banner kemitraan promosi UMKM daerah',
                'is_active'   => 1,
                'urutan'      => 4
            ]
        ];

        $stmt = $db->prepare("
            INSERT INTO `iklan` (`judul`, `tipe`, `posisi`, `kode_html`, `gambar`, `link_tujuan`, `keterangan`, `is_active`, `urutan`, `created_at`, `updated_at`)
            VALUES (:judul, :tipe, :posisi, :kode_html, :gambar, :link_tujuan, :keterangan, :is_active, :urutan, NOW(), NOW())
        ");

        foreach ($seedData as $item) {
            $stmt->execute([
                ':judul'       => $item['judul'],
                ':tipe'        => $item['tipe'],
                ':posisi'      => $item['posisi'],
                ':kode_html'   => $item['kode_html'],
                ':gambar'      => $item['gambar'],
                ':link_tujuan' => $item['link_tujuan'],
                ':keterangan'  => $item['keterangan'],
                ':is_active'   => $item['is_active'],
                ':urutan'      => $item['urutan']
            ]);
        }

        echo "✔ Berhasil menambahkan " . count($seedData) . " contoh iklan awal.\n";
    } else {
        echo "ℹ Tabel 'iklan' sudah berisi data ({$count} baris).\n";
    }

    echo "Selesai!\n";
} catch (PDOException $e) {
    echo "❌ Error PDO Database: " . $e->getMessage() . "\n";
    exit(1);
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
