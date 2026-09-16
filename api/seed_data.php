<?php
/**
 * Seeder Data Awal Artikel & Video Japakeh Post
 * Memasukkan artikel berita lengkap ke database MySQL
 */

require_once __DIR__ . '/config/database.php';

try {
    $db = Database::getConnection();

    echo "=== MEMULAI SEEDING DATA JAPAKEH POST ===\n";

    // 1. Dapatkan mapping kategori
    $catRows = $db->query("SELECT id_kategori, LOWER(name_kategori) AS name, slug FROM kategori")->fetchAll(PDO::FETCH_ASSOC);
    $catMap = [];
    foreach ($catRows as $row) {
        $catMap[strtolower($row['name'])] = (int)$row['id_kategori'];
        $catMap[strtolower($row['slug'])] = (int)$row['id_kategori'];
    }

    // 2. Dapatkan author default
    $authorId = (int)$db->query("SELECT id FROM users LIMIT 1")->fetchColumn();
    if (!$authorId) $authorId = 1;

    // 3. Baca data artikel dari api/articles-seed.json
    $jsonFile = __DIR__ . '/articles-seed.json';
    if (!file_exists($jsonFile)) {
        die("File articles-seed.json tidak ditemukan!\n");
    }

    $articles = json_decode(file_get_contents($jsonFile), true);

    $stmtArt = $db->prepare("
        INSERT INTO artikel (kategori_id, author_id, title, slug, content, thumbnail, status, published_at, updated_at, views)
        VALUES (:kategori_id, :author_id, :title, :slug, :content, :thumbnail, :status, :published_at, :updated_at, :views)
        ON DUPLICATE KEY UPDATE 
            title = VALUES(title),
            content = VALUES(content),
            thumbnail = VALUES(thumbnail),
            status = VALUES(status),
            kategori_id = VALUES(kategori_id),
            published_at = VALUES(published_at),
            updated_at = NOW()
    ");

    $count = 0;
    $now = time();
    foreach ($articles as $idx => $art) {
        $catKey = strtolower(trim($art['category'] ?? $art['categorySlug'] ?? 'nasional'));
        $kategoriId = $catMap[$catKey] ?? 1;

        $viewsRaw = str_replace(['.', ','], '', $art['views'] ?? '1000');
        $views = is_numeric($viewsRaw) ? (int)$viewsRaw : rand(500, 15000);

        // Beri jeda waktu mundur per artikel agar urutan published_at bervariasi
        $publishedAt = date('Y-m-d H:i:s', $now - ($idx * 3600));

        $stmtArt->execute([
            ':kategori_id'  => $kategoriId,
            ':author_id'    => $authorId,
            ':title'        => $art['title'],
            ':slug'         => $art['slug'],
            ':content'      => $art['content'],
            ':thumbnail'    => $art['image'] ?? 'assets/images/berita/nasional/pembangunan-ikn-nusantara.jpg',
            ':status'       => 'published',
            ':published_at' => $publishedAt,
            ':updated_at'   => date('Y-m-d H:i:s'),
            ':views'        => $views
        ]);
        $count++;
    }
    echo "✔ Berhasil memasukkan {$count} artikel ke PostgreSQL.\n";

    // 4. Seed Video jika kosong
    $videoCount = (int)$db->query("SELECT count(*) FROM video")->fetchColumn();
    if ($videoCount === 0) {
        $stmtVid = $db->prepare("
            INSERT INTO video (title, youtube_url, youtube_id, caption, is_active, created_at, updated_at)
            VALUES (:title, :youtube_url, :youtube_id, :caption, :is_active, NOW(), NOW())
        ");

        $sampleVideos = [
            [
                'title' => 'Liputan Khusus: Mengawal Ketahanan Pangan dan Geopolitik Regional',
                'youtube_url' => 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
                'youtube_id' => 'ScMzIvxBSi4',
                'caption' => 'Liputan jurnalistik mendalam tim Japakeh Post menyoroti perkembangan stabilitas logistik maritim dan kebijakan pangan di kawasan perbatasan nusantara.',
                'is_active' => true
            ],
            [
                'title' => 'Presisi Polri: Detik-detik Penggerebekan Markas Sindikat Cyber Crime',
                'youtube_url' => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                'youtube_id' => 'dQw4w9WgXcQ',
                'caption' => 'Dokumentasi eksklusif operasi penindakan aparat kepolisian membongkar jaringan penipuan daring lintas daerah dengan total aset miliaran rupiah.',
                'is_active' => true
            ]
        ];

        foreach ($sampleVideos as $v) {
            $stmtVid->execute([
                ':title'       => $v['title'],
                ':youtube_url' => $v['youtube_url'],
                ':youtube_id'  => $v['youtube_id'],
                ':caption'     => $v['caption'],
                ':is_active'   => $v['is_active'] ? 1 : 0
            ]);
        }
        echo "✔ Berhasil memasukkan " . count($sampleVideos) . " video liputan ke MySQL.\n";
    }

    echo "=== SEEDING SELESAI DENGAN SUKSES ===\n";

} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
