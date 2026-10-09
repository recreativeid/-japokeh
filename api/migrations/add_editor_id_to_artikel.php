<?php
/**
 * Migration: Menambahkan kolom editor_id (Identitas Editor / Redaktur Berita) pada tabel artikel
 * Japakeh Post News Portal - PT Japakeh Media Nusantara
 */

require_once __DIR__ . '/../config/database.php';

try {
    $db = Database::getConnection();

    echo "Memeriksa skema tabel 'artikel'...\n";

    // 1. Cek apakah kolom editor_id sudah ada
    $checkStmt = $db->query("SHOW COLUMNS FROM artikel LIKE 'editor_id'");
    $columnExists = (bool)$checkStmt->fetch();

    if (!$columnExists) {
        echo "Menambahkan kolom 'editor_id' ke tabel 'artikel'...\n";
        $db->exec("ALTER TABLE artikel ADD COLUMN editor_id INT UNSIGNED DEFAULT NULL AFTER author_id");
        
        // Tambahkan foreign key atau index
        try {
            $db->exec("ALTER TABLE artikel ADD CONSTRAINT fk_artikel_editor FOREIGN KEY (editor_id) REFERENCES users(id) ON DELETE SET NULL");
            echo "✔ Foreign key fk_artikel_editor berhasil ditambahkan.\n";
        } catch (Throwable $exFk) {
            // Jika foreign key gagal karena mode constraint, tambahkan KEY index biasa
            $db->exec("ALTER TABLE artikel ADD KEY idx_artikel_editor (editor_id)");
            echo "✔ Index idx_artikel_editor berhasil ditambahkan.\n";
        }

        echo "✔ Kolom 'editor_id' berhasil ditambahkan ke tabel 'artikel'.\n";
    } else {
        echo "ℹ Kolom 'editor_id' sudah ada pada tabel 'artikel'.\n";
    }

    // 2. Berikan default editor (Pemimpin Redaksi / user id 1) pada artikel yang belum memiliki editor_id
    echo "Memperbarui artikel lama yang belum memiliki editor_id...\n";
    
    // Pastikan user id 1 (Al Bahri) ada sebagai default editor
    $userCheck = $db->query("SELECT id FROM users ORDER BY id ASC LIMIT 1")->fetch();
    $defaultEditorId = $userCheck ? (int)$userCheck['id'] : 1;

    $updStmt = $db->prepare("UPDATE artikel SET editor_id = :editor_id WHERE editor_id IS NULL");
    $updStmt->execute([':editor_id' => $defaultEditorId]);
    $affected = $updStmt->rowCount();

    echo "✔ Selesai! {$affected} artikel berhasil diperbarui dengan editor default (ID: {$defaultEditorId}).\n";

} catch (Throwable $e) {
    echo "❌ Terjadi kesalahan: " . $e->getMessage() . "\n";
    exit(1);
}
