<?php
/**
 * Migration: Create Table artikel_galeri
 * Menyimpan relasi multi-foto galeri/slider dalam setiap artikel berita
 * PT Japakeh Media Nusantara
 */

require_once dirname(__DIR__) . '/config/database.php';

try {
    $db = Database::getConnection();

    echo "Menjalankan migrasi tabel artikel_galeri...\n";

    $sql = "
    CREATE TABLE IF NOT EXISTS `artikel_galeri` (
      `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
      `id_artikel` INT UNSIGNED NOT NULL,
      `foto` VARCHAR(255) NOT NULL,
      `caption` TEXT DEFAULT NULL,
      `urutan` INT UNSIGNED NOT NULL DEFAULT 0,
      `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (`id`),
      KEY `idx_artikel_galeri_artikel` (`id_artikel`),
      KEY `idx_artikel_galeri_urutan` (`id_artikel`, `urutan`),
      CONSTRAINT `fk_artikel_galeri_artikel` FOREIGN KEY (`id_artikel`) 
          REFERENCES `artikel` (`id_artikel`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $db->exec($sql);
    echo "✔ Tabel artikel_galeri berhasil dibuat / diverifikasi.\n";

} catch (Throwable $e) {
    echo "✖ Terjadi kesalahan: " . $e->getMessage() . "\n";
    exit(1);
}
