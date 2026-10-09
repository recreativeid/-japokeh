<?php
/**
 * REST API Endpoint: Upload Image (Thumbnail Berita & Foto Profil / Avatar Penulis/Redaksi)
 */

require_once __DIR__ . '/helpers.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendResponse(false, 'Metode HTTP tidak didukung', null, 405);
}

// Wajib Login untuk mengunggah file media
requireAuth();

// Cek apakah upload multiple foto (misal: photos[] atau gallery[])
$isMultiple = isset($_FILES['photos']['name']) && is_array($_FILES['photos']['name']);
if (!$isMultiple && isset($_FILES['gallery']['name']) && is_array($_FILES['gallery']['name'])) {
    $isMultiple = true;
    $_FILES['photos'] = $_FILES['gallery'];
}

$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
$maxSize = 8 * 1024 * 1024; // 8MB per foto
$uploadDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'berita' . DIRECTORY_SEPARATOR . 'uploads';
$folderPath = 'assets/images/berita/uploads/';

if ($isMultiple) {
    $uploadedList = [];
    $names = $_FILES['photos']['name'];
    $tmpNames = $_FILES['photos']['tmp_name'];
    $sizes = $_FILES['photos']['size'];
    $errors = $_FILES['photos']['error'];

    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    foreach ($names as $i => $origName) {
        if ($errors[$i] !== UPLOAD_ERR_OK || empty($tmpNames[$i])) {
            continue;
        }
        if ($sizes[$i] > $maxSize) {
            continue;
        }
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
        if (!in_array($ext, $allowedExtensions, true)) {
            continue;
        }
        $filename = 'buser-galeri-' . time() . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
        $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $filename;
        if (move_uploaded_file($tmpNames[$i], $targetPath)) {
            $uploadedList[] = [
                'url' => $folderPath . $filename,
                'filename' => $filename,
                'caption' => ''
            ];
        }
    }

    if (empty($uploadedList)) {
        sendResponse(false, 'Tidak ada file gambar valid yang berhasil diunggah', null, 400);
    }

    sendResponse(true, count($uploadedList) . ' foto galeri berhasil diunggah', [
        'files' => $uploadedList,
        'count' => count($uploadedList)
    ], 201);
}

// Single File Upload
$file = $_FILES['avatar'] ?? $_FILES['foto'] ?? $_FILES['thumbnail'] ?? $_FILES['file'] ?? $_FILES['photo'] ?? null;

if (!$file || !isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
    sendResponse(false, 'Tidak ada file gambar yang diunggah atau terjadi kesalahan upload', null, 400);
}

if ($file['size'] > $maxSize) {
    sendResponse(false, 'Ukuran file gambar maksimal 8MB', null, 400);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExtensions, true)) {
    sendResponse(false, 'Format gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF.', null, 400);
}

$isAvatar = isset($_FILES['avatar']) || isset($_FILES['foto']) || (isset($_POST['type']) && $_POST['type'] === 'avatar');

if ($isAvatar) {
    $targetDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'images' . DIRECTORY_SEPARATOR . 'users' . DIRECTORY_SEPARATOR . 'avatars';
    $prefix = 'avatar-';
    $targetFolder = 'assets/images/users/avatars/';
} else {
    $targetDir = $uploadDir;
    $prefix = 'buser-';
    $targetFolder = $folderPath;
}

if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

$filename = $prefix . time() . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
$targetPath = $targetDir . DIRECTORY_SEPARATOR . $filename;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    $relativePath = $targetFolder . $filename;
    sendResponse(true, $isAvatar ? 'Foto profil berhasil diunggah' : 'Gambar berhasil diunggah', [
        'url' => $relativePath,
        'filename' => $filename
    ], 201);
} else {
    sendResponse(false, 'Gagal menyimpan file gambar ke server', null, 500);
}

