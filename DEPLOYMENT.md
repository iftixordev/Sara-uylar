# Sara Uylar - Deployment Guide

## 🚀 Production Deployment

### 1. Server Talablari
- PHP 8.0+
- Apache/Nginx
- SSL sertifikat
- 500MB disk space
- Telegram Bot API access

### 2. Fayllarni Yuklash
```bash
# Git orqali
git clone <repository-url>
cd Sara-uylar

# Yoki ZIP fayl orqali
unzip sara-uylar.zip
cd Sara-uylar
```

### 3. Ruxsatlar O'rnatish
```bash
# Papka ruxsatlari
chmod 755 uploads/
chmod 755 data/
chmod 644 data/*.json

# Fayl ruxsatlari
chmod 644 *.php
chmod 644 *.html
chmod 644 *.css
chmod 644 *.js
```

### 4. Konfiguratsiya
`config.php` faylini tahrirlang:
```php
define('BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE');
define('WEBAPP_URL', 'https://your-domain.com');
define('ADMIN_ID', 'YOUR_TELEGRAM_ID');
```

### 5. Bot O'rnatish
1. Brauzerda ochish: `https://your-domain.com/setup_bot.php`
2. Webhook muvaffaqiyatli o'rnatilganini tekshirish
3. Bot test: `https://your-domain.com/test_bot.php`

### 6. Web App Test
1. Brauzerda ochish: `https://your-domain.com`
2. Barcha funksiyalarni test qilish
3. Telegram bot orqali test qilish

### 7. SSL Sertifikat
```bash
# Let's Encrypt (masalan)
certbot --apache -d your-domain.com
```

### 8. Apache Konfiguratsiya
`.htaccess` fayl avtomatik ishlaydi, lekin qo'shimcha sozlamalar:
```apache
<VirtualHost *:443>
    ServerName your-domain.com
    DocumentRoot /path/to/sara-uylar
    
    SSLEngine on
    SSLCertificateFile /path/to/cert.pem
    SSLCertificateKeyFile /path/to/private.key
    
    # Security headers
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://telegram.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.telegram.org"
</VirtualHost>
```

### 9. Nginx Konfiguratsiya (agar Nginx ishlatilsa)
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    root /path/to/sara-uylar;
    index index.html index.php;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/private.key;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
        fastcgi_index index.php;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    }
    
    location /data/ {
        deny all;
    }
    
    location ~ /\. {
        deny all;
    }
}
```

## 🔧 Monitoring va Maintenance

### Log Fayllar
- Apache: `/var/log/apache2/error.log`
- PHP: `/var/log/php_errors.log`
- Bot: `data/bot_log.txt` (agar yoqilgan bo'lsa)

### Backup
```bash
# Kunlik backup
tar -czf sara-uylar-backup-$(date +%Y%m%d).tar.gz \
    --exclude='uploads/*' \
    Sara-uylar/

# Ma'lumotlar backup
cp data/*.json backup/
```

### Performance Monitoring
- Server load monitoring
- Database size monitoring
- Bot response time
- Web app performance

## 🛡️ Xavfsizlik

### 1. Fayl Ruxsatlari
```bash
# Xavfsiz ruxsatlar
find . -type f -name "*.php" -exec chmod 644 {} \;
find . -type f -name "*.json" -exec chmod 600 {} \;
find . -type d -exec chmod 755 {} \;
```

### 2. Bot Token Xavfsizligi
- Bot tokenni hech qachon public qilmang
- Environment variables ishlatish tavsiya etiladi
- Regular token rotation

### 3. Input Validation
- Barcha user input sanitize qilinadi
- File upload validation
- CSRF protection

### 4. Rate Limiting
```php
// config.php ga qo'shish
define('RATE_LIMIT_REQUESTS', 100);
define('RATE_LIMIT_WINDOW', 3600); // 1 hour
```

## 📊 Analytics va SEO

### Google Analytics
```html
<!-- index.html ga qo'shish -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Meta Tags
```html
<meta name="description" content="Professional ko'chmas mulk e'lonlari platformasi">
<meta name="keywords" content="uy, kvartira, sotish, ijara, ko'chmas mulk">
<meta property="og:title" content="Sara Uylar">
<meta property="og:description" content="Professional ko'chmas mulk platformasi">
<meta property="og:image" content="https://your-domain.com/images/og-image.jpg">
```

## 🔄 Updates va Versioning

### Git Workflow
```bash
# Production branch
git checkout production
git pull origin main
git tag v1.0.0
git push origin production --tags
```

### Database Migration
```php
// migration script
$version = '1.0.1';
if (!file_exists("data/version.txt") || file_get_contents("data/version.txt") < $version) {
    // Run migrations
    file_put_contents("data/version.txt", $version);
}
```

## 📞 Support va Troubleshooting

### Umumiy Muammolar

1. **Bot ishlamayapti**
   - Token to'g'riligini tekshiring
   - Webhook holatini tekshiring: `test_bot.php`
   - Server loglarini ko'ring

2. **Web app yuklanmayapti**
   - SSL sertifikat holatini tekshiring
   - JavaScript xatolarini browser console da ko'ring
   - Network tab da API so'rovlarini tekshiring

3. **Rasm yuklanmayapti**
   - `uploads/` papka ruxsatlarini tekshiring
   - PHP `upload_max_filesize` sozlamasini tekshiring
   - Disk space ni tekshiring

### Debug Mode
```php
// config.php ga qo'shish
define('DEBUG_MODE', true);
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}
```

### Performance Tuning
```php
// config.php optimizations
ini_set('memory_limit', '256M');
ini_set('max_execution_time', 30);
opcache_enable();
```

## 📈 Scaling

### Load Balancing
- Multiple server instances
- Database clustering
- CDN for static files

### Caching
```php
// Simple file cache
class Cache {
    public static function get($key) {
        $file = "cache/{$key}.cache";
        if (file_exists($file) && time() - filemtime($file) < 3600) {
            return unserialize(file_get_contents($file));
        }
        return null;
    }
    
    public static function set($key, $data) {
        file_put_contents("cache/{$key}.cache", serialize($data));
    }
}
```

Bu deployment guide loyihani production muhitida muvaffaqiyatli ishga tushirish uchun barcha kerakli ma'lumotlarni o'z ichiga oladi.