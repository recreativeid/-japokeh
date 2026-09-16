<?php
/**
 * REST API Endpoint: Manajemen Wartawan & Penulis (Redaksi)
 * Tables: users, artikel
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($method) {
    case 'GET':
        handleGetAuthors($db);
        break;
    case 'POST':
        $override = $_POST['_method'] ?? $_GET['_method'] ?? null;
        if ($override === 'PUT') {
            handleUpdateAuthor($db);
        } elseif ($override === 'DELETE') {
            handleDeleteAuthor($db);
        } else {
            handleCreateAuthor($db);
        }
        break;
    case 'PUT':
        handleUpdateAuthor($db);
        break;
    case 'DELETE':
        handleDeleteAuthor($db);
        break;
    default:
        sendResponse(false, 'Metode HTTP tidak didukung', null, 405);
}

// 1. GET: Ambil Semua Penulis beserta Jumlah Artikel
function handleGetAuthors(PDO $db): void {
    try {
        // Ambil detail jika id disertakan
        if (!empty($_GET['id'])) {
            $id = (int)$_GET['id'];
            $stmt = $db->prepare("
                SELECT 
                    u.id,
                    u.nama_users,
                    u.email_users,
                    u.role,
                    COALESCE(u.status, 'active') AS status,
                    COALESCE(u.bio, '') AS bio,
                    COALESCE(u.avatar, '') AS avatar,
                    u.created_at,
                    COUNT(a.id_artikel) AS total_artikel
                FROM users u
                LEFT JOIN artikel a ON a.author_id = u.id
                WHERE u.id = :id
                GROUP BY u.id, u.nama_users, u.email_users, u.role, u.status, u.bio, u.avatar, u.created_at
                LIMIT 1
            ");
            $stmt->execute([':id' => $id]);
            $author = $stmt->fetch();

            if (!$author) {
                sendResponse(false, 'Penulis tidak ditemukan', null, 404);
            }

            // Ambil 5 artikel terbaru dari penulis ini
            $artStmt = $db->prepare("
                SELECT id_artikel, title, slug, status, published_at 
                FROM artikel 
                WHERE author_id = :id 
                ORDER BY id_artikel DESC 
                LIMIT 5
            ");
            $artStmt->execute([':id' => $id]);
            $author['recent_articles'] = $artStmt->fetchAll();

            sendResponse(true, 'Detail penulis berhasil diambil', $author);
        }

        // Ambil semua daftar penulis
        $sql = "
            SELECT 
                u.id,
                u.nama_users,
                u.email_users,
                u.role,
                COALESCE(u.status, 'active') AS status,
                COALESCE(u.bio, '') AS bio,
                COALESCE(u.avatar, '') AS avatar,
                u.created_at,
                COUNT(a.id_artikel) AS total_artikel
            FROM users u
            LEFT JOIN artikel a ON a.author_id = u.id
            GROUP BY u.id, u.nama_users, u.email_users, u.role, u.status, u.bio, u.avatar, u.created_at
            ORDER BY u.id ASC
        ";
        $stmt = $db->query($sql);
        $authors = $stmt->fetchAll();

        sendResponse(true, 'Data penulis berhasil diambil', $authors);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal mengambil data penulis: ' . $e->getMessage(), null, 500);
    }
}

// 2. POST: Tambah Penulis Baru
function handleCreateAuthor(PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $nama = trim($input['name'] ?? $input['nama_users'] ?? '');
    $email = trim($input['email'] ?? $input['email_users'] ?? '');
    $role = trim($input['role'] ?? 'Reporter');
    $bio = trim($input['bio'] ?? '');
    $password = trim($input['password'] ?? 'BuserInfo#2026');

    if (empty($nama) || empty($email)) {
        sendResponse(false, 'Nama lengkap dan email resmi wajib diisi', null, 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, 'Format email tidak valid', null, 400);
    }

    try {
        // Cek duplikasi email
        $chk = $db->prepare("SELECT id FROM users WHERE LOWER(email_users) = LOWER(:email) LIMIT 1");
        $chk->execute([':email' => $email]);
        if ($chk->fetch()) {
            sendResponse(false, 'Email tersebut sudah terdaftar di sistem', null, 409);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare("
            INSERT INTO users (nama_users, email_users, password, role, bio, status, created_at, updated_at)
            VALUES (:nama, :email, :password, :role, :bio, 'active', NOW(), NOW())
        ");
        $stmt->execute([
            ':nama'     => $nama,
            ':email'    => $email,
            ':password' => $hash,
            ':role'     => $role,
            ':bio'      => $bio
        ]);
        $newId = (int)$db->lastInsertId();
        $newAuthor = [
            'id'            => $newId,
            'nama_users'    => $nama,
            'email_users'   => $email,
            'role'          => $role,
            'bio'           => $bio,
            'status'        => 'active',
            'created_at'    => date('Y-m-d H:i:s'),
            'total_artikel' => 0
        ];

        sendResponse(true, 'Penulis baru berhasil ditambahkan', $newAuthor, 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menambahkan penulis: ' . $e->getMessage(), null, 500);
    }
}

// 3. PUT: Perbarui Data Penulis atau Toggle Status
function handleUpdateAuthor(PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    $action = $_GET['action'] ?? $input['action'] ?? '';

    if ($id <= 0) {
        sendResponse(false, 'ID penulis tidak valid', null, 400);
    }

    try {
        // Cek keberadaan penulis
        $stmtFind = $db->prepare("SELECT id, nama_users, email_users, role, status, bio FROM users WHERE id = :id LIMIT 1");
        $stmtFind->execute([':id' => $id]);
        $author = $stmtFind->fetch();
        if (!$author) {
            sendResponse(false, 'Penulis tidak ditemukan', null, 404);
        }

        // A. Tindakan Khusus: Toggle Status (Aktif <-> Nonaktif)
        if ($action === 'toggle_status') {
            $newStatus = ($author['status'] === 'active') ? 'inactive' : 'active';
            $upd = $db->prepare("UPDATE users SET status = :status, updated_at = NOW() WHERE id = :id");
            $upd->execute([':status' => $newStatus, ':id' => $id]);

            sendResponse(true, 'Status penulis berhasil diubah', [
                'id'     => $id,
                'status' => $newStatus
            ]);
        }

        // B. Update Data Standar
        $nama = trim($input['name'] ?? $input['nama_users'] ?? $author['nama_users']);
        $email = trim($input['email'] ?? $input['email_users'] ?? $author['email_users']);
        $role = trim($input['role'] ?? $author['role']);
        $bio = trim($input['bio'] ?? $author['bio'] ?? '');
        $status = trim($input['status'] ?? $author['status'] ?? 'active');

        if (empty($nama) || empty($email)) {
            sendResponse(false, 'Nama dan email tidak boleh kosong', null, 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendResponse(false, 'Format email tidak valid', null, 400);
        }

        // Cek duplikasi email ke user lain
        $chk = $db->prepare("SELECT id FROM users WHERE LOWER(email_users) = LOWER(:email) AND id != :id LIMIT 1");
        $chk->execute([':email' => $email, ':id' => $id]);
        if ($chk->fetch()) {
            sendResponse(false, 'Email sudah digunakan oleh akun lain', null, 409);
        }

        $stmt = $db->prepare("
            UPDATE users 
            SET nama_users = :nama, 
                email_users = :email, 
                role = :role, 
                bio = :bio,
                status = :status,
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            ':nama'   => $nama,
            ':email'  => $email,
            ':role'   => $role,
            ':bio'    => $bio,
            ':status' => $status,
            ':id'     => $id
        ]);

        $stmtAuthor = $db->prepare("SELECT id, nama_users, email_users, role, bio, status, updated_at FROM users WHERE id = :id");
        $stmtAuthor->execute([':id' => $id]);
        $updated = $stmtAuthor->fetch();

        sendResponse(true, 'Data penulis berhasil diperbarui', $updated);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal memperbarui penulis: ' . $e->getMessage(), null, 500);
    }
}

// 4. DELETE: Hapus Penulis
function handleDeleteAuthor(PDO $db): void {
    requireAuth();

    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = (int)($input['id'] ?? 0);
    }

    if ($id <= 0) {
        sendResponse(false, 'ID penulis tidak valid', null, 400);
    }

    try {
        // Cek data penulis
        $stmtFind = $db->prepare("SELECT id, nama_users FROM users WHERE id = :id LIMIT 1");
        $stmtFind->execute([':id' => $id]);
        $authorToDelete = $stmtFind->fetch();

        if (!$authorToDelete) {
            sendResponse(false, 'Penulis tidak ditemukan', null, 404);
        }

        // Cek apakah penulis memiliki artikel terbit/draf
        $artCountStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE author_id = :id");
        $artCountStmt->execute([':id' => $id]);
        $artCount = (int)$artCountStmt->fetchColumn();

        if ($artCount > 0) {
            sendResponse(
                false, 
                "Penulis ini memiliki {$artCount} artikel di database. Untuk menjaga integritas data berita, penulis tidak dapat dihapus permanen. Gunakan fitur 'Nonaktifkan' untuk mencabut hak akses.",
                ['total_artikel' => $artCount],
                400
            );
        }

        $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
        $stmt->execute([':id' => $id]);

        sendResponse(true, "Akun penulis {$authorToDelete['nama_users']} berhasil dihapus permanen", $authorToDelete);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menghapus penulis: ' . $e->getMessage(), null, 500);
    }
}
