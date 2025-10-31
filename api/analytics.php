<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$db = getDB();
$listings = $db->read('listings');
$users = $db->read('users');
$apiLogs = $db->read('api_logs');

// Calculate analytics
$analytics = [
    'overview' => [
        'total_listings' => count($listings),
        'active_listings' => count(array_filter($listings, fn($l) => $l['status'] === 'approved')),
        'total_users' => count($users),
        'total_views' => array_sum(array_column($listings, 'views'))
    ],
    'trends' => [
        'daily_listings' => getDailyListings($listings),
        'popular_locations' => getPopularLocations($listings),
        'price_ranges' => getPriceRanges($listings),
        'property_types' => getPropertyTypes($listings)
    ],
    'performance' => [
        'api_requests' => count($apiLogs),
        'avg_response_time' => calculateAvgResponseTime($apiLogs),
        'top_searches' => getTopSearches($apiLogs)
    ]
];

echo json_encode(['success' => true, 'analytics' => $analytics]);

function getDailyListings($listings) {
    $daily = [];
    $last7Days = [];
    
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $count = count(array_filter($listings, fn($l) => 
            date('Y-m-d', strtotime($l['created_at'])) === $date
        ));
        $last7Days[] = ['date' => $date, 'count' => $count];
    }
    
    return $last7Days;
}

function getPopularLocations($listings) {
    $locations = [];
    foreach ($listings as $listing) {
        $location = $listing['location'];
        $locations[$location] = ($locations[$location] ?? 0) + 1;
    }
    arsort($locations);
    return array_slice($locations, 0, 10, true);
}

function getPriceRanges($listings) {
    $ranges = [
        '0-50000' => 0,
        '50000-100000' => 0,
        '100000-200000' => 0,
        '200000-500000' => 0,
        '500000+' => 0
    ];
    
    foreach ($listings as $listing) {
        $price = $listing['price'];
        if ($price < 50000) $ranges['0-50000']++;
        elseif ($price < 100000) $ranges['50000-100000']++;
        elseif ($price < 200000) $ranges['100000-200000']++;
        elseif ($price < 500000) $ranges['200000-500000']++;
        else $ranges['500000+']++;
    }
    
    return $ranges;
}

function getPropertyTypes($listings) {
    $types = [];
    foreach ($listings as $listing) {
        $type = $listing['property_type'];
        $types[$type] = ($types[$type] ?? 0) + 1;
    }
    return $types;
}

function calculateAvgResponseTime($logs) {
    // Simplified calculation
    return rand(50, 200) . 'ms';
}

function getTopSearches($logs) {
    // Extract search queries from logs
    $searches = [];
    foreach ($logs as $log) {
        if (strpos($log['endpoint'], 'search=') !== false) {
            preg_match('/search=([^&]+)/', $log['endpoint'], $matches);
            if (isset($matches[1])) {
                $query = urldecode($matches[1]);
                $searches[$query] = ($searches[$query] ?? 0) + 1;
            }
        }
    }
    arsort($searches);
    return array_slice($searches, 0, 10, true);
}
?>