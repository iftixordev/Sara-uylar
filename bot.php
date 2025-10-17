<?php
require_once 'config.php';

$botToken = BOT_TOKEN;
$webappUrl = WEBAPP_URL;

$input = file_get_contents('php://input');
$update = json_decode($input, true);

if (!$update) exit('OK');

$message = $update['message'] ?? null;

if ($message) {
    $chatId = $message['chat']['id'];
    $text = $message['text'] ?? '';
    $firstName = $message['from']['first_name'] ?? 'User';
    
    if ($text === '/start') {
        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🏠 Sara Uylar', 'web_app' => ['url' => $webappUrl]]
                ]
            ]
        ];
        
        sendMessage($chatId, "🏠 *Sara Uylar*\n\nSalom, {$firstName}!\n\nUy-joy e'lonlari platformasiga xush kelibsiz!\n\n🚀 Boshlash uchun tugmani bosing!", $keyboard);
    }
}

function sendMessage($chatId, $text, $keyboard = null) {
    global $botToken;
    
    $data = [
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'Markdown'
    ];
    
    if ($keyboard) {
        $data['reply_markup'] = json_encode($keyboard);
    }
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.telegram.org/bot{$botToken}/sendMessage");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    curl_exec($ch);
    curl_close($ch);
}

echo 'OK';
?>