<?php
/**
 * REST API Endpoint: Artikel Berita
 * CRUD + Filter + Pagination + Search
 * Tables: artikel, kategori, users
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

$db = Database::getConnection();
ensureArtikelCaptionColumn($db);
ensureArtikelTagsColumn($db);
ensureArtikelGaleriTable($db);
ensureArtikelDateColumns($db);
autoProcessArticleSchedules($db);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Pastikan kolom expired_at selalu ada pada tabel artikel
function ensureArtikelDateColumns(PDO $db): void {
    static $checked = false;
    if ($checked) return;
    try {
        $stmt = $db->query("SHOW COLUMNS FROM artikel LIKE 'expired_at'");
        if (!$stmt->fetch()) {
            $db->exec("ALTER TABLE artikel ADD COLUMN expired_at DATETIME DEFAULT NULL AFTER published_at");
        }
        $checked = true;
    } catch (Throwable $e) {
        // Abaikan jika tidak memiliki izin ALTER
    }
}

// Otomasi Publikasi Terjadwal & Turun Tayang (Auto-Expire)
function autoProcessArticleSchedules(PDO $db): void {
    static $processed = false;
    if ($processed) return;
    try {
        // 1. Publikasikan artikel berstatus scheduled yang waktunya sudah tiba/lewat
        $db->exec("
            UPDATE artikel 
            SET status = 'published' 
            WHERE status = 'scheduled' 
              AND published_at IS NOT NULL 
              AND published_at <= CURRENT_TIMESTAMP
        ");

        // 2. Turunkan tayang (arsipkan ke draft) artikel yang memiliki batas waktu tayang (expired_at) dan sudah kedaluwarsa
        $db->exec("
            UPDATE artikel 
            SET status = 'draft' 
            WHERE status = 'published' 
              AND expired_at IS NOT NULL 
              AND expired_at <= CURRENT_TIMESTAMP
        ");
        $processed = true;
    } catch (Throwable $e) {
        // Abaikan
    }
}

// Pastikan kolom caption selalu ada pada tabel artikel
function ensureArtikelCaptionColumn(PDO $db): void {
    static $checked = false;
    if ($checked) return;
    try {
        $stmt = $db->query("SHOW COLUMNS FROM artikel LIKE 'caption'");
        if (!$stmt->fetch()) {
            $db->exec("ALTER TABLE artikel ADD COLUMN caption TEXT DEFAULT NULL AFTER thumbnail");
        }
        $checked = true;
    } catch (Throwable $e) {
        // Abaikan jika tidak memiliki izin ALTER
    }
}

// Pastikan kolom tags selalu ada pada tabel artikel
function ensureArtikelTagsColumn(PDO $db): void {
    static $checked = false;
    if ($checked) return;
    try {
        $stmt = $db->query("SHOW COLUMNS FROM artikel LIKE 'tags'");
        if (!$stmt->fetch()) {
            $db->exec("ALTER TABLE artikel ADD COLUMN tags VARCHAR(255) DEFAULT NULL AFTER caption");
        }
        $checked = true;
    } catch (Throwable $e) {
        // Abaikan jika tidak memiliki izin ALTER
    }
}

// Pastikan tabel artikel_galeri selalu ada
function ensureArtikelGaleriTable(PDO $db): void {
    static $checked = false;
    if ($checked) return;
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS artikel_galeri (
              id INT UNSIGNED NOT NULL AUTO_INCREMENT,
              id_artikel INT UNSIGNED NOT NULL,
              foto VARCHAR(255) NOT NULL,
              caption TEXT DEFAULT NULL,
              urutan INT UNSIGNED NOT NULL DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              KEY idx_artikel_galeri_artikel (id_artikel),
              KEY idx_artikel_galeri_urutan (id_artikel, urutan),
              CONSTRAINT fk_artikel_galeri_artikel FOREIGN KEY (id_artikel) 
                  REFERENCES artikel (id_artikel) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
        $checked = true;
    } catch (Throwable $e) {
        // Abaikan jika tidak memiliki izin DDL
    }
}

// Fallback galeri dari articles-seed.json jika database belum memiliki galeri
function fetchSeedGalleryFallback(?string $slug, ?int $id): array {
    $seedFile = __DIR__ . '/articles-seed.json';
    if (!file_exists($seedFile)) return [];
    $raw = @file_get_contents($seedFile);
    if (!$raw) return [];
    $list = json_decode($raw, true);
    if (!is_array($list)) return [];
    foreach ($list as $item) {
        if (($slug && isset($item['slug']) && $item['slug'] === $slug) ||
            ($id && isset($item['id']) && (int)$item['id'] === $id)) {
            $gal = $item['gallery'] ?? $item['galeri'] ?? [];
            if (is_array($gal)) {
                $res = [];
                foreach ($gal as $idx => $g) {
                    if (is_string($g)) {
                        $res[] = ['id' => $idx + 1, 'foto' => $g, 'caption' => '', 'urutan' => $idx];
                    } elseif (is_array($g) && (!empty($g['foto']) || !empty($g['image']) || !empty($g['url']))) {
                        $res[] = [
                            'id' => $idx + 1,
                            'foto' => $g['foto'] ?? $g['image'] ?? $g['url'] ?? '',
                            'caption' => $g['caption'] ?? '',
                            'urutan' => $g['urutan'] ?? $idx
                        ];
                    }
                }
                return $res;
            }
        }
    }
    return [];
}

switch ($method) {
    case 'GET':
        handleGetArtikel($db);
        break;
    case 'POST':
        // Cek jika ada override method (misal _method=PUT atau _method=DELETE dari form-data)
        $override = $_POST['_method'] ?? $_GET['_method'] ?? null;
        if ($override === 'PUT') {
            handleUpdateArtikel($db);
        } elseif ($override === 'DELETE') {
            handleDeleteArtikel($db);
        } else {
            handleCreateArtikel($db);
        }
        break;
    case 'PUT':
        handleUpdateArtikel($db);
        break;
    case 'DELETE':
        handleDeleteArtikel($db);
        break;
    default:
        sendResponse(false, 'Metode HTTP tidak didukung', null, 405);
}

// =========================================================================
// 1. GET: Ambil Daftar Berita atau Detail Berita
// =========================================================================
function handleGetArtikel(PDO $db): void {
    // 0. Rekomendasi Berita Terkait Otomatis
    if (!empty($_GET['related_to'])) {
        handleGetRelatedArtikel($db);
        return;
    }

    // A. Detail berdasarkan slug
    if (!empty($_GET['slug'])) {
        $slug = trim($_GET['slug']);
        $stmt = $db->prepare("
            SELECT 
                a.id_artikel,
                a.id_artikel AS id,
                a.title,
                a.slug,
                a.content,
                a.thumbnail,
                a.caption,
                a.tags,
                a.status,
                a.views,
                a.published_at,
                a.expired_at,
                a.updated_at,
                k.id_kategori,
                k.name_kategori,
                k.slug AS kategori_slug,
                u.id AS author_id,
                u.nama_users AS author_name,
                COALESCE(u.avatar, '') AS author_avatar,
                COALESCE(u.bio, '') AS author_bio,
                COALESCE(u.role, 'Reporter') AS author_role,
                a.editor_id,
                ue.nama_users AS editor_name,
                COALESCE(ue.avatar, '') AS editor_avatar,
                COALESCE(ue.bio, '') AS editor_bio,
                CASE WHEN a.editor_id IS NOT NULL THEN COALESCE(ue.role, 'Editor') ELSE NULL END AS editor_role
            FROM artikel a
            JOIN kategori k ON a.kategori_id = k.id_kategori
            LEFT JOIN users u ON a.author_id = u.id
            LEFT JOIN users ue ON a.editor_id = ue.id
            WHERE a.slug = :slug
            LIMIT 1
        ");
        $stmt->execute([':slug' => $slug]);
        $news = $stmt->fetch();

        if (!$news) {
            sendResponse(false, 'Berita tidak ditemukan', null, 404);
        }

        // Parse list tags terstruktur
        $rawTags = $news['tags'] ?? '';
        $tagList = [];
        if (!empty($rawTags)) {
            if (is_array($rawTags)) {
                $tagList = $rawTags;
            } else {
                $tagList = array_values(array_filter(array_map('trim', explode(',', $rawTags))));
            }
        }
        if (empty($tagList)) {
            $seedFile = __DIR__ . '/articles-seed.json';
            if (file_exists($seedFile)) {
                $rawSeed = @file_get_contents($seedFile);
                $seedArr = json_decode($rawSeed, true);
                if (is_array($seedArr)) {
                    foreach ($seedArr as $s) {
                        if (($s['slug'] ?? '') === $news['slug'] && !empty($s['tags']) && is_array($s['tags'])) {
                            $tagList = $s['tags'];
                            $news['tags'] = implode(', ', $s['tags']);
                            break;
                        }
                    }
                }
            }
        }
        $news['tag_list'] = $tagList;

        // Ambil relasi galeri foto jika ada
        $galStmt = $db->prepare("SELECT id, foto, caption, urutan FROM artikel_galeri WHERE id_artikel = :id ORDER BY urutan ASC, id ASC");
        $galStmt->execute([':id' => $news['id_artikel']]);
        $galeri = $galStmt->fetchAll();
        if (empty($galeri)) {
            $galeri = fetchSeedGalleryFallback($news['slug'], (int)$news['id_artikel']);
        }
        foreach ($galeri as &$g) {
            $g['url'] = $g['foto'] ?? $g['url'] ?? '';
            $g['foto'] = $g['foto'] ?? $g['url'] ?? '';
        }
        unset($g);
        $news['galeri'] = $galeri;
        $news['gallery'] = $galeri;
        $news['gallery_count'] = count($galeri);

        sendResponse(true, 'Detail berita ditemukan', $news);
    }

    // B. Detail berdasarkan ID (untuk edit form di admin)
    if (!empty($_GET['id'])) {
        $id = (int)$_GET['id'];
        $stmt = $db->prepare("
            SELECT 
                a.*,
                k.name_kategori,
                u.nama_users AS author_name,
                COALESCE(u.avatar, '') AS author_avatar,
                COALESCE(u.bio, '') AS author_bio,
                COALESCE(u.role, 'Reporter') AS author_role,
                ue.nama_users AS editor_name,
                COALESCE(ue.avatar, '') AS editor_avatar,
                COALESCE(ue.bio, '') AS editor_bio,
                CASE WHEN a.editor_id IS NOT NULL THEN COALESCE(ue.role, 'Editor') ELSE NULL END AS editor_role
            FROM artikel a
            JOIN kategori k ON a.kategori_id = k.id_kategori
            LEFT JOIN users u ON a.author_id = u.id
            LEFT JOIN users ue ON a.editor_id = ue.id
            WHERE a.id_artikel = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $news = $stmt->fetch();

        if (!$news) {
            sendResponse(false, 'Berita tidak ditemukan', null, 404);
        }

        // Ambil relasi galeri foto jika ada
        $galStmt = $db->prepare("SELECT id, foto, caption, urutan FROM artikel_galeri WHERE id_artikel = :id ORDER BY urutan ASC, id ASC");
        $galStmt->execute([':id' => $news['id_artikel']]);
        $galeri = $galStmt->fetchAll();
        if (empty($galeri)) {
            $galeri = fetchSeedGalleryFallback($news['slug'] ?? '', (int)$news['id_artikel']);
        }
        foreach ($galeri as &$g) {
            $g['url'] = $g['foto'] ?? $g['url'] ?? '';
            $g['foto'] = $g['foto'] ?? $g['url'] ?? '';
        }
        unset($g);
        $news['galeri'] = $galeri;
        $news['gallery'] = $galeri;
        $news['gallery_count'] = count($galeri);

        $rawTags = $news['tags'] ?? '';
        $tagList = [];
        if (!empty($rawTags)) {
            if (is_array($rawTags)) {
                $tagList = $rawTags;
            } else {
                $tagList = array_values(array_filter(array_map('trim', explode(',', $rawTags))));
            }
        }
        $news['tag_list'] = $tagList;

        sendResponse(true, 'Detail berita ditemukan', $news);
    }

    // C. Ambil List Berita dengan Filter
    $kategoriSlug = trim($_GET['kategori'] ?? '');
    $kategoriId   = isset($_GET['kategori_id']) ? (int)$_GET['kategori_id'] : null;
    $status       = trim($_GET['status'] ?? '');
    $search       = trim($_GET['search'] ?? '');
    $tagFilter    = trim($_GET['tag'] ?? $_GET['tags'] ?? '');
    $excludeSlug  = trim($_GET['exclude_slug'] ?? '');
    $excludeId    = isset($_GET['exclude_id']) ? (int)$_GET['exclude_id'] : null;
    $sort         = strtolower(trim($_GET['sort'] ?? ''));
    $limit        = isset($_GET['limit']) ? max(1, min(200, (int)$_GET['limit'])) : 10;
    $page         = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $offset       = ($page - 1) * $limit;

    $where = ["1=1"];
    $params = [];

    if (!empty($kategoriSlug) && strtolower($kategoriSlug) !== 'all' && strtolower($kategoriSlug) !== 'terbaru') {
        $where[] = "k.slug = :kategori_slug";
        $params[':kategori_slug'] = $kategoriSlug;
    }

    if ($kategoriId !== null && $kategoriId > 0) {
        $where[] = "a.kategori_id = :kategori_id";
        $params[':kategori_id'] = $kategoriId;
    }

    if (!empty($status)) {
        $where[] = "a.status = :status";
        $params[':status'] = $status;
        if ($status === 'published') {
            $where[] = "(a.published_at IS NULL OR a.published_at <= CURRENT_TIMESTAMP)";
            $where[] = "(a.expired_at IS NULL OR a.expired_at > CURRENT_TIMESTAMP)";
        }
    }

    if (!empty($search)) {
        $where[] = "(a.title LIKE :search OR a.content LIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }

    if (!empty($tagFilter)) {
        $where[] = "(a.tags LIKE :tag_filter OR a.title LIKE :tag_title)";
        $params[':tag_filter'] = '%' . $tagFilter . '%';
        $params[':tag_title']  = '%' . $tagFilter . '%';
    }

    if (!empty($excludeSlug)) {
        $where[] = "a.slug != :exclude_slug";
        $params[':exclude_slug'] = $excludeSlug;
    }

    if ($excludeId && $excludeId > 0) {
        $where[] = "a.id_artikel != :exclude_id";
        $params[':exclude_id'] = $excludeId;
    }

    $whereClause = implode(" AND ", $where);

    try {
        // Hitung total data
        $countStmt = $db->prepare("
            SELECT COUNT(*) 
            FROM artikel a
            JOIN kategori k ON a.kategori_id = k.id_kategori
            LEFT JOIN users u ON a.author_id = u.id
            WHERE {$whereClause}
        ");
        $countStmt->execute($params);
        $totalItems = (int)$countStmt->fetchColumn();

        // Ambil data artikel
        $orderBy = "a.published_at DESC, a.id_artikel DESC";
        if ($sort === 'popular' || $sort === 'terpopuler') {
            $orderBy = "a.views DESC, a.published_at DESC, a.id_artikel DESC";
        }

        $sql = "
            SELECT 
                a.id_artikel,
                a.id_artikel AS id,
                a.title,
                a.slug,
                SUBSTRING(a.content, 1, 400) AS raw_excerpt,
                a.thumbnail,
                a.caption,
                a.tags,
                a.status,
                a.views,
                a.published_at,
                a.expired_at,
                a.updated_at,
                k.id_kategori,
                k.name_kategori,
                k.slug AS kategori_slug,
                u.id AS author_id,
                u.nama_users AS author_name,
                COALESCE(u.avatar, '') AS author_avatar,
                a.editor_id,
                ue.nama_users AS editor_name
            FROM artikel a
            JOIN kategori k ON a.kategori_id = k.id_kategori
            LEFT JOIN users u ON a.author_id = u.id
            LEFT JOIN users ue ON a.editor_id = ue.id
            WHERE {$whereClause}
            ORDER BY {$orderBy}
            LIMIT :limit OFFSET :offset
        ";

        $stmt = $db->prepare($sql);
        foreach ($params as $k => $v) {
            $stmt->bindValue($k, $v);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $articles = $stmt->fetchAll();

        // Bersihkan tag HTML untuk excerpt agar rapi dan kompatibel di semua versi MySQL
        foreach ($articles as &$art) {
            $art['id'] = (int)$art['id_artikel'];
            $art['views'] = (int)($art['views'] ?? 0);
            $plain = strip_tags($art['raw_excerpt'] ?? '');
            $plain = preg_replace('/\s+/', ' ', $plain);
            $art['excerpt'] = mb_substr(trim($plain), 0, 160);
            unset($art['raw_excerpt']);

            $rawTags = $art['tags'] ?? '';
            $art['tag_list'] = !empty($rawTags) ? array_values(array_filter(array_map('trim', explode(',', $rawTags)))) : [];
        }
        unset($art);

        // Ambil data galeri foto untuk semua artikel yang ditemukan
        if (!empty($articles)) {
            $artIds = array_column($articles, 'id_artikel');
            $placeholders = implode(',', array_fill(0, count($artIds), '?'));
            $galStmt = $db->prepare("SELECT id, id_artikel, foto, caption, urutan FROM artikel_galeri WHERE id_artikel IN ($placeholders) ORDER BY urutan ASC, id ASC");
            $galStmt->execute($artIds);
            $allGals = $galStmt->fetchAll();
            $galGroup = [];
            foreach ($allGals as $g) {
                $g['url'] = $g['foto'] ?? $g['url'] ?? '';
                $g['foto'] = $g['foto'] ?? $g['url'] ?? '';
                $galGroup[$g['id_artikel']][] = $g;
            }
            foreach ($articles as &$art) {
                $artId = (int)$art['id_artikel'];
                $gal = $galGroup[$artId] ?? fetchSeedGalleryFallback($art['slug'] ?? '', $artId);
                $art['galeri'] = $gal;
                $art['gallery'] = $gal;
                $art['gallery_count'] = count($gal);
            }
            unset($art);
        }

        sendResponse(true, 'Data artikel berhasil diambil', [
            'articles'    => $articles,
            'pagination'  => [
                'total_items' => $totalItems,
                'page'        => $page,
                'limit'       => $limit,
                'total_pages' => ceil($totalItems / $limit)
            ]
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal mengambil artikel: ' . $e->getMessage(), null, 500);
    }
}

/**
 * Endpoint Rekomendasi Berita Terkait Otomatis (Multi-Tier Relevance Engine)
 * Merekomendasikan artikel berbasis kecocokan Tag, Kategori, Kata Kunci Judul, dan Backfill Berita Terkini
 */
function handleGetRelatedArtikel(PDO $db): void {
    $target = trim($_GET['related_to'] ?? '');
    $limit = isset($_GET['limit']) ? max(1, min(24, (int)$_GET['limit'])) : 6;

    if (empty($target)) {
        sendResponse(false, 'Parameter related_to wajib disertakan', null, 400);
    }

    // 1. Ambil artikel target
    $stmt = $db->prepare("
        SELECT a.id_artikel, a.title, a.slug, a.kategori_id, a.tags, k.slug AS kategori_slug, k.name_kategori
        FROM artikel a
        JOIN kategori k ON a.kategori_id = k.id_kategori
        WHERE a.slug = :target_slug OR a.id_artikel = :target_id
        LIMIT 1
    ");
    $stmt->execute([
        ':target_slug' => $target,
        ':target_id'   => is_numeric($target) ? (int)$target : 0
    ]);
    $current = $stmt->fetch();

    $targetId = $current ? (int)$current['id_artikel'] : 0;
    $targetCatId = $current ? (int)$current['kategori_id'] : 0;
    $targetCatSlug = $current ? ($current['kategori_slug'] ?? '') : '';
    $targetTitle = $current ? $current['title'] : $target;

    // Normalisasi tag target
    $targetTags = [];
    if ($current && !empty($current['tags'])) {
        $targetTags = array_map('trim', explode(',', strtolower($current['tags'])));
        $targetTags = array_values(array_filter($targetTags));
    }
    // Jika artikel target tidak memiliki tag di DB, coba ambil dari seed JSON
    if (empty($targetTags)) {
        $seedFile = __DIR__ . '/articles-seed.json';
        if (file_exists($seedFile)) {
            $rawSeed = @file_get_contents($seedFile);
            $seedArr = json_decode($rawSeed, true);
            if (is_array($seedArr)) {
                foreach ($seedArr as $s) {
                    if (($s['slug'] ?? '') === $target || (isset($s['id']) && (int)$s['id'] === $targetId)) {
                        if (!empty($s['tags']) && is_array($s['tags'])) {
                            $targetTags = array_map('trim', array_map('strtolower', $s['tags']));
                            break;
                        }
                    }
                }
            }
        }
    }

    // Ekstrak kata kunci penting dari judul (panjang >= 4 huruf, non-stopwords)
    $stopWords = [
        'dan','yang','untuk','pada','ke','dari','di','ini','itu','dengan','adalah','akan','bisa',
        'oleh','karena','maka','bagi','foto','video','juga','telah','lebih','saat','hari',
        'menjadi','resmi','terbaru','terkini','siap','sudah','kita','kami','mereka','dalam'
    ];
    $titleWords = preg_split('/[\s,\.\-\[\]\(\)\/]+/', strtolower($targetTitle));
    $keyWords = [];
    foreach ($titleWords as $w) {
        $w = trim($w);
        if (mb_strlen($w) >= 4 && !in_array($w, $stopWords)) {
            $keyWords[] = $w;
        }
    }

    // 2. Ambil semua artikel yang berstatus published (kecuali artikel target)
    $candStmt = $db->prepare("
        SELECT 
            a.id_artikel,
            a.id_artikel AS id,
            a.title,
            a.slug,
            SUBSTRING(a.content, 1, 350) AS raw_excerpt,
            a.thumbnail,
            a.caption,
            a.tags,
            a.status,
            a.views,
            a.published_at,
            a.expired_at,
            a.kategori_id,
            k.id_kategori,
            k.name_kategori,
            k.slug AS kategori_slug,
            u.id AS author_id,
            u.nama_users AS author_name,
            COALESCE(u.avatar, '') AS author_avatar
        FROM artikel a
        JOIN kategori k ON a.kategori_id = k.id_kategori
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.status = 'published' 
          AND (a.published_at IS NULL OR a.published_at <= CURRENT_TIMESTAMP)
          AND (a.expired_at IS NULL OR a.expired_at > CURRENT_TIMESTAMP)
          AND a.id_artikel != :exclude_id
        ORDER BY a.published_at DESC
        LIMIT 100
    ");
    $candStmt->execute([':exclude_id' => $targetId]);
    $candidates = $candStmt->fetchAll();

    // 3. Multi-tier Relevance Scoring
    $scored = [];
    foreach ($candidates as $cand) {
        $score = 0;
        $matchedTags = [];

        // A. Tag match (+50 poin per tag cocok)
        $candTags = [];
        if (!empty($cand['tags'])) {
            $candTags = array_map('trim', explode(',', strtolower($cand['tags'])));
            $candTags = array_values(array_filter($candTags));
            foreach ($candTags as $ct) {
                if (in_array($ct, $targetTags)) {
                    $matchedTags[] = $ct;
                    $score += 50;
                }
            }
        }

        // B. Kategori match (+30 poin jika satu rubrik)
        $sameCat = false;
        $candCatId = (int)($cand['kategori_id'] ?? $cand['id_kategori'] ?? 0);
        if (($targetCatId && $candCatId === $targetCatId) || ($targetCatSlug && !empty($cand['kategori_slug']) && $targetCatSlug === $cand['kategori_slug'])) {
            $score += 30;
            $sameCat = true;
        }

        // C. Kata kunci judul (+15 poin per kata kunci)
        $candTitleLower = strtolower($cand['title']);
        $matchedKw = [];
        foreach ($keyWords as $kw) {
            if (strpos($candTitleLower, $kw) !== false) {
                $matchedKw[] = $kw;
                $score += 15;
            }
        }

        // D. Freshness & Views boost (+0 s/d 5 poin)
        $views = (int)($cand['views'] ?? 0);
        $score += min(5, round($views / 2500, 2));

        $cand['id'] = (int)$cand['id_artikel'];
        $cand['views'] = $views;
        $plain = strip_tags($cand['raw_excerpt'] ?? '');
        $plain = preg_replace('/\s+/', ' ', $plain);
        $cand['excerpt'] = mb_substr(trim($plain), 0, 140);
        unset($cand['raw_excerpt']);

        $cand['relevance_score'] = $score;
        $cand['matched_tags']    = array_values(array_unique($matchedTags));
        $cand['same_category']   = $sameCat;
        $cand['tag_list']        = !empty($cand['tags']) ? array_values(array_filter(array_map('trim', explode(',', $cand['tags'])))) : [];

        $scored[] = $cand;
    }

    // Urutkan kandidat: pertama berdasarkan relevance_score tertinggi, lalu waktu terbit
    usort($scored, function($a, $b) {
        if ($b['relevance_score'] !== $a['relevance_score']) {
            return $b['relevance_score'] <=> $a['relevance_score'];
        }
        return strtotime($b['published_at'] ?? 'now') <=> strtotime($a['published_at'] ?? 'now');
    });

    // Ambil top $limit artikel (selalu terisi penuh jika total artikel mencukupi)
    $result = array_slice($scored, 0, $limit);

    sendResponse(true, 'Rekomendasi berita terkait berhasil dimuat', [
        'articles'    => $result,
        'count'       => count($result),
        'target_info' => [
            'id'            => $targetId,
            'title'         => $targetTitle,
            'kategori_slug' => $targetCatSlug,
            'tags'          => $targetTags
        ]
    ]);
}

// =========================================================================
// 2. POST: Tambah Berita Baru (Wajib Login)
// =========================================================================
function handleCreateArtikel(PDO $db): void {
    $currentUser = requireAuth();

    $rawInput = json_decode(file_get_contents('php://input'), true);
    $data = $rawInput ?? $_POST;

    $title       = trim($data['title'] ?? '');
    $kategoriId  = (int)($data['kategori_id'] ?? 1);
    $authorId    = !empty($data['author_id']) ? (int)$data['author_id'] : (int)$currentUser['id'];
    $editorId    = !empty($data['editor_id']) ? (int)$data['editor_id'] : null;
    $content     = trim($data['content'] ?? '');
    $status      = in_array($data['status'] ?? '', ['draft', 'published', 'review', 'scheduled']) ? $data['status'] : 'published';
    $thumbnail   = trim($data['thumbnail'] ?? '');
    $caption     = trim($data['caption'] ?? '');
    $rawTags     = $data['tags'] ?? '';
    $tags        = is_array($rawTags) ? implode(', ', array_map('trim', $rawTags)) : trim((string)$rawTags);

    if (empty($title)) {
        sendResponse(false, 'Judul artikel wajib diisi', null, 400);
    }
    if (empty($content)) {
        sendResponse(false, 'Konten artikel wajib diisi', null, 400);
    }

    // Buat slug unik
    $slug = createSlug($title);
    $chkStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE slug = :slug");
    $chkStmt->execute([':slug' => $slug]);
    if ($chkStmt->fetchColumn() > 0) {
        $slug .= '-' . time();
    }

    // Default thumbnail jika kosong
    if (empty($thumbnail)) {
        $thumbnail = 'assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg';
    }

    // Tangani tanggal publikasi (kustom / backdate / terjadwal)
    $rawPublishedAt = trim($data['published_at'] ?? $data['scheduled_at'] ?? '');
    $publishedAt = null;
    if (!empty($rawPublishedAt)) {
        $ts = strtotime($rawPublishedAt);
        if ($ts !== false) {
            $publishedAt = date('Y-m-d H:i:s', $ts);
        }
    }
    if (!$publishedAt) {
        $publishedAt = date('Y-m-d H:i:s');
    }

    // Tangani batas waktu tayang / auto-expire
    $rawExpiredAt = trim($data['expired_at'] ?? '');
    $expiredAt = null;
    if (!empty($rawExpiredAt)) {
        $tsExp = strtotime($rawExpiredAt);
        if ($tsExp !== false) {
            $expiredAt = date('Y-m-d H:i:s', $tsExp);
        }
    }

    try {
        $stmt = $db->prepare("
            INSERT INTO artikel (kategori_id, author_id, editor_id, title, slug, content, thumbnail, caption, tags, status, published_at, expired_at, updated_at)
            VALUES (:kategori_id, :author_id, :editor_id, :title, :slug, :content, :thumbnail, :caption, :tags, :status, :published_at, :expired_at, CURRENT_TIMESTAMP)
        ");
        $stmt->bindValue(':kategori_id', $kategoriId, PDO::PARAM_INT);
        $stmt->bindValue(':author_id', $authorId, PDO::PARAM_INT);
        $stmt->bindValue(':editor_id', $editorId, $editorId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $stmt->bindValue(':title', $title);
        $stmt->bindValue(':slug', $slug);
        $stmt->bindValue(':content', $content);
        $stmt->bindValue(':thumbnail', $thumbnail);
        $stmt->bindValue(':caption', $caption);
        $stmt->bindValue(':tags', $tags);
        $stmt->bindValue(':status', $status);
        $stmt->bindValue(':published_at', $publishedAt);
        $stmt->bindValue(':expired_at', $expiredAt, $expiredAt === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $stmt->execute();
        $newId = (int)$db->lastInsertId();

        // Simpan galeri foto jika ada
        $galleryInput = $data['gallery'] ?? $data['galeri'] ?? [];
        $savedGallery = [];
        if (!empty($galleryInput) && is_array($galleryInput)) {
            $galInsert = $db->prepare("INSERT INTO artikel_galeri (id_artikel, foto, caption, urutan) VALUES (:id_artikel, :foto, :caption, :urutan)");
            foreach ($galleryInput as $idx => $g) {
                $fotoPath = is_array($g) ? trim($g['foto'] ?? $g['image'] ?? $g['url'] ?? '') : trim($g);
                if (empty($fotoPath)) continue;
                $captionText = is_array($g) ? trim($g['caption'] ?? '') : '';
                $urutan = is_array($g) && isset($g['urutan']) ? (int)$g['urutan'] : $idx;
                $galInsert->execute([
                    ':id_artikel' => $newId,
                    ':foto'       => $fotoPath,
                    ':caption'    => $captionText,
                    ':urutan'     => $urutan
                ]);
                $savedGallery[] = [
                    'id'       => (int)$db->lastInsertId(),
                    'foto'     => $fotoPath,
                    'caption'  => $captionText,
                    'urutan'   => $urutan
                ];
            }
        }

        $newArticle = [
            'id_artikel'    => $newId,
            'title'         => $title,
            'slug'          => $slug,
            'caption'       => $caption,
            'status'        => $status,
            'galeri'        => $savedGallery,
            'gallery'       => $savedGallery,
            'gallery_count' => count($savedGallery),
            'published_at'  => $publishedAt,
            'expired_at'    => $expiredAt
        ];

        sendResponse(true, 'Artikel berhasil diterbitkan', $newArticle, 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menyimpan artikel: ' . $e->getMessage(), null, 500);
    }
}

// =========================================================================
// 3. PUT/PATCH: Update Berita (Wajib Login)
// =========================================================================
function handleUpdateArtikel(PDO $db): void {
    requireAuth();

    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    $rawInput = json_decode(file_get_contents('php://input'), true);
    $data = $rawInput ?? $_POST;

    if (!$id && isset($data['id_artikel'])) {
        $id = (int)$data['id_artikel'];
    }

    if (!$id) {
        sendResponse(false, 'ID artikel yang akan diupdate wajib disertakan', null, 400);
    }

    $title      = trim($data['title'] ?? '');
    $kategoriId = isset($data['kategori_id']) ? (int)$data['kategori_id'] : null;
    $authorId   = isset($data['author_id']) ? (int)$data['author_id'] : null;
    $editorId   = array_key_exists('editor_id', $data) ? (!empty($data['editor_id']) ? (int)$data['editor_id'] : null) : null;
    $content    = trim($data['content'] ?? '');
    $status     = trim($data['status'] ?? '');
    $thumbnail  = trim($data['thumbnail'] ?? '');
    $caption    = isset($data['caption']) ? trim($data['caption']) : null;

    try {
        $stmt = $db->prepare("SELECT * FROM artikel WHERE id_artikel = :id");
        $stmt->execute([':id' => $id]);
        $current = $stmt->fetch();

        if (!$current) {
            sendResponse(false, 'Artikel tidak ditemukan', null, 404);
        }

        $newTitle      = !empty($title) ? $title : $current['title'];
        $newKategoriId = $kategoriId ? $kategoriId : $current['kategori_id'];
        $newAuthorId   = ($authorId && $authorId > 0) ? $authorId : (int)$current['author_id'];
        $newEditorId   = array_key_exists('editor_id', $data) ? $editorId : (isset($current['editor_id']) ? (int)$current['editor_id'] : null);
        $newContent    = !empty($content) ? $content : $current['content'];
        $newStatus     = !empty($status) ? $status : $current['status'];
        $newThumb      = !empty($thumbnail) ? $thumbnail : $current['thumbnail'];
        $newCaption    = ($caption !== null) ? $caption : ($current['caption'] ?? '');
        $rawTags       = array_key_exists('tags', $data) ? $data['tags'] : ($current['tags'] ?? null);
        $newTags       = is_array($rawTags) ? implode(', ', array_map('trim', $rawTags)) : ($rawTags !== null ? trim((string)$rawTags) : null);

        // Pembaruan tanggal publikasi (kustom / backdate / terjadwal)
        $newPublishedAt = $current['published_at'];
        if (array_key_exists('published_at', $data) || array_key_exists('scheduled_at', $data)) {
            $rawPub = trim($data['published_at'] ?? $data['scheduled_at'] ?? '');
            if (!empty($rawPub)) {
                $ts = strtotime($rawPub);
                if ($ts !== false) {
                    $newPublishedAt = date('Y-m-d H:i:s', $ts);
                }
            }
        }

        // Pembaruan batas waktu tayang (auto-expire)
        $newExpiredAt = $current['expired_at'] ?? null;
        if (array_key_exists('expired_at', $data)) {
            $rawExp = trim($data['expired_at'] ?? '');
            if (!empty($rawExp)) {
                $ts = strtotime($rawExp);
                $newExpiredAt = ($ts !== false) ? date('Y-m-d H:i:s', $ts) : null;
            } else {
                $newExpiredAt = null;
            }
        }

        $upStmt = $db->prepare("
            UPDATE artikel
            SET title = :title,
                kategori_id = :kategori_id,
                author_id = :author_id,
                editor_id = :editor_id,
                content = :content,
                status = :status,
                thumbnail = :thumbnail,
                caption = :caption,
                tags = :tags,
                published_at = :published_at,
                expired_at = :expired_at,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_artikel = :id
        ");
        $upStmt->bindValue(':title', $newTitle);
        $upStmt->bindValue(':kategori_id', $newKategoriId, PDO::PARAM_INT);
        $upStmt->bindValue(':author_id', $newAuthorId, PDO::PARAM_INT);
        $upStmt->bindValue(':editor_id', $newEditorId, $newEditorId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
        $upStmt->bindValue(':content', $newContent);
        $upStmt->bindValue(':status', $newStatus);
        $upStmt->bindValue(':thumbnail', $newThumb);
        $upStmt->bindValue(':caption', $newCaption);
        $upStmt->bindValue(':tags', $newTags);
        $upStmt->bindValue(':published_at', $newPublishedAt, $newPublishedAt === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $upStmt->bindValue(':expired_at', $newExpiredAt, $newExpiredAt === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
        $upStmt->bindValue(':id', $id, PDO::PARAM_INT);
        $upStmt->execute();

        // Update galeri foto jika disertakan dalam payload
        if (array_key_exists('gallery', $data) || array_key_exists('galeri', $data)) {
            $galleryInput = $data['gallery'] ?? $data['galeri'] ?? [];
            if (is_array($galleryInput)) {
                $db->prepare("DELETE FROM artikel_galeri WHERE id_artikel = :id")->execute([':id' => $id]);
                if (!empty($galleryInput)) {
                    $galInsert = $db->prepare("INSERT INTO artikel_galeri (id_artikel, foto, caption, urutan) VALUES (:id_artikel, :foto, :caption, :urutan)");
                    foreach ($galleryInput as $idx => $g) {
                        $fotoPath = is_array($g) ? trim($g['foto'] ?? $g['image'] ?? $g['url'] ?? '') : trim($g);
                        if (empty($fotoPath)) continue;
                        $captionText = is_array($g) ? trim($g['caption'] ?? '') : '';
                        $urutan = is_array($g) && isset($g['urutan']) ? (int)$g['urutan'] : $idx;
                        $galInsert->execute([
                            ':id_artikel' => $id,
                            ':foto'       => $fotoPath,
                            ':caption'    => $captionText,
                            ':urutan'     => $urutan
                        ]);
                    }
                }
            }
        }

        sendResponse(true, 'Artikel berhasil diperbarui', [
            'id_artikel'   => $id,
            'published_at' => $newPublishedAt,
            'expired_at'   => $newExpiredAt
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal memperbarui artikel: ' . $e->getMessage(), null, 500);
    }
}

// =========================================================================
// 4. DELETE: Hapus Berita (Wajib Login)
// =========================================================================
function handleDeleteArtikel(PDO $db): void {
    requireAuth();

    $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
    if (!$id) {
        $rawInput = json_decode(file_get_contents('php://input'), true);
        $id = $rawInput['id'] ?? $rawInput['id_artikel'] ?? null;
    }

    if (!$id) {
        sendResponse(false, 'ID artikel yang akan dihapus wajib disertakan', null, 400);
    }

    try {
        $stmt = $db->prepare("DELETE FROM artikel WHERE id_artikel = :id");
        $stmt->execute([':id' => $id]);

        if ($stmt->rowCount() === 0) {
            sendResponse(false, 'Artikel tidak ditemukan atau sudah dihapus', null, 404);
        }

        sendResponse(true, 'Artikel berhasil dihapus', ['deleted_id' => $id]);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menghapus artikel: ' . $e->getMessage(), null, 500);
    }
}
