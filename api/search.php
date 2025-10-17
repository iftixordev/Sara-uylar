<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$db = getDB();
$query = sanitize($_GET['q'] ?? '');
$type = sanitize($_GET['type'] ?? '');
$minPrice = floatval($_GET['min_price'] ?? 0);
$maxPrice = floatval($_GET['max_price'] ?? 0);

$listings = $db->read('listings');
$approved = array_filter($listings, fn($l) => ($l['status'] ?? 'approved') === 'approved');

// Search filter
if ($query) {
    $approved = array_filter($approved, function($listing) use ($query) {
        return stripos($listing['title'], $query) !== false ||
               stripos($listing['location'], $query) !== false ||
               stripos($listing['description'] ?? '', $query) !== false;
    });
}

// Type filter
if ($type) {
    $approved = array_filter($approved, fn($l) => $l['property_type'] === $type);
}

// Price filters
if ($minPrice > 0) {
    $approved = array_filter($approved, fn($l) => $l['price'] >= $minPrice);
}

if ($maxPrice > 0) {
    $approved = array_filter($approved, fn($l) => $l['price'] <= $maxPrice);
}

echo json_encode(['success' => true, 'listings' => array_values($approved)]);
?>