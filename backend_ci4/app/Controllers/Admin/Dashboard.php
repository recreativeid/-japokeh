<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\BeritaModel;
use App\Models\KategoriModel;
use App\Models\KomentarModel;

class Dashboard extends BaseController
{
    protected $beritaModel;
    protected $kategoriModel;
    protected $komentarModel;

    public function __construct()
    {
        $this->beritaModel   = new BeritaModel();
        $this->kategoriModel = new KategoriModel();
        $this->komentarModel = new KomentarModel();
    }

    public function index()
    {
        $data = [
            'title'       => 'Dashboard Editorial',
            'counts'      => $this->beritaModel->getCountsByStatus(),
            'categories'  => $this->kategoriModel->getCategoriesWithCounts(),
            'recentNews'  => $this->beritaModel->getNewsWithRelations(null, null, 5),
            'unreadNotif' => $this->komentarModel->where('status', 'pending')->countAllResults(),
        ];

        return view('admin/dashboard', $data);
    }

    public function statsJson()
    {
        $range = $this->request->getGet('range') ?? '7d';

        // Mock/real aggregate data for Chart.js
        $response = [
            'status' => 'success',
            'range'  => $range,
            'labels' => ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
            'published' => [8, 12, 15, 11, 14, 9, 13],
            'drafts'    => [2, 4, 3, 5, 2, 1, 3],
            'updated'   => [3, 5, 6, 4, 7, 2, 4]
        ];

        return $this->response->setJSON($response);
    }
}
