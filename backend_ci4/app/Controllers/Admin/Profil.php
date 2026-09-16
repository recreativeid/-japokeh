<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\UserModel;

class Profil extends BaseController
{
    protected $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    public function index()
    {
        $userId = session()->get('user_id') ?? 1;
        $user   = $this->userModel->find($userId);

        $data = [
            'title' => 'Profil Redaksi',
            'user'  => $user,
        ];

        return view('admin/profil/index', $data);
    }

    public function updateBio()
    {
        $userId = session()->get('user_id') ?? 1;
        $this->userModel->update($userId, [
            'name'  => $this->request->getPost('name'),
            'email' => $this->request->getPost('email'),
            'bio'   => $this->request->getPost('bio'),
        ]);

        return redirect()->to('/admin/profil')->with('success', 'Biodata profil berhasil diperbarui.');
    }

    public function updatePassword()
    {
        $userId = session()->get('user_id') ?? 1;
        $user   = $this->userModel->find($userId);

        $currentPass = $this->request->getPost('current_password');
        $newPass     = $this->request->getPost('new_password');

        if (! password_verify($currentPass, $user['password'])) {
            return redirect()->back()->with('error', 'Kata sandi lama tidak sesuai.');
        }

        $this->userModel->update($userId, [
            'password' => password_hash($newPass, PASSWORD_DEFAULT),
        ]);

        return redirect()->to('/admin/profil')->with('success', 'Kata sandi berhasil diubah.');
    }
}
