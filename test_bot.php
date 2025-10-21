<?php
require_once 'config.php';

$botToken = BOT_TOKEN;

// Test bot connection
$url = "https://api.telegram.org/bot{$botToken}/getMe";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);

$botInfo = json_decode($result, true);

echo "<h1>Sara Uylar Bot Test</h1>";

if ($botInfo['ok']) {
    echo "<p style='color: green;'>✅ Bot ishlayapti!</p>";
    echo "<p><strong>Bot:</strong> " . $botInfo['result']['first_name'] . " (@" . $botInfo['result']['username'] . ")</p>";
} else {
    echo "<p style='color: red;'>❌ Bot ishlamayapti!</p>";
}

// Test webhook info
$webhookUrl = "https://api.telegram.org/bot{$botToken}/getWebhookInfo";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $webhookUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$webhookInfo = json_decode(curl_exec($ch), true);
curl_close($ch);

echo "<h2>Webhook Ma'lumotlari:</h2>";
if ($webhookInfo['ok']) {
    $info = $webhookInfo['result'];
    echo "<p><strong>URL:</strong> " . ($info['url'] ?: 'O\'rnatilmagan') . "</p>";
    echo "<p><strong>Holat:</strong> " . ($info['url'] ? '✅ Faol' : '❌ Faol emas') . "</p>";
    echo "<p><strong>So'nggi xatolik:</strong> " . ($info['last_error_message'] ?: 'Yo\'q') . "</p>";
}

// Test database
echo "<h2>Ma'lumotlar Bazasi:</h2>";
$db = getDB();
$listings = $db->read('listings');
$users = $db->read('users');

echo "<p><strong>E'lonlar:</strong> " . count($listings) . " ta</p>";
echo "<p><strong>Foydalanuvchilar:</strong> " . count($users) . " ta</p>";

// Test directories
echo "<h2>Papkalar:</h2>";
echo "<p><strong>Data:</strong> " . (is_writable(DATA_DIR) ? '✅ Yozish mumkin' : '❌ Yozish mumkin emas') . "</p>";
echo "<p><strong>Uploads:</strong> " . (is_writable(UPLOAD_DIR) ? '✅ Yozish mumkin' : '❌ Yozish mumkin emas') . "</p>";
?>