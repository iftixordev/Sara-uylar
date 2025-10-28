<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$db = getDB();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $listings = $db->read('listings');
        $approved = array_filter($listings, fn($l) => ($l['status'] ?? 'approved') === 'approved');
        echo json_encode(['success' => true, 'listings' => array_values($approved)]);
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
            break;
        }
        
        $listing = [
            'title' => sanitize($data['title'] ?? ''),
            'description' => sanitize($data['description'] ?? ''),
            'price' => floatval($data['price'] ?? 0),
            'location' => sanitize($data['location'] ?? ''),
            'property_type' => sanitize($data['property_type'] ?? ''),
            'rooms' => intval($data['rooms'] ?? 1),
            'area' => floatval($data['area'] ?? 0),
            'phone' => sanitize($data['phone'] ?? ''),
            'user_id' => intval($data['user_id'] ?? 0),
            'status' => 'approved',
            'views' => 0,
            'images' => $data['images'] ?? []
        ];
        
        if (empty($listing['title']) || empty($listing['location']) || $listing['price'] <= 0) {
            echo json_encode(['success' => false, 'error' => 'Required fields missing']);
            break;
        }
        
        $id = $db->insert('listings', $listing);
        echo json_encode(['success' => true, 'id' => $id, 'listing' => $listing]);
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>