<?php
// Cache tozalash utility
header('Content-Type: application/json');

$response = [
    'success' => true,
    'message' => 'Cache tozalandi',
    'actions' => []
];

try {
    // Browser cache headers
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s') . ' GMT');
    
    // Clear PHP opcache if available
    if (function_exists('opcache_reset')) {
        opcache_reset();
        $response['actions'][] = 'PHP OPcache tozalandi';
    }
    
    // Clear session cache
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
        $response['actions'][] = 'Session cache tozalandi';
    }
    
    // Clear file cache if exists
    $cacheDir = __DIR__ . '/cache';
    if (is_dir($cacheDir)) {
        $files = glob($cacheDir . '/*');
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        $response['actions'][] = 'File cache tozalandi';
    }
    
    // Clear rate limit cache
    $rateLimitFile = __DIR__ . '/data/rate_limit.json';
    if (file_exists($rateLimitFile)) {
        file_put_contents($rateLimitFile, '{}');
        $response['actions'][] = 'Rate limit cache tozalandi';
    }
    
    $response['timestamp'] = time();
    $response['version'] = '2.1.0';
    
} catch (Exception $e) {
    $response['success'] = false;
    $response['error'] = $e->getMessage();
}

echo json_encode($response, JSON_PRETTY_PRINT);

// JavaScript cache busting script
?>
<script>
// Browser cache tozalash
if ('caches' in window) {
    caches.keys().then(function(cacheNames) {
        return Promise.all(
            cacheNames.map(function(cacheName) {
                return caches.delete(cacheName);
            })
        );
    }).then(function() {
        console.log('Service Worker cache tozalandi');
    });
}

// LocalStorage tozalash
localStorage.removeItem('sara_favorites');
localStorage.removeItem('sara_theme');
localStorage.removeItem('sara_notifications');
localStorage.removeItem('sara_version');

// Force reload
setTimeout(function() {
    window.location.reload(true);
}, 1000);
</script>