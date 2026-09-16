<?php
/**
 * REST API Endpoint: Video Berita (YouTube)
 * Portal Berita Japakeh Post
 * Table: video
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($method) {
    case 'GET':
        handleGetVideos($db);
        break;
    case 'POST':
        $override = $_POST['_method'] ?? $_GET['_method'] ?? null;
        if ($override === 'PUT') {
            handleUpdateVideo($db);
        } elseif ($override === 'DELETE') {
            handleDeleteVideo($db);
        } else {
            handleCreateVideo($db);
        }
        break;
    case 'PUT':
        handleUpdateVideo($db);
        break;
    case 'DELETE':
        handleDeleteVideo($db);
        break;
    default:
        sendResponse(false, 'Metode HTTP tidak didukung', null, 405);
}

/**
 * Ekstraksi YouTube Video ID dari berbagai variasi URL
 */
function extractYouTubeId(string $url): ?string {
    $url = trim($url);
    if (preg_match('/^[a-zA-Z0-9_-]{11}$/', $url)) {
        return $url;
    }
    if (preg_match('%(?:youtube(?:-nocookie)?\.com/(?:[^/]+/.+/|(?:v|e(?:mbed)?)/|.*[?&]v=)|youtu\.be/|youtube\.com/shorts/)([^"&?/\s]{11})%i', $url, $match)) {
        return $match[1];
    }
    return null;
}

/**
 * Helper format objek video dengan URL embed dan thumbnail
 */
function formatVideoItem(array $row): array {
    $ytId = $row['youtube_id'] ?? '';
    $row['id_video'] = (int)($row['id_video'] ?? 0);
    $row['is_active'] = filter_var($row['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN);
    $row['embed_url'] = "https://www.youtube-nocookie.com/embed/{$ytId}?rel=0";
    $row['watch_url'] = "https://www.youtube.com/watch?v={$ytId}";
    $row['thumbnail_url'] = "https://img.youtube.com/vi/{$ytId}/hqdefault.jpg";
    $row['thumbnail_maxres'] = "https://img.youtube.com/vi/{$ytId}/maxresdefault.jpg";
    return $row;
}

/**
 * 1. GET: Ambil daftar video atau detail video tunggal
 */
function handleGetVideos(PDO $db): void {
    // A. Detail satu video berdasarkan ID
    if (!empty($_GET['id'])) {
        $id = (int)$_GET['id'];
        $stmt = $db->prepare("SELECT * FROM video WHERE id_video = :id LIMIT 1");
        $stmt->execute([':id' => $id]);
        $video = $stmt->fetch();

        if (!$video) {
            sendResponse(false, 'Video tidak ditemukan', null, 404);
        }
        sendResponse(true, 'Detail video ditemukan', formatVideoItem($video));
    }

    // B. Ambil daftar video
    try {
        $status = $_GET['status'] ?? null;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        if ($limit <= 0) $limit = 20;

        $where = [];
        $params = [];

        if ($status === 'active') {
            $where[] = "is_active = 1";
        } elseif ($status === 'inactive') {
            $where[] = "is_active = 0";
        }

        if (!empty($_GET['search'])) {
            $where[] = "(title LIKE :search OR caption LIKE :search)";
            $params[':search'] = '%' . trim($_GET['search']) . '%';
        }

        $whereSql = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        $sql = "
            SELECT * FROM video
            {$whereSql}
            ORDER BY id_video DESC
            LIMIT {$limit}
        ";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        $videos = array_map('formatVideoItem', $rows);

        sendResponse(true, 'Daftar video berhasil diambil', [
            'videos' => $videos,
            'total'  => count($videos)
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal mengambil video: ' . $e->getMessage(), null, 500);
    }
}

/**
 * 2. POST: Tambah video YouTube baru (Wajib Login)
 */
function handleCreateVideo(PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    
    $title = trim($input['title'] ?? '');
    $youtubeUrl = trim($input['youtube_url'] ?? '');
    $caption = trim($input['caption'] ?? '');
    $isActive = isset($input['is_active']) ? filter_var($input['is_active'], FILTER_VALIDATE_BOOLEAN) : true;

    if (empty($title)) {
        sendResponse(false, 'Judul video wajib diisi', null, 400);
    }

    if (empty($youtubeUrl)) {
        sendResponse(false, 'Link YouTube wajib diisi', null, 400);
    }

    $youtubeId = extractYouTubeId($youtubeUrl);
    if (!$youtubeId) {
        sendResponse(false, 'Format Link YouTube tidak valid. Contoh: https://www.youtube.com/watch?v=... atau https://youtu.be/...', null, 400);
    }

    // Normalisasi URL YouTube standar
    $canonicalUrl = "https://www.youtube.com/watch?v={$youtubeId}";

    try {
        $stmt = $db->prepare("
            INSERT INTO video (title, youtube_url, youtube_id, caption, is_active, created_at, updated_at)
            VALUES (:title, :youtube_url, :youtube_id, :caption, :is_active, NOW(), NOW())
        ");
        $stmt->execute([
            ':title'       => $title,
            ':youtube_url' => $canonicalUrl,
            ':youtube_id'  => $youtubeId,
            ':caption'     => $caption,
            ':is_active'   => $isActive ? 1 : 0
        ]);
        $newId = (int)$db->lastInsertId();

        $stmtGet = $db->prepare("SELECT * FROM video WHERE id_video = :id LIMIT 1");
        $stmtGet->execute([':id' => $newId]);
        $newVideo = $stmtGet->fetch();

        sendResponse(true, 'Video YouTube berhasil ditambahkan', formatVideoItem($newVideo), 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menyimpan video ke database: ' . $e->getMessage(), null, 500);
    }
}

/**
 * 3. PUT: Update video (Wajib Login)
 */
function handleUpdateVideo(PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id = (int)($input['id_video'] ?? $_GET['id'] ?? 0);

    if ($id <= 0) {
        sendResponse(false, 'ID video tidak valid', null, 400);
    }

    // Cek keberadaan video
    $check = $db->prepare("SELECT * FROM video WHERE id_video = :id LIMIT 1");
    $check->execute([':id' => $id]);
    $existing = $check->fetch();
    if (!$existing) {
        sendResponse(false, 'Video tidak ditemukan', null, 404);
    }

    $title = isset($input['title']) ? trim($input['title']) : $existing['title'];
    $youtubeUrl = isset($input['youtube_url']) ? trim($input['youtube_url']) : $existing['youtube_url'];
    $caption = isset($input['caption']) ? trim($input['caption']) : $existing['caption'];
    $isActive = isset($input['is_active']) ? filter_var($input['is_active'], FILTER_VALIDATE_BOOLEAN) : (bool)$existing['is_active'];

    if (empty($title)) {
        sendResponse(false, 'Judul video tidak boleh kosong', null, 400);
    }

    $youtubeId = extractYouTubeId($youtubeUrl);
    if (!$youtubeId) {
        sendResponse(false, 'Format Link YouTube tidak valid', null, 400);
    }
    $canonicalUrl = "https://www.youtube.com/watch?v={$youtubeId}";

    try {
        $stmt = $db->prepare("
            UPDATE video
            SET title = :title,
                youtube_url = :youtube_url,
                youtube_id = :youtube_id,
                caption = :caption,
                is_active = :is_active,
                updated_at = NOW()
            WHERE id_video = :id
        ");
        $stmt->execute([
            ':title'       => $title,
            ':youtube_url' => $canonicalUrl,
            ':youtube_id'  => $youtubeId,
            ':caption'     => $caption,
            ':is_active'   => $isActive ? 1 : 0,
            ':id'          => $id
        ]);

        $stmtGet = $db->prepare("SELECT * FROM video WHERE id_video = :id LIMIT 1");
        $stmtGet->execute([':id' => $id]);
        $updated = $stmtGet->fetch();

        sendResponse(true, 'Video berhasil diperbarui', formatVideoItem($updated));
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal memperbarui video: ' . $e->getMessage(), null, 500);
    }
}

/**
 * 4. DELETE: Hapus video (Wajib Login)
 */
function handleDeleteVideo(PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id = (int)($input['id_video'] ?? $_GET['id'] ?? 0);

    if ($id <= 0) {
        sendResponse(false, 'ID video tidak valid', null, 400);
    }

    try {
        $stmt = $db->prepare("DELETE FROM video WHERE id_video = :id");
        $stmt->execute([':id' => $id]);

        if ($stmt->rowCount() === 0) {
            sendResponse(false, 'Video tidak ditemukan atau sudah dihapus', null, 404);
        }

        sendResponse(true, 'Video berhasil dihapus', ['id_video' => $id]);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menghapus video: ' . $e->getMessage(), null, 500);
    }
}
