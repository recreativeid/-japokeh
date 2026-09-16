<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\KategoriModel;

class Kategori extends BaseController
{
    protected $kategoriModel;

    public function __construct()
    {
        $this->kategoriModel = new KategoriModel();
    }

    public function index()
    {
        $data = [
            'title'      => 'Kategori Berita',
            'categories' => $this->kategoriModel->getCategoriesWithCounts(),
        ];

        return view('admin/kategori/index', $data);
    }

    public function store()
    {
        $name = $this->request->getPost('name');
        $slug = url_title($name, '-', true);

        $this->kategoriModel->insert([
            'name'        => $name,
            'slug'        => $slug,
            'description' => $this->request->getPost('description'),
            'status'      => $this->request->getPost('status') ?? 'active',
        ]);

        return redirect()->to('/admin/kategori')->with('success', 'Kategori baru berhasil ditambahkan.');
    }

    public function update($id)
    {
        $name = $this->request->getPost('name');
        $slug = url_title($name, '-', true);

        $this->kategoriModel->update($id, [
            'name'        => $name,
            'slug'        => $slug,
            'description' => $this->request->getPost('description'),
            'status'      => $this->request->getPost('status') ?? 'active',
        ]);

        return redirect()->to('/admin/kategori')->with('success', 'Kategori berhasil diperbarui.');
    }

    public function delete($id)
    {
        $this->kategoriModel->delete($id);
        return redirect()->to('/admin/kategori')->with('success', 'Kategori berhasil dihapus.');
    }
}
