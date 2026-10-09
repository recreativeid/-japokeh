<?php
/**
 * Japakeh Post - Server-Side Open Graph & Article Detail Renderer
 * PT Japakeh Media Nusantara - Portal Berita Cepat, Akurat, dan Terpercaya
 *
 * Fungsi Utama:
 * 1. Menangkap slug/id artikel dari URL (?slug=... atau ?id=... atau /artikel/slug)
 * 2. Mengambil data artikel dari database MySQL (fallback ke api/articles-seed.json jika DB offline)
 * 3. Menginjeksi Open Graph Tags (og:title, og:description, og:image, og:url, dll.),
 *    Twitter Card, dan Schema.org JSON-LD NewsArticle ke dalam <head>
 * 4. Merender gambar thumbnail absolut, judul, dan ringkasan agar WhatsApp, Facebook,
 *    Twitter/X, Telegram, LinkedIn, dan Googlebot langsung memuat kartu pratinjau berita otomatis.
 */

// Pastikan output UTF-8
header('Content-Type: text/html; charset=UTF-8');

// 1. Tentukan Base URL & Path Subfolder Otomatis
$host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? 'japakehpost.com';
if (strpos($host, ',') !== false) {
    $host = trim(explode(',', $host)[0]);
}

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
    || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https')
    || (!empty($_SERVER['HTTP_CF_VISITOR']) && strpos($_SERVER['HTTP_CF_VISITOR'], 'https') !== false)
    || (strpos($host, 'trycloudflare.com') !== false);

$protocol = $isHttps ? 'https://' : 'http://';

// Ambil path folder tempat file artikel.php berada (misal: /WebsiteBeritaJapakehPost)
$scriptDir = trim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
$subFolder = !empty($scriptDir) ? '/' . $scriptDir : '';

// Base URL sekarang menyertakan subfolder project dengan benar
$baseUrl = rtrim($protocol . $host . $subFolder, '/');

// 2. Ambil parameter slug atau id
$slug = isset($_GET['slug']) ? trim($_GET['slug']) : null;
$id = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : null;

// Jika slug kosong, coba ambil dari PATH_INFO atau REQUEST_URI (/artikel/slug-berita)
if (!$slug && !$id && !empty($_SERVER['REQUEST_URI'])) {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (preg_match('#/artikel/([a-zA-Z0-9_\-\.]+)/?$#', $path, $m)) {
        $slug = trim($m[1]);
        if (substr($slug, -5) === '.html') {
            $slug = substr($slug, 0, -5);
        }
    }
}

// 3. Fungsi Pengambilan Data Berita
if (!function_exists('getGlobalPdoConnection')) {
    function getGlobalPdoConnection(): ?PDO {
        // A. Prioritas 1: Gunakan koneksi database dari api/config/database.php (Production cPanel & Local)
        $dbConfigPath = __DIR__ . '/api/config/database.php';
        if (file_exists($dbConfigPath)) {
            try {
                require_once $dbConfigPath;
                if (php_sapi_name() !== 'cli' && !headers_sent()) {
                    header('Content-Type: text/html; charset=UTF-8');
                }
                if (class_exists('Database') && method_exists('Database', 'getConnection')) {
                    $pdo = Database::getConnection();
                    if ($pdo instanceof PDO) {
                        return $pdo;
                    }
                }
            } catch (Throwable $e) {
                // Fallback ke langkah berikutnya jika ada kendala
            }
        }

        // B. Prioritas 2: Baca dari backend_ci4/.env (Environment Development Lokal)
        $envPath = __DIR__ . '/backend_ci4/.env';
        $host     = 'localhost';
        $port     = '3306';
        $dbname   = 'berita_japakehpost';
        $user     = 'root';
        $password = '';

        if (file_exists($envPath)) {
            $lines = @file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
            foreach ($lines as $line) {
                $line = trim($line);
                if (empty($line) || strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
                list($k, $v) = explode('=', $line, 2);
                $k = trim($k);
                $v = trim(trim($v), "'\"");
                if ($k === 'database.default.hostname') $host = $v;
                if ($k === 'database.default.port')     $port = $v;
                if ($k === 'database.default.database') $dbname = $v;
                if ($k === 'database.default.username') $user = $v;
                if ($k === 'database.default.password') $password = $v;
            }
        }

        try {
            if (!extension_loaded('pdo_mysql')) {
                return null;
            }
            $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
            return new PDO($dsn, $user, $password, [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT            => 3,
            ]);
        } catch (Throwable $e) {
            return null;
        }
    }
}

if (!function_exists('fetchArticleData')) {
    function fetchArticleData(?string $slug, ?int $id): ?array {
        // A. Coba dari Database MySQL via PDO
        $article = fetchFromDatabase($slug, $id);
        if ($article) {
            return $article;
        }

        // B. Coba via Internal API (api/artikel.php) jika koneksi langsung terkendala
        $article = fetchFromInternalApi($slug, $id);
        if ($article) {
            return $article;
        }

        // C. Fallback: Coba dari api/articles-seed.json
        return fetchFromSeedJson($slug, $id);
    }
}

if (!function_exists('fetchFromInternalApi')) {
    function fetchFromInternalApi(?string $slug, ?int $id): ?array {
        try {
            $host = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? 'japakehpost.com';
            if (strpos($host, ',') !== false) {
                $host = trim(explode(',', $host)[0]);
            }
            $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
                || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443)
                || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https')
                || (!empty($_SERVER['HTTP_CF_VISITOR']) && strpos($_SERVER['HTTP_CF_VISITOR'], 'https') !== false)
                || (strpos($host, 'trycloudflare.com') !== false);
            $protocol = $isHttps ? 'https://' : 'http://';
            $scriptDir = trim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
            $subFolder = !empty($scriptDir) ? '/' . $scriptDir : '';
            $param = $slug ? 'slug=' . urlencode($slug) : ($id ? 'id=' . $id : '');
            if (empty($param)) {
                $param = 'limit=1';
            }
            $apiUrl = $protocol . $host . $subFolder . '/api/artikel.php?' . $param;

            $ctx = stream_context_create([
                'http' => [
                    'timeout' => 3,
                    'ignore_errors' => true,
                    'header' => "User-Agent: JapakehPost-InternalOG/1.0\r\n"
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false
                ]
            ]);

            $json = @file_get_contents($apiUrl, false, $ctx);
            if ($json) {
                $res = json_decode($json, true);
                if (!empty($res['status']) && $res['status'] === 'success' && !empty($res['data'])) {
                    $item = $res['data'];
                    if (isset($item['articles']) && is_array($item['articles']) && !empty($item['articles'][0])) {
                        $item = $item['articles'][0];
                    }
                    return [
                        'id_artikel'    => $item['id_artikel'] ?? $item['id'] ?? null,
                        'title'         => $item['title'] ?? '',
                        'slug'          => $item['slug'] ?? '',
                        'excerpt'       => $item['excerpt'] ?? '',
                        'content'       => $item['content'] ?? '',
                        'thumbnail'     => $item['thumbnail'] ?? '',
                        'caption'       => $item['caption'] ?? '',
                        'name_kategori' => $item['name_kategori'] ?? 'Nasional',
                        'kategori_slug' => $item['kategori_slug'] ?? 'nasional',
                        'author_id'     => $item['author_id'] ?? null,
                        'author_name'   => $item['author_name'] ?? 'Redaksi Japakeh Post',
                        'author_avatar' => $item['author_avatar'] ?? '',
                        'author_bio'    => $item['author_bio'] ?? '',
                        'author_role'   => $item['author_role'] ?? 'Wartawan Japakeh Post',
                        'editor_id'     => $item['editor_id'] ?? null,
                        'editor_name'   => $item['editor_name'] ?? null,
                        'editor_avatar' => $item['editor_avatar'] ?? '',
                        'editor_bio'    => $item['editor_bio'] ?? '',
                        'editor_role'   => $item['editor_role'] ?? null,
                        'tags'          => is_array($item['tags'] ?? null) ? implode(', ', $item['tags']) : ($item['tags'] ?? ''),
                        'views'         => $item['views'] ?? 0,
                        'published_at'  => $item['published_at'] ?? date('Y-m-d H:i:s'),
                        'galeri'        => $item['galeri'] ?? $item['gallery'] ?? [],
                        'gallery'       => $item['gallery'] ?? $item['galeri'] ?? [],
                        'gallery_count' => $item['gallery_count'] ?? count($item['galeri'] ?? [])
                    ];
                }
            }
        } catch (Throwable $e) {}
        return null;
    }
}

if (!function_exists('fetchFromDatabase')) {
    function fetchFromDatabase(?string $slug, ?int $id): ?array {
    try {
        $pdo = getGlobalPdoConnection();
        if (!$pdo) {
            return null;
        }

        if ($slug) {
            $stmt = $pdo->prepare("
                SELECT 
                    a.id_artikel,
                    a.title,
                    a.slug,
                    a.content,
                    a.thumbnail,
                    a.caption,
                    a.tags,
                    a.status,
                    a.views,
                    a.published_at,
                    k.name_kategori,
                    k.slug AS kategori_slug,
                    a.author_id,
                    u.nama_users AS author_name,
                    u.avatar AS author_avatar,
                    u.bio AS author_bio,
                    u.role AS author_role,
                    a.editor_id,
                    ue.nama_users AS editor_name,
                    ue.avatar AS editor_avatar,
                    ue.bio AS editor_bio,
                    ue.role AS editor_role
                FROM artikel a
                LEFT JOIN kategori k ON a.kategori_id = k.id_kategori
                LEFT JOIN users u ON a.author_id = u.id
                LEFT JOIN users ue ON a.editor_id = ue.id
                WHERE a.slug = :slug
                LIMIT 1
            ");
            $stmt->execute([':slug' => $slug]);
            $res = $stmt->fetch();
            // TAMBAHKAN BARIS INI UNTUK DEBUGGING:
            // echo "<pre>HASIL QUERY: ";
            // var_dump($res);
            // echo "</pre>";
            // exit;
            if ($res) {
                attachGalleryToArticle($pdo, $res, $slug, $id);
                return $res;
            }
        }

        if ($id) {
            $stmt = $pdo->prepare("
                SELECT 
                    a.id_artikel,
                    a.title,
                    a.slug,
                    a.content,
                    a.thumbnail,
                    a.caption,
                    a.tags,
                    a.status,
                    a.views,
                    a.published_at,
                    k.name_kategori,
                    k.slug AS kategori_slug,
                    a.author_id,
                    u.nama_users AS author_name,
                    u.avatar AS author_avatar,
                    u.bio AS author_bio,
                    u.role AS author_role,
                    a.editor_id,
                    ue.nama_users AS editor_name,
                    ue.avatar AS editor_avatar,
                    ue.bio AS editor_bio,
                    ue.role AS editor_role
                FROM artikel a
                LEFT JOIN kategori k ON a.kategori_id = k.id_kategori
                LEFT JOIN users u ON a.author_id = u.id
                LEFT JOIN users ue ON a.editor_id = ue.id
                WHERE a.id_artikel = :id
                LIMIT 1
            ");
            $stmt->execute([':id' => $id]);
            $res = $stmt->fetch();
            if ($res) {
                attachGalleryToArticle($pdo, $res, $slug, $id);
                return $res;
            }
        }

        // Jika tanpa parameter, ambil 1 artikel published terbaru
        if (!$slug && !$id) {
            $stmt = $pdo->query("
                SELECT 
                    a.id_artikel,
                    a.title,
                    a.slug,
                    a.content,
                    a.thumbnail,
                    a.caption,
                    a.tags,
                    a.status,
                    a.views,
                    a.published_at,
                    k.name_kategori,
                    k.slug AS kategori_slug,
                    a.author_id,
                    u.nama_users AS author_name,
                    u.avatar AS author_avatar,
                    u.bio AS author_bio,
                    u.role AS author_role,
                    a.editor_id,
                    ue.nama_users AS editor_name,
                    ue.avatar AS editor_avatar,
                    ue.bio AS editor_bio,
                    ue.role AS editor_role
                FROM artikel a
                LEFT JOIN kategori k ON a.kategori_id = k.id_kategori
                LEFT JOIN users u ON a.author_id = u.id
                LEFT JOIN users ue ON a.editor_id = ue.id
                WHERE a.status = 'published'
                ORDER BY a.published_at DESC
                LIMIT 1
            ");
            $res = $stmt ? $stmt->fetch() : null;
            if ($res) {
                attachGalleryToArticle($pdo, $res, $slug, $id);
                return $res;
            }
        }
    } catch (Throwable $e) {
        // Diamkan error DB, fallback ke JSON seed
    }

    return null;
    }
}

if (!function_exists('attachGalleryToArticle')) {
    function attachGalleryToArticle(?PDO $pdo, array &$article, ?string $slug, ?int $id): void {
        $gallery = [];
        if ($pdo && !empty($article['id_artikel'])) {
            try {
                $galStmt = $pdo->prepare("SELECT id, foto, caption, urutan FROM artikel_galeri WHERE id_artikel = :id ORDER BY urutan ASC, id ASC");
                $galStmt->execute([':id' => $article['id_artikel']]);
                $gallery = $galStmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (Throwable $e) {}
        }
        if (empty($gallery)) {
            $seedFile = __DIR__ . '/api/articles-seed.json';
            if (file_exists($seedFile)) {
                $seedList = json_decode(@file_get_contents($seedFile), true);
                if (is_array($seedList)) {
                    foreach ($seedList as $s) {
                        if (($slug && isset($s['slug']) && $s['slug'] === $slug) ||
                            ($id && isset($s['id']) && (int)$s['id'] === $id) ||
                            (!empty($article['id_artikel']) && isset($s['id']) && (int)$s['id'] === (int)$article['id_artikel'])) {
                            $rawG = $s['gallery'] ?? $s['galeri'] ?? [];
                            if (is_array($rawG)) {
                                foreach ($rawG as $idx => $item) {
                                    $gallery[] = [
                                        'id' => $idx + 1,
                                        'foto' => is_array($item) ? ($item['url'] ?? $item['foto'] ?? '') : $item,
                                        'caption' => is_array($item) ? ($item['caption'] ?? '') : '',
                                        'urutan' => $idx + 1
                                    ];
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
        $article['galeri'] = $gallery;
        $article['gallery'] = $gallery;
        $article['gallery_count'] = count($gallery);
    }
}

if (!function_exists('fetchFromSeedJson')) {
    function fetchFromSeedJson(?string $slug, ?int $id): ?array {
        $seedFile = __DIR__ . '/api/articles-seed.json';
        if (!file_exists($seedFile)) return null;

        $json = @file_get_contents($seedFile);
        if (!$json) return null;

        $list = json_decode($json, true);
        if (!is_array($list) || empty($list)) return null;

        if ($slug) {
            foreach ($list as $item) {
                if (isset($item['slug']) && $item['slug'] === $slug) {
                    return normalizeSeedArticle($item);
                }
            }
        }

        if ($id) {
            foreach ($list as $item) {
                if (isset($item['id']) && (int)$item['id'] === $id) {
                    return normalizeSeedArticle($item);
                }
            }
        }

        // Default ke artikel pertama jika ada
        if (!$slug && !$id && !empty($list[0])) {
            return normalizeSeedArticle($list[0]);
        }

        return null;
    }
}

if (!function_exists('normalizeSeedArticle')) {
    function normalizeSeedArticle(array $item): array {
        $rawG = $item['gallery'] ?? $item['galeri'] ?? [];
        $galList = [];
        if (is_array($rawG)) {
            foreach ($rawG as $idx => $g) {
                $galList[] = [
                    'id' => $idx + 1,
                    'foto' => is_array($g) ? ($g['url'] ?? $g['foto'] ?? '') : $g,
                    'caption' => is_array($g) ? ($g['caption'] ?? '') : '',
                    'urutan' => $idx + 1
                ];
            }
        }
        return [
        'id_artikel'    => $item['id'] ?? null,
        'title'         => $item['title'] ?? '',
        'slug'          => $item['slug'] ?? '',
        'excerpt'       => $item['excerpt'] ?? '',
        'content'       => $item['content'] ?? '',
        'thumbnail'     => $item['image'] ?? $item['thumbnail'] ?? '',
        'caption'       => $item['caption'] ?? '',
        'name_kategori' => $item['category'] ?? 'Nasional',
        'kategori_slug' => $item['categorySlug'] ?? 'nasional',
        'author_name'   => $item['author'] ?? 'Al Bahri',
        'author_avatar' => $item['author_avatar'] ?? '',
        'author_role'   => $item['author_role'] ?? 'Wartawan Japakeh Post',
        'author_bio'    => $item['author_bio'] ?? '',
        'editor_name'   => $item['editor_name'] ?? null,
        'editor_avatar' => $item['editor_avatar'] ?? '',
        'editor_role'   => $item['editor_role'] ?? null,
        'tags'          => is_array($item['tags'] ?? null) ? implode(', ', $item['tags']) : ($item['tags'] ?? ''),
        'galeri'        => $galList,
        'gallery'       => $galList,
        'gallery_count' => count($galList),
        'published_at'  => isset($item['timestamp']) ? date('Y-m-d H:i:s', $item['timestamp'] / 1000) : date('Y-m-d H:i:s'),
        ];
    }
}

// 3b. Fungsi Generator Gambar Open Graph Khusus (WhatsApp & Facebook 1200x630 JPEG < 200KB)
if (!function_exists('generateArticleOgImage')) {
    function generateArticleOgImage(string $sourcePath, string $slug): ?string {
        // Pastikan ekstensi GD aktif sebelum memproses gambar
        if (!extension_loaded('gd') || !function_exists('imagecreatetruecolor') || !function_exists('imagejpeg')) {
            return null;
        }

        $cacheDir = __DIR__ . '/assets/images/og-cache';
        if (!is_dir($cacheDir)) {
            @mkdir($cacheDir, 0755, true);
        }

        $cleanSlug = preg_replace('/[^a-zA-Z0-9_\-]/', '-', $slug);
        $cleanSlug = trim($cleanSlug, '-');
        if (empty($cleanSlug)) {
            $cleanSlug = 'article-' . substr(md5($sourcePath), 0, 10);
        }
        $targetFile = $cacheDir . '/' . $cleanSlug . '.jpg';

        // Target Open Graph: 1200x630 (Rasio ideal 1.91:1)
        $targetW = 1200;
        $targetH = 630;

        $fullSourcePath = __DIR__ . '/' . ltrim($sourcePath, '/\\');
        if (!file_exists($fullSourcePath)) {
            $fullSourcePath = __DIR__ . '/assets/images/logo/og-default.jpg';
            if (!file_exists($fullSourcePath)) {
                return null;
            }
        }

        $imgInfo = @getimagesize($fullSourcePath);
        if (!$imgInfo) {
            return null;
        }

        $mime = $imgInfo['mime'] ?? '';
        $srcImg = null;
        if ($mime === 'image/jpeg' && function_exists('imagecreatefromjpeg')) {
            $srcImg = @imagecreatefromjpeg($fullSourcePath);
        } elseif ($mime === 'image/png' && function_exists('imagecreatefrompng')) {
            $srcImg = @imagecreatefrompng($fullSourcePath);
        } elseif ($mime === 'image/webp' && function_exists('imagecreatefromwebp')) {
            $srcImg = @imagecreatefromwebp($fullSourcePath);
        }

        if (!$srcImg) {
            return null;
        }

        $srcW = imagesx($srcImg);
        $srcH = imagesy($srcImg);

        // Crop proporsional (Cover mode) agar objek foto artikel tidak gepeng / terdistorsi
        $targetRatio = $targetW / $targetH;
        $srcRatio = $srcW / $srcH;

        if ($srcRatio > $targetRatio) {
            $cropH = $srcH;
            $cropW = (int)round($srcH * $targetRatio);
            $cropX = (int)round(($srcW - $cropW) / 2);
            $cropY = 0;
        } else {
            $cropW = $srcW;
            $cropH = (int)round($srcW / $targetRatio);
            $cropX = 0;
            $cropY = (int)round(($srcH - $cropH) * 0.35); // 35% dari atas agar fokus wajah/objek utama pas
            if ($cropY < 0) $cropY = 0;
            if ($cropY + $cropH > $srcH) $cropY = $srcH - $cropH;
        }

        $canvas = imagecreatetruecolor($targetW, $targetH);
        imagecopyresampled($canvas, $srcImg, 0, 0, $cropX, $cropY, $targetW, $targetH, $cropW, $cropH);
        imagedestroy($srcImg);

        // Kualitas 82 menghasilkan gambar jernih & tajam dengan ukuran file 80-180 KB (< 300 KB limit WhatsApp)
        imagejpeg($canvas, $targetFile, 82);
        imagedestroy($canvas);

        return $targetFile;
    }
}

// 4. Eksekusi Pengambilan Data
$article = fetchArticleData($slug, $id);

// 5. Normalisasi Metadata Open Graph
if ($article && !empty($article['title'])) {
    $articleTitle = trim($article['title']);
    $pageTitle = $articleTitle . ' — Japakeh Post';
    $authorName = !empty($article['author_name']) ? trim($article['author_name']) : 'Al Bahri';
    $hasEditor = !empty($article['editor_id']) && !empty($article['editor_name']) && trim($article['editor_name']) !== '' && (string)$article['editor_id'] !== '0';
    $editorName = $hasEditor ? trim($article['editor_name']) : '';
    $authorRole = !empty($article['author_role']) ? trim($article['author_role']) : 'Wartawan Japakeh Post';
    $editorRole = $hasEditor ? (!empty($article['editor_role']) ? trim($article['editor_role']) : 'Redaktur Pelaksana') : '';
    $authorBio = !empty($article['author_bio']) ? trim($article['author_bio']) : 'Jurnalis dan redaksi Japakeh Post yang berfokus pada liputan mendalam, investigasi, dan akurasi informasi publik di Aceh dan sekitarnya.';
    $authorAvatar = !empty($article['author_avatar']) ? trim($article['author_avatar']) : '';
    $editorAvatar = $hasEditor && !empty($article['editor_avatar']) ? trim($article['editor_avatar']) : '';
    $categoryName = !empty($article['name_kategori']) ? trim($article['name_kategori']) : 'Nasional';
    $articleSlug = !empty($article['slug']) ? trim($article['slug']) : ($slug ?: 'detail');

    // Buat Excerpt / Ringkasan yang Bersih
    $metaDescription = '';
    if (!empty($article['excerpt'])) {
        $metaDescription = trim(strip_tags($article['excerpt']));
    }
    if (empty($metaDescription) && !empty($article['content'])) {
        $clean = strip_tags($article['content']);
        $clean = html_entity_decode($clean, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $clean = preg_replace('/\s+/', ' ', $clean);
        $clean = trim($clean);
        if (mb_strlen($clean) > 175) {
            $clean = mb_substr($clean, 0, 172) . '...';
        }
        $metaDescription = $clean;
    }
    if (empty($metaDescription)) {
        $metaDescription = 'Baca laporan lengkap dan berita terkini ' . $articleTitle . ' hanya di portal berita Japakeh Post.';
    }

    // Resolusi Gambar Thumbnail Absolut Artikel (Optimal 1200x630 JPEG < 300KB untuk WhatsApp & Facebook)
    $thumbPath = !empty($article['thumbnail']) ? trim($article['thumbnail']) : '';
    if (empty($thumbPath)) {
        $thumbPath = 'assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg';
    }

    $cleanSlug = !empty($article['slug']) ? preg_replace('/[^a-zA-Z0-9_\-]/', '-', $article['slug']) : ($slug ?: 'detail');
    $cleanSlug = trim($cleanSlug, '-');

    // Cek atau buat file gambar Open Graph 1200x630 teroptimasi dari foto artikel
    $cachedOgRelPath = 'assets/images/og-cache/' . $cleanSlug . '.jpg';
    $cachedOgFullPath = __DIR__ . '/' . $cachedOgRelPath;

    $fullSourcePath = __DIR__ . '/' . ltrim($thumbPath, '/\\');
    $needsRegen = !file_exists($cachedOgFullPath)
        || filesize($cachedOgFullPath) < 1024
        || (file_exists($fullSourcePath) && filemtime($fullSourcePath) > filemtime($cachedOgFullPath));

    if ($needsRegen) {
        if (function_exists('generateArticleOgImage')) {
            generateArticleOgImage($thumbPath, $cleanSlug);
        }
    }

    if (file_exists($cachedOgFullPath) && filesize($cachedOgFullPath) > 1024) {
        // Gunakan foto thumbnail artikel versi 1200x630 JPEG (< 200KB)
        $absoluteImageUrl = $baseUrl . '/' . $cachedOgRelPath;
        $imageMime = 'image/jpeg';
    } else {
        // Fallback langsung ke file thumbnail artikel asli
        if (preg_match('#^https?://#i', $thumbPath)) {
            $absoluteImageUrl = $thumbPath;
        } else {
            $thumbPath = ltrim($thumbPath, '/');
            $absoluteImageUrl = $baseUrl . '/' . $thumbPath;
        }
        $imgExt = strtolower(pathinfo(parse_url($absoluteImageUrl, PHP_URL_PATH) ?? '', PATHINFO_EXTENSION));
        $imageMime = ($imgExt === 'png') ? 'image/png' : (($imgExt === 'webp') ? 'image/webp' : 'image/jpeg');
    }

    // Canonical & Share URL (Sesuaikan dengan file yang diakses agar bot tidak diarahkan ke file statis)
    $scriptName = basename(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '');
    $targetFile = (strpos($scriptName, 'artikel.html') !== false) ? 'artikel.html' : 'artikel.php';
    $canonicalUrl = $baseUrl . '/' . $targetFile . '?slug=' . urlencode($articleSlug);
    $publishedIso = !empty($article['published_at']) ? date('c', strtotime($article['published_at'])) : date('c');

} else {
    // Fallback Profil Global Japakeh Post jika artikel tidak ditemukan
    $scriptName = basename(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?? '');
    $targetFile = (strpos($scriptName, 'artikel.html') !== false) ? 'artikel.html' : 'artikel.php';
    $articleTitle = 'Detail Berita — Japakeh Post';
    $pageTitle = 'Japakeh Post — Portal Berita Terkini, Akurat, dan Terpercaya';
    $metaDescription = 'Baca berita dan laporan terkini, akurat, dan terpercaya di portal berita Japakeh Post. Menjangkau informasi nasional, daerah, hukum, dan politik.';
    $authorName = 'PT Japakeh Media Nusantara';
    $hasEditor = false;
    $editorName = '';
    $authorRole = 'Redaksi Japakeh Post';
    $editorRole = '';
    $authorBio = '';
    $authorAvatar = '';
    $editorAvatar = '';
    $categoryName = 'Berita';
    $absoluteImageUrl = $baseUrl . '/assets/images/logo/og-default.jpg';
    $imageMime = 'image/jpeg';
    $canonicalUrl = $baseUrl . '/' . $targetFile . ($slug ? '?slug=' . urlencode($slug) : '');
    $publishedIso = date('c');
}

// 6. Schema.org NewsArticle JSON-LD
$schemaData = [
    "@context" => "https://schema.org",
    "@type" => "NewsArticle",
    "mainEntityOfPage" => [
        "@type" => "WebPage",
        "@id" => $canonicalUrl
    ],
    "headline" => $articleTitle,
    "description" => $metaDescription,
    "image" => [
        "@type" => "ImageObject",
        "url" => $absoluteImageUrl,
        "caption" => !empty($article['caption']) ? trim($article['caption']) : $articleTitle,
        "width" => 1200,
        "height" => 630
    ],
    "datePublished" => $publishedIso,
    "dateModified" => $publishedIso,
    "author" => [
        "@type" => "Person",
        "name" => $authorName
    ],
    "publisher" => [
        "@type" => "Organization",
        "name" => "PT Japakeh Media Nusantara",
        "logo" => [
            "@type" => "ImageObject",
            "url" => $baseUrl . "/assets/images/logo/Logo_Japakeh_Post_Berita.png"
        ]
    ]
];

$metaKeywords = !empty($article['tags']) ? htmlspecialchars($article['tags'], ENT_QUOTES, 'UTF-8') : htmlspecialchars($categoryName . ', Japakeh Post, Berita Terkini', ENT_QUOTES, 'UTF-8');
$schemaData["keywords"] = $metaKeywords;

if (!empty($hasEditor) && !empty($editorName)) {
    $schemaData["editor"] = [
        "@type" => "Person",
        "name" => $editorName
    ];
}

$schemaJson = json_encode($schemaData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

// 7. Muat Template HTML Utama (artikel.html)
$htmlTemplatePath = __DIR__ . '/artikel.html';
if (!file_exists($htmlTemplatePath)) {
    http_response_code(500);
    echo "Kesalahan Server: File template artikel.html tidak ditemukan.";
    exit;
}
$html = file_get_contents($htmlTemplatePath);

// 8. Susun Blok Metadata Open Graph Lengkap
$openGraphTags = <<<HTML

  <!-- Canonical URL -->
  <link rel="canonical" href="{$canonicalUrl}">

  <!-- Meta Keywords & Topik Terkait -->
  <meta name="keywords" content="{$metaKeywords}">

  <!-- Open Graph / Facebook / WhatsApp / Telegram / LinkedIn -->
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Japakeh Post">
  <meta property="og:title" content="{$articleTitle}">
  <meta property="og:description" content="{$metaDescription}">
  <meta property="og:image" content="{$absoluteImageUrl}">
  <meta property="og:image:secure_url" content="{$absoluteImageUrl}">
  <meta property="og:image:type" content="{$imageMime}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{$articleTitle}">
  <meta property="og:url" content="{$canonicalUrl}">
  <meta property="og:locale" content="id_ID">
  <meta property="article:published_time" content="{$publishedIso}">
  <meta property="article:author" content="{$authorName}">
  <meta property="article:section" content="{$categoryName}">
  <meta property="article:tag" content="{$metaKeywords}">

  <!-- Twitter / X Cards -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@japakehpost">
  <meta name="twitter:creator" content="@japakehpost">
  <meta name="twitter:title" content="{$articleTitle}">
  <meta name="twitter:description" content="{$metaDescription}">
  <meta name="twitter:image" content="{$absoluteImageUrl}">
  <meta name="twitter:image:alt" content="{$articleTitle}">

  <!-- Schema.org NewsArticle Structured Data -->
  <script type="application/ld+json">
{$schemaJson}
  </script>
HTML;

// Ganti Title dan Meta Description bawaan
$html = preg_replace('/<title>.*?<\/title>/is', '<title>' . htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') . '</title>', $html, 1);
$html = preg_replace('/<meta\s+name=["\']description["\']\s+content=["\'].*?["\']\s*\/?>/is', '<meta name="description" content="' . htmlspecialchars($metaDescription, ENT_QUOTES, 'UTF-8') . '">', $html, 1);

// Sisipkan Open Graph Tags setelah meta author
if (strpos($html, '<meta name="author"') !== false) {
    $html = preg_replace('/(<meta\s+name=["\']author["\'][^>]*>)/i', '$1' . "\n" . $openGraphTags, $html, 1);
} else {
    // Fallback: sisipkan sebelum </head>
    $html = str_replace('</head>', $openGraphTags . "\n</head>", $html);
}

// 9. Pre-populate Konten HTML Body jika data artikel ditemukan
// (Memastikan crawler teks dan pembaca tanpa JS langsung melihat artikel tanpa jeda "Memuat Berita...")
if ($article && !empty($article['title'])) {
    // Headline
    $html = preg_replace(
        '/(<h1\s+id=["\']article-headline["\'][^>]*>)(.*?)(<\/h1>)/is',
        '$1' . htmlspecialchars($articleTitle, ENT_QUOTES, 'UTF-8') . '$3',
        $html,
        1
    );

    // Breadcrumb Title
    $html = preg_replace(
        '/(<span\s+id=["\']article-breadcrumb-title["\'][^>]*>)(.*?)(<\/span>)/is',
        '$1' . htmlspecialchars($articleTitle, ENT_QUOTES, 'UTF-8') . '$3',
        $html,
        1
    );

    // Kategori
    $html = preg_replace(
        '/(<span\s+id=["\']article-cat-badge["\'][^>]*>)(.*?)(<\/span>)/is',
        '$1' . htmlspecialchars(strtoupper($categoryName), ENT_QUOTES, 'UTF-8') . '$3',
        $html,
        1
    );

    // Penulis & Editor (Top Bar)
    $html = preg_replace(
        '/(<div[^>]*id=["\']article-author["\'][^>]*>)(.*?)(<\/div>)/is',
        '$1' . htmlspecialchars($authorName, ENT_QUOTES, 'UTF-8') . '$3',
        $html,
        1
    );
    $html = preg_replace(
        '/(<div[^>]*id=["\']article-author-role["\'][^>]*>)(.*?)(<\/div>)/is',
        '$1' . htmlspecialchars($authorRole, ENT_QUOTES, 'UTF-8') . '$3',
        $html,
        1
    );
    // Date & Reading Time (Tabaca Style)
    if (!empty($article['published_at'])) {
        $ts = strtotime($article['published_at']);
        $days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        $months = [1 => 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        $dayName = $days[(int)date('w', $ts)];
        $mName = $months[(int)date('n', $ts)];
        $formattedDate = $dayName . ', ' . date('j', $ts) . ' ' . $mName . ' ' . date('Y | H:i', $ts) . ' WIB';

        $html = preg_replace(
            '/(<time\s+id=["\']article-date["\'][^>]*>)(.*?)(<\/time>)/is',
            '$1' . htmlspecialchars($formattedDate, ENT_QUOTES, 'UTF-8') . '$3',
            $html,
            1
        );
    }

    if (!empty($authorAvatar)) {
        $html = preg_replace(
            '/(<img\s+id=["\']article-author-img["\'][^>]*src=["\'])([^"\']*)(["\'][^>]*class=["\'])([^"\']*)(["\'][^>]*>)/is',
            '${1}' . htmlspecialchars($authorAvatar, ENT_QUOTES, 'UTF-8') . '${3}' . trim(preg_replace('/\bhidden\b/', '', '${4}')) . '${5}',
            $html,
            1
        );
        $html = preg_replace(
            '/(<span\s+id=["\']article-author-initials["\'][^>]*class=["\'])([^"\']*)(["\'])/is',
            '$1$2 hidden$3',
            $html,
            1
        );
    }

    if (!empty($hasEditor) && !empty($editorName)) {
        $html = preg_replace(
            '/(<div[^>]*id=["\']article-editor-name["\'][^>]*>)(.*?)(<\/div>)/is',
            '$1' . htmlspecialchars($editorName, ENT_QUOTES, 'UTF-8') . '$3',
            $html,
            1
        );
        $html = preg_replace(
            '/(<div[^>]*id=["\']article-editor-role["\'][^>]*>)(.*?)(<\/div>)/is',
            '$1' . htmlspecialchars($editorRole, ENT_QUOTES, 'UTF-8') . '$3',
            $html,
            1
        );
        if (!empty($editorAvatar)) {
            $html = preg_replace(
                '/(<img\s+id=["\']article-editor-img["\'][^>]*src=["\'])([^"\']*)(["\'][^>]*class=["\'])([^"\']*)(["\'][^>]*>)/is',
                '${1}' . htmlspecialchars($editorAvatar, ENT_QUOTES, 'UTF-8') . '${3}' . trim(preg_replace('/\bhidden\b/', '', '${4}')) . '${5}',
                $html,
                1
            );
            $html = preg_replace(
                '/(<span\s+id=["\']article-editor-initials["\'][^>]*class=["\'])([^"\']*)(["\'])/is',
                '$1$2 hidden$3',
                $html,
                1
            );
        }
    } else {
        $html = preg_replace(
            '/(<div[^>]*id=["\']article-editor-container["\'][^>]*class=["\'])([^"\']*)(["\'])/is',
            '$1$2 hidden$3',
            $html,
            1
        );
        $html = preg_replace(
            '/(<div[^>]*id=["\']article-author-editor-separator["\'][^>]*class=["\'])([^"\']*)(["\'])/is',
            '$1$2 hidden$3',
            $html,
            1
        );
        $html = preg_replace(
            '/(<div[^>]*id=["\']article-editor-avatar-box["\'][^>]*class=["\'])([^"\']*)(["\'])/is',
            '$1$2 hidden$3',
            $html,
            1
        );
    }

    // Bottom Author Card & Signoff
    $html = preg_replace(
        '/(<h4[^>]*id=["\']article-author-bottom-name["\'][^>]*>)(.*?)(<\/h4>)/is',
        '$1' . htmlspecialchars($authorName, ENT_QUOTES, 'UTF-8') . '$3',
        $html,
        1
    );
    $html = preg_replace(
        '/(<span[^>]*id=["\']article-author-bottom-role["\'][^>]*>)(.*?)(<\/span>)/is',
        '$1' . htmlspecialchars($authorRole, ENT_QUOTES, 'UTF-8') . '$3',
        $html,
        1
    );
    if (!empty($authorBio)) {
        $html = preg_replace(
            '/(<p[^>]*id=["\']article-author-bottom-bio["\'][^>]*>)(.*?)(<\/p>)/is',
            '$1' . htmlspecialchars($authorBio, ENT_QUOTES, 'UTF-8') . '$3',
            $html,
            1
        );
    }
    $html = preg_replace(
        '/(<span[^>]*id=["\']article-signoff-author["\'][^>]*>)(.*?)(<\/span>)/is',
        '$1' . htmlspecialchars($authorName, ENT_QUOTES, 'UTF-8') . '$3',
        $html,
        1
    );
    $html = preg_replace(
        '/(<span[^>]*id=["\']article-signoff-editor["\'][^>]*>)(.*?)(<\/span>)/is',
        '$1' . htmlspecialchars((!empty($hasEditor) && !empty($editorName)) ? $editorName : '— (Penanggung Jawab Langsung)', ENT_QUOTES, 'UTF-8') . '$3',
        $html,
        1
    );

    // Hero Image src & alt
    $html = preg_replace(
        '/(<img\s+id=["\']article-hero-img["\'][^>]*src=["\'])([^"\']*)(["\'][^>]*alt=["\'])([^"\']*)(["\'][^>]*>)/is',
        '${1}' . htmlspecialchars($thumbPath, ENT_QUOTES, 'UTF-8') . '${3}' . htmlspecialchars($articleTitle, ENT_QUOTES, 'UTF-8') . '${5}',
        $html,
        1
    );

    // Hero Caption
    $captionText = !empty($article['caption']) && trim($article['caption']) !== ''
        ? trim($article['caption'])
        : ('Dokumentasi Liputan: ' . $articleTitle . ' (Foto: Dok. Japakeh Post)');
    $html = preg_replace(
        '/(<figcaption\s+id=["\']article-hero-caption["\'][^>]*>)(.*?)(<\/figcaption>)/is',
        '$1' . htmlspecialchars($captionText, ENT_QUOTES, 'UTF-8') . '$3',
        $html,
        1
    );

    // Pre-populate Galeri Foto jika artikel memiliki galeri (Slider & Grid)
    if (!empty($article['galeri']) && is_array($article['galeri']) && count($article['galeri']) > 0) {
        $galCount = count($article['galeri']);
        $firstFoto = $article['galeri'][0];
        $firstUrl = is_array($firstFoto) ? ($firstFoto['foto'] ?? $firstFoto['url'] ?? '') : $firstFoto;
        $firstCaption = is_array($firstFoto) ? ($firstFoto['caption'] ?? '') : '';
        if (empty($firstCaption)) {
            $firstCaption = $captionText;
        }

        // Sembunyikan single media dan aktifkan gallery container
        $html = preg_replace('/id=["\']article-single-media["\']\s+class=["\']([^"\']*)["\']/is', 'id="article-single-media" class="$1 hidden"', $html, 1);
        $html = preg_replace('/id=["\']article-gallery-container["\']\s+class=["\']([^"\']*)hidden([^"\']*)["\']/is', 'id="article-gallery-container" class="$1$2"', $html, 1);

        // Update badge dan counter
        $html = preg_replace('/(<span\s+id=["\']gallery-badge-count["\'][^>]*>)(.*?)(<\/span>)/is', '$1GALERI FOTO (' . $galCount . ' Foto)$3', $html, 1);
        $html = preg_replace('/(<span\s+id=["\']gallery-slide-counter["\'][^>]*>)(.*?)(<\/span>)/is', '$1Foto 1 dari ' . $galCount . '$3', $html, 1);

        // Update foto utama dan caption galeri
        $html = preg_replace(
            '/(<img\s+id=["\']gallery-main-img["\'][^>]*src=["\'])([^"\']*)(["\'][^>]*alt=["\'])([^"\']*)(["\'][^>]*>)/is',
            '${1}' . htmlspecialchars($firstUrl, ENT_QUOTES, 'UTF-8') . '${3}' . htmlspecialchars($firstCaption, ENT_QUOTES, 'UTF-8') . '${5}',
            $html,
            1
        );
        $html = preg_replace(
            '/(<figcaption\s+id=["\']gallery-main-caption["\'][^>]*>)(.*?)(<\/figcaption>)/is',
            '$1' . htmlspecialchars($firstCaption, ENT_QUOTES, 'UTF-8') . '$3',
            $html,
            1
        );
    }

    // Excerpt jika tersedia
    if (!empty($article['excerpt']) && trim($article['excerpt']) !== $articleTitle) {
        $html = preg_replace(
            '/<p\s+id=["\']article-excerpt["\']\s+class=["\']([^"\']*)hidden([^"\']*)["\']><\/p>/is',
            '<p id="article-excerpt" class="$1$2">' . htmlspecialchars(trim($article['excerpt']), ENT_QUOTES, 'UTF-8') . '</p>',
            $html,
            1
        );
    }
}

// 10. Outputkan Halaman Lengkap
echo $html;
