<?php
/**
 * REST API Endpoint: Manajemen Pengguna Sistem (Users CMS)
 * Tables: users, artikel
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($method) {
    case 'GET':
        handleGetUsers($db);
        break;
    case 'POST':
        $override = $_POST['_method'] ?? $_GET['_method'] ?? null;
        if ($override === 'PUT') {
            handleUpdateUser($db);
        } elseif ($override === 'DELETE') {
            handleDeleteUser($db);
        } else {
            handleCreateUser($db);
        }
        break;
    case 'PUT':
        handleUpdateUser($db);
        break;
    case 'DELETE':
        handleDeleteUser($db);
        break;
    default:
        sendResponse(false, 'Metode HTTP tidak didukung', null, 405);
}

// 1. GET: Ambil Daftar Pengguna Sistem
function handleGetUsers(PDO $db): void {
    requireAuth();

    try {
        if (!empty($_GET['id'])) {
            $id = (int)$_GET['id'];
            $stmt = $db->prepare("
                SELECT 
                    id, 
                    nama_users, 
                    email_users, 
                    role, 
                    COALESCE(status, 'active') AS status, 
                    last_login, 
                    created_at, 
                    updated_at
                FROM users 
                WHERE id = :id 
                LIMIT 1
            ");
            $stmt->execute([':id' => $id]);
            $user = $stmt->fetch();

            if (!$user) {
                sendResponse(false, 'Pengguna tidak ditemukan', null, 404);
            }

            sendResponse(true, 'Detail pengguna berhasil diambil', $user);
        }

        $stmt = $db->query("
            SELECT 
                id, 
                nama_users, 
                email_users, 
                role, 
                COALESCE(status, 'active') AS status, 
                last_login, 
                created_at, 
                updated_at
            FROM users 
            ORDER BY id ASC
        ");
        $users = $stmt->fetchAll();

        sendResponse(true, 'Data pengguna berhasil diambil', $users);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal mengambil data pengguna: ' . $e->getMessage(), null, 500);
    }
}

// 2. POST: Tambah Pengguna Baru
function handleCreateUser(PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $nama     = trim($input['name'] ?? $input['nama_users'] ?? '');
    $email    = trim($input['email'] ?? $input['email_users'] ?? '');
    $role     = trim($input['role'] ?? 'Reporter');
    $password = trim($input['password'] ?? '');

    if (empty($nama) || empty($email) || empty($password)) {
        sendResponse(false, 'Nama lengkap, email, dan kata sandi wajib diisi', null, 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, 'Format email tidak valid', null, 400);
    }

    if (strlen($password) < 6) {
        sendResponse(false, 'Kata sandi minimal 6 karakter', null, 400);
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
            INSERT INTO users (nama_users, email_users, password, role, status, created_at, updated_at)
            VALUES (:nama, :email, :password, :role, 'active', NOW(), NOW())
        ");
        $stmt->execute([
            ':nama'     => $nama,
            ':email'    => $email,
            ':password' => $hash,
            ':role'     => $role
        ]);
        $newId = (int)$db->lastInsertId();
        $newUser = [
            'id'          => $newId,
            'nama_users'  => $nama,
            'email_users' => $email,
            'role'        => $role,
            'status'      => 'active',
            'created_at'  => date('Y-m-d H:i:s')
        ];

        sendResponse(true, 'Pengguna baru berhasil ditambahkan', $newUser, 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menambahkan pengguna: ' . $e->getMessage(), null, 500);
    }
}

// 3. PUT: Update Pengguna / Ubah Role / Toggle Status
function handleUpdateUser(PDO $db): void {
    $currentUser = requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    $action = $_GET['action'] ?? $input['action'] ?? '';

    if ($id <= 0) {
        sendResponse(false, 'ID pengguna tidak valid', null, 400);
    }

    try {
        $stmtFind = $db->prepare("SELECT id, nama_users, email_users, role, status FROM users WHERE id = :id LIMIT 1");
        $stmtFind->execute([':id' => $id]);
        $user = $stmtFind->fetch();

        if (!$user) {
            sendResponse(false, 'Pengguna tidak ditemukan', null, 404);
        }

        // A. Tindakan Khusus: Toggle Status (Aktif <-> Nonaktif)
        if ($action === 'toggle_status') {
            // Cegah menonaktifkan akun sendiri
            if ((int)$currentUser['id'] === $id) {
                sendResponse(false, 'Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang digunakan.', null, 400);
            }

            $newStatus = ($user['status'] === 'active') ? 'inactive' : 'active';
            $upd = $db->prepare("UPDATE users SET status = :status, updated_at = NOW() WHERE id = :id");
            $upd->execute([':status' => $newStatus, ':id' => $id]);

            sendResponse(true, 'Status pengguna berhasil diperbarui', [
                'id'     => $id,
                'status' => $newStatus
            ]);
        }

        // B. Tindakan Khusus: Ubah Role Akses
        if ($action === 'change_role') {
            $newRole = trim($input['role'] ?? '');
            $validRoles = ['Administrator', 'Editor', 'Reporter'];
            if (!in_array($newRole, $validRoles, true)) {
                sendResponse(false, 'Peran (role) tidak valid. Pilihan: ' . implode(', ', $validRoles), null, 400);
            }

            $upd = $db->prepare("UPDATE users SET role = :role, updated_at = NOW() WHERE id = :id");
            $upd->execute([':role' => $newRole, ':id' => $id]);

            sendResponse(true, "Hak akses untuk {$user['nama_users']} berhasil diubah menjadi {$newRole}", [
                'id'   => $id,
                'role' => $newRole
            ]);
        }

        // C. Update Data Profil Pengguna Standar
        $nama   = trim($input['name'] ?? $input['nama_users'] ?? $user['nama_users']);
        $email  = trim($input['email'] ?? $input['email_users'] ?? $user['email_users']);
        $role   = trim($input['role'] ?? $user['role']);
        $status = trim($input['status'] ?? $user['status'] ?? 'active');
        $newPass = trim($input['password'] ?? '');

        if (empty($nama) || empty($email)) {
            sendResponse(false, 'Nama dan email tidak boleh kosong', null, 400);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendResponse(false, 'Format email tidak valid', null, 400);
        }

        // Cek duplikasi email pada akun lain
        $chk = $db->prepare("SELECT id FROM users WHERE LOWER(email_users) = LOWER(:email) AND id != :id LIMIT 1");
        $chk->execute([':email' => $email, ':id' => $id]);
        if ($chk->fetch()) {
            sendResponse(false, 'Email sudah digunakan oleh pengguna lain', null, 409);
        }

        // Siapkan query update (dengan atau tanpa password)
        if (!empty($newPass)) {
            if (strlen($newPass) < 6) {
                sendResponse(false, 'Kata sandi minimal 6 karakter', null, 400);
            }
            $hash = password_hash($newPass, PASSWORD_DEFAULT);
            $stmt = $db->prepare("
                UPDATE users 
                SET nama_users = :nama, 
                    email_users = :email, 
                    role = :role, 
                    status = :status,
                    password = :password,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $stmt->execute([
                ':nama'     => $nama,
                ':email'    => $email,
                ':role'     => $role,
                ':status'   => $status,
                ':password' => $hash,
                ':id'       => $id
            ]);
        } else {
            $stmt = $db->prepare("
                UPDATE users 
                SET nama_users = :nama, 
                    email_users = :email, 
                    role = :role, 
                    status = :status,
                    updated_at = NOW()
                WHERE id = :id
            ");
            $stmt->execute([
                ':nama'   => $nama,
                ':email'  => $email,
                ':role'   => $role,
                ':status' => $status,
                ':id'     => $id
            ]);
        }

        $stmtUser = $db->prepare("SELECT id, nama_users, email_users, role, status, updated_at FROM users WHERE id = :id");
        $stmtUser->execute([':id' => $id]);
        $updated = $stmtUser->fetch();

        sendResponse(true, 'Data pengguna berhasil diperbarui', $updated);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal memperbarui pengguna: ' . $e->getMessage(), null, 500);
    }
}

// 4. DELETE: Hapus Pengguna
function handleDeleteUser(PDO $db): void {
    $currentUser = requireAuth();

    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
        $id = (int)($input['id'] ?? 0);
    }

    if ($id <= 0) {
        sendResponse(false, 'ID pengguna tidak valid', null, 400);
    }

    // Pencegahan: Tidak boleh menghapus akun yang sedang aktif digunakan login
    if ((int)$currentUser['id'] === $id) {
        sendResponse(false, 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.', null, 400);
    }

    try {
        // Cek pengguna dan artikel terkait
        $stmtFind = $db->prepare("SELECT id, nama_users FROM users WHERE id = :id LIMIT 1");
        $stmtFind->execute([':id' => $id]);
        $userToDelete = $stmtFind->fetch();

        if (!$userToDelete) {
            sendResponse(false, 'Pengguna tidak ditemukan', null, 404);
        }

        $artCountStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE author_id = :id");
        $artCountStmt->execute([':id' => $id]);
        $artCount = (int)$artCountStmt->fetchColumn();

        if ($artCount > 0) {
            sendResponse(
                false, 
                "Pengguna ini tercatat sebagai penulis dari {$artCount} artikel. Untuk melindungi integritas arsip berita, akun tidak dapat dihapus. Anda dapat menonaktifkannya melalui opsi 'Nonaktifkan'.", 
                ['total_artikel' => $artCount], 
                400
            );
        }

        $stmt = $db->prepare("DELETE FROM users WHERE id = :id");
        $stmt->execute([':id' => $id]);

        sendResponse(true, "Pengguna {$userToDelete['nama_users']} berhasil dihapus permanen", $userToDelete);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menghapus pengguna: ' . $e->getMessage(), null, 500);
    }
}
