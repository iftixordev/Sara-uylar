<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

require_once '../config.php';

class EnhancedListingsAPI {
    private $dataFile = '../data/listings.json';
    
    public function __construct() {
        if (!file_exists('../data')) {
            mkdir('../data', 0755, true);
        }
        
        if (!file_exists($this->dataFile)) {
            $this->initializeData();
        }
    }
    
    private function initializeData() {
        $sampleListings = [
            [
                'id' => '1',
                'title' => '3-xonali kvartira Chilonzorda',
                'description' => 'Yangi qurilgan binoda, barcha qulayliklar bilan',
                'price' => 85000000,
                'type' => 'sale',
                'category' => 'apartment',
                'location' => 'Chilonzor tumani, Toshkent',
                'rooms' => 3,
                'area' => 75,
                'floor' => 5,
                'total_floors' => 9,
                'phone' => '+998901234567',
                'image' => 'images/apartment1.jpg',
                'images' => ['images/apartment1.jpg', 'images/apartment1-2.jpg'],
                'features' => ['Yangi ta\'mir', 'Lift', 'Parking', 'Xavfsizlik'],
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
                'status' => 'active',
                'views' => 45,
                'owner_id' => 'user1'
            ],
            [
                'id' => '2',
                'title' => 'Hovli uy Sergeli tumani',
                'description' => 'Katta hovli, meva daraxtlari bilan',
                'price' => 2500000,
                'type' => 'rent',
                'category' => 'house',
                'location' => 'Sergeli tumani, Toshkent',
                'rooms' => 4,
                'area' => 120,
                'land_area' => 300,
                'phone' => '+998901234568',
                'image' => 'images/house1.jpg',
                'images' => ['images/house1.jpg', 'images/house1-2.jpg'],
                'features' => ['Hovli', 'Garaj', 'Meva daraxtlari', 'Quduq'],
                'created_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-1 day')),
                'status' => 'active',
                'views' => 32,
                'owner_id' => 'user2'
            ],
            [
                'id' => '3',
                'title' => 'Tijorat binosi Amir Temur ko\'chasi',
                'description' => 'Shahar markazida joylashgan ofis binosi',
                'price' => 150000000,
                'type' => 'sale',
                'category' => 'commercial',
                'location' => 'Amir Temur ko\'chasi, Toshkent',
                'area' => 200,
                'floor' => 2,
                'total_floors' => 3,
                'phone' => '+998901234569',
                'image' => 'images/commercial1.jpg',
                'images' => ['images/commercial1.jpg'],
                'features' => ['Shahar markazi', 'Parking', 'Lift', 'Konditsioner'],
                'created_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
                'updated_at' => date('Y-m-d H:i:s', strtotime('-2 days')),
                'status' => 'active',
                'views' => 67,
                'owner_id' => 'user3'
            ]
        ];
        
        file_put_contents($this->dataFile, json_encode($sampleListings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    private function getListings() {
        if (!file_exists($this->dataFile)) {
            return [];
        }
        
        $data = file_get_contents($this->dataFile);
        return json_decode($data, true) ?: [];
    }
    
    private function saveListings($listings) {
        return file_put_contents($this->dataFile, json_encode($listings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = $_GET['action'] ?? '';
        
        switch ($method) {
            case 'GET':
                if ($path === 'stats') {
                    $this->getStats();
                } elseif (isset($_GET['id'])) {
                    $this->getListing($_GET['id']);
                } else {
                    $this->getAllListings();
                }
                break;
                
            case 'POST':
                $this->createListing();
                break;
                
            case 'PUT':
                if (isset($_GET['id'])) {
                    $this->updateListing($_GET['id']);
                }
                break;
                
            case 'DELETE':
                if (isset($_GET['id'])) {
                    $this->deleteListing($_GET['id']);
                }
                break;
                
            default:
                $this->sendResponse(['error' => 'Method not allowed'], 405);
        }
    }
    
    private function getAllListings() {
        $listings = $this->getListings();
        
        // Filter by parameters
        $type = $_GET['type'] ?? null;
        $category = $_GET['category'] ?? null;
        $search = $_GET['search'] ?? null;
        $limit = (int)($_GET['limit'] ?? 20);
        $offset = (int)($_GET['offset'] ?? 0);
        
        // Apply filters
        if ($type) {
            $listings = array_filter($listings, fn($l) => $l['type'] === $type);
        }
        
        if ($category) {
            $listings = array_filter($listings, fn($l) => $l['category'] === $category);
        }
        
        if ($search) {
            $search = strtolower($search);
            $listings = array_filter($listings, function($l) use ($search) {
                return strpos(strtolower($l['title']), $search) !== false ||
                       strpos(strtolower($l['location']), $search) !== false ||
                       strpos(strtolower($l['description'] ?? ''), $search) !== false;
            });
        }
        
        // Sort by created_at desc
        usort($listings, fn($a, $b) => strtotime($b['created_at']) - strtotime($a['created_at']));
        
        // Pagination
        $total = count($listings);
        $listings = array_slice($listings, $offset, $limit);
        
        $this->sendResponse([
            'success' => true,
            'listings' => array_values($listings),
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset
        ]);
    }
    
    private function getListing($id) {
        $listings = $this->getListings();
        $listing = array_filter($listings, fn($l) => $l['id'] === $id);
        
        if (empty($listing)) {
            $this->sendResponse(['error' => 'Listing not found'], 404);
            return;
        }
        
        $listing = array_values($listing)[0];
        
        // Increment views
        $listing['views'] = ($listing['views'] ?? 0) + 1;
        $this->updateListingData($id, $listing);
        
        $this->sendResponse([
            'success' => true,
            'listing' => $listing
        ]);
    }
    
    private function createListing() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            $this->sendResponse(['error' => 'Invalid JSON'], 400);
            return;
        }
        
        // Validate required fields
        $required = ['title', 'price', 'type', 'location', 'phone'];
        foreach ($required as $field) {
            if (empty($input[$field])) {
                $this->sendResponse(['error' => "Field '$field' is required"], 400);
                return;
            }
        }
        
        $listings = $this->getListings();
        
        $newListing = [
            'id' => uniqid(),
            'title' => $input['title'],
            'description' => $input['description'] ?? '',
            'price' => (int)$input['price'],
            'type' => $input['type'],
            'category' => $input['category'] ?? 'apartment',
            'location' => $input['location'],
            'rooms' => (int)($input['rooms'] ?? 0),
            'area' => (int)($input['area'] ?? 0),
            'floor' => (int)($input['floor'] ?? 0),
            'total_floors' => (int)($input['total_floors'] ?? 0),
            'land_area' => (int)($input['land_area'] ?? 0),
            'phone' => $input['phone'],
            'image' => $input['image'] ?? '',
            'images' => $input['images'] ?? [],
            'features' => $input['features'] ?? [],
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
            'status' => 'pending',
            'views' => 0,
            'owner_id' => $input['owner_id'] ?? 'anonymous'
        ];
        
        $listings[] = $newListing;
        $this->saveListings($listings);
        
        $this->sendResponse([
            'success' => true,
            'listing' => $newListing,
            'message' => 'E\'lon muvaffaqiyatli qo\'shildi'
        ], 201);
    }
    
    private function updateListing($id) {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            $this->sendResponse(['error' => 'Invalid JSON'], 400);
            return;
        }
        
        $listings = $this->getListings();
        $index = array_search($id, array_column($listings, 'id'));
        
        if ($index === false) {
            $this->sendResponse(['error' => 'Listing not found'], 404);
            return;
        }
        
        // Update fields
        $updatable = ['title', 'description', 'price', 'type', 'category', 'location', 
                     'rooms', 'area', 'floor', 'total_floors', 'land_area', 'phone', 
                     'image', 'images', 'features', 'status'];
        
        foreach ($updatable as $field) {
            if (isset($input[$field])) {
                $listings[$index][$field] = $input[$field];
            }
        }
        
        $listings[$index]['updated_at'] = date('Y-m-d H:i:s');
        
        $this->saveListings($listings);
        
        $this->sendResponse([
            'success' => true,
            'listing' => $listings[$index],
            'message' => 'E\'lon yangilandi'
        ]);
    }
    
    private function updateListingData($id, $data) {
        $listings = $this->getListings();
        $index = array_search($id, array_column($listings, 'id'));
        
        if ($index !== false) {
            $listings[$index] = $data;
            $this->saveListings($listings);
        }
    }
    
    private function deleteListing($id) {
        $listings = $this->getListings();
        $listings = array_filter($listings, fn($l) => $l['id'] !== $id);
        
        $this->saveListings(array_values($listings));
        
        $this->sendResponse([
            'success' => true,
            'message' => 'E\'lon o\'chirildi'
        ]);
    }
    
    private function getStats() {
        $listings = $this->getListings();
        
        $stats = [
            'total_listings' => count($listings),
            'active_listings' => count(array_filter($listings, fn($l) => $l['status'] === 'active')),
            'pending_listings' => count(array_filter($listings, fn($l) => $l['status'] === 'pending')),
            'sale_listings' => count(array_filter($listings, fn($l) => $l['type'] === 'sale')),
            'rent_listings' => count(array_filter($listings, fn($l) => $l['type'] === 'rent')),
            'total_views' => array_sum(array_column($listings, 'views')),
            'today_listings' => count(array_filter($listings, function($l) {
                return date('Y-m-d', strtotime($l['created_at'])) === date('Y-m-d');
            }))
        ];
        
        $this->sendResponse([
            'success' => true,
            'stats' => $stats
        ]);
    }
    
    private function sendResponse($data, $code = 200) {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Handle the request
$api = new EnhancedListingsAPI();
$api->handleRequest();
?>