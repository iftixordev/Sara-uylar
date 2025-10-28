<?php
session_start();
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Rate limiting
$clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!rateLimit($clientIP, 100, 3600)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Too many requests']);
    exit;
}

$db = getDB();

// Log API request
logAPIRequest($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI'], $clientIP, $_SERVER['HTTP_USER_AGENT'] ?? '');

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $page = max(1, intval($_GET['page'] ?? 1));
        $limit = min(50, max(1, intval($_GET['limit'] ?? 20)));
        $search = sanitize($_GET['search'] ?? '');
        $filter = sanitize($_GET['filter'] ?? 'all');
        $sort = sanitize($_GET['sort'] ?? 'newest');
        
        $listings = $db->read('listings');
        $approved = array_filter($listings, fn($l) => ($l['status'] ?? 'approved') === 'approved');
        
        // Search filter
        if (!empty($search)) {
            $approved = array_filter($approved, function($listing) use ($search) {
                return stripos($listing['title'], $search) !== false ||
                       stripos($listing['location'], $search) !== false ||
                       stripos($listing['description'] ?? '', $search) !== false;
            });
        }
        
        // Category filter
        if ($filter !== 'all') {
            $approved = array_filter($approved, function($listing) use ($filter) {
                if (in_array($filter, ['sale', 'rent'])) {
                    return ($listing['type'] ?? 'sale') === $filter;
                }
                return $listing['property_type'] === $filter;
            });
        }
        
        // Sort
        usort($approved, function($a, $b) use ($sort) {
            switch ($sort) {
                case 'price_low':
                    return $a['price'] <=> $b['price'];
                case 'price_high':
                    return $b['price'] <=> $a['price'];
                case 'oldest':
                    return $a['created_at'] <=> $b['created_at'];
                default: // newest
                    return $b['created_at'] <=> $a['created_at'];
            }
        });
        
        // Pagination
        $total = count($approved);
        $offset = ($page - 1) * $limit;
        $paginatedListings = array_slice($approved, $offset, $limit);
        
        echo json_encode([
            'success' => true, 
            'listings' => array_values($paginatedListings),
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ]);
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        if (!$data) {
            echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
            break;
        }
        
        // Validation
        $errors = [];
        
        if (empty($data['title']) || strlen($data['title']) < 3) {
            $errors[] = 'Sarlavha kamida 3 ta belgidan iborat bo\'lishi kerak';
        }
        
        if (empty($data['location']) || strlen($data['location']) < 3) {
            $errors[] = 'Joylashuv kamida 3 ta belgidan iborat bo\'lishi kerak';
        }
        
        if (!validatePrice($data['price'] ?? 0)) {
            $errors[] = 'Narx noto\'g\'ri formatda';
        }
        
        if (!empty($data['phone']) && !validatePhone($data['phone'])) {
            $errors[] = 'Telefon raqami noto\'g\'ri formatda';
        }
        
        if (!empty($data['area']) && !validateArea($data['area'])) {
            $errors[] = 'Maydon noto\'g\'ri formatda';
        }
        
        $allowedTypes = ['apartment', 'house', 'commercial', 'office'];
        if (!in_array($data['property_type'] ?? '', $allowedTypes)) {
            $errors[] = 'Mulk turi noto\'g\'ri';
        }
        
        if (!empty($errors)) {
            echo json_encode(['success' => false, 'error' => implode(', ', $errors)]);
            break;
        }
        
        $listing = [
            'title' => sanitize($data['title']),
            'description' => sanitize($data['description'] ?? ''),
            'price' => floatval($data['price']),
            'location' => sanitize($data['location']),
            'property_type' => sanitize($data['property_type']),
            'rooms' => max(1, intval($data['rooms'] ?? 1)),
            'area' => floatval($data['area'] ?? 0),
            'phone' => sanitize($data['phone'] ?? ''),
            'user_id' => intval($data['user_id'] ?? 0),
            'status' => 'approved',
            'views' => 0,
            'images' => array_slice($data['images'] ?? [], 0, 10),
            'type' => sanitize($data['type'] ?? 'sale')
        ];
        
        $id = $db->insert('listings', $listing);
        echo json_encode(['success' => true, 'id' => $id, 'listing' => $listing]);
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
}
?>