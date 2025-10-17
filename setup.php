<?php
require_once 'config.php';

$botToken = BOT_TOKEN;
$webhookUrl = WEBAPP_URL . '/bot.php';

echo "<h1>🤖 Sara Uylar Bot Setup</h1>";

// Set webhook
$setWebhookUrl = "https://api.telegram.org/bot{$botToken}/setWebhook";
$data = ['url' => $webhookUrl];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $setWebhookUrl);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($ch);
curl_close($ch);

$response = json_decode($result, true);

if ($response['ok']) {
    echo "<p style='color: green;'>✅ Webhook o'rnatildi: $webhookUrl</p>";
} else {
    echo "<p style='color: red;'>❌ Webhook xatoligi: " . $response['description'] . "</p>";
}

// Bot info
$botInfoUrl = "https://api.telegram.org/bot{$botToken}/getMe";
$botInfo = json_decode(file_get_contents($botInfoUrl), true);

if ($botInfo['ok']) {
    echo "<p>✅ Bot: @" . $botInfo['result']['username'] . "</p>";
    echo "<p><strong>Bot havolasi:</strong> <a href='https://t.me/" . $botInfo['result']['username'] . "' target='_blank'>https://t.me/" . $botInfo['result']['username'] . "</a></p>";
} else {
    echo "<p style='color: red;'>❌ Bot ma'lumotlari olinmadi</p>";
}

echo "<hr>";
echo "<p><strong>Web App:</strong> <a href='$webhookUrl/../index.html' target='_blank'>$webhookUrl/../index.html</a></p>";
echo "<p>Botga /start yuboring va Web App tugmasini bosing!</p>";
?>