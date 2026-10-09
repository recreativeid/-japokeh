<?php
/**
 * REST API Endpoint: Pengaturan Portal Berita & Profil Kontak
 * Portal Berita Japakeh Post - PT Japakeh Media Nusantara
 * Table: settings
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$jsonFile = __DIR__ . '/settings.json';

// Pengaturan Default Sistem
function getDefaultSettings(): array {
    return [
        'site_title'         => 'Japakeh Post — Cepat, Akurat, Terpercaya',
        'site_tagline'       => 'Portal Berita Cepat, Akurat, dan Terpercaya',
        'site_description'   => 'Portal Berita Digital Terkini Daerah, Nasional, Politik, Hukum, Ekonomi, dan Informasi Terpercaya Nusantara.',
        'company_name'       => 'PT Japakeh Media Nusantara',
        'timezone'           => 'Asia/Jakarta',
        'hotline_phone'      => '082165071114',
        'redaksi_email'      => 'alb4hri@gmail.com',
        'iklan_email'        => 'iklan@japakehpost.com',
        'office_address'     => 'Gedung PT Japakeh Media Nusantara, Jl. Banda Aceh - Meulaboh Km. 8, Gampong Japakeh, Kec. Darul Imarah, Kab. Aceh Besar, Aceh.',
        'social_facebook'    => 'https://www.facebook.com/',
        'social_tiktok'      => 'https://www.tiktok.com/',
        'social_instagram'   => '',
        'social_youtube'     => '',
        'social_twitter'     => '',
        'seo_title'          => 'Japakeh Post — Cepat, Akurat, Terpercaya',
        'seo_description'    => 'Portal berita daerah Aceh, nasional, politik, hukum, ekonomi, bisnis, pendidikan, teknologi, dan internasional secara cepat, akurat, dan terpercaya.',
        'seo_keywords'       => 'japakeh post, portal berita aceh, berita terkini, daerah aceh, nasional, politik, hukum, ekonomi, bisnis',
        'posts_per_page'     => 12,
        'show_views_counter' => 1,
        'allow_comments'     => 1,
        'moderate_comments'  => 1,
        'show_breaking_time' => 1,

        // Pengaturan Halaman Tentang Kami & Legalitas
        'about_hero_badge'        => 'PROFIL RESMI',
        'about_hero_title'        => 'Tentang Japakeh Post',
        'about_hero_subtitle'     => '"Cepat, Akurat, Terpercaya"',
        'about_intro_heading'     => 'Tentang Japakeh Post',
        'about_intro_subheading'  => 'Profil Media Siber',
        'about_description'       => "Japakeh Post adalah portal media siber dan multimedia independen yang berpusat di Aceh dan menjangkau pembaca di seluruh Indonesia. Mengusung tagline \"Cepat, Akurat, Terpercaya\", Japakeh Post didirikan dengan tekad teguh untuk menghadirkan jurnalisme yang faktual, kredibel, dan berintegritas tinggi.\n\nJapakeh Post diterbitkan dan dikelola oleh badan usaha pers resmi PT JAPAKEH MEDIA NUSANTARA, dengan Penanggung Jawab / Pemimpin Redaksi Al Bahri. Kami menyajikan informasi terkini meliputi kanal Berita Daerah, Nusantara, Nasional, Politik, Hukum, Ekonomi, Bisnis, Pendidikan, Teknologi, Opini Publik, dan Peristiwa Internasional.\n\nDalam menjalankan kerja-kerja jurnalistik, seluruh jurnalis dan awak redaksi Japakeh Post senantiasa mematuhi Undang-Undang Pokok Pers No. 40 Tahun 1999, Kode Etik Jurnalistik (KEJ), serta Pedoman Pemberitaan Media Siber Dewan Pers Republik Indonesia.",
        'about_visi'              => 'Menjadi portal berita digital terdepan, tepercaya, dan berintegritas di Aceh dan kancah Nasional yang mencerdaskan publik serta menjadi rujukan informasi yang cepat, akurat, dan berimbang.',
        'about_misi'              => "Menyajikan berita aktual, cepat, dan terverifikasi secara ketat sesuai kaidah jurnalistik profesional.\nMengangkat potensi kemajuan daerah Aceh dan Nusantara ke panggung publik luas.\nMengawal supremasi hukum, transparansi tata kelola, dan aspirasi masyarakat secara berimbang.\nMemanfaatkan teknologi digital mutakhir untuk kemudahan akses informasi pembaca modern.",
        'about_redaksi_subtitle'  => 'PT Japakeh Media Nusantara • 2026',
        'about_redaksi_notice'    => 'PEMBERITAHUAN RESMI: Seluruh jurnalis Japakeh Post dibekali Kartu Tanda Anggota (KTA) Pers resmi yang masih berlaku dan namanya tercantum dalam Boks Redaksi ini. Dilarang keras menerima atau meminta imbalan dalam bentuk apa pun dari narasumber.',
        'about_leader'            => 'Al Bahri',
        'about_business_field'    => 'Portal Berita Daring, Multimedia, dan Penerbitan Karya Jurnalistik',
        'about_legal_sk'          => 'AHU-0012345.AH.01.01.TAHUN 2024',
        'about_legal_nib'         => '0123456789123',
        'about_legal_npwp'        => '12.345.678.9-123.000',
        'about_legal_commitments' => "Undang-Undang Republik Indonesia Nomor 40 Tahun 1999 tentang Pers\nKode Etik Jurnalistik (KEJ) Dewan Pers Indonesia\nPedoman Pemberitaan Media Siber (Peraturan Dewan Pers)",
        'about_pedoman_siber'     => 'Japakeh Post tunduk pada Pedoman Pemberitaan Media Siber yang ditetapkan oleh Dewan Pers Republik Indonesia. Prinsip akurasi, keberimbangan, kejujuran, dan hak jawab merupakan pilar mutlak dalam setiap peliputan kami.',
        'about_hak_jawab'         => 'Hak Jawab dan Koreksi Berita: Setiap pihak atau subjek pemberitaan yang merasa dirugikan atau menemukan ketidakakuratan data memiliki hak penuh mengajukan Hak Jawab, Hak Koreksi, atau Hak Klarifikasi. Permohonan dapat dikirimkan secara tertulis via email resmi atau WhatsApp redaksi dengan menyertakan bukti pendukung dan identitas yang valid.'
    ];
}

// Baca dari file JSON jika ada
function getJsonSettings(string $filePath): array {
    if (file_exists($filePath)) {
        $content = @file_get_contents($filePath);
        if ($content) {
            $data = json_decode($content, true);
            if (is_array($data)) {
                return array_merge(getDefaultSettings(), $data);
            }
        }
    }
    return getDefaultSettings();
}

// Simpan ke file JSON
function saveJsonSettings(string $filePath, array $settings): bool {
    return (bool)@file_put_contents(
        $filePath,
        json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
    );
}

// Dapatkan koneksi DB (opsional)
$db = null;
try {
    $db = Database::getConnection();
} catch (Throwable $e) {
    $db = null;
}

// Pastikan tabel settings ada jika koneksi DB tersedia
if ($db) {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS `settings` (
              `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
              `setting_key` VARCHAR(100) NOT NULL,
              `setting_value` TEXT DEFAULT NULL,
              `group` VARCHAR(50) DEFAULT 'general',
              `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              UNIQUE KEY `idx_setting_key` (`setting_key`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (Throwable $e) {}
}

/* ==========================================================================
   1. METHOD GET: Ambil Semua Pengaturan
   ========================================================================== */
if ($method === 'GET') {
    $settings = getDefaultSettings();

    // 1. Coba baca dari file JSON terlebih dahulu sebagai cache/fallback
    $jsonSettings = getJsonSettings($jsonFile);
    $settings = array_merge($settings, $jsonSettings);

    // 2. Jika ada koneksi database, ambil pengaturan dari database
    if ($db) {
        try {
            $stmt = $db->query("SELECT setting_key, setting_value FROM settings");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $row) {
                $key = $row['setting_key'];
                $val = $row['setting_value'];
                // Normalisasi tipe boolean / integer jika berlaku
                if (in_array($key, ['show_views_counter', 'allow_comments', 'moderate_comments', 'show_breaking_time', 'posts_per_page'], true) && is_numeric($val)) {
                    $val = (int)$val;
                }
                $settings[$key] = $val;
            }
            // Sinkronkan kembali ke JSON agar file selalu terupdate
            saveJsonSettings($jsonFile, $settings);
        } catch (Throwable $e) {
            // Diamkan error DB, gunakan data JSON
        }
    }

    sendResponse(true, 'Pengaturan portal berhasil dimuat', $settings);
}

/* ==========================================================================
   2. METHOD POST / PUT: Simpan / Update Pengaturan
   ========================================================================== */
if ($method === 'POST' || $method === 'PUT') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (!is_array($input) || empty($input)) {
        $input = $_POST;
    }

    if (empty($input)) {
        sendResponse(false, 'Data pengaturan tidak boleh kosong', null, 400);
    }

    // Ambil data pengaturan saat ini
    $currentSettings = getDefaultSettings();
    $currentSettings = array_merge($currentSettings, getJsonSettings($jsonFile));

    if ($db) {
        try {
            $stmt = $db->query("SELECT setting_key, setting_value FROM settings");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $row) {
                $currentSettings[$row['setting_key']] = $row['setting_value'];
            }
        } catch (Throwable $e) {}
    }

    // Tentukan mapping group untuk tiap key
    $groupMap = [
        'site_title'         => 'general',
        'site_tagline'       => 'general',
        'site_description'   => 'general',
        'company_name'       => 'company',
        'timezone'           => 'general',
        'hotline_phone'      => 'contact',
        'redaksi_email'      => 'contact',
        'iklan_email'        => 'contact',
        'office_address'     => 'contact',
        'social_facebook'    => 'social',
        'social_tiktok'      => 'social',
        'social_instagram'   => 'social',
        'social_youtube'     => 'social',
        'social_twitter'     => 'social',
        'seo_title'          => 'seo',
        'seo_description'    => 'seo',
        'seo_keywords'       => 'seo',
        'posts_per_page'     => 'content',
        'show_views_counter' => 'content',
        'allow_comments'     => 'content',
        'moderate_comments'  => 'content',
        'show_breaking_time' => 'content',
        'about_hero_badge'        => 'about',
        'about_hero_title'        => 'about',
        'about_hero_subtitle'     => 'about',
        'about_intro_heading'     => 'about',
        'about_intro_subheading'  => 'about',
        'about_description'       => 'about',
        'about_visi'              => 'about',
        'about_misi'              => 'about',
        'about_redaksi_subtitle'  => 'about',
        'about_redaksi_notice'    => 'about',
        'about_leader'            => 'about',
        'about_business_field'    => 'about',
        'about_legal_sk'          => 'about',
        'about_legal_nib'         => 'about',
        'about_legal_npwp'        => 'about',
        'about_legal_commitments' => 'about',
        'about_pedoman_siber'     => 'about',
        'about_hak_jawab'         => 'about'
    ];

    $updatedKeys = [];
    foreach ($input as $key => $value) {
        $cleanKey = trim($key);
        if ($cleanKey === '' || $cleanKey === 'action') continue;

        $cleanVal = is_string($value) ? trim($value) : $value;
        $currentSettings[$cleanKey] = $cleanVal;
        $group = $groupMap[$cleanKey] ?? 'general';

        if ($db) {
            try {
                $upsertStmt = $db->prepare("
                    INSERT INTO settings (`setting_key`, `setting_value`, `group`) 
                    VALUES (:k, :v, :g)
                    ON DUPLICATE KEY UPDATE 
                        `setting_value` = VALUES(`setting_value`),
                        `group` = VALUES(`group`),
                        `updated_at` = NOW()
                ");
                $upsertStmt->execute([
                    ':k' => $cleanKey,
                    ':v' => is_scalar($cleanVal) ? (string)$cleanVal : json_encode($cleanVal),
                    ':g' => $group
                ]);
            } catch (Throwable $e) {}
        }
        $updatedKeys[] = $cleanKey;
    }

    // Simpan ke file JSON sinkron
    saveJsonSettings($jsonFile, $currentSettings);

    sendResponse(true, 'Pengaturan portal berhasil disimpan dan diperbarui secara real-time', [
        'updated_keys' => $updatedKeys,
        'settings'     => $currentSettings
    ]);
}

sendResponse(false, 'Metode HTTP tidak didukung', null, 405);
