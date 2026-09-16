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
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

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
    // A. Detail berdasarkan slug
    if (!empty($_GET['slug'])) {
        $slug = trim($_GET['slug']);
        $stmt = $db->prepare("
            SELECT 
                a.id_artikel,
                a.title,
                a.slug,
                a.content,
                a.thumbnail,
                a.status,
                a.published_at,
                a.updated_at,
                k.id_kategori,
                k.name_kategori,
                k.slug AS kategori_slug,
                u.id AS author_id,
                u.nama_users AS author_name
            FROM artikel a
            JOIN kategori k ON a.kategori_id = k.id_kategori
            JOIN users u ON a.author_id = u.id
            WHERE a.slug = :slug
            LIMIT 1
        ");
        $stmt->execute([':slug' => $slug]);
        $news = $stmt->fetch();

        if (!$news) {
            sendResponse(false, 'Berita tidak ditemukan', null, 404);
        }
        sendResponse(true, 'Detail berita ditemukan', $news);
    }

    // B. Detail berdasarkan ID (untuk edit form di admin)
    if (!empty($_GET['id'])) {
        $id = (int)$_GET['id'];
        $stmt = $db->prepare("
            SELECT 
                a.*,
                k.name_kategori,
                u.nama_users AS author_name
            FROM artikel a
            JOIN kategori k ON a.kategori_id = k.id_kategori
            JOIN users u ON a.author_id = u.id
            WHERE a.id_artikel = :id
            LIMIT 1
        ");
        $stmt->execute([':id' => $id]);
        $news = $stmt->fetch();

        if (!$news) {
            sendResponse(false, 'Berita tidak ditemukan', null, 404);
        }
        sendResponse(true, 'Detail berita ditemukan', $news);
    }

    // C. Ambil List Berita dengan Filter
    $kategoriSlug = trim($_GET['kategori'] ?? '');
    $kategoriId   = isset($_GET['kategori_id']) ? (int)$_GET['kategori_id'] : null;
    $status       = trim($_GET['status'] ?? '');
    $search       = trim($_GET['search'] ?? '');
    $limit        = isset($_GET['limit']) ? max(1, min(200, (int)$_GET['limit'])) : 10;
    $page         = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $offset       = ($page - 1) * $limit;

    $where = ["1=1"];
    $params = [];

    if (!empty($kategoriSlug) && strtolower($kategoriSlug) !== 'all') {
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
    }

    if (!empty($search)) {
        $where[] = "(a.title LIKE :search OR a.content LIKE :search)";
        $params[':search'] = '%' . $search . '%';
    }

    $whereClause = implode(" AND ", $where);

    try {
        // Hitung total data
        $countStmt = $db->prepare("
            SELECT COUNT(*) 
            FROM artikel a
            JOIN kategori k ON a.kategori_id = k.id_kategori
            JOIN users u ON a.author_id = u.id
            WHERE {$whereClause}
        ");
        $countStmt->execute($params);
        $totalItems = (int)$countStmt->fetchColumn();

        // Ambil data artikel
        $sql = "
            SELECT 
                a.id_artikel,
                a.title,
                a.slug,
                SUBSTRING(a.content, 1, 400) AS raw_excerpt,
                a.thumbnail,
                a.status,
                a.published_at,
                a.updated_at,
                k.id_kategori,
                k.name_kategori,
                k.slug AS kategori_slug,
                u.id AS author_id,
                u.nama_users AS author_name
            FROM artikel a
            JOIN kategori k ON a.kategori_id = k.id_kategori
            JOIN users u ON a.author_id = u.id
            WHERE {$whereClause}
            ORDER BY a.published_at DESC, a.id_artikel DESC
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
            $plain = strip_tags($art['raw_excerpt'] ?? '');
            $plain = preg_replace('/\s+/', ' ', $plain);
            $art['excerpt'] = mb_substr(trim($plain), 0, 160);
            unset($art['raw_excerpt']);
        }
        unset($art);

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

// =========================================================================
// 2. POST: Tambah Berita Baru (Wajib Login)
// =========================================================================
function handleCreateArtikel(PDO $db): void {
    $currentUser = requireAuth();

    $rawInput = json_decode(file_get_contents('php://input'), true);
    $data = $rawInput ?? $_POST;

    $title       = trim($data['title'] ?? '');
    $kategoriId  = (int)($data['kategori_id'] ?? 1);
    $authorId    = (int)($data['author_id'] ?? $currentUser['id']);
    $content     = trim($data['content'] ?? '');
    $status      = in_array($data['status'] ?? '', ['draft', 'published']) ? $data['status'] : 'published';
    $thumbnail   = trim($data['thumbnail'] ?? '');

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

    try {
        $stmt = $db->prepare("
            INSERT INTO artikel (kategori_id, author_id, title, slug, content, thumbnail, status, published_at, updated_at)
            VALUES (:kategori_id, :author_id, :title, :slug, :content, :thumbnail, :status, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ");
        $stmt->execute([
            ':kategori_id' => $kategoriId,
            ':author_id'   => $authorId,
            ':title'       => $title,
            ':slug'        => $slug,
            ':content'     => $content,
            ':thumbnail'   => $thumbnail,
            ':status'      => $status
        ]);
        $newId = (int)$db->lastInsertId();
        $newArticle = [
            'id_artikel'   => $newId,
            'title'        => $title,
            'slug'         => $slug,
            'status'       => $status,
            'published_at' => date('Y-m-d H:i:s')
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
    $content    = trim($data['content'] ?? '');
    $status     = trim($data['status'] ?? '');
    $thumbnail  = trim($data['thumbnail'] ?? '');

    try {
        $stmt = $db->prepare("SELECT * FROM artikel WHERE id_artikel = :id");
        $stmt->execute([':id' => $id]);
        $current = $stmt->fetch();

        if (!$current) {
            sendResponse(false, 'Artikel tidak ditemukan', null, 404);
        }

        $newTitle      = !empty($title) ? $title : $current['title'];
        $newKategoriId = $kategoriId ? $kategoriId : $current['kategori_id'];
        $newContent    = !empty($content) ? $content : $current['content'];
        $newStatus     = !empty($status) ? $status : $current['status'];
        $newThumb      = !empty($thumbnail) ? $thumbnail : $current['thumbnail'];

        $upStmt = $db->prepare("
            UPDATE artikel
            SET title = :title,
                kategori_id = :kategori_id,
                content = :content,
                status = :status,
                thumbnail = :thumbnail,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_artikel = :id
        ");
        $upStmt->execute([
            ':title'       => $newTitle,
            ':kategori_id' => $newKategoriId,
            ':content'     => $newContent,
            ':status'      => $newStatus,
            ':thumbnail'   => $newThumb,
            ':id'          => $id
        ]);

        sendResponse(true, 'Artikel berhasil diperbarui', ['id_artikel' => $id]);
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
