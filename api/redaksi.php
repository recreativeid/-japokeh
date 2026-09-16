<?php
/**
 * REST API Endpoint: Manajemen Profil & Susunan Redaksi
 * Table: profil_redaksi
 * Japakeh Post News Portal
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

$db = Database::getConnection();

// Pastikan tabel profil_redaksi siap
ensureProfilRedaksiTable($db);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($method) {
    case 'GET':
        handleGetRedaksi($db);
        break;
    case 'POST':
        $override = $_POST['_method'] ?? $_GET['_method'] ?? null;
        if ($override === 'PUT') {
            handleUpdateRedaksi($db);
        } elseif ($override === 'DELETE') {
            handleDeleteRedaksi($db);
        } else {
            handleCreateRedaksi($db);
        }
        break;
    case 'PUT':
        handleUpdateRedaksi($db);
        break;
    case 'DELETE':
        handleDeleteRedaksi($db);
        break;
    default:
        sendResponse(false, 'Metode HTTP tidak didukung', null, 405);
}

/**
 * Pastikan tabel profil_redaksi otomatis terbuat jika belum ada
 */
function ensureProfilRedaksiTable(PDO $db): void {
    try {
        $db->exec("
            CREATE TABLE IF NOT EXISTS profil_redaksi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama VARCHAR(150) NOT NULL,
                jabatan VARCHAR(150) NOT NULL,
                kategori VARCHAR(100) DEFAULT 'Redaksi',
                keterangan VARCHAR(255),
                email VARCHAR(150),
                telepon VARCHAR(50),
                foto VARCHAR(255),
                urutan INT DEFAULT 0,
                status VARCHAR(20) DEFAULT 'active',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");
    } catch (PDOException $e) {
        // Abaikan jika sudah ada
    }
}

/**
 * Seeder data resmi bawaan redaksi (hanya dipanggil manual/eksplisit via reset_defaults)
 */
function seedDefaultRedaksi(PDO $db): void {
    $seedData = [
        ['Drs. H. Taufik Hidayat, S.H., M.H.', 'Penasihat Hukum', 'Penasihat & Pembina', 'Advokat & Konsultan Hukum Media Pers', 'hukum@japakehpost.com', '082165071114', '', 1, 'active'],
        ['Al Bahri', 'Pemimpin Umum / Direktur Utama', 'Pimpinan Perusahaan', 'PT Japakeh Media Nusantara', 'alb4hri@gmail.com', '082165071114', 'assets/images/logo/favicon.webp', 2, 'active'],
        ['Al Bahri', 'Pemimpin Redaksi / Penanggung Jawab', 'Pimpinan Redaksi', 'Uji Kompetensi Wartawan Utama', 'alb4hri@gmail.com', '082165071114', 'assets/images/logo/favicon.webp', 3, 'active'],
        ['Teuku Iskandar', 'Redaktur Pelaksana', 'Redaktur', 'Koordinator Meja Redaksi Japakeh Post', 'iskandar@japakehpost.com', '082165071114', '', 4, 'active'],
        ['Zulfikar Maulana', 'Redaktur Daerah & Investigasi', 'Redaktur', 'Koordinator Liputan Wilayah Aceh & Nusantara', 'zulfikar@japakehpost.com', '082165071114', '', 5, 'active'],
        ['Rahman Hakim, S.Sos.', 'Redaktur Politik & Hukum', 'Redaktur', 'Koresponden Kebijakan Publik & Parlemen', 'rahman.hakim@japakehpost.com', '082165071114', '', 6, 'active'],
        ['M. Rizky Ramadhan, S.E.', 'Redaktur Ekonomi & Bisnis', 'Redaktur', 'Analis Pasar Modal, Keuangan & Perbankan Syariah', 'rizky.ramadhan@japakehpost.com', '082165071114', '', 7, 'active'],
        ['Cut Mutia Sari, M.Pd.', 'Redaktur Pendidikan & Opini', 'Redaktur', 'Pemerhati Mutu Akademik & Budaya Literasi', 'mutiasari@japakehpost.com', '082165071114', '', 8, 'active'],
        ['Kevin Adityawarman', 'Teknologi & Multimedia', 'Teknologi & Multimedia', 'Infrastruktur Web, Siber, dan Siaran Digital', 'kevin.tech@japakehpost.com', '082165071114', '', 9, 'active']
    ];

    $ins = $db->prepare("
        INSERT INTO profil_redaksi (nama, jabatan, kategori, keterangan, email, telepon, foto, urutan, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    ");
    foreach ($seedData as $row) {
        $ins->execute($row);
    }
}

/**
 * 1. GET: Ambil Daftar Profil Redaksi / Detail Per Anggota
 */
function handleGetRedaksi(PDO $db): void {
    $action = $_GET['action'] ?? '';

    // Ambil daftar kategori unik yang terdaftar
    if ($action === 'categories') {
        try {
            $stmt = $db->query("SELECT DISTINCT kategori FROM profil_redaksi WHERE kategori IS NOT NULL AND TRIM(kategori) != '' ORDER BY kategori ASC");
            $cats = $stmt->fetchAll(PDO::FETCH_COLUMN);
            sendResponse(true, 'Kategori profil redaksi berhasil diambil', $cats);
        } catch (PDOException $e) {
            sendResponse(false, 'Gagal mengambil kategori: ' . $e->getMessage(), null, 500);
        }
    }

    // Ambil detail berdasarkan ID
    if (!empty($_GET['id'])) {
        $id = (int)$_GET['id'];
        try {
            $stmt = $db->prepare("SELECT * FROM profil_redaksi WHERE id = :id LIMIT 1");
            $stmt->execute([':id' => $id]);
            $item = $stmt->fetch();

            if (!$item) {
                sendResponse(false, 'Data profil redaksi tidak ditemukan', null, 404);
            }

            sendResponse(true, 'Detail profil redaksi berhasil diambil', $item);
        } catch (PDOException $e) {
            sendResponse(false, 'Gagal mengambil detail profil: ' . $e->getMessage(), null, 500);
        }
    }

    // Ambil daftar dengan filter
    try {
        $where = [];
        $params = [];

        // Filter status (misal untuk portal publik hanya active, admin bisa all)
        if (!empty($_GET['status'])) {
            $where[] = "status = :status";
            $params[':status'] = strtolower(trim($_GET['status']));
        }

        // Filter kategori
        if (!empty($_GET['kategori'])) {
            $where[] = "LOWER(kategori) = LOWER(:kategori)";
            $params[':kategori'] = trim($_GET['kategori']);
        }

        // Pencarian nama, jabatan, keterangan, email
        if (!empty($_GET['search'])) {
            $search = '%' . trim($_GET['search']) . '%';
            $where[] = "(nama LIKE :search OR jabatan LIKE :search OR keterangan LIKE :search OR email LIKE :search)";
            $params[':search'] = $search;
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
        $sql = "SELECT * FROM profil_redaksi {$whereClause} ORDER BY urutan ASC, id ASC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $list = $stmt->fetchAll();

        // Hitung statistik ringkas untuk admin dashboard
        $statsStmt = $db->query("
            SELECT 
                COUNT(*) AS total,
                COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_count,
                COUNT(CASE WHEN status != 'active' THEN 1 END) AS inactive_count,
                COUNT(DISTINCT kategori) AS category_count
            FROM profil_redaksi
        ");
        $stats = $statsStmt->fetch();

        sendResponse(true, 'Data profil redaksi berhasil diambil', [
            'profiles' => $list,
            'total'    => count($list),
            'stats'    => $stats
        ]);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal mengambil data profil redaksi: ' . $e->getMessage(), null, 500);
    }
}

/**
 * 2. POST: Tambah Anggota Profil Redaksi Baru / Upload Foto
 */
function handleCreateRedaksi(PDO $db): void {
    requireAuth();

    $action = $_GET['action'] ?? '';

    // A. Sub-aksi: Upload Foto Anggota Redaksi
    if ($action === 'upload_foto') {
        if (!isset($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK) {
            sendResponse(false, 'File foto tidak valid atau tidak diunggah', null, 400);
        }

        $file = $_FILES['foto'];
        $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (!in_array($file['type'], $allowedTypes, true)) {
            sendResponse(false, 'Format foto tidak didukung (harus JPG, PNG, WEBP, atau SVG)', null, 400);
        }

        if ($file['size'] > 3 * 1024 * 1024) {
            sendResponse(false, 'Ukuran foto maksimal 3MB', null, 400);
        }

        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $targetDir = dirname(__DIR__) . '/assets/images/redaksi';
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $filename = 'redaksi_' . time() . '_' . uniqid() . '.' . $ext;
        $targetPath = $targetDir . '/' . $filename;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $publicUrl = 'assets/images/redaksi/' . $filename;
            sendResponse(true, 'Foto berhasil diunggah', ['foto_url' => $publicUrl]);
        } else {
            sendResponse(false, 'Gagal memindahkan file foto ke direktori tujuan', null, 500);
        }
    }

    // B. Sub-aksi: Reset susunan redaksi ke data standar
    if ($action === 'reset_defaults') {
        try {
            $db->exec("TRUNCATE TABLE profil_redaksi");
            seedDefaultRedaksi($db);
            sendResponse(true, 'Susunan dewan redaksi berhasil direset ke profil standar');
        } catch (PDOException $e) {
            sendResponse(false, 'Gagal mereset data redaksi: ' . $e->getMessage(), null, 500);
        }
    }

    // C. Tambah Anggota Redaksi Baru
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

    $nama       = trim($input['nama'] ?? '');
    $jabatan    = trim($input['jabatan'] ?? '');
    $kategori   = trim($input['kategori'] ?? 'Redaksi');
    $keterangan = trim($input['keterangan'] ?? '');
    $email      = trim($input['email'] ?? '');
    $telepon    = trim($input['telepon'] ?? '');
    $foto       = trim($input['foto'] ?? '');
    $urutan     = isset($input['urutan']) && is_numeric($input['urutan']) ? (int)$input['urutan'] : null;
    $status     = trim($input['status'] ?? 'active');

    if (empty($nama) || empty($jabatan)) {
        sendResponse(false, 'Nama lengkap dan jabatan wajib diisi', null, 400);
    }

    // Jika urutan tidak diisi, otomatis urutan berikutnya
    if ($urutan === null) {
        $maxUrutan = (int)$db->query("SELECT COALESCE(MAX(urutan), 0) FROM profil_redaksi")->fetchColumn();
        $urutan = $maxUrutan + 1;
    }

    try {
        $stmt = $db->prepare("
            INSERT INTO profil_redaksi (nama, jabatan, kategori, keterangan, email, telepon, foto, urutan, status, created_at, updated_at)
            VALUES (:nama, :jabatan, :kategori, :keterangan, :email, :telepon, :foto, :urutan, :status, NOW(), NOW())
        ");
        $stmt->execute([
            ':nama'       => $nama,
            ':jabatan'    => $jabatan,
            ':kategori'   => $kategori ?: 'Redaksi',
            ':keterangan' => $keterangan,
            ':email'      => $email,
            ':telepon'    => $telepon,
            ':foto'       => $foto,
            ':urutan'     => $urutan,
            ':status'     => $status ?: 'active'
        ]);
        $newId = (int)$db->lastInsertId();

        $stmtGet = $db->prepare("SELECT * FROM profil_redaksi WHERE id = :id LIMIT 1");
        $stmtGet->execute([':id' => $newId]);
        $newRecord = $stmtGet->fetch();

        sendResponse(true, "Anggota redaksi '{$nama}' berhasil ditambahkan", $newRecord, 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menambahkan anggota redaksi: ' . $e->getMessage(), null, 500);
    }
}

/**
 * 3. PUT: Perbarui Data Profil Redaksi / Toggle Status / Reorder
 */
function handleUpdateRedaksi(PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
    $action = $_GET['action'] ?? $input['action'] ?? '';

    if ($id <= 0) {
        sendResponse(false, 'ID profil redaksi tidak valid', null, 400);
    }

    try {
        $chk = $db->prepare("SELECT * FROM profil_redaksi WHERE id = :id LIMIT 1");
        $chk->execute([':id' => $id]);
        $existing = $chk->fetch();

        if (!$existing) {
            sendResponse(false, 'Data profil redaksi tidak ditemukan', null, 404);
        }

        // A. Toggle Status Aktif / Nonaktif
        if ($action === 'toggle_status') {
            $newStatus = ($existing['status'] === 'active') ? 'inactive' : 'active';
            $upd = $db->prepare("UPDATE profil_redaksi SET status = :status, updated_at = NOW() WHERE id = :id");
            $upd->execute([':status' => $newStatus, ':id' => $id]);

            $existing['status'] = $newStatus;
            sendResponse(true, "Status {$existing['nama']} diubah menjadi " . ($newStatus === 'active' ? 'Aktif' : 'Nonaktif'), $existing);
        }

        // B. Reorder Urutan
        if ($action === 'reorder') {
            $newUrutan = (int)($input['urutan'] ?? 0);
            $upd = $db->prepare("UPDATE profil_redaksi SET urutan = :urutan, updated_at = NOW() WHERE id = :id");
            $upd->execute([':urutan' => $newUrutan, ':id' => $id]);

            $existing['urutan'] = $newUrutan;
            sendResponse(true, "Urutan posisi berhasil diperbarui", $existing);
        }

        // C. Update Penuh Data Profil
        $nama       = trim($input['nama'] ?? $existing['nama']);
        $jabatan    = trim($input['jabatan'] ?? $existing['jabatan']);
        $kategori   = trim($input['kategori'] ?? $existing['kategori']);
        $keterangan = trim($input['keterangan'] ?? $existing['keterangan']);
        $email      = trim($input['email'] ?? $existing['email']);
        $telepon    = trim($input['telepon'] ?? $existing['telepon']);
        $foto       = trim($input['foto'] ?? $existing['foto']);
        $urutan     = isset($input['urutan']) && is_numeric($input['urutan']) ? (int)$input['urutan'] : (int)$existing['urutan'];
        $status     = trim($input['status'] ?? $existing['status']);

        if (empty($nama) || empty($jabatan)) {
            sendResponse(false, 'Nama lengkap dan jabatan tidak boleh kosong', null, 400);
        }

        $stmt = $db->prepare("
            UPDATE profil_redaksi 
            SET nama = :nama,
                jabatan = :jabatan,
                kategori = :kategori,
                keterangan = :keterangan,
                email = :email,
                telepon = :telepon,
                foto = :foto,
                urutan = :urutan,
                status = :status,
                updated_at = NOW()
            WHERE id = :id
        ");
        $stmt->execute([
            ':nama'       => $nama,
            ':jabatan'    => $jabatan,
            ':kategori'   => $kategori ?: 'Redaksi',
            ':keterangan' => $keterangan,
            ':email'      => $email,
            ':telepon'    => $telepon,
            ':foto'       => $foto,
            ':urutan'     => $urutan,
            ':status'     => $status ?: 'active',
            ':id'         => $id
        ]);

        $stmtGet = $db->prepare("SELECT * FROM profil_redaksi WHERE id = :id LIMIT 1");
        $stmtGet->execute([':id' => $id]);
        $updatedRecord = $stmtGet->fetch();

        sendResponse(true, "Data anggota redaksi '{$nama}' berhasil diperbarui", $updatedRecord);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal memperbarui profil redaksi: ' . $e->getMessage(), null, 500);
    }
}

/**
 * 4. DELETE: Hapus Anggota Profil Redaksi
 */
function handleDeleteRedaksi(PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id = (int)($input['id'] ?? $_GET['id'] ?? 0);

    if ($id <= 0) {
        sendResponse(false, 'ID profil redaksi tidak valid', null, 400);
    }

    try {
        $chk = $db->prepare("SELECT nama FROM profil_redaksi WHERE id = :id LIMIT 1");
        $chk->execute([':id' => $id]);
        $item = $chk->fetch();

        if (!$item) {
            sendResponse(false, 'Data anggota redaksi tidak ditemukan', null, 404);
        }

        $stmt = $db->prepare("DELETE FROM profil_redaksi WHERE id = :id");
        $stmt->execute([':id' => $id]);

        sendResponse(true, "Anggota redaksi '{$item['nama']}' berhasil dihapus dari susunan redaksi");
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menghapus anggota redaksi: ' . $e->getMessage(), null, 500);
    }
}
