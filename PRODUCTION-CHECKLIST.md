# Sara Uylar - Production Checklist

## 🚀 Production Deployment Checklist

### 1. Server Requirements
- [ ] PHP 8.0+ installed
- [ ] Apache/Nginx web server
- [ ] SSL certificate configured
- [ ] Domain DNS configured
- [ ] Required PHP extensions: json, curl, gd

### 2. File Permissions
```bash
chmod 755 data/ uploads/ logs/
chmod 644 data/*.json
chmod 600 config.php
```

### 3. Configuration
- [ ] Update `BOT_TOKEN` in config.php
- [ ] Update `WEBAPP_URL` in config.php  
- [ ] Update `ADMIN_ID` in config.php
- [ ] Verify all paths are correct

### 4. Security Setup
- [ ] HTTPS enabled and working
- [ ] .htaccess file in place
- [ ] Security headers configured
- [ ] File upload restrictions active
- [ ] Directory browsing disabled

### 5. Bot Configuration
- [ ] Run `setup-production.php` to configure webhook
- [ ] Test bot with `/start` command
- [ ] Verify inline search works
- [ ] Test web app integration

### 6. Testing
- [ ] Health check: `/health-check.php`
- [ ] API endpoints working: `/api/listings.php`
- [ ] Image upload working: `/api/upload-image.php`
- [ ] Bot webhook receiving updates
- [ ] Web app loads correctly

### 7. Monitoring
- [ ] Error logs configured
- [ ] API request logging active
- [ ] Rate limiting working
- [ ] Performance monitoring setup

### 8. Backup
- [ ] Database backup strategy
- [ ] File backup strategy
- [ ] Configuration backup

## 🔧 Quick Setup Commands

1. **Initial Setup:**
```bash
# Upload files to server
# Set permissions
chmod -R 755 data/ uploads/ logs/
chmod 644 data/*.json

# Run production setup
https://yourdomain.com/setup-production.php
```

2. **Health Check:**
```bash
curl https://yourdomain.com/health-check.php
```

3. **Test Bot:**
```bash
https://yourdomain.com/test_bot.php
```

## 📊 Monitoring URLs

- **Health Check:** `/health-check.php`
- **Bot Test:** `/test_bot.php`
- **Debug Info:** `/debug_bot.php`
- **Setup:** `/setup-production.php`

## 🚨 Troubleshooting

### Common Issues:

1. **Bot not responding:**
   - Check webhook URL
   - Verify bot token
   - Check server logs

2. **File upload fails:**
   - Check upload directory permissions
   - Verify file size limits
   - Check PHP configuration

3. **API errors:**
   - Check error logs in `/logs/`
   - Verify database files exist
   - Check rate limiting

4. **Performance issues:**
   - Enable compression in .htaccess
   - Check server resources
   - Monitor API logs

## 📝 Maintenance

### Daily:
- [ ] Check error logs
- [ ] Monitor disk space
- [ ] Verify bot functionality

### Weekly:
- [ ] Clean old logs
- [ ] Backup data files
- [ ] Update dependencies

### Monthly:
- [ ] Security updates
- [ ] Performance review
- [ ] User feedback analysis

## 🔐 Security Notes

- Never expose config.php publicly
- Regularly update bot token if compromised
- Monitor for unusual API activity
- Keep server software updated
- Use strong file permissions

## 📞 Support

For issues or questions:
- Check logs in `/logs/` directory
- Use health check endpoint
- Review this checklist
- Contact system administrator