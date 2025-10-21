<?php
require_once 'config.php';

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Sara Uylar Bot Debug</h1>";

// Test incoming webhook
echo "<h2>Webhook Test:</h2>";
$input = file_get_contents('php://input');
echo "<p><strong>Raw Input:</strong></p>";
echo "<pre>" . htmlspecialchars($input) . "</pre>";

if ($input) {
    $update = json_decode($input, true);
    echo "<p><strong>Parsed Update:</strong></p>";
    echo "<pre>" . json_encode($update, JSON_PRETTY_PRINT) . "</pre>";
}

// Test bot token
echo "<h2>Bot Configuration:</h2>";
echo "<p><strong>Token:</strong> " . (BOT_TOKEN ? 'O\'rnatilgan' : 'O\'rnatilmagan') . "</p>";
echo "<p><strong>Webapp URL:</strong> " . WEBAPP_URL . "</p>";
echo "<p><strong>Admin ID:</strong> " . ADMIN_ID . "</p>";

// Test API connection
$botToken = BOT_TOKEN;
$url = "https://api.telegram.org/bot{$botToken}/getMe";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "<h2>API Test:</h2>";
echo "<p><strong>HTTP Code:</strong> {$httpCode}</p>";
echo "<p><strong>Response:</strong></p>";
echo "<pre>" . htmlspecialchars($result) . "</pre>";

// Test database
echo "<h2>Database Test:</h2>";
try {
    $db = getDB();
    $listings = $db->read('listings');
    echo "<p>✅ Database OK - " . count($listings) . " listings</p>";
} catch (Exception $e) {
    echo "<p>❌ Database Error: " . $e->getMessage() . "</p>";
}

// Test file permissions
echo "<h2>File Permissions:</h2>";
echo "<p><strong>Data dir:</strong> " . (is_writable(DATA_DIR) ? '✅ Writable' : '❌ Not writable') . "</p>";
echo "<p><strong>Upload dir:</strong> " . (is_writable(UPLOAD_DIR) ? '✅ Writable' : '❌ Not writable') . "</p>";

// Show recent logs
echo "<h2>Recent Activity:</h2>";
$logFile = DATA_DIR . 'bot_log.txt';
if (file_exists($logFile)) {
    $logs = file_get_contents($logFile);
    echo "<pre>" . htmlspecialchars(substr($logs, -1000)) . "</pre>";
} else {
    echo "<p>No logs found</p>";
}
?>