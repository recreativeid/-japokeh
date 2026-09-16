<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\UserModel;

class Pengguna extends BaseController
{
    protected $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    public function index()
    {
        $data = [
            'title' => 'Pengguna Sistem',
            'users' => $this->userModel->findAll(),
        ];

        return view('admin/pengguna/index', $data);
    }

    public function store()
    {
        $password = $this->request->getPost('password') ?: 'BuserInfo#2026';

        $this->userModel->insert([
            'name'     => $this->request->getPost('name'),
            'email'    => $this->request->getPost('email'),
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'role'     => $this->request->getPost('role') ?? 'Reporter',
            'status'   => 'active',
        ]);

        return redirect()->to('/admin/pengguna')->with('success', 'Pengguna baru berhasil ditambahkan.');
    }

    public function update($id)
    {
        $data = [
            'name'  => $this->request->getPost('name'),
            'email' => $this->request->getPost('email'),
            'role'  => $this->request->getPost('role'),
        ];

        if ($this->request->getPost('password')) {
            $data['password'] = password_hash($this->request->getPost('password'), PASSWORD_DEFAULT);
        }

        $this->userModel->update($id, $data);

        return redirect()->to('/admin/pengguna')->with('success', 'Data pengguna berhasil diperbarui.');
    }

    public function delete($id)
    {
        $this->userModel->delete($id);
        return redirect()->to('/admin/pengguna')->with('success', 'Pengguna berhasil dihapus.');
    }
}
