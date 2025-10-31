<?php
header('Content-Type: application/json');
require_once '../config.php';

session_start();

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Ruxsat yo\'q']);
    exit;
}

$type = $_POST['type'] ?? '';
$title = $_POST['title'] ?? '';
$message = $_POST['message'] ?? '';

if (empty($title) || empty($message)) {
    echo json_encode(['success' => false, 'error' => 'Sarlavha va xabar matnini kiriting']);
    exit;
}

try {
    $users = json_decode(file_get_contents('../data/users.json'), true) ?: [];
    $listings = json_decode(file_get_contents('../data/listings.json'), true) ?: [];
    $blocked_users = json_decode(file_get_contents('../data/blocked_users.json'), true) ?: [];
    
    $target_users = [];
    
    switch ($type) {
        case 'all':
            $target_users = array_filter($users, fn($user) => !in_array($user['id'], $blocked_users));
            break;
            
        case 'active_users':
            $active_user_ids = array_unique(array_column($listings, 'user_id'));
            $target_users = array_filter($users, fn($user) => 
                in_array($user['id'], $active_user_ids) && !in_array($user['id'], $blocked_users)
            );
            break;
            
        case 'listing_owners':
            $recent_listings = array_filter($listings, fn($l) => 
                strtotime($l['created_at']) > strtotime('-30 days')
            );
            $owner_ids = array_unique(array_column($recent_listings, 'user_id'));
            $target_users = array_filter($users, fn($user) => 
                in_array($user['id'], $owner_ids) && !in_array($user['id'], $blocked_users)
            );
            break;
    }
    
    $sent_count = 0;
    $failed_count = 0;
    
    foreach ($target_users as $user) {
        $result = sendTelegramMessage($user['id'], $title, $message);
        if ($result) {
            $sent_count++;
        } else {
            $failed_count++;
        }
        
        // Rate limiting
        usleep(100000); // 0.1 sekund kutish
    }
    
    echo json_encode([
        'success' => true,
        'sent' => $sent_count,
        'failed' => $failed_count,
        'message' => "{$sent_count} ta foydalanuvchiga yuborildi"
    ]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

function sendTelegramMessage($user_id, $title, $message) {
    if (!defined('BOT_TOKEN')) {
        return false;
    }
    
    $text = "📢 *{$title}*\n\n{$message}\n\n_Sara Uylar jamoasidan_";
    
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
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    
    $result = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return $http_code === 200;
}
?>