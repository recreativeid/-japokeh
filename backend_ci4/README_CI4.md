# Panduan Integrasi Backend CodeIgniter 4 (CI4) — Japakeh Post CMS

Dokumen ini menjelaskan struktur arsitektur dan langkah pemasangan backend **CodeIgniter 4** untuk Sistem Manajemen Konten (CMS) **Japakeh Post** (PT Japakeh Media Nusantara).

---

## 1. Struktur Direktori CI4

```
backend_ci4/
├── app/
│   ├── Config/
│   │   └── Routes.php             # Route definitions & grouping admin
│   ├── Controllers/
│   │   └── Admin/
│   │       ├── Auth.php           # Login, Session, Logout
│   │       ├── Dashboard.php      # Ringkasan KPI, Statistik publikasi
│   │       ├── Berita.php         # CRUD Berita, Slug, Bulk Actions
│   │       ├── Kategori.php       # Manajemen 12 Rubrikasi (Referensi Tabaca.id)
│   │       ├── Penulis.php        # Manajemen Wartawan & Redaktur
│   │       ├── Media.php          # Upload Foto & Dokumen
│   │       ├── Komentar.php       # Moderasi Komentar Pembaca
│   │       ├── Pengguna.php       # Manajemen Role & Hak Akses
│   │       ├── Pengaturan.php     # Konfigurasi Portal & SEO Global
│   │       └── Profil.php         # Profil Redaksi & Ubah Password
│   ├── Database/
│   │   └── Migrations/
│   │       └── 2026-09-09-000001_CreateBuserInfoCmsTables.php
│   ├── Models/
│   │   ├── BeritaModel.php
│   │   ├── KategoriModel.php
│   │   ├── UserModel.php
│   │   ├── MediaModel.php
│   │   ├── KomentarModel.php
│   │   └── PengaturanModel.php
│   └── Views/
│       └── admin/
│           ├── layout/
│           │   ├── header.php
│           │   ├── sidebar.php
│           │   ├── navbar.php
│           │   └── footer.php
│           ├── dashboard.php
│           ├── berita/
│           ├── kategori/
│           ├── media/
│           ├── komentar/
│           ├── pengguna/
│           ├── pengaturan/
│           └── profil/
└── README_CI4.md
```

---

## 2. Persyaratan Sistem

* PHP 8.1 / 8.2 / 8.4
* Ekstensi PHP: `intl`, `mbstring`, `mysqli`, `curl`, `gd`
* MySQL / MariaDB 10.4+
* Composer 2.x

---

## 3. Langkah Pemasangan & Migrasi Database

### Langkah 1: Konfigurasi File `.env`
Salin file `env` menjadi `.env` pada root project CodeIgniter 4 Anda:
```ini
CI_ENVIRONMENT = development

app.baseURL = 'http://localhost:8080/'

database.default.hostname = localhost
database.default.database = berita_japakehpost
database.default.username = root
database.default.password = 
database.default.DBDriver = MySQLi
database.default.DBPrefix = 
database.default.port = 3306
```

### Langkah 2: Jalankan Migrasi Tabel / Import Database
Import skrip SQL siap pakai yang telah disediakan di root:
```bash
mysql -u root -p berita_japakehpost < database_mysql.sql
```
Atau eksekusi perintah spark:
```bash
php spark migrate
```
Tabel-tabel berikut akan otomatis terbuat:
1. `users`: Akun redaktur, wartawan, dan administrator (Al Bahri).
2. `kategori`: 12 kategori resmi portal Japakeh Post (Daerah, Nasional, Politik, Hukum, Ekonomi, Bisnis, Pendidikan, Teknologi, Opini, Foto, Internasional, Video) sesuai referensi Tabaca.id.
3. `artikel`: Berita lengkap dengan excerpt, status, view counter, dan SEO meta.
4. `media`: Arsip file media, thumbnail, caption, dan alt text.
5. `komentar`: Komentar pembaca dengan sistem moderasi.
6. `pengaturan`: Pengaturan nama portal, kontak hotline (082165071114), email (alb4hri@gmail.com), dan legalitas PT Japakeh Media Nusantara.

### Langkah 3: Menjalankan Server Lokal
```bash
php spark serve
```
Akses panel admin di browser melalui:
`http://localhost:8080/admin/login`

---

## 4. Akun Administrator Default (Seeder)

* **Nama**: `Al Bahri`
* **Email**: `alb4hri@gmail.com`
* **Password**: `Japakeh#2026` / `admin123`
* **Peran**: `Administrator` (Pemimpin Umum / Pemimpin Redaksi)
* **Perusahaan**: `PT Japakeh Media Nusantara`
* **WhatsApp**: `082165071114`

---

## 5. Sinkronisasi dengan Aset Frontend Standalone

File aset desain antarmuka berada di folder:
* CSS Desain Sistem: `admin/css/admin.css`
* JavaScript Utama: `admin/js/admin.js`
* Logo & Identitas: `assets/images/logo/japakeh-logo.webp` dan `assets/images/logo/favicon.webp`
Semua file dapat langsung diakses melalui `public/admin/` atau tautan relatif portal.
