<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\UserModel;

class Penulis extends BaseController
{
    protected $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    public function index()
    {
        $data = [
            'title'   => 'Daftar Penulis',
            'authors' => $this->userModel->getAuthorsWithArticleCounts(),
        ];

        return view('admin/penulis/index', $data);
    }

    public function store()
    {
        $this->userModel->insert([
            'name'     => $this->request->getPost('name'),
            'email'    => $this->request->getPost('email'),
            'password' => password_hash('BuserInfo#2026', PASSWORD_DEFAULT),
            'role'     => $this->request->getPost('role') ?? 'Reporter',
            'bio'      => $this->request->getPost('bio'),
            'status'   => 'active',
        ]);

        return redirect()->to('/admin/penulis')->with('success', 'Penulis baru berhasil ditambahkan.');
    }

    public function update($id)
    {
        $this->userModel->update($id, [
            'name'  => $this->request->getPost('name'),
            'email' => $this->request->getPost('email'),
            'role'  => $this->request->getPost('role'),
            'bio'   => $this->request->getPost('bio'),
        ]);

        return redirect()->to('/admin/penulis')->with('success', 'Data penulis berhasil diperbarui.');
    }

    public function toggleStatus($id)
    {
        $author = $this->userModel->find($id);
        if ($author) {
            $newStatus = $author['status'] === 'active' ? 'inactive' : 'active';
            $this->userModel->update($id, ['status' => $newStatus]);
            return redirect()->to('/admin/penulis')->with('info', 'Status penulis diperbarui.');
        }

        return redirect()->to('/admin/penulis')->with('error', 'Penulis tidak ditemukan.');
    }
}
