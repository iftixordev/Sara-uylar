<?php
require_once 'config.php';

$botToken = BOT_TOKEN;
$webhookUrl = WEBAPP_URL . '/bot-enhanced.php';

echo "<h1>🤖 Sara Uylar - Enhanced Bot Setup</h1>";

// Set webhook
$setWebhookUrl = "https://api.telegram.org/bot{$botToken}/setWebhook";
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
    echo "<p style='color: green;'>✅ Enhanced webhook o'rnatildi: $webhookUrl</p>";
} else {
    echo "<p style='color: red;'>❌ Webhook xatoligi: " . $response['description'] . "</p>";
}

// Bot info
$botInfoUrl = "https://api.telegram.org/bot{$botToken}/getMe";
$botInfo = json_decode(file_get_contents($botInfoUrl), true);

if ($botInfo['ok']) {
    echo "<p>✅ Bot: @" . $botInfo['result']['username'] . "</p>";
    echo "<p><strong>Enhanced Bot havolasi:</strong> <a href='https://t.me/" . $botInfo['result']['username'] . "' target='_blank'>https://t.me/" . $botInfo['result']['username'] . "</a></p>";
} else {
    echo "<p style='color: red;'>❌ Bot ma'lumotlari olinmadi</p>";
}

// Test message
$testUrl = "https://api.telegram.org/bot{$botToken}/sendMessage";
$testData = [
    'chat_id' => ADMIN_ID,
    'text' => "🚀 *Enhanced Bot Test*\n\nBot muvaffaqiyatli yangilandi!\n\n✨ Yangi xususiyatlar:\n• Kuchaytirilgan tugmalar\n• Yaxshilangan menyu\n• Admin panel\n• Inline qidiruv\n\nVaqt: " . date('Y-m-d H:i:s'),
    'parse_mode' => 'Markdown'
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $testUrl);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $testData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$testResult = curl_exec($ch);
curl_close($ch);

$testResponse = json_decode($testResult, true);

if ($testResponse['ok']) {
    echo "<p style='color: green;'>✅ Enhanced test xabar yuborildi</p>";
} else {
    echo "<p style='color: red;'>❌ Test xabar yuborilmadi: " . $testResponse['description'] . "</p>";
}

echo "<hr>";
echo "<h2>🎉 Enhanced Bot Tayyor!</h2>";
echo "<p><strong>Yangi xususiyatlar:</strong></p>";
echo "<ul>";
echo "<li>🎯 6 ta asosiy tugma</li>";
echo "<li>📊 Interaktiv statistika</li>";
echo "<li>❓ Kengaytirilgan yordam</li>";
echo "<li>👑 Admin panel</li>";
echo "<li>🔍 Inline qidiruv</li>";
echo "<li>💬 Callback tugmalar</li>";
echo "</ul>";
echo "<p>Botga /start yuboring va yangi imkoniyatlarni sinab ko'ring!</p>";
?>