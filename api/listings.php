<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$db = getDB();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $listings = $db->read('listings');
        $approved = array_filter($listings, fn($l) => ($l['status'] ?? 'approved') === 'approved');
        echo json_encode(['success' => true, 'listings' => array_values($approved)]);
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        $listing = [
            'title' => sanitize($data['title']),
            'description' => sanitize($data['description'] ?? ''),
            'price' => floatval($data['price']),
            'location' => sanitize($data['location']),
            'property_type' => sanitize($data['property_type']),
            'rooms' => intval($data['rooms'] ?? 1),
            'area' => floatval($data['area'] ?? 0),
            'phone' => sanitize($data['phone'] ?? ''),
            'user_id' => intval($data['user_id']),
            'status' => 'approved',
            'views' => 0
        ];
        
        $id = $db->insert('listings', $listing);
        echo json_encode(['success' => true, 'id' => $id]);
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>