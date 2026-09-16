<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\KomentarModel;

class Komentar extends BaseController
{
    protected $komentarModel;

    public function __construct()
    {
        $this->komentarModel = new KomentarModel();
    }

    public function index()
    {
        $status = $this->request->getGet('status');

        $data = [
            'title'    => 'Moderasi Komentar',
            'comments' => $this->komentarModel->getCommentsWithArticle($status),
            'status'   => $status ?? 'all',
        ];

        return view('admin/komentar/index', $data);
    }

    public function updateStatus($id)
    {
        $status = $this->request->getPost('status'); // approved, rejected, spam
        if (in_array($status, ['approved', 'rejected', 'spam', 'pending'])) {
            $this->komentarModel->update($id, ['status' => $status]);
            return redirect()->to('/admin/komentar')->with('success', 'Status komentar berhasil diperbarui.');
        }

        return redirect()->to('/admin/komentar')->with('error', 'Status tidak valid.');
    }

    public function delete($id)
    {
        $this->komentarModel->delete($id);
        return redirect()->to('/admin/komentar')->with('success', 'Komentar berhasil dihapus.');
    }
}
