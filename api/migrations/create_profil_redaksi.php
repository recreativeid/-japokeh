<?php
/**
 * Migration & Seeder: Tabel profil_redaksi
 * Japakeh Post News Portal
 */

require_once __DIR__ . '/../config/database.php';

try {
    $db = Database::getConnection();

    echo "Creating table profil_redaksi if not exists...\n";

    $sql = "
    CREATE TABLE IF NOT EXISTS profil_redaksi (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nama VARCHAR(150) NOT NULL,
        jabatan VARCHAR(150) NOT NULL,
        kategori VARCHAR(100) DEFAULT 'Redaksi',
        keterangan VARCHAR(255),
        email VARCHAR(150),
        telepon VARCHAR(50),
        foto VARCHAR(255),
        urutan INT DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $db->exec($sql);
    echo "✔ Tabel profil_redaksi berhasil dibuat atau sudah ada.\n";

    // Cek apakah tabel kosong
    $count = (int)$db->query("SELECT COUNT(*) FROM profil_redaksi")->fetchColumn();
    if ($count === 0) {
        echo "Seeding data awal susunan profil redaksi...\n";

        $seedData = [
            [
                'nama'       => 'Drs. H. Taufik Hidayat, S.H., M.H.',
                'jabatan'    => 'Penasihat Hukum',
                'kategori'   => 'Penasihat & Pembina',
                'keterangan' => 'Advokat & Konsultan Hukum Media Pers',
                'email'      => 'hukum@japakehpost.com',
                'telepon'    => '082165071114',
                'foto'       => '',
                'urutan'     => 1,
                'status'     => 'active'
            ],
            [
                'nama'       => 'Al Bahri',
                'jabatan'    => 'Pemimpin Umum / Direktur Utama',
                'kategori'   => 'Pimpinan Perusahaan',
                'keterangan' => 'PT Japakeh Media Nusantara',
                'email'      => 'alb4hri@gmail.com',
                'telepon'    => '082165071114',
                'foto'       => 'assets/images/logo/favicon.webp',
                'urutan'     => 2,
                'status'     => 'active'
            ],
            [
                'nama'       => 'Al Bahri',
                'jabatan'    => 'Pemimpin Redaksi / Penanggung Jawab',
                'kategori'   => 'Pimpinan Redaksi',
                'keterangan' => 'Uji Kompetensi Wartawan Utama',
                'email'      => 'alb4hri@gmail.com',
                'telepon'    => '082165071114',
                'foto'       => 'assets/images/logo/favicon.webp',
                'urutan'     => 3,
                'status'     => 'active'
            ],
            [
                'nama'       => 'Teuku Iskandar',
                'jabatan'    => 'Redaktur Pelaksana',
                'kategori'   => 'Redaktur',
                'keterangan' => 'Koordinator Meja Redaksi Japakeh Post',
                'email'      => 'iskandar@japakehpost.com',
                'telepon'    => '082165071114',
                'foto'       => '',
                'urutan'     => 4,
                'status'     => 'active'
            ],
            [
                'nama'       => 'Zulfikar Maulana',
                'jabatan'    => 'Redaktur Daerah & Investigasi',
                'kategori'   => 'Redaktur',
                'keterangan' => 'Koordinator Liputan Wilayah Aceh & Nusantara',
                'email'      => 'zulfikar@japakehpost.com',
                'telepon'    => '082165071114',
                'foto'       => '',
                'urutan'     => 5,
                'status'     => 'active'
            ],
            [
                'nama'       => 'Rahman Hakim, S.Sos.',
                'jabatan'    => 'Redaktur Politik & Hukum',
                'kategori'   => 'Redaktur',
                'keterangan' => 'Koresponden Kebijakan Publik & Parlemen',
                'email'      => 'rahman.hakim@japakehpost.com',
                'telepon'    => '082165071114',
                'foto'       => '',
                'urutan'     => 6,
                'status'     => 'active'
            ],
            [
                'nama'       => 'M. Rizky Ramadhan, S.E.',
                'jabatan'    => 'Redaktur Ekonomi & Bisnis',
                'kategori'   => 'Redaktur',
                'keterangan' => 'Analis Pasar Modal, Keuangan & Perbankan Syariah',
                'email'      => 'rizky.ramadhan@japakehpost.com',
                'telepon'    => '082165071114',
                'foto'       => '',
                'urutan'     => 7,
                'status'     => 'active'
            ],
            [
                'nama'       => 'Cut Mutia Sari, M.Pd.',
                'jabatan'    => 'Redaktur Pendidikan & Opini',
                'kategori'   => 'Redaktur',
                'keterangan' => 'Pemerhati Mutu Akademik & Budaya Literasi',
                'email'      => 'mutiasari@japakehpost.com',
                'telepon'    => '082165071114',
                'foto'       => '',
                'urutan'     => 8,
                'status'     => 'active'
            ],
            [
                'nama'       => 'Kevin Adityawarman',
                'jabatan'    => 'Teknologi & Multimedia',
                'kategori'   => 'Teknologi & Multimedia',
                'keterangan' => 'Infrastruktur Web, Siber, dan Siaran Digital',
                'email'      => 'kevin.tech@japakehpost.com',
                'telepon'    => '082165071114',
                'foto'       => '',
                'urutan'     => 9,
                'status'     => 'active'
            ]
        ];

        $stmt = $db->prepare("
            INSERT INTO profil_redaksi (nama, jabatan, kategori, keterangan, email, telepon, foto, urutan, status, created_at, updated_at)
            VALUES (:nama, :jabatan, :kategori, :keterangan, :email, :telepon, :foto, :urutan, :status, NOW(), NOW())
        ");

        foreach ($seedData as $item) {
            $stmt->execute([
                ':nama'       => $item['nama'],
                ':jabatan'    => $item['jabatan'],
                ':kategori'   => $item['kategori'],
                ':keterangan' => $item['keterangan'],
                ':email'      => $item['email'],
                ':telepon'    => $item['telepon'],
                ':foto'       => $item['foto'],
                ':urutan'     => $item['urutan'],
                ':status'     => $item['status']
            ]);
        }
        echo "✔ Berhasil memasukkan " . count($seedData) . " profil anggota redaksi awal.\n";
    } else {
        echo "Tabel sudah berisi $count data.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
