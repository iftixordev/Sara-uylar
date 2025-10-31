<?php
header('Content-Type: application/json');

// System health check endpoint
$health = [
    'status' => 'healthy',
    'timestamp' => date('c'),
    'version' => '2.1.0',
    'checks' => []
];

try {
    // Check file system
    $dataDir = __DIR__ . '/data';
    $uploadsDir = __DIR__ . '/uploads';
    $logsDir = __DIR__ . '/logs';
    
    $health['checks']['filesystem'] = [
        'status' => 'ok',
        'data_writable' => is_writable($dataDir),
        'uploads_writable' => is_writable($uploadsDir),
        'logs_writable' => is_writable($logsDir),
        'disk_free' => disk_free_space(__DIR__)
    ];
    
    // Check data files
    $listingsFile = $dataDir . '/listings.json';
    $usersFile = $dataDir . '/users.json';
    
    $listings = file_exists($listingsFile) ? json_decode(file_get_contents($listingsFile), true) : [];
    $users = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : [];
    
    $health['checks']['data'] = [
        'status' => 'ok',
        'listings_count' => count($listings ?: []),
        'users_count' => count($users ?: []),
        'active_listings' => count(array_filter($listings ?: [], fn($l) => ($l['status'] ?? 'pending') === 'active'))
    ];
    
    // Check bot configuration
    $botConfigured = defined('BOT_TOKEN') && !empty(BOT_TOKEN) && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE';
    
    $health['checks']['bot'] = [
        'status' => $botConfigured ? 'ok' : 'warning',
        'configured' => $botConfigured,
        'webhook_url' => $botConfigured ? 'configured' : 'not_set'
    ];
    
    // Check PHP configuration
    $health['checks']['php'] = [
        'status' => 'ok',
        'version' => PHP_VERSION,
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'extensions' => [
            'gd' => extension_loaded('gd'),
            'curl' => extension_loaded('curl'),
            'json' => extension_loaded('json'),
            'mbstring' => extension_loaded('mbstring')
        ]
    ];
    
    // Check recent activity
    $recentListings = array_filter($listings ?: [], function($listing) {
        return strtotime($listing['created_at']) > strtotime('-24 hours');
    });
    
    $health['checks']['activity'] = [
        'status' => 'ok',
        'listings_today' => count($recentListings),
        'last_listing' => !empty($listings) ? max(array_column($listings, 'created_at')) : null
    ];
    
    // Performance metrics
    $startTime = microtime(true);
    
    // Simulate some work
    for ($i = 0; $i < 1000; $i++) {
        $temp = md5($i);
    }
    
    $endTime = microtime(true);
    $responseTime = round(($endTime - $startTime) * 1000, 2);
    
    $health['checks']['performance'] = [
        'status' => $responseTime < 100 ? 'ok' : 'warning',
        'response_time_ms' => $responseTime,
        'memory_usage' => memory_get_usage(true),
        'memory_peak' => memory_get_peak_usage(true)
    ];
    
    // Overall status
    $allOk = true;
    foreach ($health['checks'] as $check) {
        if ($check['status'] !== 'ok') {
            $allOk = false;
            break;
        }
    }
    
    $health['status'] = $allOk ? 'healthy' : 'degraded';
    
    // Add uptime if available
    if (function_exists('sys_getloadavg')) {
        $load = sys_getloadavg();
        $health['system'] = [
            'load_average' => $load,
            'load_status' => $load[0] < 1.0 ? 'ok' : 'high'
        ];
    }
    
    http_response_code(200);
    
} catch (Exception $e) {
    $health['status'] = 'unhealthy';
    $health['error'] = $e->getMessage();
    http_response_code(503);
}

echo json_encode($health, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>