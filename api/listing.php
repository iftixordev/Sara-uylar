<?php
session_start();
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$db = getDB();
$id = intval($_GET['id'] ?? 0);

if (!$id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'ID required']);
    exit;
}

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $listing = $db->find('listings', $id);
        
        if (!$listing) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Listing not found']);
            break;
        }
        
        // Increment views
        $listings = $db->read('listings');
        foreach ($listings as &$l) {
            if ($l['id'] == $id) {
                $l['views'] = ($l['views'] ?? 0) + 1;
                break;
            }
        }
        $db->write('listings', $listings);
        
        echo json_encode(['success' => true, 'listing' => $listing]);
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
            break;
        }
        
        $listings = $db->read('listings');
        $found = false;
        
        foreach ($listings as &$listing) {
            if ($listing['id'] == $id) {
                $listing['title'] = sanitize($data['title'] ?? $listing['title']);
                $listing['description'] = sanitize($data['description'] ?? $listing['description']);
                $listing['price'] = floatval($data['price'] ?? $listing['price']);
                $listing['location'] = sanitize($data['location'] ?? $listing['location']);
                $listing['updated_at'] = date('Y-m-d H:i:s');
                $found = true;
                break;
            }
        }
        
        if (!$found) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Listing not found']);
            break;
        }
        
        $db->write('listings', $listings);
        echo json_encode(['success' => true, 'message' => 'Listing updated']);
        break;
        
    case 'DELETE':
        $listings = $db->read('listings');
        $found = false;
        
        foreach ($listings as $key => $listing) {
            if ($listing['id'] == $id) {
                unset($listings[$key]);
                $found = true;
                break;
            }
        }
        
        if (!$found) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Listing not found']);
            break;
        }
        
        $db->write('listings', array_values($listings));
        echo json_encode(['success' => true, 'message' => 'Listing deleted']);
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>