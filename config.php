<?php
// Sara Uylar - Configuration

// Environment detection
define('IS_PRODUCTION', !in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1', '::1']));

// Bot configuration
define('BOT_TOKEN', '6379136508:AAGWn5WJsYoUQmrFCXpL9VXghc9-WGHDD8s');
define('WEBAPP_URL', 'https://sarauylar.bigsaver.ru');
define('ADMIN_ID', '2114098498');

// Directories
define('DATA_DIR', __DIR__ . '/data/');
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('LOG_DIR', __DIR__ . '/logs/');

// Security settings
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp']);
define('RATE_LIMIT_REQUESTS', 100);
define('RATE_LIMIT_WINDOW', 3600);

// Error reporting
if (IS_PRODUCTION) {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', LOG_DIR . 'php_errors.log');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}

// Create required directories
if (!is_dir(DATA_DIR)) mkdir(DATA_DIR, 0755, true);
if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
if (!is_dir(LOG_DIR)) mkdir(LOG_DIR, 0755, true);

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
        $filtered = array_filter($records, function($r) use ($id) { return $r['id'] == $id; });
        return !empty($filtered) ? array_values($filtered)[0] : null;
    }
}

function getDB() {
    static $db = null;
    if ($db === null) {
        $db = new DB();
    }
    return $db;
}

function sanitize($input) {
    if (is_array($input)) {
        return array_map('sanitize', $input);
    }
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

function validateEmail($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validatePhone($phone) {
    return preg_match('/^[+]?[0-9\s\-\(\)]{7,15}$/', $phone);
}

function validatePrice($price) {
    return is_numeric($price) && $price > 0 && $price <= 999999999;
}

function validateArea($area) {
    return is_numeric($area) && $area > 0 && $area <= 10000;
}

function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function validateCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

function rateLimit($key, $limit = RATE_LIMIT_REQUESTS, $window = RATE_LIMIT_WINDOW) {
    $file = DATA_DIR . 'rate_limit.json';
    $data = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    
    $now = time();
    $windowStart = $now - $window;
    
    if (!isset($data[$key])) {
        $data[$key] = [];
    }
    
    $data[$key] = array_filter($data[$key], fn($time) => $time > $windowStart);
    
    if (count($data[$key]) >= $limit) {
        logError("Rate limit exceeded for: $key");
        return false;
    }
    
    $data[$key][] = $now;
    file_put_contents($file, json_encode($data));
    return true;
}

function logError($message, $context = []) {
    $logFile = LOG_DIR . 'app_errors.log';
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? json_encode($context) : '';
    $logEntry = "[$timestamp] $message $contextStr" . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

function logAPIRequest($method, $endpoint, $ip, $userAgent = '') {
    $logFile = DATA_DIR . 'api_logs.json';
    $logs = file_exists($logFile) ? json_decode(file_get_contents($logFile), true) : [];
    
    $logs[] = [
        'timestamp' => date('Y-m-d H:i:s'),
        'method' => $method,
        'endpoint' => $endpoint,
        'ip' => $ip,
        'user_agent' => $userAgent
    ];
    
    // Keep only last 1000 logs
    $logs = array_slice($logs, -1000);
    file_put_contents($logFile, json_encode($logs));
}

function validateImageFile($file) {
    if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
        return ['valid' => false, 'error' => 'Invalid file upload'];
    }
    
    if ($file['size'] > MAX_FILE_SIZE) {
        return ['valid' => false, 'error' => 'File too large'];
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, ALLOWED_IMAGE_TYPES)) {
        return ['valid' => false, 'error' => 'Invalid file type'];
    }
    
    return ['valid' => true, 'mime_type' => $mimeType];
}
?>