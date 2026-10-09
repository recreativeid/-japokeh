<?php
/**
 * REST API Endpoint: Link Preview / Unfurl untuk Link Card
 * GET /api/link-preview.php?url={url}
 *
 * Mengambil metadata Open Graph server-side dengan SSRF guard,
 * cache file 24 jam, dan fallback aman agar editor sederhana.
 *
 * Kontrak (PRD FR-07):
 *  sukses   -> { status: "success", data: {...} }
 *  fallback -> { status: "fallback", message, data: {...} } (HTTP 200)
 *  invalid  -> { status: "error", message } (HTTP 400)
 */

require_once __DIR__ . '/helpers.php';

setCorsHeaders();

header('Cache-Control: public, max-age=86400');
header('Content-Type: application/json; charset=utf-8');

define('JP_LINK_CACHE_DIR', __DIR__ . '/cache/link-preview');
define('JP_LINK_CACHE_TTL', 86400); // 24 jam
define('JP_LINK_FETCH_TIMEOUT', 5);
define('JP_LINK_MAX_BODY', 1048576); // 1 MB
define('JP_LINK_MAX_REDIRECTS', 3);
define('JP_LINK_RATE_LIMIT', 30);
define('JP_LINK_RATE_WINDOW', 60);

if (!is_dir(JP_LINK_CACHE_DIR)) {
    @mkdir(JP_LINK_CACHE_DIR, 0755, true);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jpLinkFail(int $code, string $message): void {
    http_response_code($code);
    echo json_encode([
        'status'  => 'error',
        'message' => $message,
        'data'    => null,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jpLinkFallback(string $canonical, string $domain, string $message = 'Metadata tidak ditemukan, gunakan link teks.'): void {
    http_response_code(200);
    echo json_encode([
        'status'  => 'fallback',
        'message' => $message,
        'data'    => [
            'url_canonical' => $canonical,
            'domain'        => $domain,
            'title'         => $domain,
            'description'   => '',
            'image'         => '',
            'favicon'       => '',
        ],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jpLinkSuccess(array $data): void {
    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'data'   => $data,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function jpClientIp(): string {
    $candidates = [
        $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '',
        $_SERVER['HTTP_CLIENT_IP'] ?? '',
        $_SERVER['REMOTE_ADDR'] ?? 'unknown',
    ];
    $first = trim($candidates[0]);
    if (strpos($first, ',') !== false) {
        $first = trim(explode(',', $first)[0]);
    }
    return $first !== '' ? $first : trim($candidates[2]);
}

function jpRateLimitCheck(string $ip): void {
    $key = 'rl_' . md5($ip) . '.json';
    $file = JP_LINK_CACHE_DIR . '/' . $key;
    $now = time();
    $hits = [];
    if (file_exists($file)) {
        $raw = @file_get_contents($file);
        $decoded = json_decode((string)$raw, true);
        if (is_array($decoded)) {
            $hits = array_filter($decoded, static function ($t) use ($now) {
                return is_numeric($t) && ($now - (int)$t) < JP_LINK_RATE_WINDOW;
            });
            $hits = array_values($hits);
        }
    }
    if (count($hits) >= JP_LINK_RATE_LIMIT) {
        jpLinkFail(429, 'Terlalu banyak permintaan. Coba lagi dalam satu menit.');
    }
    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
}

function jpIsBlockedHost(string $host): bool {
    $h = strtolower(trim($host));
    if ($h === '') return true;
    // nama langsung
    if (in_array($h, ['localhost'], true)) return true;
    if ($h === '169.254.169.254') return true;
    // suffix berbahaya
    foreach (['.internal', '.local'] as $suffix) {
        if (substr($h, -strlen($suffix)) === $suffix) return true;
    }
    // hindari userinfo lolos via parse_url (sudah dipisah), tapi cegah karakter aneh
    if (preg_match('/[\s<>"\'\\\\]/', $h)) return true;
    return false;
}

function jpIpIsPrivate(string $ip): bool {
    $ip = trim($ip);
    if ($ip === '') return true;
    // IPv6 loopback / link-local / unique-local sederhana
    $lower = strtolower($ip);
    if ($lower === '::1') return true;
    if (strpos($lower, 'fe80:') === 0) return true;
    if (strpos($lower, 'fc') === 0 || strpos($lower, 'fd') === 0) return true;
    if (strpos($ip, ':') !== false) {
        // blokir semua IPv6 non-publik di v1 kecuali global unicast biasa —
        // pendekatan konservatif: tolak jika bukan global unicast 2000::/3
        $packed = @inet_pton($ip);
        if ($packed === false) return true;
        $firstByte = ord($packed[0]);
        // 2000::/3 => 0x20-0x3F
        if ($firstByte < 0x20 || $firstByte > 0x3F) return true;
        return false;
    }
    $long = ip2long($ip);
    if ($long === false) return true;
    $ranges = [
        ['127.0.0.0', '255.0.0.0'],       // loopback
        ['10.0.0.0', '255.0.0.0'],        // private A
        ['172.16.0.0', '255.240.0.0'],    // private B
        ['192.168.0.0', '255.255.0.0'],   // private C
        ['169.254.0.0', '255.255.0.0'],   // link-local (incl. metadata)
        ['0.0.0.0', '255.0.0.0'],         // current network
    ];
    foreach ($ranges as [$net, $mask]) {
        if (($long & ip2long($mask)) === (ip2long($net) & ip2long($mask))) {
            return true;
        }
    }
    return false;
}

/**
 * Resolve DNS lalu cek semua IP hasil resolve. Return false jika berbahaya.
 */
function jpHostResolvesToPublic(string $host): bool {
    if (jpIsBlockedHost($host)) return false;
    // Jika host sudah berupa IP literal, cek langsung
    if (filter_var($host, FILTER_VALIDATE_IP)) {
        return !jpIpIsPrivate($host);
    }
    $ips = [];
    // A records via gethostbyname (IPv4 cepat)
    $v4 = @gethostbyname($host);
    if ($v4 && $v4 !== $host && filter_var($v4, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
        $ips[] = $v4;
    }
    // Semua A/AAAA via dns_get_record
    if (function_exists('dns_get_record')) {
        $records = @dns_get_record($host, DNS_A + DNS_AAAA);
        if (is_array($records)) {
            foreach ($records as $r) {
                if (!empty($r['ip'])) $ips[] = $r['ip'];
                if (!empty($r['ipv6'])) $ips[] = $r['ipv6'];
            }
        }
    }
    if (empty($ips)) {
        // Tidak bisa resolve -> anggap gagal fetch (bukan hard-block),
        // kembalikan true agar fetch mencoba dan berakhir fallback.
        // Namun untuk nama yang jelas internal, sudah diblok di atas.
        return true;
    }
    foreach ($ips as $ip) {
        if (jpIpIsPrivate($ip)) {
            return false;
        }
    }
    return true;
}

function jpValidateUrl(string $raw): array {
    $raw = trim($raw);
    if ($raw === '') {
        jpLinkFail(400, 'Parameter url wajib diisi.');
    }
    if (strlen($raw) > 2048) {
        jpLinkFail(400, 'URL terlalu panjang.');
    }
    $parts = @parse_url($raw);
    if (!$parts || empty($parts['scheme']) || empty($parts['host'])) {
        jpLinkFail(400, 'URL tidak valid. Gunakan format http(s)://...');
    }
    $scheme = strtolower($parts['scheme']);
    if (!in_array($scheme, ['http', 'https'], true)) {
        jpLinkFail(400, 'Skema URL tidak diizinkan. Hanya http dan https.');
    }
    $host = strtolower($parts['host']);
    if (jpIsBlockedHost($host)) {
        jpLinkFail(400, 'Host URL diblokir demi keamanan server.');
    }
    if (!jpHostResolvesToPublic($host)) {
        jpLinkFail(400, 'Host URL mengarah ke jaringan internal dan diblokir.');
    }
    return [$raw, $host];
}

function jpResolveRelative(string $base, string $ref): string {
    $ref = trim(html_entity_decode($ref, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    if ($ref === '') return '';
    $lower = strtolower($ref);
    if (strpos($lower, 'data:') === 0 || strpos($lower, 'blob:') === 0 || strpos($lower, 'javascript:') === 0) {
        return '';
    }
    // Protokol-relatif //example.com/x
    if (strpos($ref, '//') === 0) {
        $scheme = strtolower(@parse_url($base, PHP_URL_SCHEME) ?: 'https');
        return $scheme . ':' . $ref;
    }
    if (preg_match('#^https?://#i', $ref)) {
        return $ref;
    }
    // Path absolut / absolut-relatif
    $b = @parse_url($base);
    if (!$b || empty($b['scheme']) || empty($b['host'])) return '';
    $scheme = $b['scheme'] . '://' . $b['host'];
    if (!empty($b['port'])) $scheme .= ':' . $b['port'];
    if ($ref[0] === '/') {
        return $scheme . $ref;
    }
    $basePath = $b['path'] ?? '/';
    $dir = substr($basePath, 0, strrpos($basePath, '/') + 1);
    return $scheme . $dir . $ref;
}

function jpTruncate(string $s, int $max): string {
    $s = trim(preg_replace('/\s+/', ' ', $s));
    if (mb_strlen($s) > $max) {
        $s = mb_substr($s, 0, $max - 3) . '...';
    }
    return $s;
}

// ---------------------------------------------------------------------------
// 1. Input & rate-limit
// ---------------------------------------------------------------------------

$rawUrl = $_GET['url'] ?? '';
jpRateLimitCheck(jpClientIp());
[$inputUrl, $inputHost] = jpValidateUrl((string)$rawUrl);

// Kanonis: trim fragment, pertahankan query
$canonParts = @parse_url($inputUrl);
$canonical = $inputUrl;
if ($canonParts) {
    unset($canonParts['fragment']);
    $canonical = (strtolower($canonParts['scheme']) . '://' . strtolower($canonParts['host']))
        . (!empty($canonParts['port']) ? ':' . $canonParts['port'] : '')
        . ($canonParts['path'] ?? '')
        . (!empty($canonParts['query']) ? '?' . $canonParts['query'] : '');
}

$domain = strtolower(@parse_url($canonical, PHP_URL_HOST) ?: $inputHost);

// ---------------------------------------------------------------------------
// 2. Cache 24 jam (key sha1 canonical)
// ---------------------------------------------------------------------------

$cacheKey = sha1($canonical);
$cacheFile = JP_LINK_CACHE_DIR . '/link_' . $cacheKey . '.json';
if (file_exists($cacheFile)) {
    $cached = json_decode((string)@file_get_contents($cacheFile), true);
    if (is_array($cached) && !empty($cached['data']) && !empty($cached['cached_at'])) {
        if ((time() - (int)$cached['cached_at']) < JP_LINK_CACHE_TTL) {
            $cached['data']['fetched_at'] = date('c', (int)$cached['cached_at']);
            if (!empty($cached['is_fallback'])) {
                http_response_code(200);
                echo json_encode([
                    'status'  => 'fallback',
                    'message' => $cached['message'] ?? 'Metadata tidak ditemukan, gunakan link teks.',
                    'data'    => $cached['data'],
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                exit;
            }
            jpLinkSuccess($cached['data']);
        }
    }
}

function jpStoreCache(string $file, array $data, bool $isFallback, string $message = ''): void {
    @file_put_contents($file, json_encode([
        'cached_at'   => time(),
        'is_fallback' => $isFallback,
        'message'     => $message,
        'data'        => $data,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
}

// ---------------------------------------------------------------------------
// 3. Fetch server-side (curl, timeout 5s, redirect max 3, body max 1MB)
// ---------------------------------------------------------------------------

$fetchUrl = $canonical;
$html = false;
$effectiveUrl = $canonical;
$httpCode = 0;
$fetchError = '';

if (function_exists('curl_init')) {
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $fetchUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS      => JP_LINK_MAX_REDIRECTS,
        CURLOPT_CONNECTTIMEOUT => JP_LINK_FETCH_TIMEOUT,
        CURLOPT_TIMEOUT        => JP_LINK_FETCH_TIMEOUT,
        CURLOPT_USERAGENT      => 'JapakehPost-LinkPreview/1.0 (+https://japakehpost.com)',
        CURLOPT_ENCODING       => '',
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_HTTPHEADER     => ['Accept: text/html,application/xhtml+xml'],
    ]);
    $html = @curl_exec($ch);
    $fetchError = $ch ? (string)@curl_error($ch) : 'curl init gagal';
    $httpCode = (int)@curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $effectiveUrl = (string)@curl_getinfo($ch, CURLINFO_EFFECTIVE_URL) ?: $canonical;
    @curl_close($ch);
    if (is_string($html) && strlen($html) > JP_LINK_MAX_BODY) {
        $html = substr($html, 0, JP_LINK_MAX_BODY);
    }
} else {
    $ctx = stream_context_create([
        'http' => [
            'method'         => 'GET',
            'timeout'        => JP_LINK_FETCH_TIMEOUT,
            'max_redirects'  => JP_LINK_MAX_REDIRECTS,
            'header'         => "User-Agent: JapakehPost-LinkPreview/1.0\r\nAccept: text/html\r\n",
        ],
        'ssl' => ['verify_peer' => true, 'verify_peer_name' => true],
    ]);
    $html = @file_get_contents($fetchUrl, false, $ctx, 0, JP_LINK_MAX_BODY);
    if ($html === false) {
        $fetchError = 'fetch gagal';
    } else {
        foreach (($http_response_header ?? []) as $h) {
            if (preg_match('#^HTTP/\S+\s+(\d+)#i', $h, $m)) {
                $httpCode = (int)$m[1];
            }
        }
    }
}

// Validasi URL efektif pasca-redirect (SSRF ulang)
if ($effectiveUrl && $effectiveUrl !== $canonical) {
    $effParts = @parse_url($effectiveUrl);
    $effScheme = strtolower($effParts['scheme'] ?? '');
    $effHost = strtolower($effParts['host'] ?? '');
    if (!in_array($effScheme, ['http', 'https'], true) || jpIsBlockedHost($effHost) || !jpHostResolvesToPublic($effHost)) {
        error_log('[link-preview] redirect terblokir: ' . $effectiveUrl);
        $fallbackData = [
            'url_canonical' => $canonical,
            'domain'        => $domain,
            'title'         => $domain,
            'description'   => '',
            'image'         => '',
            'favicon'       => '',
            'fetched_at'    => date('c'),
        ];
        jpStoreCache($cacheFile, $fallbackData, true);
        jpLinkFallback($canonical, $domain, 'Tautan dialihkan ke host internal dan diblokir.');
    }
    $canonical = strtok($effectiveUrl, '#');
    $domain = strtolower(@parse_url($canonical, PHP_URL_HOST) ?: $domain);
}

if ($html === false || $httpCode >= 400 || !is_string($html) || trim($html) === '') {
    error_log('[link-preview] fetch gagal url=' . $canonical . ' code=' . $httpCode . ' err=' . substr($fetchError, 0, 200));
    $fallbackData = [
        'url_canonical' => $canonical,
        'domain'        => $domain,
        'title'         => $domain,
        'description'   => '',
        'image'         => '',
        'favicon'       => '',
        'fetched_at'    => date('c'),
    ];
    jpStoreCache($cacheFile, $fallbackData, true);
    jpLinkFallback($canonical, $domain);
}

// Tolak content-type non-HTML (PDF/gambar/dokumen -> fallback)
$contentType = '';
if (preg_match('/<html|<!doctype|<head|<title/iu', substr($html, 0, 8192)) !== 1) {
    // Tetap coba parse; jika benar-benar biner, fallback.
    if (strpos(substr($html, 0, 4), '%PDF') === 0 || strpos($html, "\x89PNG") === 0 || strpos($html, "\xFF\xD8\xFF") === 0) {
        $fallbackData = [
            'url_canonical' => $canonical,
            'domain'        => $domain,
            'title'         => $domain,
            'description'   => '',
            'image'         => '',
            'favicon'       => '',
            'fetched_at'    => date('c'),
        ];
        jpStoreCache($cacheFile, $fallbackData, true);
        jpLinkFallback($canonical, $domain);
    }
}

// ---------------------------------------------------------------------------
// 4. Parse OG
// ---------------------------------------------------------------------------

$title = '';
$description = '';
$image = '';
$siteName = '';
$favicon = '';

libxml_use_internal_errors(true);
$doc = new DOMDocument();
$loaded = $doc->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR | LIBXML_NONET);
if ($loaded) {
    $xp = new DOMXPath($doc);
    $metaContent = static function (DOMXPath $xp, string $query) {
        $nodes = $xp->query($query);
        if ($nodes && $nodes->length > 0) {
            return trim($nodes->item(0)->getAttribute('content'));
        }
        return '';
    };

    $ogTitle = $metaContent($xp, '//meta[@property="og:title"]');
    $ogDesc = $metaContent($xp, '//meta[@property="og:description"]');
    $ogImage = $metaContent($xp, '//meta[@property="og:image"]');
    $ogSite = $metaContent($xp, '//meta[@property="og:site_name"]');
    $metaDesc = $metaContent($xp, '//meta[@name="description"]');
    $twTitle = $metaContent($xp, '//meta[@name="twitter:title"]');
    $twDesc = $metaContent($xp, '//meta[@name="twitter:description"]');
    $twImage = $metaContent($xp, '//meta[@name="twitter:image"]');

    $titleNodes = $doc->getElementsByTagName('title');
    $htmlTitle = ($titleNodes && $titleNodes->length > 0) ? trim($titleNodes->item(0)->textContent) : '';

    $title = $ogTitle !== '' ? $ogTitle : ($twTitle !== '' ? $twTitle : $htmlTitle);
    $description = $ogDesc !== '' ? $ogDesc : ($twDesc !== '' ? $twDesc : $metaDesc);
    $image = $ogImage !== '' ? $ogImage : $twImage;
    $siteName = $ogSite;

    // Favicon: link[rel~=icon] prioritas terbesar, fallback /favicon.ico
    $favNodes = $xp->query('//link[contains(translate(@rel, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "icon")]');
    if ($favNodes && $favNodes->length > 0) {
        // pilih apple-touch-icon terakhir / terbesar sederhana: ambil yang ada sizes terbesar
        $best = '';
        $bestSize = -1;
        foreach ($favNodes as $link) {
            /** @var DOMElement $link */
            $href = trim($link->getAttribute('href'));
            if ($href === '') continue;
            $sizes = trim($link->getAttribute('sizes'));
            $score = 0;
            if (preg_match('/(\d+)\s*x\s*(\d+)/i', $sizes, $m)) {
                $score = (int)$m[1] * (int)$m[2];
            }
            if ($score >= $bestSize) {
                $bestSize = $score;
                $best = $href;
            }
        }
        $favicon = $best;
    }
}
libxml_clear_errors();

$title = jpTruncate(html_entity_decode($title, ENT_QUOTES | ENT_HTML5, 'UTF-8'), 160);
$description = jpTruncate(html_entity_decode($description, ENT_QUOTES | ENT_HTML5, 'UTF-8'), 160);

if ($image !== '') {
    $image = jpResolveRelative($canonical, $image);
    // validasi image absolut http(s) saja
    $ip = @parse_url($image);
    if (!$ip || empty($ip['scheme']) || !in_array(strtolower($ip['scheme']), ['http', 'https'], true) || empty($ip['host'])) {
        $image = '';
    }
    if (strlen($image) > 2000) {
        $image = '';
    }
}
if ($favicon !== '') {
    $favicon = jpResolveRelative($canonical, $favicon);
    $fp = @parse_url($favicon);
    if (!$fp || empty($fp['scheme']) || !in_array(strtolower($fp['scheme']), ['http', 'https'], true) || empty($fp['host'])) {
        $favicon = '';
    }
    if (strlen($favicon) > 2000) {
        $favicon = '';
    }
}
if ($favicon === '') {
    $favicon = 'https://' . $domain . '/favicon.ico';
}

if ($title === '' && $description === '' && $image === '') {
    error_log('[link-preview] tanpa OG url=' . $canonical);
    $fallbackData = [
        'url_canonical' => $canonical,
        'domain'        => $domain,
        'title'         => $siteName !== '' ? $siteName : $domain,
        'description'   => '',
        'image'         => '',
        'favicon'       => '',
        'fetched_at'    => date('c'),
    ];
    jpStoreCache($cacheFile, $fallbackData, true);
    jpLinkFallback($canonical, $domain);
}

if ($title === '') {
    $title = $siteName !== '' ? $siteName : $domain;
}

$data = [
    'url_canonical' => $canonical,
    'domain'        => $domain,
    'title'         => $title,
    'description'   => $description,
    'image'         => $image,
    'favicon'       => $favicon,
    'fetched_at'    => date('c'),
];

jpStoreCache($cacheFile, $data, false);
jpLinkSuccess($data);
