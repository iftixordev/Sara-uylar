<?php
// Sara Uylar - Xavfsiz konfiguratsiya fayli

// Bot sozlamalari
define('BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE');
define('BOT_USERNAME', 'SaraUylarbot');
define('WEBAPP_URL', 'https://sarauylar.bigsaver.ru');
define('ADMIN_ID', 'YOUR_ADMIN_TELEGRAM_ID');

// Kanal sozlamalari
define('CHANNEL_ID', '@sara_uylar_channel');
define('CHANNEL_USERNAME', 'sara_uylar_channel');

// Ma'lumotlar bazasi sozlamalari (agar kerak bo'lsa)
define('DB_HOST', 'localhost');
define('DB_NAME', 'sara_uylar');
define('DB_USER', 'sara_user');
define('DB_PASS', 'secure_password_here');

// Xavfsizlik sozlamalari
define('SECRET_KEY', 'your_secret_key_here_32_chars_min');
define('CSRF_TOKEN_LIFETIME', 3600); // 1 soat
define('SESSION_LIFETIME', 86400); // 24 soat
define('MAX_LOGIN_ATTEMPTS', 5);
define('LOGIN_LOCKOUT_TIME', 900); // 15 daqiqa

// Rate limiting
define('RATE_LIMIT_REQUESTS', 100); // So'rovlar soni
define('RATE_LIMIT_WINDOW', 3600); // Vaqt oynasi (sekund)

// Fayl yuklash sozlamalari
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_IMAGE_TYPES', ['image/jpeg', 'image/png', 'image/webp']);
define('UPLOAD_PATH', __DIR__ . '/uploads/');

// Email sozlamalari (agar kerak bo'lsa)
define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_PORT', 587);
define('SMTP_USERNAME', 'your_email@gmail.com');
define('SMTP_PASSWORD', 'your_app_password');
define('FROM_EMAIL', 'noreply@sarauylar.com');
define('FROM_NAME', 'Sara Uylar');

// API sozlamalari
define('API_VERSION', 'v1');
define('API_RATE_LIMIT', 1000); // So'rovlar/soat
define('API_KEY_LENGTH', 32);

// Logging
define('LOG_LEVEL', 'INFO'); // DEBUG, INFO, WARNING, ERROR
define('LOG_FILE', __DIR__ . '/logs/app.log');
define('ERROR_LOG_FILE', __DIR__ . '/logs/error.log');
define('ACCESS_LOG_FILE', __DIR__ . '/logs/access.log');

// Cache sozlamalari
define('CACHE_ENABLED', true);
define('CACHE_LIFETIME', 3600); // 1 soat
define('CACHE_PATH', __DIR__ . '/cache/');

// Debugging (production da false qiling!)
define('DEBUG_MODE', false);
define('SHOW_ERRORS', false);

// Timezone
date_default_timezone_set('Asia/Tashkent');

// Error reporting
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
    ini_set('error_log', ERROR_LOG_FILE);
}

// Session sozlamalari
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Strict');

// Security headers
function setSecurityHeaders() {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: geolocation=(), microphone=(), camera=()');
    
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
    }
}

// CSRF token yaratish
function generateCSRFToken() {
    if (!isset($_SESSION['csrf_token']) || 
        !isset($_SESSION['csrf_token_time']) || 
        time() - $_SESSION['csrf_token_time'] > CSRF_TOKEN_LIFETIME) {
        
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['csrf_token_time'] = time();
    }
    
    return $_SESSION['csrf_token'];
}

// CSRF token tekshirish
function validateCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && 
           isset($_SESSION['csrf_token_time']) &&
           time() - $_SESSION['csrf_token_time'] <= CSRF_TOKEN_LIFETIME &&
           hash_equals($_SESSION['csrf_token'], $token);
}

// Input sanitization
function sanitizeInput($input, $type = 'string') {
    switch ($type) {
        case 'string':
            return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
        case 'email':
            return filter_var(trim($input), FILTER_SANITIZE_EMAIL);
        case 'url':
            return filter_var(trim($input), FILTER_SANITIZE_URL);
        case 'int':
            return filter_var($input, FILTER_SANITIZE_NUMBER_INT);
        case 'float':
            return filter_var($input, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
        default:
            return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
    }
}

// Rate limiting
function checkRateLimit($identifier, $limit = null, $window = null) {
    $limit = $limit ?: RATE_LIMIT_REQUESTS;
    $window = $window ?: RATE_LIMIT_WINDOW;
    
    $rateLimitFile = __DIR__ . '/data/rate_limits.json';
    $rateLimits = file_exists($rateLimitFile) ? 
        json_decode(file_get_contents($rateLimitFile), true) : [];
    
    $now = time();
    $key = $identifier . '_' . floor($now / $window);
    
    // Eski ma'lumotlarni tozalash
    $rateLimits = array_filter($rateLimits, function($data, $k) use ($now, $window) {
        $timestamp = explode('_', $k);
        return count($timestamp) > 1 && ($now - end($timestamp) * $window) < $window * 2;
    }, ARRAY_FILTER_USE_BOTH);
    
    $currentCount = $rateLimits[$key]['count'] ?? 0;
    
    if ($currentCount >= $limit) {
        return false;
    }
    
    $rateLimits[$key] = [
        'count' => $currentCount + 1,
        'first_request' => $rateLimits[$key]['first_request'] ?? $now
    ];
    
    file_put_contents($rateLimitFile, json_encode($rateLimits));
    return true;
}

// Logging function
function logMessage($message, $level = 'INFO', $context = []) {
    if (!defined('LOG_LEVEL')) return;
    
    $levels = ['DEBUG' => 0, 'INFO' => 1, 'WARNING' => 2, 'ERROR' => 3];
    $currentLevel = $levels[LOG_LEVEL] ?? 1;
    $messageLevel = $levels[$level] ?? 1;
    
    if ($messageLevel < $currentLevel) return;
    
    $logFile = ($level === 'ERROR') ? ERROR_LOG_FILE : LOG_FILE;
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $timestamp = date('Y-m-d H:i:s');
    $contextStr = !empty($context) ? ' ' . json_encode($context) : '';
    $logEntry = "[{$timestamp}] {$level}: {$message}{$contextStr}\n";
    
    file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
}

// Xavfsiz fayl yuklash
function validateUploadedFile($file, $allowedTypes = null) {
    $allowedTypes = $allowedTypes ?: ALLOWED_IMAGE_TYPES;
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Fayl yuklashda xatolik: ' . $file['error']);
    }
    
    if ($file['size'] > MAX_FILE_SIZE) {
        throw new Exception('Fayl hajmi juda katta');
    }
    
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($mimeType, $allowedTypes)) {
        throw new Exception('Ruxsat etilmagan fayl turi');
    }
    
    // Fayl nomini xavfsiz qilish
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeName = preg_replace('/[^a-zA-Z0-9._-]/', '', $file['name']);
    $uniqueName = uniqid() . '_' . $safeName;
    
    return [
        'original_name' => $file['name'],
        'safe_name' => $uniqueName,
        'mime_type' => $mimeType,
        'size' => $file['size'],
        'extension' => strtolower($extension)
    ];
}

// Database connection (agar kerak bo'lsa)
function getDBConnection() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
            ];
            
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            logMessage('Database connection failed: ' . $e->getMessage(), 'ERROR');
            throw new Exception('Ma\'lumotlar bazasiga ulanishda xatolik');
        }
    }
    
    return $pdo;
}

// JSON file operations with locking
function readJSONFile($filename, $default = []) {
    $filepath = __DIR__ . '/data/' . $filename;
    
    if (!file_exists($filepath)) {
        return $default;
    }
    
    $content = file_get_contents($filepath);
    if ($content === false) {
        logMessage("Failed to read file: {$filename}", 'ERROR');
        return $default;
    }
    
    $data = json_decode($content, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        logMessage("JSON decode error in {$filename}: " . json_last_error_msg(), 'ERROR');
        return $default;
    }
    
    return $data;
}

function writeJSONFile($filename, $data) {
    $filepath = __DIR__ . '/data/' . $filename;
    $tempFile = $filepath . '.tmp';
    
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        logMessage("JSON encode error for {$filename}: " . json_last_error_msg(), 'ERROR');
        return false;
    }
    
    if (file_put_contents($tempFile, $json, LOCK_EX) === false) {
        logMessage("Failed to write temp file: {$tempFile}", 'ERROR');
        return false;
    }
    
    if (!rename($tempFile, $filepath)) {
        logMessage("Failed to rename temp file: {$tempFile} to {$filepath}", 'ERROR');
        unlink($tempFile);
        return false;
    }
    
    return true;
}

// Startup initialization
if (!is_dir(__DIR__ . '/data')) {
    mkdir(__DIR__ . '/data', 0755, true);
}

if (!is_dir(__DIR__ . '/logs')) {
    mkdir(__DIR__ . '/logs', 0755, true);
}

if (!is_dir(__DIR__ . '/cache')) {
    mkdir(__DIR__ . '/cache', 0755, true);
}

if (!is_dir(UPLOAD_PATH)) {
    mkdir(UPLOAD_PATH, 0755, true);
}

// Set security headers
setSecurityHeaders();

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>