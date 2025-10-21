<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$db = getDB();
$query = sanitize($_GET['q'] ?? '');
$minPrice = floatval($_GET['min_price'] ?? 0);
$maxPrice = floatval($_GET['max_price'] ?? 0);
$propertyType = sanitize($_GET['property_type'] ?? '');
$rooms = intval($_GET['rooms'] ?? 0);
$minArea = floatval($_GET['min_area'] ?? 0);
$maxArea = floatval($_GET['max_area'] ?? 0);

$listings = $db->read('listings');
$approved = array_filter($listings, fn($l) => ($l['status'] ?? 'approved') === 'approved');

// Apply filters
$filtered = array_filter($approved, function($listing) use ($query, $minPrice, $maxPrice, $propertyType, $rooms, $minArea, $maxArea) {
    // Text search
    if ($query && !empty($query)) {
        $searchText = strtolower($listing['title'] . ' ' . $listing['location'] . ' ' . ($listing['description'] ?? ''));
        if (strpos($searchText, strtolower($query)) === false) {
            return false;
        }
    }
    
    // Price range
    if ($minPrice > 0 && $listing['price'] < $minPrice) return false;
    if ($maxPrice > 0 && $listing['price'] > $maxPrice) return false;
    
    // Property type
    if ($propertyType && $listing['property_type'] !== $propertyType) return false;
    
    // Rooms
    if ($rooms > 0 && $listing['rooms'] != $rooms) return false;
    
    // Area range
    if ($minArea > 0 && ($listing['area'] ?? 0) < $minArea) return false;
    if ($maxArea > 0 && ($listing['area'] ?? 0) > $maxArea) return false;
    
    return true;
});

echo json_encode([
    'success' => true,
    'listings' => array_values($filtered),
    'total' => count($filtered),
    'query' => $query
]);
?>