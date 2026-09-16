<?php
/**
 * REST API Endpoint: Dashboard & Statistik Editorial
 * Mengembalikan agregasi riil dari tabel artikel, kategori, dan users di MySQL
 */

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/config/database.php';

setCorsHeaders();

// Wajib Login untuk melihat metrik dan statistik dashboard
requireAuth();

$db = Database::getConnection();

try {
    // 1. HITUNGAN METRIK KARTU UTAMA
    $totalStmt = $db->query("SELECT COUNT(*) FROM artikel");
    $totalArticles = (int)$totalStmt->fetchColumn();

    $statusStmt = $db->query("SELECT status, COUNT(*) as count FROM artikel GROUP BY status");
    $statusMap = [];
    while ($row = $statusStmt->fetch()) {
        $statusMap[strtolower(trim($row['status']))] = (int)$row['count'];
    }

    $publishedCount = $statusMap['published'] ?? 0;
    $draftCount     = $statusMap['draft'] ?? 0;
    $reviewCount    = $statusMap['review'] ?? 0;
    $scheduledCount = $statusMap['scheduled'] ?? 0;

    // Artikel terbit bulan berjalan (MySQL: DATE_FORMAT)
    $monthStmt = $db->query("SELECT COUNT(*) FROM artikel WHERE status = 'published' AND published_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')");
    $thisMonthCount = (int)$monthStmt->fetchColumn();

    // Persentase terbit
    $publishedPercentage = $totalArticles > 0 ? round(($publishedCount / $totalArticles) * 100, 1) : 0;

    // Total Users / Penulis
    $userStmt = $db->query("SELECT COUNT(*) FROM users");
    $totalAuthors = (int)$userStmt->fetchColumn();

    // Komentar Menunggu Verifikasi
    $pendingCommentsStmt = $db->query("SELECT COUNT(*) FROM komentar WHERE status = 'pending'");
    $pendingCommentsCount = (int)$pendingCommentsStmt->fetchColumn();

    // 2. DISTRIBUSI KATEGORI RIIL
    $catStmt = $db->query("
        SELECT 
            k.id_kategori,
            k.name_kategori,
            k.slug,
            COUNT(a.id_artikel) AS article_count
        FROM kategori k
        LEFT JOIN artikel a ON k.id_kategori = a.kategori_id
        GROUP BY k.id_kategori, k.name_kategori, k.slug
        ORDER BY article_count DESC, k.id_kategori ASC
    ");

    $categoryColors = [
        'nasional'      => '#D71920',
        'daerah'        => '#4B5563',
        'politik'       => '#DC2626',
        'kriminal'      => '#0B0B0B',
        'ekonomi'       => '#059669',
        'pendidikan'    => '#4F46E5',
        'teknologi'     => '#2563EB',
        'olahraga'      => '#D97706',
        'internasional' => '#0D9488',
        'lifestyle'     => '#F43F5E'
    ];

    $categoriesList = [];
    while ($cat = $catStmt->fetch()) {
        $count = (int)$cat['article_count'];
        $pct = $totalArticles > 0 ? round(($count / $totalArticles) * 100, 1) : 0;
        $slug = $cat['slug'];
        $categoriesList[] = [
            'id'         => (int)$cat['id_kategori'],
            'name'       => $cat['name_kategori'],
            'slug'       => $slug,
            'count'      => $count,
            'percentage' => $pct,
            'color'      => $categoryColors[$slug] ?? '#6B7280'
        ];
    }

    // 3. STATISTIK PUBLIKASI UNTUK CHART.JS
    // A. Rentang 7 Hari Terakhir (H-6 s/d Hari Ini)
    $indoDays = [0 => 'Min', 1 => 'Sen', 2 => 'Sel', 3 => 'Rab', 4 => 'Kam', 5 => 'Jum', 6 => 'Sab'];
    $chart7d = [
        'labels'    => [],
        'published' => [],
        'drafts'    => [],
        'updated'   => []
    ];

    for ($i = 6; $i >= 0; $i--) {
        $targetDate = date('Y-m-d', strtotime("-$i days"));
        $dayNum     = (int)date('w', strtotime($targetDate));
        $chart7d['labels'][] = $indoDays[$dayNum];

        // Published
        $pStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE status = 'published' AND DATE(published_at) = :d");
        $pStmt->execute([':d' => $targetDate]);
        $chart7d['published'][] = (int)$pStmt->fetchColumn();

        // Draft
        $dStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE status = 'draft' AND DATE(COALESCE(updated_at, published_at)) = :d");
        $dStmt->execute([':d' => $targetDate]);
        $chart7d['drafts'][] = (int)$dStmt->fetchColumn();

        // Updated
        $uStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE updated_at IS NOT NULL AND DATE(updated_at) = :d AND DATE(updated_at) > DATE(published_at)");
        $uStmt->execute([':d' => $targetDate]);
        $chart7d['updated'][] = (int)$uStmt->fetchColumn();
    }

    // B. Rentang 30 Hari Terakhir (Dibagi ke 4 Minggu: Mgg 1, Mgg 2, Mgg 3, Mgg 4)
    $chart30d = [
        'labels'    => ['Mgg 1', 'Mgg 2', 'Mgg 3', 'Mgg 4'],
        'published' => [0, 0, 0, 0],
        'drafts'    => [0, 0, 0, 0],
        'updated'   => [0, 0, 0, 0]
    ];

    $weeksRanges = [
        ['start' => date('Y-m-d', strtotime('-27 days')), 'end' => date('Y-m-d', strtotime('-21 days'))],
        ['start' => date('Y-m-d', strtotime('-20 days')), 'end' => date('Y-m-d', strtotime('-14 days'))],
        ['start' => date('Y-m-d', strtotime('-13 days')), 'end' => date('Y-m-d', strtotime('-7 days'))],
        ['start' => date('Y-m-d', strtotime('-6 days')),  'end' => date('Y-m-d')]
    ];

    foreach ($weeksRanges as $idx => $w) {
        $pStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE status = 'published' AND DATE(published_at) BETWEEN :s AND :e");
        $pStmt->execute([':s' => $w['start'], ':e' => $w['end']]);
        $chart30d['published'][$idx] = (int)$pStmt->fetchColumn();

        $dStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE status = 'draft' AND DATE(COALESCE(updated_at, published_at)) BETWEEN :s AND :e");
        $dStmt->execute([':s' => $w['start'], ':e' => $w['end']]);
        $chart30d['drafts'][$idx] = (int)$dStmt->fetchColumn();

        $uStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE updated_at IS NOT NULL AND DATE(updated_at) BETWEEN :s AND :e AND DATE(updated_at) > DATE(published_at)");
        $uStmt->execute([':s' => $w['start'], ':e' => $w['end']]);
        $chart30d['updated'][$idx] = (int)$uStmt->fetchColumn();
    }

    // C. Rentang 3 Bulan Terakhir
    $indoMonths = [
        1 => 'Januari', 2 => 'Februari', 3 => 'Maret', 4 => 'April', 5 => 'Mei', 6 => 'Juni',
        7 => 'Juli', 8 => 'Agustus', 9 => 'September', 10 => 'Oktober', 11 => 'November', 12 => 'Desember'
    ];

    $chart3m = [
        'labels'    => [],
        'published' => [],
        'drafts'    => [],
        'updated'   => []
    ];

    for ($m = 2; $m >= 0; $m--) {
        $firstDayOfMonth = date('Y-m-01', strtotime("-$m month"));
        $lastDayOfMonth  = date('Y-m-t', strtotime("-$m month"));
        $monthNum        = (int)date('n', strtotime($firstDayOfMonth));
        $chart3m['labels'][] = $indoMonths[$monthNum];

        $pStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE status = 'published' AND DATE(published_at) BETWEEN :s AND :e");
        $pStmt->execute([':s' => $firstDayOfMonth, ':e' => $lastDayOfMonth]);
        $chart3m['published'][] = (int)$pStmt->fetchColumn();

        $dStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE status = 'draft' AND DATE(COALESCE(updated_at, published_at)) BETWEEN :s AND :e");
        $dStmt->execute([':s' => $firstDayOfMonth, ':e' => $lastDayOfMonth]);
        $chart3m['drafts'][] = (int)$dStmt->fetchColumn();

        $uStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE updated_at IS NOT NULL AND DATE(updated_at) BETWEEN :s AND :e AND DATE(updated_at) > DATE(published_at)");
        $uStmt->execute([':s' => $firstDayOfMonth, ':e' => $lastDayOfMonth]);
        $chart3m['updated'][] = (int)$uStmt->fetchColumn();
    }

    // D. Rentang 1 Tahun Terakhir (Berdasarkan Kuartal Q1 - Q4)
    $currentYear = date('Y');
    $chart1y = [
        'labels'    => ["Q1 $currentYear", "Q2 $currentYear", "Q3 $currentYear", "Q4 $currentYear"],
        'published' => [0, 0, 0, 0],
        'drafts'    => [0, 0, 0, 0],
        'updated'   => [0, 0, 0, 0]
    ];

    $quarters = [
        ['start' => "$currentYear-01-01", 'end' => "$currentYear-03-31"],
        ['start' => "$currentYear-04-01", 'end' => "$currentYear-06-30"],
        ['start' => "$currentYear-07-01", 'end' => "$currentYear-09-30"],
        ['start' => "$currentYear-10-01", 'end' => "$currentYear-12-31"]
    ];

    foreach ($quarters as $qIdx => $q) {
        $pStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE status = 'published' AND DATE(published_at) BETWEEN :s AND :e");
        $pStmt->execute([':s' => $q['start'], ':e' => $q['end']]);
        $chart1y['published'][$qIdx] = (int)$pStmt->fetchColumn();

        $dStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE status = 'draft' AND DATE(COALESCE(updated_at, published_at)) BETWEEN :s AND :e");
        $dStmt->execute([':s' => $q['start'], ':e' => $q['end']]);
        $chart1y['drafts'][$qIdx] = (int)$dStmt->fetchColumn();

        $uStmt = $db->prepare("SELECT COUNT(*) FROM artikel WHERE updated_at IS NOT NULL AND DATE(updated_at) BETWEEN :s AND :e AND DATE(updated_at) > DATE(published_at)");
        $uStmt->execute([':s' => $q['start'], ':e' => $q['end']]);
        $chart1y['updated'][$qIdx] = (int)$uStmt->fetchColumn();
    }

    // 4. DAFTAR 5 BERITA TERBARU (Tabel Dashboard)
    $recentStmt = $db->query("
        SELECT 
            a.id_artikel,
            a.title,
            a.slug,
            a.status,
            a.thumbnail,
            a.published_at,
            a.updated_at,
            COALESCE(k.name_kategori, 'Umum') AS name_kategori,
            COALESCE(u.nama_users, 'Redaksi') AS author_name
        FROM artikel a
        LEFT JOIN kategori k ON a.kategori_id = k.id_kategori
        LEFT JOIN users u ON a.author_id = u.id
        ORDER BY a.id_artikel DESC
        LIMIT 5
    ");
    $recentNews = $recentStmt->fetchAll();

    // Satukan semua data respons
    $dashboardData = [
        'counts' => [
            'total'                => $totalArticles,
            'published'            => $publishedCount,
            'draft'                => $draftCount,
            'review'               => $reviewCount,
            'scheduled'            => $scheduledCount,
            'this_month'           => $thisMonthCount,
            'published_percentage' => $publishedPercentage,
            'authors'              => $totalAuthors,
            'pending_comments'     => $pendingCommentsCount
        ],
        'categories'   => $categoriesList,
        'chart_stats'  => [
            '7d'  => $chart7d,
            '30d' => $chart30d,
            '3m'  => $chart3m,
            '1y'  => $chart1y
        ],
        'recent_news'  => $recentNews
    ];

    sendResponse(true, 'Data agregasi dashboard berhasil dimuat', $dashboardData);

} catch (Exception $e) {
    sendResponse(false, 'Gagal memuat data dashboard: ' . $e->getMessage(), null, 500);
}
