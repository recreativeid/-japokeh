<?php
/**
 * REST API Endpoint: Upload Image Thumbnail Berita
 */

require_once __DIR__ . '/helpers.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Metode HTTP tidak didukung', null, 405);
}

// Wajib Login untuk mengunggah file media
requireAuth();

if (!isset($_FILES['thumbnail']) || $_FILES['thumbnail']['error'] !== UPLOAD_ERR_OK) {
    sendResponse(false, 'Tidak ada file gambar yang diunggah atau terjadi kesalahan upload', null, 400);
}

$file = $_FILES['thumbnail'];
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
$maxSize = 5 * 1024 * 1024; // 5MB

if ($file['size'] > $maxSize) {
    sendResponse(false, 'Ukuran file gambar maksimal 5MB', null, 400);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExtensions, true)) {
    sendResponse(false, 'Format gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF.', null, 400);
}

// Target folder: assets/images/berita/uploads/
$uploadDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'berita' . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$filename = 'buser-' . time() . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
$targetPath = $uploadDir . DIRECTORY_SEPARATOR . $filename;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    $relativePath = 'assets/images/berita/uploads/' . $filename;
    sendResponse(true, 'Gambar berhasil diunggah', [
        'url' => $relativePath,
        'filename' => $filename
    ], 201);
} else {
    sendResponse(false, 'Gagal menyimpan file gambar ke server', null, 500);
}
