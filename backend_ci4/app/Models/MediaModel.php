<?php

namespace App\Models;

use CodeIgniter\Model;

class MediaModel extends Model
{
    protected $table            = 'media';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $allowedFields    = [
        'filename',
        'filepath',
        'filetype',
        'filesize',
        'alt_text',
        'caption',
        'user_id'
    ];

    protected $useTimestamps = false;

    public function getMediaWithUploader($limit = 30, $offset = 0)
    {
        return $this->db->table('media')
            ->select('media.*, users.name as uploader_name')
            ->join('users', 'users.id = media.user_id', 'left')
            ->orderBy('media.created_at', 'DESC')
            ->get($limit, $offset)
            ->getResultArray();
    }
}
