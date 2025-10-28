<?php
require_once 'config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Method not allowed']));
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

$db = getDB();

switch ($action) {
    case 'register':
        $name = sanitize($input['name'] ?? '');
        $phone = sanitize($input['phone'] ?? '');
        
        if (empty($name) || empty($phone)) {
            exit(json_encode(['error' => 'Ism va telefon raqam kiritish majburiy']));
        }
        
        // Check if user exists
        $users = $db->read('users');
        foreach ($users as $user) {
            if ($user['phone'] === $phone) {
                exit(json_encode(['error' => 'Bu telefon raqam allaqachon ro\'yxatdan o\'tgan']));
            }
        }
        
        // Create user
        $userId = $db->insert('users', [
            'name' => $name,
            'phone' => $phone,
            'telegram_id' => null,
            'is_verified' => false,
            'source' => 'web'
        ]);
        
        session_start();
        $_SESSION['user_id'] = $userId;
        $_SESSION['user_name'] = $name;
        
        echo json_encode(['success' => true, 'user_id' => $userId]);
        break;
        
    case 'login':
        $phone = sanitize($input['phone'] ?? '');
        
        if (empty($phone)) {
            exit(json_encode(['error' => 'Telefon raqam kiritish majburiy']));
        }
        
        $users = $db->read('users');
        foreach ($users as $user) {
            if ($user['phone'] === $phone) {
                session_start();
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['user_name'] = $user['name'];
                
                echo json_encode(['success' => true, 'user_id' => $user['id']]);
                exit;
            }
        }
        
        echo json_encode(['error' => 'Foydalanuvchi topilmadi']);
        break;
        
    case 'logout':
        session_start();
        session_destroy();
        echo json_encode(['success' => true]);
        break;
        
    default:
        echo json_encode(['error' => 'Noto\'g\'ri harakat']);
}
?>