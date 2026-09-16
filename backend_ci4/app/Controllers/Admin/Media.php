<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\MediaModel;

class Media extends BaseController
{
    protected $mediaModel;

    public function __construct()
    {
        $this->mediaModel = new MediaModel();
    }

    public function index()
    {
        $data = [
            'title'     => 'Pustaka Media',
            'mediaList' => $this->mediaModel->getMediaWithUploader(),
        ];

        return view('admin/media/index', $data);
    }

    public function upload()
    {
        $file = $this->request->getFile('media_file');

        if ($file && $file->isValid() && ! $file->hasMoved()) {
            $newName = $file->getRandomName();
            $file->move(FCPATH . 'uploads/media', $newName);

            $this->mediaModel->insert([
                'filename' => $file->getClientName(),
                'filepath' => 'uploads/media/' . $newName,
                'filetype' => $file->getClientMimeType(),
                'filesize' => $file->getSize(),
                'alt_text' => $this->request->getPost('alt_text'),
                'caption'  => $this->request->getPost('caption'),
                'user_id'  => session()->get('user_id') ?? 1,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            return redirect()->to('/admin/media')->with('success', 'Media berhasil diunggah.');
        }

        return redirect()->to('/admin/media')->with('error', 'Gagal mengunggah media.');
    }

    public function delete($id)
    {
        $media = $this->mediaModel->find($id);
        if ($media) {
            if (file_exists(FCPATH . $media['filepath'])) {
                unlink(FCPATH . $media['filepath']);
            }
            $this->mediaModel->delete($id);
            return redirect()->to('/admin/media')->with('success', 'File media berhasil dihapus.');
        }

        return redirect()->to('/admin/media')->with('error', 'Media tidak ditemukan.');
    }
}
