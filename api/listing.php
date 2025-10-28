<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$db = getDB();
$id = intval($_GET['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid ID']);
    exit;
}

$listing = $db->find('listings', $id);

if (!$listing) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Listing not found']);
    exit;
}

// Increment views
$listing['views'] = ($listing['views'] ?? 0) + 1;
$listings = $db->read('listings');
foreach ($listings as &$l) {
    if ($l['id'] == $id) {
        $l['views'] = $listing['views'];
        $l['updated_at'] = date('Y-m-d H:i:s');
        break;
    }
}
$db->write('listings', $listings);

echo json_encode(['success' => true, 'listing' => $listing]);
?>