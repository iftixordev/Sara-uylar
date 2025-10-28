<?php
// Sara Uylar - Production Setup
require_once 'config.php';

echo "<h1>🚀 Sara Uylar - Production Setup</h1>";

// Check PHP version
if (version_compare(PHP_VERSION, '8.0.0') < 0) {
    echo "<p style='color: red;'>❌ PHP 8.0+ required. Current: " . PHP_VERSION . "</p>";
    exit;
}
echo "<p style='color: green;'>✅ PHP Version: " . PHP_VERSION . "</p>";

// Check required extensions
$required_extensions = ['json', 'curl', 'gd'];
foreach ($required_extensions as $ext) {
    if (extension_loaded($ext)) {
        echo "<p style='color: green;'>✅ Extension: $ext</p>";
    } else {
        echo "<p style='color: red;'>❌ Missing extension: $ext</p>";
    }
}

// Create directories
$directories = [DATA_DIR, UPLOAD_DIR];
foreach ($directories as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
        echo "<p style='color: green;'>✅ Created directory: $dir</p>";
    } else {
        echo "<p style='color: blue;'>📁 Directory exists: $dir</p>";
    }
}

// Set permissions
chmod(DATA_DIR, 0755);
chmod(UPLOAD_DIR, 0755);
echo "<p style='color: green;'>✅ Permissions set</p>";

// Initialize data files
$dataFiles = [
    'listings.json' => [],
    'users.json' => [],
    'rate_limit.json' => [],
    'api_logs.json' => []
];

foreach ($dataFiles as $file => $defaultData) {
    $filePath = DATA_DIR . $file;
    if (!file_exists($filePath)) {
        file_put_contents($filePath, json_encode($defaultData, JSON_PRETTY_PRINT));
        echo "<p style='color: green;'>✅ Created: $file</p>";
    } else {
        echo "<p style='color: blue;'>📄 File exists: $file</p>";
    }
}

// Test database
try {
    $db = getDB();
    $testData = $db->read('listings');
    echo "<p style='color: green;'>✅ Database connection working</p>";
} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Database error: " . $e->getMessage() . "</p>";
}

// Setup bot webhook
if (defined('BOT_TOKEN') && BOT_TOKEN) {
    $webhookUrl = WEBAPP_URL . '/bot.php';
    $setWebhookUrl = "https://api.telegram.org/bot" . BOT_TOKEN . "/setWebhook";
    
    $data = [
        'url' => $webhookUrl,
        'allowed_updates' => json_encode(['message', 'callback_query', 'inline_query'])
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $setWebhookUrl);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $result = curl_exec($ch);
    curl_close($ch);
    
    $response = json_decode($result, true);
    
    if ($response['ok']) {
        echo "<p style='color: green;'>✅ Bot webhook set: $webhookUrl</p>";
    } else {
        echo "<p style='color: red;'>❌ Webhook error: " . $response['description'] . "</p>";
    }
} else {
    echo "<p style='color: orange;'>⚠️ Bot token not configured</p>";
}

// Security check
if (is_writable('.')) {
    echo "<p style='color: orange;'>⚠️ Root directory is writable - consider restricting</p>";
}

// Check HTTPS
if (!isset($_SERVER['HTTPS']) || $_SERVER['HTTPS'] !== 'on') {
    echo "<p style='color: orange;'>⚠️ HTTPS not detected - SSL recommended for production</p>";
} else {
    echo "<p style='color: green;'>✅ HTTPS enabled</p>";
}

echo "<hr>";
echo "<h2>🎉 Setup Complete!</h2>";
echo "<p><strong>Next steps:</strong></p>";
echo "<ul>";
echo "<li>✅ Configure SSL certificate</li>";
echo "<li>✅ Set up domain DNS</li>";
echo "<li>✅ Test bot functionality</li>";
echo "<li>✅ Monitor error logs</li>";
echo "</ul>";

echo "<p><strong>URLs:</strong></p>";
echo "<ul>";
echo "<li>Web App: <a href='" . WEBAPP_URL . "' target='_blank'>" . WEBAPP_URL . "</a></li>";
echo "<li>Bot Test: <a href='" . WEBAPP_URL . "/test_bot.php' target='_blank'>Test Bot</a></li>";
echo "<li>Debug: <a href='" . WEBAPP_URL . "/debug_bot.php' target='_blank'>Debug</a></li>";
echo "</ul>";
?>