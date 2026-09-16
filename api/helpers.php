<?php
/**
 * Helper Functions untuk REST API & Keamanan Autentikasi
 * Japakeh Post News Portal - PT Japakeh Media Nusantara
 */

if (!defined('AUTH_SECRET_KEY')) {
    define('AUTH_SECRET_KEY', 'japakehpost_secret_key_cms_2026_auth');
}

// Konfigurasi Batas Waktu Sesi (Session Timeout)
if (!defined('SESSION_LIFETIME')) {
    define('SESSION_LIFETIME', 7200); // Batas maksimal sesi: 2 jam (7200 detik)
}
if (!defined('SESSION_IDLE_TIMEOUT')) {
    define('SESSION_IDLE_TIMEOUT', 1800); // Batas inaktivitas: 30 menit (1800 detik)
}

// Handle CORS dengan dukungan Cookies/Credentials dan Header Authorization
function setCorsHeaders(): void {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
    if ($origin !== '*') {
        header("Access-Control-Allow-Origin: $origin");
        header("Access-Control-Allow-Credentials: true");
    } else {
        header("Access-Control-Allow-Origin: *");
    }

    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Authorization, X-Token, X-Requested-With");
    
    $reqMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($reqMethod === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// Inisialisasi Session PHP secara aman dengan batas masa hidup
function startSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        if (!headers_sent()) {
            ini_set('session.cookie_httponly', '1');
            ini_set('session.use_only_cookies', '1');
            ini_set('session.cookie_samesite', 'Lax');
            ini_set('session.gc_maxlifetime', (string)SESSION_LIFETIME);
        }
        @session_start();
    }
}

// Generate Cryptographic Signed Token (Bearer Token dengan batas waktu 2 jam)
function generateToken(array $user): string {
    $now = time();
    $payload = [
        'id'          => $user['id'],
        'nama_users'  => $user['nama_users'] ?? '',
        'email_users' => $user['email_users'] ?? '',
        'role'        => $user['role'] ?? 'Reporter',
        'iat'         => $now,
        'exp'         => $now + SESSION_LIFETIME, // Batas waktu maksimal 2 jam
    ];
    $base64 = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $sig = hash_hmac('sha256', $base64, AUTH_SECRET_KEY);
    return $base64 . '.' . $sig;
}

// Verifikasi Cryptographic Signed Token
function verifyToken(string $token): ?array {
    $parts = explode('.', trim($token));
    if (count($parts) !== 2) return null;
    [$base64, $signature] = $parts;

    $expectedSig = hash_hmac('sha256', $base64, AUTH_SECRET_KEY);
    if (!hash_equals($expectedSig, $signature)) return null;

    $json = base64_decode(strtr($base64, '-_', '+/'));
    $payload = json_decode($json, true);
    if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
        return null;
    }
    return $payload;
}

// Dapatkan Data Pengguna yang Sedang Terautentikasi (Validasi Batas Waktu Sesi & Token)
function getAuthenticatedUser(): ?array {
    startSession();

    $now = time();

    // 1. Cek PHP Session dan validasi batas inaktivitas (30 menit) & total batas waktu (2 jam)
    if (!empty($_SESSION['user_id'])) {
        $lastActivity = $_SESSION['last_activity'] ?? $now;
        $sessionStart = $_SESSION['session_start'] ?? $now;

        // Jika melebihi batas inaktivitas atau total batas sesi: sesi kedaluwarsa
        if (($now - $lastActivity > SESSION_IDLE_TIMEOUT) || ($now - $sessionStart > SESSION_LIFETIME)) {
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000,
                    $params['path'], $params['domain'],
                    $params['secure'], $params['httponly']
                );
            }
            if (!empty($_COOKIE['buser_token'])) {
                setcookie('buser_token', '', [
                    'expires'  => time() - 42000,
                    'path'     => '/',
                    'samesite' => 'Lax'
                ]);
            }
            @session_destroy();
            return null;
        }

        // Perbarui timestamp aktivitas terakhir
        $_SESSION['last_activity'] = $now;

        return [
            'id'          => $_SESSION['user_id'],
            'nama_users'  => $_SESSION['nama_users'] ?? '',
            'email_users' => $_SESSION['email_users'] ?? '',
            'role'        => $_SESSION['role'] ?? 'Reporter'
        ];
    }

    // 2. Cek Berbagai Kemungkinan Header Authorization (Mengatasi Apache/FastCGI/XAMPP yang men-strip Authorization)
    $token = null;

    $headerCandidates = [
        $_SERVER['HTTP_AUTHORIZATION'] ?? '',
        $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '',
        $_SERVER['HTTP_X_AUTHORIZATION'] ?? '',
        $_SERVER['HTTP_X_TOKEN'] ?? '',
    ];

    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $k => $v) {
            $lk = strtolower($k);
            if (in_array($lk, ['authorization', 'x-authorization', 'x-token', 'http_authorization'])) {
                $headerCandidates[] = $v;
            }
        }
    }

    foreach ($headerCandidates as $rawHeader) {
        $rawHeader = trim($rawHeader);
        if (empty($rawHeader)) continue;
        if (str_starts_with($rawHeader, 'Bearer ')) {
            $token = substr($rawHeader, 7);
            break;
        } elseif (!str_contains($rawHeader, ' ') && str_contains($rawHeader, '.')) {
            $token = $rawHeader;
            break;
        }
    }

    // 3. Cek Cookie jika header ditolak/dihapus oleh server
    if (!$token && !empty($_COOKIE['buser_token'])) {
        $token = trim($_COOKIE['buser_token']);
    }

    // 4. Cek Query Param / Post data sebagai fallback
    if (!$token && !empty($_GET['token'])) {
        $token = trim($_GET['token']);
    }

    if ($token) {
        $payload = verifyToken($token);
        if ($payload) {
            // Sinkronkan ke session dengan batas waktu sesi
            $_SESSION['user_id']       = $payload['id'];
            $_SESSION['nama_users']    = $payload['nama_users'];
            $_SESSION['email_users']   = $payload['email_users'];
            $_SESSION['role']          = $payload['role'];
            $_SESSION['session_start'] = $payload['iat'] ?? $now;
            $_SESSION['last_activity'] = $now;
            return $payload;
        }
    }

    return null;
}

// Guard: Wajib Login (Menghentikan Request dengan 401 jika belum terautentikasi)
function requireAuth(): array {
    $user = getAuthenticatedUser();
    if (!$user) {
        sendResponse(false, 'Akses ditolak. Anda belum login atau sesi telah berakhir.', null, 401);
    }
    return $user;
}

// Guard: Wajib Role Tertentu (misal Admin)
function requireRole(array $allowedRoles): array {
    $user = requireAuth();
    $role = strtolower($user['role'] ?? '');
    $allowed = array_map('strtolower', $allowedRoles);
    if (!in_array($role, $allowed, true)) {
        sendResponse(false, 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.', null, 403);
    }
    return $user;
}

// JSON Response Standard
function sendResponse(bool $success, string $message, mixed $data = null, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode([
        'status'  => $success ? 'success' : 'error',
        'message' => $message,
        'data'    => $data
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// Generate URL Friendly Slug
function createSlug(string $title): string {
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title)));
    return trim($slug, '-');
}
