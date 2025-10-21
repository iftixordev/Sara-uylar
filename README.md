# Sara Uylar - Telegram Web App

Professional ko'chmas mulk e'lonlari platformasi Telegram Web App sifatida.

## 🤖 Bot Funksiyalari

### Asosiy Buyruqlar
- `/start` - Botni ishga tushirish va asosiy menyu
- `/help` - Yordam va ko'rsatmalar
- `/stats` - Platform statistikasi
- `/profile` - Foydalanuvchi profili
- `/admin` - Admin panel (faqat admin uchun)

### Bot Xususiyatlari

#### 1. **Asosiy Menyu**
- 🏠 Sara Uylar - Web App ochish
- 🔍 Qidiruv - Inline qidiruv rejimi
- 📊 Statistika - Platform statistikasi
- 👤 Profil - Foydalanuvchi profili
- ❓ Yordam - Yordam ma'lumotlari

#### 2. **Inline Qidiruv**
- `@SaraUylarbot [qidiruv so'zi]` - E'lonlarni qidirish
- Real-time natijalar
- To'liq e'lon ma'lumotlari
- Tezkor bog'lanish

#### 3. **Foydalanuvchi Funksiyalari**
- Avtomatik profil yaratish
- E'lonlar statistikasi
- Tasdiqlash holati
- Shaxsiy e'lonlar ro'yxati

#### 4. **Admin Funksiyalari**
- E'lonlarni tasdiqlash/rad etish
- Platform statistikasi
- Foydalanuvchilar boshqaruvi
- Avtomatik bildirishnomalar

#### 5. **Bildirishnomalar**
- E'lon tasdiqlanganda
- E'lon rad etilganda
- Yangi xabarlar
- Tizim yangilanishlari

### Bot Sozlash

1. **Webhook o'rnatish:**
```bash
https://sarauylar.bigsaver.ru/setup_bot.php
```

2. **Bot test:**
```bash
https://sarauylar.bigsaver.ru/test_bot.php
```

3. **Bot debug:**
```bash
https://sarauylar.bigsaver.ru/debug_bot.php
```

### Bot Konfiguratsiyasi

```php
// config_secure.php da
define('BOT_TOKEN', 'your_bot_token');
define('WEBAPP_URL', 'https://your-domain.com');
define('ADMIN_ID', 'your_admin_id');
```

### Bot Fayllari

- `bot.php` - Asosiy bot handler
- `setup_bot.php` - Webhook sozlash
- `test_bot.php` - Bot test
- `debug_bot.php` - Debug va diagnostika

## 🌐 Web App Funksiyalari

### Sahifalar
- **Bosh sahifa** - E'lonlar ro'yxati va qidiruv
- **E'lon tafsilotlari** - To'liq ma'lumot va bog'lanish
- **E'lon qo'shish** - Yangi e'lon yaratish
- **Profil** - Foydalanuvchi ma'lumotlari
- **Qidiruv** - Kengaytirilgan qidiruv

### Xususiyatlar
- 📱 Responsive design
- 🌙 Tungi/kunduzgi rejim
- 🔍 Real-time qidiruv
- 📷 Rasm yuklash
- 💬 Tezkor bog'lanish
- ❤️ Sevimlilar
- 📤 Ulashish
- 🔄 Pull-to-refresh

## 🛠 Texnologiyalar

- **Backend:** PHP 8.0+
- **Frontend:** Vanilla JavaScript, Material Design
- **Ma'lumotlar:** JSON fayllar
- **Bot:** Telegram Bot API
- **Xavfsizlik:** CSRF, XSS, Input validation

## 📦 O'rnatish

### 1. Fayllarni serverga yuklash
```bash
git clone <repository-url>
cd Sara-uylar
```

### 2. Ruxsatlar berish
```bash
chmod 755 uploads/ data/
chmod 644 data/*.json
```

### 3. Konfiguratsiya
`config.php` faylida sozlamalarni o'zgartiring:
```php
define('BOT_TOKEN', 'your_bot_token_here');
define('WEBAPP_URL', 'https://your-domain.com');
define('ADMIN_ID', 'your_telegram_id');
```

### 4. Bot o'rnatish
```bash
# Webhook o'rnatish
https://your-domain.com/setup_bot.php

# Bot test qilish
https://your-domain.com/test_bot.php

# Debug (agar kerak bo'lsa)
https://your-domain.com/debug_bot.php
```

### 5. Web App test qilish
Brauzerda `https://your-domain.com` ochib test qiling

## 🔒 Xavfsizlik

- ✅ CSRF himoyasi
- ✅ XSS himoyasi
- ✅ Input sanitization
- ✅ File upload validation
- ✅ Rate limiting
- ✅ Secure headers

## 📊 Statistika

Bot va web app real-time statistika taqdim etadi:
- Jami e'lonlar soni
- Bugungi e'lonlar
- Foydalanuvchilar soni
- Ko'rishlar statistikasi

## 🚀 Deployment

1. Production serverga yuklash
2. SSL sertifikat o'rnatish
3. Bot webhook sozlash
4. Domain sozlash
5. Test va ishga tushirish

## 📞 Yordam

Muammolar yoki savollar uchun:
- Bot: @SaraUylarbot
- Inline: @SaraUylarbot [qidiruv]
- Web: https://sarauylar.bigsaver.ru

## 📄 Litsenziya

MIT License