<?php

namespace App\Models;

use CodeIgniter\Model;

class BeritaModel extends Model
{
    protected $table            = 'news';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $allowedFields    = [
        'title',
        'slug',
        'category_id',
        'author_id',
        'thumbnail',
        'excerpt',
        'content',
        'tags',
        'meta_title',
        'meta_description',
        'focus_keyword',
        'views',
        'status',
        'scheduled_at',
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Ambil berita dengan join kategori dan penulis
     */
    public function getNewsWithRelations($status = null, $categoryId = null, $limit = 25, $offset = 0)
    {
        $builder = $this->db->table('news')
            ->select('news.*, categories.name as category_name, categories.slug as category_slug, users.name as author_name, users.role as author_role')
            ->join('categories', 'categories.id = news.category_id', 'left')
            ->join('users', 'users.id = news.author_id', 'left')
            ->orderBy('news.created_at', 'DESC');

        if ($status && $status !== 'all') {
            $builder->where('news.status', $status);
        }

        if ($categoryId) {
            $builder->where('news.category_id', $categoryId);
        }

        return $builder->get($limit, $offset)->getResultArray();
    }

    /**
     * Hitung total per status berita untuk ringkasan dashboard
     */
    public function getCountsByStatus()
    {
        return [
            'total'     => $this->countAllResults(),
            'published' => $this->where('status', 'published')->countAllResults(false),
            'draft'     => $this->where('status', 'draft')->countAllResults(false),
            'review'    => $this->where('status', 'review')->countAllResults(false),
            'scheduled' => $this->where('status', 'scheduled')->countAllResults(false),
        ];
    }
}
