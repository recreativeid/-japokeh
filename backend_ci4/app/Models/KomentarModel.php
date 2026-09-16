<?php

namespace App\Models;

use CodeIgniter\Model;

class KomentarModel extends Model
{
    protected $table            = 'comments';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = [
        'news_id',
        'name',
        'email',
        'comment',
        'status',
        'ip_address'
    ];

    protected $useTimestamps = false;

    public function getCommentsWithArticle($status = null)
    {
        $builder = $this->db->table('comments')
            ->select('comments.*, news.title as article_title, news.slug as article_slug')
            ->join('news', 'news.id = comments.news_id', 'left')
            ->orderBy('comments.created_at', 'DESC');

        if ($status && $status !== 'all') {
            $builder->where('comments.status', $status);
        }

        return $builder->get()->getResultArray();
    }
}
