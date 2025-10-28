<?php
session_start();
require_once '../config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Rate limiting
$clientIP = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
if (!rateLimit($clientIP, 20, 3600)) {
    http_response_code(429);
    echo json_encode(['success' => false, 'error' => 'Too many requests']);
    exit;
}

// Check if file was uploaded
if (!isset($_FILES['image'])) {
    echo json_encode(['success' => false, 'error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['image'];

// Validate file
$validation = validateImageFile($file);
if (!$validation['valid']) {
    echo json_encode(['success' => false, 'error' => $validation['error']]);
    exit;
}

$mimeType = $validation['mime_type'];

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = uniqid() . '.' . strtolower($extension);
$uploadPath = UPLOAD_DIR . $filename;

// Create upload directory if it doesn't exist
if (!is_dir(UPLOAD_DIR)) {
    mkdir(UPLOAD_DIR, 0755, true);
}

// Move uploaded file
if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
    // Optimize image
    optimizeImage($uploadPath, $mimeType);
    
    echo json_encode([
        'success' => true,
        'filename' => $filename,
        'url' => 'uploads/' . $filename,
        'size' => filesize($uploadPath)
    ]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to save file']);
}

function optimizeImage($filePath, $mimeType) {
    $maxWidth = 1200;
    $maxHeight = 800;
    $quality = 85;
    
    switch ($mimeType) {
        case 'image/jpeg':
            $image = imagecreatefromjpeg($filePath);
            break;
        case 'image/png':
            $image = imagecreatefrompng($filePath);
            break;
        case 'image/webp':
            $image = imagecreatefromwebp($filePath);
            break;
        default:
            return;
    }
    
    if (!$image) return;
    
    $width = imagesx($image);
    $height = imagesy($image);
    
    // Calculate new dimensions
    if ($width > $maxWidth || $height > $maxHeight) {
        $ratio = min($maxWidth / $width, $maxHeight / $height);
        $newWidth = round($width * $ratio);
        $newHeight = round($height * $ratio);
        
        $resized = imagecreatetruecolor($newWidth, $newHeight);
        
        // Preserve transparency for PNG
        if ($mimeType === 'image/png') {
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
        }
        
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        
        // Save optimized image
        switch ($mimeType) {
            case 'image/jpeg':
                imagejpeg($resized, $filePath, $quality);
                break;
            case 'image/png':
                imagepng($resized, $filePath, 9);
                break;
            case 'image/webp':
                imagewebp($resized, $filePath, $quality);
                break;
        }
        
        imagedestroy($resized);
    }
    
    imagedestroy($image);
}
?>