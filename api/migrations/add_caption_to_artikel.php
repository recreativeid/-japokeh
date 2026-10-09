<?php
/**
 * Migration: Menambahkan kolom caption (Keterangan Foto & Atribusi Sumber) pada tabel artikel
 * Japakeh Post News Portal - PT Japakeh Media Nusantara
 */

require_once __DIR__ . '/../config/database.php';

try {
    $db = Database::getConnection();

    echo "Memeriksa skema tabel 'artikel'...\n";

    // 1. Cek apakah kolom caption sudah ada
    $checkStmt = $db->query("SHOW COLUMNS FROM artikel LIKE 'caption'");
    $columnExists = (bool)$checkStmt->fetch();

    if (!$columnExists) {
        echo "Menambahkan kolom 'caption' ke tabel 'artikel'...\n";
        $db->exec("ALTER TABLE artikel ADD COLUMN caption TEXT DEFAULT NULL AFTER thumbnail");
        echo "✔ Kolom 'caption' berhasil ditambahkan ke tabel 'artikel'.\n";
    } else {
        echo "ℹ Kolom 'caption' sudah ada pada tabel 'artikel'.\n";
    }

    // 2. Berikan contoh keterangan foto konteks & atribusi pada berita yang belum memiliki caption
    echo "Memperbarui berita yang belum memiliki caption dengan keterangan foto dan atribusi sumber yang informatif...\n";
    
    $stmt = $db->query("SELECT id_artikel, title, slug, caption FROM artikel");
    $articles = $stmt->fetchAll();

    $updatedCount = 0;
    foreach ($articles as $art) {
        if (empty($art['caption'])) {
            $id = $art['id_artikel'];
            $title = $art['title'];
            $slug = $art['slug'];

            // Susun caption kontekstual berdasarkan judul berita
            if (stripos($slug, 'ikn') !== false || stripos($title, 'infrastruktur') !== false) {
                $caption = "Aktivitas pengerjaan konstruksi jaringan infrastruktur konektivitas logistik pendukung kawasan pusat pertumbuhan ekonomi baru. (Foto: Dok. Humas Proyek / Antara)";
            } elseif (stripos($slug, 'video') !== false || stripos($title, 'manggis') !== false || stripos($title, 'air gambut') !== false) {
                $caption = "Dokumentasi pengujian filter inovasi karbon aktif kulit manggis untuk penyaringan air gambut perdesaan di laboratorium kampus. (Foto: Dok. Tim Riset Sains Terapan Japakeh Post)";
            } elseif (stripos($slug, 'anggaran') !== false || stripos($title, 'anggaran') !== false || stripos($slug, 'editorial') !== false) {
                $caption = "Ilustrasi perencanaan fiskal dan tata kelola anggaran pembangunan daerah yang transparan dan akuntabel. (Foto: Dok. Redaksi Japakeh Post)";
            } else {
                $caption = "Dokumentasi liputan: " . $title . " (Foto: Dok. Japakeh Post)";
            }

            $updateStmt = $db->prepare("UPDATE artikel SET caption = :caption WHERE id_artikel = :id");
            $updateStmt->execute([
                ':caption' => $caption,
                ':id'      => $id
            ]);
            $updatedCount++;
        }
    }

    echo "✔ Selesai! {$updatedCount} artikel berhasil diperbarui dengan caption foto utama.\n";

} catch (Throwable $e) {
    echo "❌ Terjadi kesalahan: " . $e->getMessage() . "\n";
    exit(1);
}
