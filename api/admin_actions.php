<?php
header('Content-Type: application/json');
require_once '../config.php';

session_start();

// Admin tekshiruvi
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Ruxsat yo\'q']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

try {
    switch ($action) {
        case 'approve_listing':
            $listing_id = $input['listing_id'];
            $listings = json_decode(file_get_contents('../data/listings.json'), true) ?: [];
            
            foreach ($listings as &$listing) {
                if ($listing['id'] == $listing_id) {
                    $listing['status'] = 'active';
                    $listing['approved_at'] = date('Y-m-d H:i:s');
                    
                    // Telegram kanalga yuborish
                    sendToTelegramChannel($listing);
                    
                    // Foydalanuvchiga bildirishnoma
                    sendNotificationToUser($listing['user_id'], "✅ E'loningiz tasdiqlandi!", "'{$listing['title']}' e'loni faollashtirildi.");
                    break;
                }
            }
            
            file_put_contents('../data/listings.json', json_encode($listings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            echo json_encode(['success' => true]);
            break;
            
        case 'reject_listing':
            $listing_id = $input['listing_id'];
            $listings = json_decode(file_get_contents('../data/listings.json'), true) ?: [];
            
            foreach ($listings as &$listing) {
                if ($listing['id'] == $listing_id) {
                    $listing['status'] = 'rejected';
                    $listing['rejected_at'] = date('Y-m-d H:i:s');
                    
                    // Foydalanuvchiga bildirishnoma
                    sendNotificationToUser($listing['user_id'], "❌ E'loningiz rad etildi", "'{$listing['title']}' e'loni qoidalarga mos kelmadi.");
                    break;
                }
            }
            
            file_put_contents('../data/listings.json', json_encode($listings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            echo json_encode(['success' => true]);
            break;
            
        case 'block_user':
            $user_id = $input['user_id'];
            $blocked_users = json_decode(file_get_contents('../data/blocked_users.json'), true) ?: [];
            
            if (!in_array($user_id, $blocked_users)) {
                $blocked_users[] = $user_id;
                file_put_contents('../data/blocked_users.json', json_encode($blocked_users, JSON_PRETTY_PRINT));
                
                // Foydalanuvchiga bildirishnoma
                sendNotificationToUser($user_id, "🚫 Hisobingiz bloklandi", "Qoidalarni buzganingiz uchun hisobingiz vaqtincha bloklandi.");
            }
            
            echo json_encode(['success' => true]);
            break;
            
        case 'unblock_user':
            $user_id = $input['user_id'];
            $blocked_users = json_decode(file_get_contents('../data/blocked_users.json'), true) ?: [];
            
            $blocked_users = array_filter($blocked_users, fn($id) => $id != $user_id);
            file_put_contents('../data/blocked_users.json', json_encode(array_values($blocked_users), JSON_PRETTY_PRINT));
            
            // Foydalanuvchiga bildirishnoma
            sendNotificationToUser($user_id, "✅ Hisobingiz faollashtirildi", "Hisobingiz qayta faollashtirildi. Qoidalarga rioya qiling.");
            
            echo json_encode(['success' => true]);
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Noto\'g\'ri amal']);
    }
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function sendToTelegramChannel($listing) {
    if (!defined('BOT_TOKEN') || !defined('CHANNEL_ID')) {
        return false;
    }
    
    $message = "🏠 *Yangi e'lon!*\n\n";
    $message .= "*{$listing['title']}*\n";
    $message .= "💰 Narx: $" . number_format($listing['price']) . "\n";
    $message .= "📍 Joylashuv: {$listing['location']}\n";
    $message .= "🚪 Xonalar: {$listing['rooms']}\n";
    
    if (!empty($listing['area'])) {
        $message .= "📏 Maydon: {$listing['area']}m²\n";
    }
    
    $message .= "\n👀 Ko'rish uchun: " . WEBAPP_URL . "/#listing-{$listing['id']}";
    
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '👀 E\'lonni ko\'rish', 'url' => WEBAPP_URL . "/#listing-{$listing['id']}"],
                ['text' => '💬 Bog\'lanish', 'url' => "https://t.me/" . BOT_USERNAME]
            ]
        ]
    ];
    
    $data = [
        'chat_id' => CHANNEL_ID,
        'text' => $message,
        'parse_mode' => 'Markdown',
        'reply_markup' => json_encode($keyboard)
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.telegram.org/bot" . BOT_TOKEN . "/sendMessage");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $result = curl_exec($ch);
    curl_close($ch);
    
    return $result;
}

function sendNotificationToUser($user_id, $title, $message) {
    if (!defined('BOT_TOKEN')) {
        return false;
    }
    
    $text = "*{$title}*\n\n{$message}";
    
    $data = [
        'chat_id' => $user_id,
        'text' => $text,
        'parse_mode' => 'Markdown'
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.telegram.org/bot" . BOT_TOKEN . "/sendMessage");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $result = curl_exec($ch);
    curl_close($ch);
    
    return $result;
}
?>