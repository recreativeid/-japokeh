<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\PengaturanModel;

class Pengaturan extends BaseController
{
    protected $pengaturanModel;

    public function __construct()
    {
        $this->pengaturanModel = new PengaturanModel();
    }

    public function index()
    {
        $data = [
            'title'    => 'Pengaturan Portal',
            'settings' => $this->pengaturanModel->getSettingsAsKeyValue(),
        ];

        return view('admin/pengaturan/index', $data);
    }

    public function update()
    {
        $postData = $this->request->getPost();
        foreach ($postData as $key => $val) {
            if ($key !== 'csrf_test_name') {
                $this->pengaturanModel->saveSetting($key, $val);
            }
        }

        return redirect()->to('/admin/pengaturan')->with('success', 'Semua pengaturan portal berhasil disimpan.');
    }
}
