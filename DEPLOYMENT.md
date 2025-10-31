# 🚀 Sara Uylar - Production Deployment Guide

## Pre-Deployment Checklist

### 🔧 Server Requirements
- **PHP**: 8.0+ with extensions (GD, cURL, JSON, mbstring)
- **Web Server**: Apache/Nginx with SSL
- **Storage**: 10GB+ free space
- **Memory**: 512MB+ RAM
- **SSL Certificate**: Valid HTTPS certificate

### 📁 File Structure Preparation
```bash
sara-uylar/
├── api/                 # API endpoints
├── admin/              # Admin panel
├── css/                # Stylesheets
├── js/                 # JavaScript files
├── data/               # JSON data files (755)
├── uploads/            # User uploads (755)
├── logs/               # Log files (755)
├── cache/              # Cache files (755)
├── images/             # Static images
├── config-secure.php   # Secure config (600)
├── .htaccess          # Apache config
└── index.html         # Main app
```

## 🔐 Security Configuration

### 1. Environment Setup
```bash
# Create secure config
cp config-secure.php config.php

# Set proper permissions
chmod 600 config.php
chmod 755 data/ uploads/ logs/ cache/
chmod 644 *.html *.css *.js
chmod 644 api/*.php admin/*.php
```

### 2. Configure Bot Settings
```php
// config.php
define('BOT_TOKEN', 'YOUR_ACTUAL_BOT_TOKEN');
define('BOT_USERNAME', 'YourBotUsername');
define('WEBAPP_URL', 'https://yourdomain.com');
define('ADMIN_ID', 'YOUR_TELEGRAM_ID');
define('CHANNEL_ID', '@your_channel');
```

### 3. SSL Certificate
```bash
# Let's Encrypt (recommended)
certbot --apache -d yourdomain.com -d www.yourdomain.com

# Or upload your SSL certificate
# - certificate.crt
# - private.key
# - ca_bundle.crt
```

## 🤖 Bot Configuration

### 1. Set Webhook
```bash
# Method 1: Using setup script
https://yourdomain.com/setup_bot.php

# Method 2: Manual API call
curl -X POST "https://api.telegram.org/bot{BOT_TOKEN}/setWebhook" \
     -d "url=https://yourdomain.com/bot.php" \
     -d "allowed_updates=[\"message\",\"callback_query\",\"inline_query\"]"
```

### 2. Bot Commands Setup
```bash
curl -X POST "https://api.telegram.org/bot{BOT_TOKEN}/setMyCommands" \
     -H "Content-Type: application/json" \
     -d '{
       "commands": [
         {"command": "start", "description": "🏠 Botni ishga tushirish"},
         {"command": "help", "description": "❓ Yordam va ko'\''rsatmalar"},
         {"command": "stats", "description": "📊 Platform statistikasi"},
         {"command": "profile", "description": "👤 Foydalanuvchi profili"}
       ]
     }'
```

### 3. Web App Domain
```bash
curl -X POST "https://api.telegram.org/bot{BOT_TOKEN}/setChatMenuButton" \
     -H "Content-Type: application/json" \
     -d '{
       "menu_button": {
         "type": "web_app",
         "text": "🏠 Sara Uylar",
         "web_app": {"url": "https://yourdomain.com"}
       }
     }'
```

## 📊 Database Initialization

### 1. Create Data Files
```bash
# Initialize JSON files
echo '[]' > data/listings.json
echo '[]' > data/users.json
echo '[]' > data/blocked_users.json
echo '{}' > data/rate_limit.json
echo '{}' > data/settings.json

# Set permissions
chmod 644 data/*.json
```

### 2. Default Settings
```json
// data/settings.json
{
  "platform_name": "Sara Uylar",
  "max_listings_per_user": 10,
  "auto_approve": false,
  "maintenance_mode": false,
  "channel_posting": true,
  "rate_limiting": true
}
```

## 🌐 Web Server Configuration

### Apache (.htaccess)
```apache
# Already configured in .htaccess file
# Includes security headers, compression, caching
```

### Nginx (alternative)
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    root /var/www/sara-uylar;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # API routes
    location /api/ {
        try_files $uri $uri/ =404;
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
            fastcgi_index index.php;
            include fastcgi_params;
        }
    }
    
    # Bot webhook
    location /bot.php {
        fastcgi_pass unix:/var/run/php/php8.0-fpm.sock;
        include fastcgi_params;
    }
    
    # Static files caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 📱 PWA Configuration

### 1. Service Worker Registration
```javascript
// Already configured in app.js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
```

### 2. Manifest File
```json
// manifest.json - already configured
{
  "name": "Sara Uylar",
  "short_name": "Sara Uylar",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#667eea"
}
```

## 🔍 Testing & Validation

### 1. Functionality Tests
```bash
# Test bot webhook
curl -X POST "https://yourdomain.com/test_bot.php"

# Test API endpoints
curl "https://yourdomain.com/api/listings.php"

# Test web app
curl "https://yourdomain.com/"
```

### 2. Security Tests
```bash
# SSL test
curl -I https://yourdomain.com

# Security headers test
curl -I https://yourdomain.com | grep -E "(X-Frame|X-XSS|X-Content)"

# File permissions test
ls -la data/ uploads/ logs/
```

### 3. Performance Tests
```bash
# Page load speed
curl -w "@curl-format.txt" -o /dev/null -s "https://yourdomain.com"

# API response time
time curl "https://yourdomain.com/api/listings.php"
```

## 📊 Monitoring Setup

### 1. Log Monitoring
```bash
# Create log rotation
cat > /etc/logrotate.d/sara-uylar << EOF
/var/www/sara-uylar/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 www-data www-data
}
EOF
```

### 2. Health Check Endpoint
```php
// health-check.php - already created
// Returns system status and metrics
```

### 3. Uptime Monitoring
```bash
# Add to crontab
*/5 * * * * curl -f https://yourdomain.com/health-check.php || echo "Site down" | mail admin@yourdomain.com
```

## 🔄 Backup Strategy

### 1. Automated Backup Script
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/sara-uylar"
SOURCE_DIR="/var/www/sara-uylar"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup files
tar -czf $BACKUP_DIR/sara-uylar_$DATE.tar.gz \
    --exclude='logs/*' \
    --exclude='cache/*' \
    --exclude='uploads/temp/*' \
    $SOURCE_DIR

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: sara-uylar_$DATE.tar.gz"
```

### 2. Schedule Backups
```bash
# Add to crontab
0 2 * * * /path/to/backup.sh
```

## 🚨 Emergency Procedures

### 1. Maintenance Mode
```php
// Enable in config.php
define('MAINTENANCE_MODE', true);

// Or create maintenance.html
```

### 2. Quick Rollback
```bash
# Restore from backup
cd /var/www
tar -xzf /backups/sara-uylar/sara-uylar_YYYYMMDD_HHMMSS.tar.gz
```

### 3. Bot Disable
```bash
# Remove webhook
curl -X POST "https://api.telegram.org/bot{BOT_TOKEN}/deleteWebhook"
```

## ✅ Post-Deployment Checklist

### Immediate (0-1 hour)
- [ ] SSL certificate working
- [ ] Bot responding to /start
- [ ] Web app loading
- [ ] API endpoints working
- [ ] Admin panel accessible
- [ ] File uploads working

### Short-term (1-24 hours)
- [ ] Monitoring alerts configured
- [ ] Backup system tested
- [ ] Performance metrics baseline
- [ ] Security scan completed
- [ ] User acceptance testing

### Long-term (1-7 days)
- [ ] Log analysis setup
- [ ] Performance optimization
- [ ] User feedback collection
- [ ] Documentation updated
- [ ] Team training completed

## 📞 Support Contacts

### Technical Issues
- **Primary**: System Administrator
- **Secondary**: Development Team
- **Emergency**: 24/7 Support Hotline

### Escalation Matrix
1. **Level 1**: Basic troubleshooting
2. **Level 2**: Advanced technical issues
3. **Level 3**: Critical system failures

---

**🎯 Success Metrics:**
- Uptime: 99.9%+
- Response time: <2s
- Error rate: <0.1%
- User satisfaction: 95%+

**📅 Review Schedule:**
- Daily: System health
- Weekly: Performance metrics
- Monthly: Security audit
- Quarterly: Full system review