<?php

namespace Config;

// Create a new instance of our RouteCollection class.
$routes = Services::routes();

/*
 * --------------------------------------------------------------------
 * Router Setup
 * --------------------------------------------------------------------
 */
$routes->setDefaultNamespace('App\Controllers');
$routes->setDefaultController('Home');
$routes->setDefaultMethod('index');
$routes->setTranslateURIDashes(false);
$routes->set404Override();

/*
 * --------------------------------------------------------------------
 * Route Definitions
 * --------------------------------------------------------------------
 */

// Public Portal Routes
$routes->get('/', 'Home::index');
$routes->get('berita/(:segment)', 'Home::article/$1');
$routes->get('kategori/(:segment)', 'Home::category/$1');
$routes->get('cari', 'Home::search');
$routes->get('tentang', 'Home::about');

// Admin Auth Routes
$routes->group('admin', ['namespace' => 'App\Controllers\Admin'], function ($routes) {
    $routes->get('login', 'Auth::login');
    $routes->post('login', 'Auth::attemptLogin');
    $routes->get('logout', 'Auth::logout');
});

// Admin CMS Protected Routes
$routes->group('admin', ['namespace' => 'App\Controllers\Admin', 'filter' => 'auth'], function ($routes) {
    // 1. Dashboard
    $routes->get('/', 'Dashboard::index');
    $routes->get('dashboard', 'Dashboard::index');
    $routes->get('dashboard/stats-json', 'Dashboard::statsJson');

    // 2. Berita (News Management)
    $routes->get('berita', 'Berita::index');
    $routes->get('berita/tambah', 'Berita::create');
    $routes->post('berita/simpan', 'Berita::store');
    $routes->get('berita/edit/(:num)', 'Berita::edit/$1');
    $routes->post('berita/update/(:num)', 'Berita::update/$1');
    $routes->post('berita/delete/(:num)', 'Berita::delete/$1');
    $routes->post('berita/bulk-action', 'Berita::bulkAction');

    // 3. Kategori (Category Management)
    $routes->get('kategori', 'Kategori::index');
    $routes->post('kategori/simpan', 'Kategori::store');
    $routes->post('kategori/update/(:num)', 'Kategori::update/$1');
    $routes->post('kategori/delete/(:num)', 'Kategori::delete/$1');

    // 4. Penulis (Author Management)
    $routes->get('penulis', 'Penulis::index');
    $routes->post('penulis/simpan', 'Penulis::store');
    $routes->post('penulis/update/(:num)', 'Penulis::update/$1');
    $routes->post('penulis/toggle-status/(:num)', 'Penulis::toggleStatus/$1');

    // 5. Media Library
    $routes->get('media', 'Media::index');
    $routes->post('media/upload', 'Media::upload');
    $routes->post('media/delete/(:num)', 'Media::delete/$1');

    // 6. Komentar (Comment Moderation)
    $routes->get('komentar', 'Komentar::index');
    $routes->post('komentar/update-status/(:num)', 'Komentar::updateStatus/$1');
    $routes->post('komentar/delete/(:num)', 'Komentar::delete/$1');


    // 8. Pengguna (User Management)
    $routes->get('pengguna', 'Pengguna::index');
    $routes->post('pengguna/simpan', 'Pengguna::store');
    $routes->post('pengguna/update/(:num)', 'Pengguna::update/$1');
    $routes->post('pengguna/delete/(:num)', 'Pengguna::delete/$1');

    // 9. Pengaturan (Settings)
    $routes->get('pengaturan', 'Pengaturan::index');
    $routes->post('pengaturan/simpan', 'Pengaturan::update');

    // 10. Profil Admin
    $routes->get('profil', 'Profil::index');
    $routes->post('profil/update-bio', 'Profil::updateBio');
    $routes->post('profil/update-password', 'Profil::updatePassword');
});
