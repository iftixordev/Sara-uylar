<?php
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$query = sanitize($_GET['q'] ?? '');
$db = getDB();
$listings = $db->read('listings');

if (empty($query)) {
    echo json_encode(['success' => false, 'error' => 'Query required']);
    exit;
}

// Smart search algorithm
$results = smartSearch($listings, $query);

// Save search query for analytics
saveSearchQuery($query, count($results));

echo json_encode([
    'success' => true,
    'query' => $query,
    'results' => $results,
    'suggestions' => generateSuggestions($query, $listings),
    'filters' => generateSmartFilters($results)
]);

function smartSearch($listings, $query) {
    $results = [];
    $query = strtolower($query);
    
    foreach ($listings as $listing) {
        if ($listing['status'] !== 'approved') continue;
        
        $score = 0;
        $searchText = strtolower(implode(' ', [
            $listing['title'],
            $listing['description'] ?? '',
            $listing['location'],
            $listing['property_type']
        ]));
        
        // Exact match in title (highest score)
        if (strpos(strtolower($listing['title']), $query) !== false) {
            $score += 100;
        }
        
        // Match in location
        if (strpos(strtolower($listing['location']), $query) !== false) {
            $score += 80;
        }
        
        // Match in description
        if (strpos(strtolower($listing['description'] ?? ''), $query) !== false) {
            $score += 60;
        }
        
        // Property type match
        if (strpos(strtolower($listing['property_type']), $query) !== false) {
            $score += 70;
        }
        
        // Fuzzy matching for typos
        $words = explode(' ', $query);
        foreach ($words as $word) {
            if (strlen($word) > 3) {
                $similarity = 0;
                similar_text($word, $searchText, $similarity);
                if ($similarity > 70) {
                    $score += $similarity / 2;
                }
            }
        }
        
        // Number matching (price, rooms, area)
        if (is_numeric($query)) {
            $num = floatval($query);
            if ($listing['price'] == $num || $listing['rooms'] == $num || $listing['area'] == $num) {
                $score += 90;
            }
        }
        
        if ($score > 0) {
            $listing['search_score'] = $score;
            $results[] = $listing;
        }
    }
    
    // Sort by score
    usort($results, fn($a, $b) => $b['search_score'] <=> $a['search_score']);
    
    return array_slice($results, 0, 20);
}

function generateSuggestions($query, $listings) {
    $suggestions = [];
    
    // Location suggestions
    $locations = array_unique(array_column($listings, 'location'));
    foreach ($locations as $location) {
        if (stripos($location, $query) !== false) {
            $suggestions[] = $location;
        }
    }
    
    // Property type suggestions
    $types = ['kvartira', 'uy', 'tijorat', 'ofis'];
    foreach ($types as $type) {
        if (stripos($type, $query) !== false) {
            $suggestions[] = $type;
        }
    }
    
    // Popular searches
    $popular = ['3 xonali kvartira', 'yangi bino', 'markazda', 'arzon uy'];
    foreach ($popular as $pop) {
        if (stripos($pop, $query) !== false) {
            $suggestions[] = $pop;
        }
    }
    
    return array_unique(array_slice($suggestions, 0, 5));
}

function generateSmartFilters($results) {
    if (empty($results)) return [];
    
    $priceRanges = [];
    $locations = [];
    $types = [];
    
    foreach ($results as $result) {
        // Price ranges
        $price = $result['price'];
        if ($price < 50000) $priceRanges['0-50k'] = ($priceRanges['0-50k'] ?? 0) + 1;
        elseif ($price < 100000) $priceRanges['50k-100k'] = ($priceRanges['50k-100k'] ?? 0) + 1;
        elseif ($price < 200000) $priceRanges['100k-200k'] = ($priceRanges['100k-200k'] ?? 0) + 1;
        else $priceRanges['200k+'] = ($priceRanges['200k+'] ?? 0) + 1;
        
        // Locations
        $locations[$result['location']] = ($locations[$result['location']] ?? 0) + 1;
        
        // Types
        $types[$result['property_type']] = ($types[$result['property_type']] ?? 0) + 1;
    }
    
    return [
        'price_ranges' => $priceRanges,
        'locations' => array_slice($locations, 0, 5, true),
        'property_types' => $types
    ];
}

function saveSearchQuery($query, $resultCount) {
    $searchFile = DATA_DIR . 'search_queries.json';
    $searches = file_exists($searchFile) ? json_decode(file_get_contents($searchFile), true) : [];
    
    $searches[] = [
        'query' => $query,
        'result_count' => $resultCount,
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];
    
    // Keep only last 1000 searches
    $searches = array_slice($searches, -1000);
    file_put_contents($searchFile, json_encode($searches));
}
?>