<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\UserModel;

class Auth extends BaseController
{
    protected $userModel;

    public function __construct()
    {
        $this->userModel = new UserModel();
    }

    public function login()
    {
        if (session()->get('is_admin_logged_in')) {
            return redirect()->to('/admin/dashboard');
        }

        return view('admin/login');
    }

    public function attemptLogin()
    {
        $email = $this->request->getPost('email');
        $password = $this->request->getPost('password');

        $user = $this->userModel->where('email', $email)->first();

        if ($user && password_verify($password, $user['password'])) {
            if ($user['status'] !== 'active') {
                return redirect()->back()->with('error', 'Akun redaksi Anda sedang dinonaktifkan.');
            }

            // Set session
            session()->set([
                'user_id'             => $user['id'],
                'user_name'           => $user['name'],
                'user_email'          => $user['email'],
                'user_role'           => $user['role'],
                'user_avatar'         => $user['avatar'],
                'is_admin_logged_in'  => true,
            ]);

            // Update last login
            $this->userModel->update($user['id'], ['last_login' => date('Y-m-d H:i:s')]);

            return redirect()->to('/admin/dashboard')->with('success', 'Selamat datang kembali di Dashboard Redaksi Japakeh Post.');
        }

        return redirect()->back()->with('error', 'Email atau kata sandi tidak valid.');
    }

    public function logout()
    {
        session()->destroy();
        return redirect()->to('/admin/login')->with('info', 'Anda telah keluar dari sistem.');
    }
}
