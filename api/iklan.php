<?php
/**
 * REST API Endpoint: Manajemen Iklan (Google Ads & Banner Endorse)
 * Portal Berita Japakeh Post - PT Japakeh Media Nusantara
 * Table: iklan
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Data Mock Demo Fallback jika MySQL offline
function getDemoAds(): array {
    return [
        [
            'id'            => 1,
            'judul'         => 'Sponsor Resmi Japakeh Post — Bank Syariah Indonesia',
            'tipe'          => 'banner',
            'posisi'        => 'sidebar',
            'target_device' => 'desktop',
            'target_page'   => 'article',
            'mode_tayang'   => 'exclusive',
            'kode_html'     => null,
            'gambar'        => 'assets/images/berita/nasional/kantor-pusat-bsi-landmark-aceh.jpg',
            'link_tujuan'   => 'https://bankbsi.co.id',
            'keterangan'    => 'Mitra Finansial & Perbankan Syariah Mitra Redaksi (Eksklusif Sidebar Desktop)',
            'is_active'     => 1,
            'urutan'        => 1,
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s')
        ],
        [
            'id'            => 2,
            'judul'         => 'Google AdSense — Sidebar Responsive Display',
            'tipe'          => 'google',
            'posisi'        => 'sidebar_middle',
            'target_device' => 'desktop',
            'target_page'   => 'article',
            'mode_tayang'   => 'exclusive',
            'kode_html'     => '<ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-1234567890123456" data-ad-slot="9876543210" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>',
            'gambar'        => null,
            'link_tujuan'   => null,
            'keterangan'    => 'Slot iklan sidebar tengah otomatis Google AdSense',
            'is_active'     => 1,
            'urutan'        => 2,
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s')
        ],
        [
            'id'            => 3,
            'judul'         => 'Google AdSense — Artikel Tengah (In-Article)',
            'tipe'          => 'google',
            'posisi'        => 'article_middle',
            'target_device' => 'mobile',
            'target_page'   => 'article',
            'mode_tayang'   => 'exclusive',
            'kode_html'     => '<ins class="adsbygoogle" style="display:block; text-align:center;" data-ad-layout="in-article" data-ad-format="fluid" data-ad-client="ca-pub-1234567890123456" data-ad-slot="5432109876"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script>',
            'gambar'        => null,
            'link_tujuan'   => null,
            'keterangan'    => 'Slot iklan di sela paragraf artikel berita khusus HP',
            'is_active'     => 1,
            'urutan'        => 1,
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s')
        ],
        [
            'id'            => 4,
            'judul'         => 'Banner Promo UMKM Aceh & Kuliner Khas Nusantara',
            'tipe'          => 'banner',
            'posisi'        => 'home_middle',
            'target_device' => 'mobile',
            'target_page'   => 'home',
            'mode_tayang'   => 'rotation',
            'kode_html'     => null,
            'gambar'        => 'assets/images/berita/ekonomi/panen-kopi-gayo-organik.jpg',
            'link_tujuan'   => 'https://japakehpost.com',
            'keterangan'    => 'Banner kemitraan promosi UMKM daerah (Mode Rotasi)',
            'is_active'     => 1,
            'urutan'        => 1,
            'created_at'    => date('Y-m-d H:i:s'),
            'updated_at'    => date('Y-m-d H:i:s')
        ]
    ];
}

try {
    $db = Database::getConnection();
    if ($db) {
        // Auto-migrate kolom target_device jika belum ada
        try {
            // Pastikan ENUM posisi mendukung 'sidebar_middle' dan 'sidebar_bottom'
            $posCol = $db->query("SHOW COLUMNS FROM `iklan` LIKE 'posisi'")->fetch();
            if ($posCol && isset($posCol['Type']) && strpos($posCol['Type'], 'sidebar_bottom') === false) {
                $db->exec("ALTER TABLE `iklan` MODIFY COLUMN `posisi` ENUM('sidebar', 'sidebar_middle', 'sidebar_bottom', 'article_middle', 'article_bottom', 'home_middle', 'footer') NOT NULL DEFAULT 'sidebar'");
                $db->exec("UPDATE `iklan` SET `posisi` = 'sidebar_bottom' WHERE `target_page` = 'article' AND `target_device` = 'desktop' AND `posisi` = 'footer'");
            }

            $cols = $db->query("SHOW COLUMNS FROM `iklan` LIKE 'target_device'")->fetchAll();
            if (empty($cols)) {
                $db->exec("ALTER TABLE `iklan` ADD COLUMN `target_device` ENUM('all', 'desktop', 'mobile') NOT NULL DEFAULT 'desktop' AFTER `posisi`");
            }
            $colsPage = $db->query("SHOW COLUMNS FROM `iklan` LIKE 'target_page'")->fetchAll();
            if (empty($colsPage)) {
                $db->exec("ALTER TABLE `iklan` ADD COLUMN `target_page` ENUM('home', 'article') NOT NULL DEFAULT 'article' AFTER `target_device`");
                $db->exec("ALTER TABLE `iklan` ADD INDEX `idx_iklan_target_page` (`target_page`)");
            }
            $colsMode = $db->query("SHOW COLUMNS FROM `iklan` LIKE 'mode_tayang'")->fetchAll();
            if (empty($colsMode)) {
                $db->exec("ALTER TABLE `iklan` ADD COLUMN `mode_tayang` ENUM('exclusive', 'rotation') NOT NULL DEFAULT 'exclusive' AFTER `target_device`");
                $db->exec("ALTER TABLE `iklan` ADD INDEX `idx_iklan_mode_tayang` (`mode_tayang`)");
            }
        } catch (Throwable $me) {
            // Ignore error jika migrasi gagal
        }
    }
} catch (Throwable $e) {
    $db = null;
}

switch ($method) {
    case 'GET':
        handleGetAds($db);
        break;
    case 'POST':
        $action = $_GET['action'] ?? $_POST['action'] ?? null;
        $override = $_POST['_method'] ?? $_GET['_method'] ?? null;
        
        if ($action === 'toggle_status') {
            handleToggleStatus($db);
        } elseif ($override === 'PUT') {
            handleUpdateAd($db);
        } elseif ($override === 'DELETE') {
            handleDeleteAd($db);
        } else {
            handleCreateAd($db);
        }
        break;
    case 'PUT':
        handleUpdateAd($db);
        break;
    case 'DELETE':
        handleDeleteAd($db);
        break;
    default:
        sendResponse(false, 'Metode HTTP tidak didukung', null, 405);
}

/**
 * Format satu item iklan
 */
function formatAdItem(array $row): array {
    $row['id'] = (int)($row['id'] ?? 0);
    $row['is_active'] = (int)($row['is_active'] ?? 0);
    $row['urutan'] = (int)($row['urutan'] ?? 0);
    $row['target_device'] = in_array($row['target_device'] ?? '', ['desktop', 'mobile', 'all'], true) ? $row['target_device'] : 'desktop';
    $row['target_page'] = $row['target_page'] ?? 'article';
    $row['mode_tayang'] = in_array($row['mode_tayang'] ?? '', ['exclusive', 'rotation'], true) ? $row['mode_tayang'] : 'exclusive';
    return $row;
}

/**
 * 1. GET: Ambil daftar iklan atau detail iklan
 */
function handleGetAds(?PDO $db): void {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $posisi = isset($_GET['posisi']) ? trim($_GET['posisi']) : null;
    $tipe = isset($_GET['tipe']) ? trim($_GET['tipe']) : null;
    $status = isset($_GET['status']) ? trim($_GET['status']) : null;
    $targetDevice = isset($_GET['target_device']) ? trim($_GET['target_device']) : null;
    $device = isset($_GET['device']) ? trim($_GET['device']) : null;
    $targetPage = isset($_GET['target_page']) ? trim($_GET['target_page']) : (isset($_GET['page']) ? trim($_GET['page']) : null);
    $modeTayang = isset($_GET['mode_tayang']) ? trim($_GET['mode_tayang']) : null;

    // Fallback jika database tidak aktif
    if (!$db) {
        $ads = getDemoAds();
        if ($id) {
            foreach ($ads as $ad) {
                if ($ad['id'] === $id) {
                    sendResponse(true, 'Detail iklan (mode demo offline)', formatAdItem($ad));
                }
            }
            sendResponse(false, 'Iklan tidak ditemukan', null, 404);
        }

        $filtered = array_filter($ads, function($item) use ($posisi, $tipe, $status, $targetDevice, $device, $targetPage, $modeTayang) {
            if ($posisi && $item['posisi'] !== $posisi) return false;
            if ($tipe && $item['tipe'] !== $tipe) return false;
            if ($status === 'active' && $item['is_active'] != 1) return false;
            if ($status === 'inactive' && $item['is_active'] != 0) return false;
            $adDev = $item['target_device'] ?? 'desktop';
            if ($targetDevice && $adDev !== $targetDevice && $adDev !== 'all') return false;
            if ($device === 'mobile' && !in_array($adDev, ['all', 'mobile'], true)) return false;
            if ($device === 'desktop' && !in_array($adDev, ['all', 'desktop'], true)) return false;
            $adPage = $item['target_page'] ?? 'article';
            if ($targetPage && $adPage !== $targetPage) return false;
            $adMode = $item['mode_tayang'] ?? 'exclusive';
            if ($modeTayang && $adMode !== $modeTayang) return false;
            return true;
        });

        sendResponse(true, 'Daftar iklan (mode demo offline)', [
            'ads' => array_values(array_map('formatAdItem', $filtered)),
            'total' => count($filtered)
        ]);
    }

    // A. Detail satu iklan
    if ($id) {
        $stmt = $db->prepare("SELECT * FROM `iklan` WHERE `id` = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if (!$row) {
            sendResponse(false, 'Iklan tidak ditemukan', null, 404);
        }
        sendResponse(true, 'Detail iklan ditemukan', formatAdItem($row));
    }

    // B. Daftar iklan
    try {
        $where = [];
        $params = [];

        if ($posisi) {
            $where[] = "`posisi` = :posisi";
            $params[':posisi'] = $posisi;
        }

        if ($tipe) {
            $where[] = "`tipe` = :tipe";
            $params[':tipe'] = $tipe;
        }

        if ($targetDevice) {
            $where[] = "(`target_device` = :target_device OR `target_device` = 'all')";
            $params[':target_device'] = $targetDevice;
        } elseif ($device === 'mobile') {
            $where[] = "`target_device` IN ('all', 'mobile')";
        } elseif ($device === 'desktop') {
            $where[] = "`target_device` IN ('all', 'desktop')";
        }

        if ($modeTayang && in_array($modeTayang, ['exclusive', 'rotation'], true)) {
            $where[] = "`mode_tayang` = :mode_tayang";
            $params[':mode_tayang'] = $modeTayang;
        }

        if ($targetPage && in_array($targetPage, ['home', 'article'], true)) {
            $where[] = "`target_page` = :target_page";
            $params[':target_page'] = $targetPage;
        }

        if ($status === 'active') {
            $where[] = "`is_active` = 1";
        } elseif ($status === 'inactive') {
            $where[] = "`is_active` = 0";
        }

        if (!empty($_GET['search'])) {
            $where[] = "(`judul` LIKE :search OR `keterangan` LIKE :search)";
            $params[':search'] = '%' . trim($_GET['search']) . '%';
        }

        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $sql = "SELECT * FROM `iklan` {$whereClause} ORDER BY `urutan` ASC, `id` DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $ads = array_map('formatAdItem', $rows);
        sendResponse(true, 'Daftar iklan berhasil dimuat', [
            'ads' => $ads,
            'total' => count($ads)
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal mengambil data iklan: ' . $e->getMessage(), null, 500);
    }
}

/**
 * 2. POST: Tambah iklan baru (Wajib Auth)
 */
function handleCreateAd(?PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }

    $judul = trim($input['judul'] ?? '');
    $tipe = trim($input['tipe'] ?? 'google');
    $posisi = trim($input['posisi'] ?? 'sidebar');
    $targetDevice = trim($input['target_device'] ?? 'desktop');
    if (!in_array($targetDevice, ['desktop', 'mobile', 'all'], true)) {
        $targetDevice = 'desktop';
    }
    $modeTayang = trim($input['mode_tayang'] ?? 'exclusive');
    if (!in_array($modeTayang, ['exclusive', 'rotation'], true)) {
        $modeTayang = 'exclusive';
    }
    $kodeHtml = $input['kode_html'] ?? null;
    $gambar = !empty($input['gambar']) ? trim($input['gambar']) : null;
    if ($gambar) {
        $gambar = preg_replace('#^\.\./+#', '', $gambar);
    }
    $linkTujuan = $input['link_tujuan'] ?? null;
    $keterangan = trim($input['keterangan'] ?? '');
    $isActive = isset($input['is_active']) ? (int)filter_var($input['is_active'], FILTER_VALIDATE_BOOLEAN) : 1;
    $urutan = isset($input['urutan']) ? (int)$input['urutan'] : 0;

    if (empty($judul)) {
        sendResponse(false, 'Judul iklan wajib diisi', null, 400);
    }

    if (!in_array($tipe, ['google', 'banner'], true)) {
        sendResponse(false, 'Tipe iklan harus "google" atau "banner"', null, 400);
    }

    $validPositions = ['sidebar', 'sidebar_middle', 'sidebar_bottom', 'article_middle', 'article_bottom', 'home_middle', 'footer'];
    if ($posisi === 'header' || !in_array($posisi, $validPositions, true)) {
        $posisi = ($targetDevice === 'mobile') ? 'article_middle' : 'sidebar';
    }

    $targetPage = trim($input['target_page'] ?? 'article');
    if (!in_array($targetPage, ['home', 'article'], true)) {
        $targetPage = 'article';
    }

    if ($tipe === 'google' && empty(trim($kodeHtml ?? ''))) {
        sendResponse(false, 'Kode script Google Ads wajib diisi untuk tipe Google Ads', null, 400);
    }

    if (!$db) {
        sendResponse(true, 'Iklan baru berhasil disimpan (mode demo)', [
            'id' => time(),
            'judul' => $judul,
            'tipe' => $tipe,
            'posisi' => $posisi,
            'target_device' => $targetDevice,
            'target_page' => $targetPage,
            'mode_tayang' => $modeTayang,
            'kode_html' => $kodeHtml,
            'gambar' => $gambar,
            'link_tujuan' => $linkTujuan,
            'keterangan' => $keterangan,
            'is_active' => $isActive,
            'urutan' => $urutan
        ], 201);
    }

    try {
        $stmt = $db->prepare("
            INSERT INTO `iklan` (`judul`, `tipe`, `posisi`, `target_device`, `target_page`, `mode_tayang`, `kode_html`, `gambar`, `link_tujuan`, `keterangan`, `is_active`, `urutan`, `created_at`, `updated_at`)
            VALUES (:judul, :tipe, :posisi, :target_device, :target_page, :mode_tayang, :kode_html, :gambar, :link_tujuan, :keterangan, :is_active, :urutan, NOW(), NOW())
        ");
        $stmt->execute([
            ':judul'         => $judul,
            ':tipe'          => $tipe,
            ':posisi'        => $posisi,
            ':target_device' => $targetDevice,
            ':target_page'   => $targetPage,
            ':mode_tayang'   => $modeTayang,
            ':kode_html'     => $kodeHtml,
            ':gambar'        => $gambar,
            ':link_tujuan'   => $linkTujuan,
            ':keterangan'    => $keterangan,
            ':is_active'     => $isActive,
            ':urutan'        => $urutan
        ]);

        $newId = (int)$db->lastInsertId();
        sendResponse(true, 'Iklan berhasil ditambahkan', ['id' => $newId], 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menyimpan iklan ke database: ' . $e->getMessage(), null, 500);
    }
}

/**
 * 3. PUT/POST: Update iklan (Wajib Auth)
 */
function handleUpdateAd(?PDO $db): void {
    requireAuth();

    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        $input = $_POST;
    }
    if (!$id && !empty($input['id'])) {
        $id = (int)$input['id'];
    }

    if (!$id) {
        sendResponse(false, 'ID iklan wajib disertakan', null, 400);
    }

    $judul = trim($input['judul'] ?? '');
    $tipe = trim($input['tipe'] ?? 'google');
    $posisi = trim($input['posisi'] ?? 'sidebar');
    $targetDevice = trim($input['target_device'] ?? 'desktop');
    if (!in_array($targetDevice, ['desktop', 'mobile', 'all'], true)) {
        $targetDevice = 'desktop';
    }
    $modeTayang = trim($input['mode_tayang'] ?? 'exclusive');
    if (!in_array($modeTayang, ['exclusive', 'rotation'], true)) {
        $modeTayang = 'exclusive';
    }
    $targetPage = trim($input['target_page'] ?? 'article');
    if (!in_array($targetPage, ['home', 'article'], true)) {
        $targetPage = 'article';
    }

    $validPositions = ['sidebar', 'sidebar_middle', 'sidebar_bottom', 'article_middle', 'article_bottom', 'home_middle', 'footer'];
    if ($posisi === 'header' || !in_array($posisi, $validPositions, true)) {
        $posisi = ($targetDevice === 'mobile') ? 'article_middle' : 'sidebar';
    }

    $kodeHtml = $input['kode_html'] ?? null;
    $gambar = !empty($input['gambar']) ? trim($input['gambar']) : null;
    if ($gambar) {
        $gambar = preg_replace('#^\.\./+#', '', $gambar);
    }
    $linkTujuan = $input['link_tujuan'] ?? null;
    $keterangan = trim($input['keterangan'] ?? '');
    $isActive = isset($input['is_active']) ? (int)filter_var($input['is_active'], FILTER_VALIDATE_BOOLEAN) : 1;
    $urutan = isset($input['urutan']) ? (int)$input['urutan'] : 0;

    if (empty($judul)) {
        sendResponse(false, 'Judul iklan wajib diisi', null, 400);
    }

    if (!$db) {
        sendResponse(true, 'Iklan berhasil diperbarui (mode demo)', ['id' => $id]);
    }

    try {
        $stmt = $db->prepare("
            UPDATE `iklan`
            SET `judul` = :judul,
                `tipe` = :tipe,
                `posisi` = :posisi,
                `target_device` = :target_device,
                `target_page` = :target_page,
                `mode_tayang` = :mode_tayang,
                `kode_html` = :kode_html,
                `gambar` = :gambar,
                `link_tujuan` = :link_tujuan,
                `keterangan` = :keterangan,
                `is_active` = :is_active,
                `urutan` = :urutan,
                `updated_at` = NOW()
            WHERE `id` = :id
        ");
        $stmt->execute([
            ':id'            => $id,
            ':judul'         => $judul,
            ':tipe'          => $tipe,
            ':posisi'        => $posisi,
            ':target_device' => $targetDevice,
            ':target_page'   => $targetPage,
            ':mode_tayang'   => $modeTayang,
            ':kode_html'     => $kodeHtml,
            ':gambar'        => $gambar,
            ':link_tujuan'   => $linkTujuan,
            ':keterangan'    => $keterangan,
            ':is_active'     => $isActive,
            ':urutan'        => $urutan
        ]);

        sendResponse(true, 'Iklan berhasil diperbarui', ['id' => $id]);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal memperbarui iklan: ' . $e->getMessage(), null, 500);
    }
}

/**
 * 4. DELETE: Hapus iklan (Wajib Auth)
 */
function handleDeleteAd(?PDO $db): void {
    requireAuth();

    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = isset($input['id']) ? (int)$input['id'] : (int)($_POST['id'] ?? 0);
    }

    if (!$id) {
        sendResponse(false, 'ID iklan wajib disertakan', null, 400);
    }

    if (!$db) {
        sendResponse(true, 'Iklan berhasil dihapus (mode demo)', ['id' => $id]);
    }

    try {
        $stmt = $db->prepare("DELETE FROM `iklan` WHERE `id` = :id");
        $stmt->execute([':id' => $id]);
        sendResponse(true, 'Iklan berhasil dihapus', ['id' => $id]);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menghapus iklan: ' . $e->getMessage(), null, 500);
    }
}

/**
 * 5. POST: Quick toggle status aktif/nonaktif (Wajib Auth)
 */
function handleToggleStatus(?PDO $db): void {
    requireAuth();

    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = (int)($input['id'] ?? $_POST['id'] ?? 0);
    }

    if (!$id) {
        sendResponse(false, 'ID iklan wajib disertakan', null, 400);
    }

    if (!$db) {
        sendResponse(true, 'Status iklan berhasil diubah (mode demo)', ['id' => $id]);
    }

    try {
        $stmt = $db->prepare("UPDATE `iklan` SET `is_active` = NOT `is_active`, `updated_at` = NOW() WHERE `id` = :id");
        $stmt->execute([':id' => $id]);

        $check = $db->prepare("SELECT `is_active` FROM `iklan` WHERE `id` = :id");
        $check->execute([':id' => $id]);
        $status = (int)$check->fetchColumn();

        sendResponse(true, 'Status iklan berhasil diperbarui', [
            'id' => $id,
            'is_active' => $status
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal mengubah status iklan: ' . $e->getMessage(), null, 500);
    }
}
