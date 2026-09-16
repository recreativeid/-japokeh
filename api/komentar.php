<?php
/**
 * REST API Endpoint: Moderasi & Komentar Pembaca
 * Tables: komentar, artikel
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($method) {
    case 'GET':
        handleGetKomentar($db);
        break;
    case 'POST':
        $override = $_POST['_method'] ?? $_GET['_method'] ?? null;
        if ($override === 'PUT') {
            handleUpdateStatusKomentar($db);
        } elseif ($override === 'DELETE') {
            handleDeleteKomentar($db);
        } else {
            handleCreateKomentar($db);
        }
        break;
    case 'PUT':
    case 'PATCH':
        handleUpdateStatusKomentar($db);
        break;
    case 'DELETE':
        handleDeleteKomentar($db);
        break;
    default:
        sendResponse(false, 'Metode HTTP tidak didukung', null, 405);
}

// =========================================================================
// 1. GET: Daftar Komentar (Publik untuk Artikel atau Lengkap untuk Admin)
// =========================================================================
function handleGetKomentar(PDO $db): void {
    $artikelId = !empty($_GET['artikel_id']) ? (int)$_GET['artikel_id'] : null;
    $slug      = !empty($_GET['slug']) ? trim($_GET['slug']) : null;
    $status    = !empty($_GET['status']) ? strtolower(trim($_GET['status'])) : null;
    $forAdmin  = isset($_GET['admin']) || isset($_GET['manage']) || (empty($artikelId) && empty($slug));

    // A. Jika publik membaca komentar pada artikel tertentu
    if (!$forAdmin && ($artikelId || $slug)) {
        if (!$artikelId && $slug) {
            $stmtArt = $db->prepare("SELECT id_artikel FROM artikel WHERE slug = :slug LIMIT 1");
            $stmtArt->execute([':slug' => $slug]);
            $artRow = $stmtArt->fetch();
            $artikelId = $artRow ? (int)$artRow['id_artikel'] : 0;
        }

        if (!$artikelId) {
            sendResponse(true, 'Belum ada komentar untuk artikel ini', []);
        }

        $stmt = $db->prepare("
            SELECT 
                id,
                artikel_id,
                name,
                comment,
                created_at
            FROM komentar
            WHERE artikel_id = :aid AND status = 'approved'
            ORDER BY created_at DESC
        ");
        $stmt->execute([':aid' => $artikelId]);
        $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

        sendResponse(true, 'Daftar komentar disetujui', $comments);
    }

    // B. Panel Admin: Ambil komentar lengkap beserta data artikel dan counter tab
    $countSql = "
        SELECT 
            COUNT(*) AS total_all,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS total_pending,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS total_approved,
            COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS total_rejected,
            COALESCE(SUM(CASE WHEN status = 'spam' THEN 1 ELSE 0 END), 0) AS total_spam
        FROM komentar
    ";
    $counts = $db->query($countSql)->fetch(PDO::FETCH_ASSOC);

    $where = [];
    $params = [];

    if (!empty($status) && $status !== 'all') {
        $where[] = "k.status = :status";
        $params[':status'] = $status;
    }

    if (!empty($artikelId)) {
        $where[] = "k.artikel_id = :aid";
        $params[':aid'] = $artikelId;
    }

    $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';

    $sql = "
        SELECT 
            k.id,
            k.artikel_id,
            k.name,
            k.email,
            k.comment,
            k.status,
            k.ip_address,
            k.created_at,
            a.title AS artikel_title,
            a.slug AS artikel_slug
        FROM komentar k
        LEFT JOIN artikel a ON k.artikel_id = a.id_artikel
        $whereClause
        ORDER BY k.created_at DESC
    ";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    sendResponse(true, 'Data komentar admin berhasil dimuat', [
        'comments' => $comments,
        'counts'   => [
            'all'      => (int)($counts['total_all'] ?? 0),
            'pending'  => (int)($counts['total_pending'] ?? 0),
            'approved' => (int)($counts['total_approved'] ?? 0),
            'rejected' => (int)($counts['total_rejected'] ?? 0),
            'spam'     => (int)($counts['total_spam'] ?? 0),
        ]
    ]);
}

// =========================================================================
// 2. POST: Kirim Komentar Pembaca (Guest Comment)
// =========================================================================
function handleCreateKomentar(PDO $db): void {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;

    $name      = trim($data['name'] ?? '');
    $email     = trim($data['email'] ?? '');
    $comment   = trim($data['comment'] ?? '');
    $slug      = trim($data['slug'] ?? '');
    $artikelId = !empty($data['artikel_id']) ? (int)$data['artikel_id'] : null;

    if (empty($name) || empty($comment)) {
        sendResponse(false, 'Nama dan isi komentar wajib diisi.', null, 422);
    }

    if (!$artikelId && !empty($slug)) {
        $stmt = $db->prepare("SELECT id_artikel FROM artikel WHERE slug = :slug LIMIT 1");
        $stmt->execute([':slug' => $slug]);
        $artRow = $stmt->fetch();
        if ($artRow) {
            $artikelId = (int)$artRow['id_artikel'];
        }
    }

    if (!$artikelId) {
        $fallback = $db->query("SELECT id_artikel FROM artikel ORDER BY id_artikel ASC LIMIT 1")->fetchColumn();
        $artikelId = $fallback ? (int)$fallback : 1;
    }

    $ipAddress = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    if (str_contains($ipAddress, ',')) {
        $ipAddress = trim(explode(',', $ipAddress)[0]);
    }

    $isSpam = false;
    $lowerComment = strtolower($comment);
    $spamKeywords = ['bit.ly', 'pinjol', 'slot gacor', 'judi online', 'whatsapp.com/send', 'promo dana'];
    foreach ($spamKeywords as $kw) {
        if (str_contains($lowerComment, $kw)) {
            $isSpam = true;
            break;
        }
    }

    $initialStatus = $isSpam ? 'spam' : 'pending';

    $insertSql = "
        INSERT INTO komentar (artikel_id, name, email, comment, status, ip_address, created_at, updated_at)
        VALUES (:aid, :name, :email, :comment, :status, :ip, NOW(), NOW())
    ";

    $stmt = $db->prepare($insertSql);
    $stmt->execute([
        ':aid'     => $artikelId,
        ':name'    => htmlspecialchars($name, ENT_QUOTES, 'UTF-8'),
        ':email'   => htmlspecialchars($email, ENT_QUOTES, 'UTF-8'),
        ':comment' => htmlspecialchars($comment, ENT_QUOTES, 'UTF-8'),
        ':status'  => $initialStatus,
        ':ip'      => substr($ipAddress, 0, 45)
    ]);

    $newId = (int)$db->lastInsertId();
    $newComment = [
        'id'         => $newId,
        'name'       => $name,
        'comment'    => $comment,
        'status'     => $initialStatus,
        'created_at' => date('Y-m-d H:i:s')
    ];

    sendResponse(
        true, 
        'Terima kasih! Komentar Anda berhasil dikirim dan sedang menunggu kurasi redaksi sebelum dipublikasikan.', 
        $newComment, 
        201
    );
}

// =========================================================================
// 3. PUT: Update Status Komentar (Moderasi Admin)
// =========================================================================
function handleUpdateStatusKomentar(PDO $db): void {
    $rawInput = file_get_contents('php://input');
    $data = json_decode($rawInput, true) ?? $_POST;

    $id = !empty($_GET['id']) ? (int)$_GET['id'] : (int)($data['id'] ?? 0);
    $status = strtolower(trim($data['status'] ?? ''));

    if (!$id) {
        sendResponse(false, 'ID komentar tidak valid', null, 400);
    }

    $allowedStatuses = ['pending', 'approved', 'rejected', 'spam'];
    if (!in_array($status, $allowedStatuses, true)) {
        sendResponse(false, 'Status tidak valid. Pilihan: pending, approved, rejected, spam', null, 422);
    }

    $stmt = $db->prepare("
        UPDATE komentar 
        SET status = :status, updated_at = NOW() 
        WHERE id = :id
    ");
    $stmt->execute([':status' => $status, ':id' => $id]);

    $updated = [
        'id'     => $id,
        'status' => $status
    ];

    sendResponse(true, "Status komentar berhasil diubah menjadi '$status'", $updated);
}

// =========================================================================
// 4. DELETE: Hapus Komentar Permanen (Admin)
// =========================================================================
function handleDeleteKomentar(PDO $db): void {
    $id = !empty($_GET['id']) ? (int)$_GET['id'] : 0;
    if (!$id) {
        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        $id = (int)($data['id'] ?? 0);
    }

    if (!$id) {
        sendResponse(false, 'ID komentar tidak valid', null, 400);
    }

    $stmt = $db->prepare("DELETE FROM komentar WHERE id = :id");
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() === 0) {
        sendResponse(false, 'Komentar tidak ditemukan', null, 404);
    }

    sendResponse(true, 'Data komentar telah berhasil dibersihkan permanen', ['id' => $id]);
}
