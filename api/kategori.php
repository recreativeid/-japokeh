<?php
/**
 * REST API Endpoint: Kategori Rubrikasi Berita
 * Tables: kategori, artikel
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

$db = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($method) {
    case 'GET':
        handleGetCategories($db);
        break;
    case 'POST':
        $override = $_POST['_method'] ?? $_GET['_method'] ?? null;
        if ($override === 'PUT') {
            handleUpdateCategory($db);
        } elseif ($override === 'DELETE') {
            handleDeleteCategory($db);
        } else {
            handleCreateCategory($db);
        }
        break;
    case 'PUT':
        handleUpdateCategory($db);
        break;
    case 'DELETE':
        handleDeleteCategory($db);
        break;
    default:
        sendResponse(false, 'Metode HTTP tidak didukung', null, 405);
}

function handleGetCategories(PDO $db): void {
    try {
        // Ambil daftar kategori beserta jumlah artikelnya
        $sql = "
            SELECT 
                k.id_kategori,
                k.name_kategori,
                k.slug,
                k.deskripsi,
                COUNT(a.id_artikel) AS total_artikel
            FROM kategori k
            LEFT JOIN artikel a ON k.id_kategori = a.kategori_id
            GROUP BY k.id_kategori, k.name_kategori, k.slug, k.deskripsi
            ORDER BY k.id_kategori ASC
        ";
        $stmt = $db->query($sql);
        $categories = $stmt->fetchAll();

        sendResponse(true, 'Data kategori berhasil diambil', $categories);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal mengambil kategori: ' . $e->getMessage(), null, 500);
    }
}

function handleCreateCategory(PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $nama = trim($input['name_kategori'] ?? '');
    $deskripsi = trim($input['deskripsi'] ?? '');

    if (empty($nama)) {
        sendResponse(false, 'Nama kategori wajib diisi', null, 400);
    }

    $slug = createSlug($nama);

    try {
        $stmt = $db->prepare("
            INSERT INTO kategori (name_kategori, slug, deskripsi)
            VALUES (:name, :slug, :deskripsi)
        ");
        $stmt->execute([
            ':name'      => $nama,
            ':slug'      => $slug,
            ':deskripsi' => $deskripsi
        ]);
        $newId = (int)$db->lastInsertId();
        $newCat = [
            'id_kategori'   => $newId,
            'name_kategori' => $nama,
            'slug'          => $slug,
            'deskripsi'     => $deskripsi
        ];

        sendResponse(true, 'Kategori baru berhasil ditambahkan', $newCat, 201);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menambahkan kategori: ' . $e->getMessage(), null, 500);
    }
}

function handleUpdateCategory(PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id = intval($input['id_kategori'] ?? $_GET['id'] ?? 0);
    $nama = trim($input['name_kategori'] ?? '');
    $slug = trim($input['slug'] ?? '');
    $deskripsi = trim($input['deskripsi'] ?? '');

    if ($id <= 0) {
        sendResponse(false, 'ID kategori tidak valid', null, 400);
    }
    if (empty($nama)) {
        sendResponse(false, 'Nama kategori wajib diisi', null, 400);
    }
    if (empty($slug)) {
        $slug = createSlug($nama);
    }

    try {
        $stmt = $db->prepare("
            UPDATE kategori
            SET name_kategori = :name, slug = :slug, deskripsi = :deskripsi
            WHERE id_kategori = :id
        ");
        $stmt->execute([
            ':name'      => $nama,
            ':slug'      => $slug,
            ':deskripsi' => $deskripsi,
            ':id'        => $id
        ]);
        
        $updated = [
            'id_kategori'   => $id,
            'name_kategori' => $nama,
            'slug'          => $slug,
            'deskripsi'     => $deskripsi
        ];
        sendResponse(true, 'Kategori berhasil diperbarui', $updated);
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal memperbarui kategori: ' . $e->getMessage(), null, 500);
    }
}

function handleDeleteCategory(PDO $db): void {
    requireAuth();

    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    $id = intval($input['id_kategori'] ?? $_GET['id'] ?? 0);

    if ($id <= 0) {
        sendResponse(false, 'ID kategori tidak valid', null, 400);
    }

    try {
        // Alihkan artikel ke kategori default (id 1) jika kategori yang dihapus bukan id 1
        if ($id !== 1) {
            $db->prepare("UPDATE artikel SET kategori_id = 1 WHERE kategori_id = :id")->execute([':id' => $id]);
        }

        $stmt = $db->prepare("DELETE FROM kategori WHERE id_kategori = :id");
        $stmt->execute([':id' => $id]);

        if ($stmt->rowCount() === 0) {
            sendResponse(false, 'Kategori tidak ditemukan', null, 404);
        }
        sendResponse(true, 'Kategori berhasil dihapus');
    } catch (PDOException $e) {
        sendResponse(false, 'Gagal menghapus kategori: ' . $e->getMessage(), null, 500);
    }
}
