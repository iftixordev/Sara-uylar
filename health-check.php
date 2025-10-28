<?php
// Sara Uylar - Health Check
require_once 'config.php';

header('Content-Type: application/json');

$health = [
    'status' => 'ok',
    'timestamp' => date('Y-m-d H:i:s'),
    'version' => '2.0',
    'checks' => []
];

// Check PHP version
$health['checks']['php_version'] = [
    'status' => version_compare(PHP_VERSION, '8.0.0') >= 0 ? 'ok' : 'error',
    'value' => PHP_VERSION
];

// Check required extensions
$required_extensions = ['json', 'curl', 'gd'];
foreach ($required_extensions as $ext) {
    $health['checks']['extension_' . $ext] = [
        'status' => extension_loaded($ext) ? 'ok' : 'error',
        'value' => extension_loaded($ext)
    ];
}

// Check directories
$directories = [DATA_DIR, UPLOAD_DIR, LOG_DIR];
foreach ($directories as $dir) {
    $name = basename($dir);
    $health['checks']['directory_' . $name] = [
        'status' => is_dir($dir) && is_writable($dir) ? 'ok' : 'error',
        'value' => is_dir($dir) && is_writable($dir)
    ];
}

// Check database
try {
    $db = getDB();
    $listings = $db->read('listings');
    $health['checks']['database'] = [
        'status' => 'ok',
        'value' => count($listings) . ' listings'
    ];
} catch (Exception $e) {
    $health['checks']['database'] = [
        'status' => 'error',
        'value' => $e->getMessage()
    ];
}

// Check bot
if (defined('BOT_TOKEN') && BOT_TOKEN) {
    $botInfoUrl = "https://api.telegram.org/bot" . BOT_TOKEN . "/getMe";
    $botInfo = @file_get_contents($botInfoUrl);
    $botData = json_decode($botInfo, true);
    
    $health['checks']['bot'] = [
        'status' => $botData && $botData['ok'] ? 'ok' : 'error',
        'value' => $botData && $botData['ok'] ? $botData['result']['username'] : 'Bot not accessible'
    ];
} else {
    $health['checks']['bot'] = [
        'status' => 'warning',
        'value' => 'Bot token not configured'
    ];
}

// Check disk space
$freeBytes = disk_free_space('.');
$totalBytes = disk_total_space('.');
$usedPercent = (($totalBytes - $freeBytes) / $totalBytes) * 100;

$health['checks']['disk_space'] = [
    'status' => $usedPercent < 90 ? 'ok' : 'warning',
    'value' => round($usedPercent, 2) . '% used'
];

// Overall status
$hasError = false;
foreach ($health['checks'] as $check) {
    if ($check['status'] === 'error') {
        $hasError = true;
        break;
    }
}

if ($hasError) {
    $health['status'] = 'error';
    http_response_code(500);
}

echo json_encode($health, JSON_PRETTY_PRINT);
?>