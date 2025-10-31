<?php
session_start();
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$db = getDB();
$userId = intval($_GET['user_id'] ?? 0);

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (!$userId) {
            echo json_encode(['success' => false, 'error' => 'User ID required']);
            break;
        }
        
        $notifications = $db->read('notifications');
        $userNotifications = array_filter($notifications, fn($n) => $n['user_id'] == $userId);
        
        // Mark as read
        foreach ($notifications as &$notification) {
            if ($notification['user_id'] == $userId && !$notification['read']) {
                $notification['read'] = true;
                $notification['read_at'] = date('Y-m-d H:i:s');
            }
        }
        $db->write('notifications', $notifications);
        
        echo json_encode([
            'success' => true, 
            'notifications' => array_values($userNotifications)
        ]);
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        $notification = [
            'user_id' => intval($data['user_id']),
            'title' => sanitize($data['title']),
            'message' => sanitize($data['message']),
            'type' => sanitize($data['type'] ?? 'info'),
            'read' => false,
            'data' => $data['data'] ?? []
        ];
        
        $id = $db->insert('notifications', $notification);
        
        // Send push notification if enabled
        sendPushNotification($notification);
        
        echo json_encode(['success' => true, 'id' => $id]);
        break;
}

function sendPushNotification($notification) {
    // Implementation for push notifications
    // This would integrate with Firebase, OneSignal, etc.
}
?>