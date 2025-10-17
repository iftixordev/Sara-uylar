<?php
// Sara Uylar - Configuration
define('BOT_TOKEN', '6379136508:AAGWn5WJsYoUQmrFCXpL9VXghc9-WGHDD8s');
define('WEBAPP_URL', 'https://sarauylar.bigsaver.ru');
define('ADMIN_ID', '2114098498');
define('DATA_DIR', __DIR__ . '/data/');
define('UPLOAD_DIR', __DIR__ . '/uploads/');

// Database class
class DB {
    private $dataDir;
    
    public function __construct() {
        $this->dataDir = DATA_DIR;
    }
    
    public function read($table) {
        $file = $this->dataDir . $table . '.json';
        return file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    }
    
    public function write($table, $data) {
        $file = $this->dataDir . $table . '.json';
        return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    public function insert($table, $data) {
        $records = $this->read($table);
        $data['id'] = count($records) + 1;
        $data['created_at'] = date('Y-m-d H:i:s');
        $records[] = $data;
        $this->write($table, $records);
        return $data['id'];
    }
    
    public function find($table, $id) {
        $records = $this->read($table);
        return array_filter($records, fn($r) => $r['id'] == $id)[0] ?? null;
    }
}

function getDB() {
    static $db = null;
    return $db ?: $db = new DB();
}

function sanitize($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}
?>