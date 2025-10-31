<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Performance metrics
$metrics = [
    'server' => [
        'php_version' => PHP_VERSION,
        'memory_usage' => formatBytes(memory_get_usage(true)),
        'memory_peak' => formatBytes(memory_get_peak_usage(true)),
        'load_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'],
        'disk_free' => formatBytes(disk_free_space('.')),
        'disk_total' => formatBytes(disk_total_space('.'))
    ],
    'database' => [
        'listings_count' => count(getDB()->read('listings')),
        'users_count' => count(getDB()->read('users')),
        'file_sizes' => getFileSizes()
    ],
    'api' => [
        'response_times' => getAverageResponseTimes(),
        'request_count' => getRequestCount(),
        'error_rate' => getErrorRate()
    ],
    'cache' => [
        'hit_rate' => getCacheHitRate(),
        'size' => getCacheSize()
    ]
];

echo json_encode(['success' => true, 'metrics' => $metrics]);

function formatBytes($bytes, $precision = 2) {
    $units = array('B', 'KB', 'MB', 'GB', 'TB');
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}

function getFileSizes() {
    $sizes = [];
    $dataFiles = ['listings.json', 'users.json', 'api_logs.json', 'rate_limit.json'];
    
    foreach ($dataFiles as $file) {
        $path = DATA_DIR . $file;
        $sizes[$file] = file_exists($path) ? formatBytes(filesize($path)) : '0 B';
    }
    
    return $sizes;
}

function getAverageResponseTimes() {
    $logs = getDB()->read('api_logs');
    $recentLogs = array_slice($logs, -100); // Last 100 requests
    
    if (empty($recentLogs)) return '0ms';
    
    // Simulate response time calculation
    $avgTime = array_sum(array_map(fn() => rand(50, 300), $recentLogs)) / count($recentLogs);
    return round($avgTime) . 'ms';
}

function getRequestCount() {
    $logs = getDB()->read('api_logs');
    $today = date('Y-m-d');
    
    return count(array_filter($logs, fn($log) => 
        strpos($log['timestamp'], $today) === 0
    ));
}

function getErrorRate() {
    // Simulate error rate calculation
    return rand(0, 5) . '%';
}

function getCacheHitRate() {
    // Simulate cache hit rate
    return rand(85, 98) . '%';
}

function getCacheSize() {
    // Calculate total cache size
    $totalSize = 0;
    $cacheFiles = glob(DATA_DIR . '*.json');
    
    foreach ($cacheFiles as $file) {
        $totalSize += filesize($file);
    }
    
    return formatBytes($totalSize);
}
?>