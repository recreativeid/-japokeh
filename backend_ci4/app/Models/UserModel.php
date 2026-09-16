<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table            = 'users';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = [
        'name',
        'email',
        'password',
        'role',
        'avatar',
        'bio',
        'status',
        'last_login'
    ];

    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';

    /**
     * Dapatkan daftar penulis beserta jumlah artikel yang ditulis
     */
    public function getAuthorsWithArticleCounts()
    {
        return $this->db->table('users')
            ->select('users.id, users.name, users.email, users.role, users.avatar, users.status, users.last_login, COUNT(news.id) as article_count')
            ->join('news', 'news.author_id = users.id', 'left')
            ->groupBy('users.id')
            ->orderBy('users.id', 'ASC')
            ->get()
            ->getResultArray();
    }
}
