<?php

namespace App\Models;

use CodeIgniter\Model;

class KategoriModel extends Model
{
    protected $table            = 'categories';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = ['name', 'slug', 'description', 'status'];
    protected $useTimestamps    = true;
    protected $createdField     = 'created_at';
    protected $updatedField     = 'updated_at';

    /**
     * Ambil kategori dengan jumlah berita terkait
     */
    public function getCategoriesWithCounts()
    {
        return $this->db->table('categories')
            ->select('categories.*, COUNT(news.id) as news_count')
            ->join('news', 'news.category_id = categories.id', 'left')
            ->groupBy('categories.id')
            ->orderBy('categories.name', 'ASC')
            ->get()
            ->getResultArray();
    }
}
