<?php
header('Content-Type: application/json');

class ImageOptimizer {
    private $maxWidth = 1200;
    private $maxHeight = 800;
    private $quality = 85;
    private $allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    private $maxFileSize = 5 * 1024 * 1024; // 5MB
    
    public function optimize($inputPath, $outputPath = null) {
        if (!file_exists($inputPath)) {
            throw new Exception('Fayl topilmadi');
        }
        
        $fileSize = filesize($inputPath);
        if ($fileSize > $this->maxFileSize) {
            throw new Exception('Fayl hajmi juda katta (maksimal 5MB)');
        }
        
        $imageInfo = getimagesize($inputPath);
        if (!$imageInfo) {
            throw new Exception('Noto\'g\'ri rasm formati');
        }
        
        $mimeType = $imageInfo['mime'];
        if (!in_array($mimeType, $this->allowedTypes)) {
            throw new Exception('Qo\'llab-quvvatlanmaydigan format');
        }
        
        $width = $imageInfo[0];
        $height = $imageInfo[1];
        
        // Kichik rasmlarni optimizatsiya qilmaslik
        if ($width <= $this->maxWidth && $height <= $this->maxHeight && $fileSize < 500000) {
            if ($outputPath && $outputPath !== $inputPath) {
                copy($inputPath, $outputPath);
            }
            return [
                'optimized' => false,
                'original_size' => $fileSize,
                'new_size' => $fileSize,
                'width' => $width,
                'height' => $height
            ];
        }
        
        // Yangi o'lchamlarni hisoblash
        $newDimensions = $this->calculateDimensions($width, $height);
        
        // Rasm yaratish
        $sourceImage = $this->createImageFromFile($inputPath, $mimeType);
        if (!$sourceImage) {
            throw new Exception('Rasmni o\'qib bo\'lmadi');
        }
        
        // Yangi rasm yaratish
        $newImage = imagecreatetruecolor($newDimensions['width'], $newDimensions['height']);
        
        // PNG uchun shaffoflikni saqlash
        if ($mimeType === 'image/png') {
            imagealphablending($newImage, false);
            imagesavealpha($newImage, true);
            $transparent = imagecolorallocatealpha($newImage, 255, 255, 255, 127);
            imagefill($newImage, 0, 0, $transparent);
        }
        
        // Rasmni kichraytirish
        imagecopyresampled(
            $newImage, $sourceImage,
            0, 0, 0, 0,
            $newDimensions['width'], $newDimensions['height'],
            $width, $height
        );
        
        // Saqlash
        $outputPath = $outputPath ?: $inputPath;
        $saved = $this->saveOptimizedImage($newImage, $outputPath, $mimeType);
        
        // Xotiradan tozalash
        imagedestroy($sourceImage);
        imagedestroy($newImage);
        
        if (!$saved) {
            throw new Exception('Rasmni saqlashda xatolik');
        }
        
        $newSize = filesize($outputPath);
        
        return [
            'optimized' => true,
            'original_size' => $fileSize,
            'new_size' => $newSize,
            'savings' => round((($fileSize - $newSize) / $fileSize) * 100, 1),
            'width' => $newDimensions['width'],
            'height' => $newDimensions['height']
        ];
    }
    
    private function calculateDimensions($width, $height) {
        $ratio = $width / $height;
        
        if ($width > $this->maxWidth || $height > $this->maxHeight) {
            if ($ratio > 1) {
                // Landscape
                $newWidth = $this->maxWidth;
                $newHeight = round($this->maxWidth / $ratio);
            } else {
                // Portrait
                $newHeight = $this->maxHeight;
                $newWidth = round($this->maxHeight * $ratio);
            }
        } else {
            $newWidth = $width;
            $newHeight = $height;
        }
        
        return [
            'width' => $newWidth,
            'height' => $newHeight
        ];
    }
    
    private function createImageFromFile($path, $mimeType) {
        switch ($mimeType) {
            case 'image/jpeg':
                return imagecreatefromjpeg($path);
            case 'image/png':
                return imagecreatefrompng($path);
            case 'image/webp':
                return imagecreatefromwebp($path);
            default:
                return false;
        }
    }
    
    private function saveOptimizedImage($image, $path, $mimeType) {
        switch ($mimeType) {
            case 'image/jpeg':
                return imagejpeg($image, $path, $this->quality);
            case 'image/png':
                // PNG uchun siqish darajasi 0-9
                $pngQuality = round((100 - $this->quality) / 10);
                return imagepng($image, $path, $pngQuality);
            case 'image/webp':
                return imagewebp($image, $path, $this->quality);
            default:
                return false;
        }
    }
    
    public function createThumbnail($inputPath, $outputPath, $size = 300) {
        if (!file_exists($inputPath)) {
            throw new Exception('Fayl topilmadi');
        }
        
        $imageInfo = getimagesize($inputPath);
        if (!$imageInfo) {
            throw new Exception('Noto\'g\'ri rasm formati');
        }
        
        $mimeType = $imageInfo['mime'];
        $width = $imageInfo[0];
        $height = $imageInfo[1];
        
        // Kvadrat thumbnail yaratish
        $minDimension = min($width, $height);
        $x = ($width - $minDimension) / 2;
        $y = ($height - $minDimension) / 2;
        
        $sourceImage = $this->createImageFromFile($inputPath, $mimeType);
        if (!$sourceImage) {
            throw new Exception('Rasmni o\'qib bo\'lmadi');
        }
        
        $thumbnail = imagecreatetruecolor($size, $size);
        
        // PNG uchun shaffoflik
        if ($mimeType === 'image/png') {
            imagealphablending($thumbnail, false);
            imagesavealpha($thumbnail, true);
            $transparent = imagecolorallocatealpha($thumbnail, 255, 255, 255, 127);
            imagefill($thumbnail, 0, 0, $transparent);
        }
        
        imagecopyresampled(
            $thumbnail, $sourceImage,
            0, 0, $x, $y,
            $size, $size, $minDimension, $minDimension
        );
        
        $saved = $this->saveOptimizedImage($thumbnail, $outputPath, $mimeType);
        
        imagedestroy($sourceImage);
        imagedestroy($thumbnail);
        
        return $saved;
    }
}

// API endpoint
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (!isset($_FILES['image'])) {
            throw new Exception('Rasm yuklanmadi');
        }
        
        $file = $_FILES['image'];
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('Fayl yuklashda xatolik');
        }
        
        $optimizer = new ImageOptimizer();
        
        // Fayl nomini yaratish
        $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid() . '.' . strtolower($extension);
        $uploadPath = '../uploads/' . $filename;
        
        // Vaqtinchalik faylni ko'chirish
        if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
            throw new Exception('Faylni saqlashda xatolik');
        }
        
        // Optimizatsiya
        $result = $optimizer->optimize($uploadPath);
        
        // Thumbnail yaratish
        $thumbnailPath = '../uploads/thumb_' . $filename;
        $optimizer->createThumbnail($uploadPath, $thumbnailPath, 300);
        
        echo json_encode([
            'success' => true,
            'filename' => $filename,
            'thumbnail' => 'thumb_' . $filename,
            'optimization' => $result,
            'url' => 'uploads/' . $filename,
            'thumbnail_url' => 'uploads/thumb_' . $filename
        ]);
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Faqat POST so\'rovlar qabul qilinadi'
    ]);
}
?>