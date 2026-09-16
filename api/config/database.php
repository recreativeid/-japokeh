<?php
/**
 * Konfigurasi Koneksi Database MySQL via PDO
 * Japakeh Post News Portal
 */

header('Content-Type: application/json; charset=utf-8');

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            // Konfigurasi Database Default (MySQL / MariaDB) Japakeh Post
            $host     = 'localhost';
            $port     = '3306';
            $dbname   = 'berita_japakehpost';
            $user     = 'root';
            $password = ''; // Default XAMPP/Laragon kosong

            // Jika ada file .env di backend_ci4, gunakan isinya
            $envPath = dirname(__DIR__, 2) . '/backend_ci4/.env';
            if (file_exists($envPath)) {
                $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                foreach ($lines as $line) {
                    $line = trim($line);
                    if (empty($line) || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
                    list($k, $v) = explode('=', $line, 2);
                    $k = trim($k);
                    $v = trim(trim($v), "'\"");
                    if ($k === 'database.default.hostname') $host = $v;
                    if ($k === 'database.default.port')     $port = $v;
                    if ($k === 'database.default.database') $dbname = $v;
                    if ($k === 'database.default.username') $user = $v;
                    if ($k === 'database.default.password') $password = $v;
                }
            }

            // Periksa apakah ekstensi pdo_mysql sudah aktif
            if (!extension_loaded('pdo_mysql')) {
                http_response_code(500);
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'Ekstensi PHP "pdo_mysql" belum diaktifkan di server Anda. Harap aktifkan "extension=pdo_mysql" di file php.ini lalu restart web server (Apache/Nginx/Herd/XAMPP).'
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                exit;
            }

            try {
                $dsn = "mysql:host={$host};port={$port};dbname={$dbname};charset=utf8mb4";
                self::$instance = new PDO($dsn, $user, $password, [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => true,
                    PDO::ATTR_TIMEOUT            => 1,
                ]);
            } catch (PDOException $e) {
                http_response_code(500);
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'Gagal terhubung ke database MySQL: ' . $e->getMessage()
                ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                exit;
            }
        }

        return self::$instance;
    }
}
