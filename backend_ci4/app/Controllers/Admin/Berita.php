<?php

namespace App\Controllers\Admin;

use App\Controllers\BaseController;
use App\Models\BeritaModel;
use App\Models\KategoriModel;
use App\Models\UserModel;

class Berita extends BaseController
{
    protected $beritaModel;
    protected $kategoriModel;
    protected $userModel;

    public function __construct()
    {
        $this->beritaModel   = new BeritaModel();
        $this->kategoriModel = new KategoriModel();
        $this->userModel     = new UserModel();
    }

    public function index()
    {
        $status   = $this->request->getGet('status');
        $category = $this->request->getGet('category');

        $data = [
            'title'      => 'Manajemen Berita',
            'newsList'   => $this->beritaModel->getNewsWithRelations($status, $category, 25),
            'categories' => $this->kategoriModel->findAll(),
            'counts'     => $this->beritaModel->getCountsByStatus(),
            'status'     => $status ?? 'all',
        ];

        return view('admin/berita/index', $data);
    }

    public function create()
    {
        $data = [
            'title'      => 'Tulis Berita Baru',
            'categories' => $this->kategoriModel->where('status', 'active')->findAll(),
            'authors'    => $this->userModel->where('status', 'active')->findAll(),
            'article'    => null,
        ];

        return view('admin/berita/form', $data);
    }

    public function store()
    {
        $rules = [
            'title'       => 'required|min_length[5]|max_length[255]',
            'category_id' => 'required|is_natural_no_zero',
            'content'     => 'required',
        ];

        if (! $this->validate($rules)) {
            return redirect()->back()->withInput()->with('errors', $this->validator->getErrors());
        }

        $slug = url_title($this->request->getPost('title'), '-', true);

        $data = [
            'title'            => $this->request->getPost('title'),
            'slug'             => $slug,
            'category_id'      => $this->request->getPost('category_id'),
            'author_id'        => session()->get('user_id') ?? 1,
            'thumbnail'        => $this->request->getPost('thumbnail'),
            'excerpt'          => $this->request->getPost('excerpt'),
            'content'          => $this->request->getPost('content'),
            'tags'             => $this->request->getPost('tags'),
            'meta_title'       => $this->request->getPost('meta_title'),
            'meta_description' => $this->request->getPost('meta_description'),
            'focus_keyword'    => $this->request->getPost('focus_keyword'),
            'status'           => $this->request->getPost('status') ?? 'draft',
            'scheduled_at'     => $this->request->getPost('scheduled_at') ?: null,
        ];

        $this->beritaModel->insert($data);

        return redirect()->to('/admin/berita')->with('success', 'Berita berhasil disimpan.');
    }

    public function edit($id)
    {
        $article = $this->beritaModel->find($id);
        if (! $article) {
            return redirect()->to('/admin/berita')->with('error', 'Artikel tidak ditemukan.');
        }

        $data = [
            'title'      => 'Edit Berita #' . $id,
            'categories' => $this->kategoriModel->where('status', 'active')->findAll(),
            'authors'    => $this->userModel->where('status', 'active')->findAll(),
            'article'    => $article,
        ];

        return view('admin/berita/form', $data);
    }

    public function update($id)
    {
        $article = $this->beritaModel->find($id);
        if (! $article) {
            return redirect()->to('/admin/berita')->with('error', 'Artikel tidak ditemukan.');
        }

        $data = [
            'title'            => $this->request->getPost('title'),
            'category_id'      => $this->request->getPost('category_id'),
            'thumbnail'        => $this->request->getPost('thumbnail'),
            'excerpt'          => $this->request->getPost('excerpt'),
            'content'          => $this->request->getPost('content'),
            'tags'             => $this->request->getPost('tags'),
            'meta_title'       => $this->request->getPost('meta_title'),
            'meta_description' => $this->request->getPost('meta_description'),
            'focus_keyword'    => $this->request->getPost('focus_keyword'),
            'status'           => $this->request->getPost('status') ?? $article['status'],
        ];

        $this->beritaModel->update($id, $data);

        return redirect()->to('/admin/berita')->with('success', 'Berita berhasil diperbarui.');
    }

    public function delete($id)
    {
        $this->beritaModel->delete($id);
        return redirect()->to('/admin/berita')->with('success', 'Berita berhasil dihapus.');
    }

    public function bulkAction()
    {
        $action = $this->request->getPost('action');
        $ids    = $this->request->getPost('ids'); // array of ids

        if (! empty($ids) && is_array($ids)) {
            if ($action === 'delete') {
                $this->beritaModel->whereIn('id', $ids)->delete();
            } elseif ($action === 'publish') {
                $this->beritaModel->whereIn('id', $ids)->set(['status' => 'published'])->update();
            } elseif ($action === 'draft') {
                $this->beritaModel->whereIn('id', $ids)->set(['status' => 'draft'])->update();
            }
            return redirect()->to('/admin/berita')->with('success', 'Tindakan masal berhasil dijalankan.');
        }

        return redirect()->to('/admin/berita')->with('warning', 'Tidak ada artikel yang dipilih.');
    }
}
