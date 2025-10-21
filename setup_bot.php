<?php
require_once 'config.php';

$botToken = BOT_TOKEN;
$webhookUrl = WEBAPP_URL . '/bot.php';

// Set webhook
$url = "https://api.telegram.org/bot{$botToken}/setWebhook";
$data = [
    'url' => $webhookUrl,
    'allowed_updates' => json_encode(['message', 'callback_query', 'inline_query'])
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$response = json_decode($result, true);

echo "<h1>Sara Uylar Bot Setup</h1>";
echo "<p><strong>Webhook URL:</strong> {$webhookUrl}</p>";
echo "<p><strong>HTTP Code:</strong> {$httpCode}</p>";
echo "<p><strong>Response:</strong></p>";
echo "<pre>" . json_encode($response, JSON_PRETTY_PRINT) . "</pre>";

if ($response['ok']) {
    echo "<p style='color: green;'>✅ Webhook muvaffaqiyatli o'rnatildi!</p>";
} else {
    echo "<p style='color: red;'>❌ Xatolik: " . ($response['description'] ?? 'Unknown error') . "</p>";
}

// Test bot info
$infoUrl = "https://api.telegram.org/bot{$botToken}/getMe";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $infoUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$botInfo = json_decode(curl_exec($ch), true);
curl_close($ch);

if ($botInfo['ok']) {
    echo "<h2>Bot Ma'lumotlari:</h2>";
    echo "<p><strong>Nom:</strong> " . $botInfo['result']['first_name'] . "</p>";
    echo "<p><strong>Username:</strong> @" . $botInfo['result']['username'] . "</p>";
    echo "<p><strong>ID:</strong> " . $botInfo['result']['id'] . "</p>";
}
?>