<?php
require_once 'config.php';

$input = file_get_contents('php://input');
$update = json_decode($input, true);

if (!$update) exit('OK');

// Log yozish
file_put_contents('bot_log.txt', date('Y-m-d H:i:s') . " - " . $input . "\n", FILE_APPEND);

$message = $update['message'] ?? null;
$callbackQuery = $update['callback_query'] ?? null;
$inlineQuery = $update['inline_query'] ?? null;

// Bloklangan foydalanuvchilarni tekshirish
function isUserBlocked($userId) {
    $blocked = json_decode(file_get_contents('data/blocked_users.json'), true) ?: [];
    return in_array($userId, $blocked);
}

// Rate limiting
function checkRateLimit($userId) {
    $rates = json_decode(file_get_contents('data/rate_limit.json'), true) ?: [];
    $now = time();
    $userKey = (string)$userId;
    
    // Eski ma'lumotlarni tozalash
    $rates = array_filter($rates, fn($time) => $now - $time < 60);
    
    // Foydalanuvchi so'rovlarini tekshirish
    $userRequests = array_filter($rates, fn($time, $key) => 
        strpos($key, $userKey . '_') === 0 && $now - $time < 60, ARRAY_FILTER_USE_BOTH);
    
    if (count($userRequests) >= 20) { // 20 ta so'rov/daqiqa
        return false;
    }
    
    // Yangi so'rovni qo'shish
    $rates[$userKey . '_' . $now] = $now;
    file_put_contents('data/rate_limit.json', json_encode($rates));
    
    return true;
}

// Message handler
if ($message) {
    $chatId = $message['chat']['id'];
    $userId = $message['from']['id'];
    $text = $message['text'] ?? '';
    $firstName = $message['from']['first_name'] ?? 'User';
    $lastName = $message['from']['last_name'] ?? '';
    $username = $message['from']['username'] ?? '';
    
    // Bloklangan foydalanuvchi tekshiruvi
    if (isUserBlocked($userId)) {
        sendMessage($chatId, "🚫 Sizning hisobingiz bloklangan. Qo'llab-quvvatlash bilan bog'laning: @SaraUylarSupport");
        exit('OK');
    }
    
    // Rate limiting
    if (!checkRateLimit($userId)) {
        sendMessage($chatId, "⏰ Juda tez xabar yuboryapsiz. Biroz kuting.");
        exit('OK');
    }
    
    // Foydalanuvchini saqlash
    saveUser($message['from']);
    
    // Deep link tekshirish
    if (strpos($text, '/start') === 0) {
        $parts = explode(' ', $text);
        if (count($parts) > 1) {
            $param = $parts[1];
            
            // Kanaldan kelgan e'lon
            if (strpos($param, 'listing_') === 0) {
                $listingId = str_replace('listing_', '', $param);
                showListingDetails($chatId, $listingId);
                exit('OK');
            }
            
            // Bog'lanish uchun
            if (strpos($param, 'contact_') === 0) {
                $ownerId = str_replace('contact_', '', $param);
                handleContactRequest($chatId, $userId, $ownerId);
                exit('OK');
            }
        }
        
        // Oddiy start
        handleStart($chatId, $firstName);
    }
    
    elseif ($text === '/help') {
        handleHelp($chatId);
    }
    
    elseif ($text === '/stats') {
        handleStats($chatId);
    }
    
    elseif ($text === '/profile') {
        handleProfile($chatId, $userId);
    }
    
    elseif ($text === '/admin' && $userId == ADMIN_ID) {
        handleAdmin($chatId);
    }
    
    elseif (strpos($text, '/') === 0) {
        sendMessage($chatId, "❓ Noma'lum buyruq. /help ni bosing.");
    }
    
    else {
        // Oddiy matn - qidiruv taklifi
        handleTextMessage($chatId, $text);
    }
}

// Callback query handler
if ($callbackQuery) {
    $chatId = $callbackQuery['message']['chat']['id'];
    $userId = $callbackQuery['from']['id'];
    $data = $callbackQuery['data'];
    $messageId = $callbackQuery['message']['message_id'];
    
    if (isUserBlocked($userId)) {
        answerCallback($callbackQuery['id'], "🚫 Hisobingiz bloklangan");
        exit('OK');
    }
    
    handleCallbackQuery($chatId, $userId, $data, $messageId, $callbackQuery['id']);
}

// Inline query handler
if ($inlineQuery) {
    $userId = $inlineQuery['from']['id'];
    
    if (isUserBlocked($userId)) {
        answerInlineQuery($inlineQuery['id'], []);
        exit('OK');
    }
    
    handleInlineQuery($inlineQuery);
}

// Functions
function handleStart($chatId, $firstName) {
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '🏠 Sara Uylar Platformasi', 'web_app' => ['url' => WEBAPP_URL]]
            ],
            [
                ['text' => '🔍 E\'lonlarni Qidirish', 'switch_inline_query_current_chat' => ''],
                ['text' => '➕ E\'lon Qo\'shish', 'web_app' => ['url' => WEBAPP_URL . '/#add']]
            ],
            [
                ['text' => '❤️ Sevimlilar', 'web_app' => ['url' => WEBAPP_URL . '/#favorites']],
                ['text' => '👤 Profil', 'web_app' => ['url' => WEBAPP_URL . '/#profile']]
            ],
            [
                ['text' => '📊 Statistika', 'callback_data' => 'stats'],
                ['text' => '❓ Yordam', 'callback_data' => 'help']
            ]
        ]
    ];
    
    $text = "🏠 *Sara Uylar*ga xush kelibsiz, {$firstName}!\n\n";
    $text .= "🌟 Professional ko'chmas mulk platformasi\n\n";
    $text .= "✨ *Imkoniyatlar:*\n";
    $text .= "• 🔍 Minglab e'lonlar orasidan qidiring\n";
    $text .= "• ➕ O'z e'loningizni qo'shing\n";
    $text .= "• ❤️ Yoqgan e'lonlarni saqlang\n";
    $text .= "• 💬 Egalar bilan to'g'ridan-to'g'ri bog'laning\n";
    $text .= "• 🌙 Tungi/kunduzgi rejim\n\n";
    $text .= "👇 Boshlash uchun kerakli tugmani tanlang!";
    
    sendMessage($chatId, $text, $keyboard);
}

function handleHelp($chatId) {
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '🏠 Platformaga O\'tish', 'web_app' => ['url' => WEBAPP_URL]]
            ],
            [
                ['text' => '🔍 Qidiruv Sinab Ko\'rish', 'switch_inline_query_current_chat' => 'kvartira']
            ],
            [
                ['text' => '🔙 Asosiy Menyu', 'callback_data' => 'main_menu']
            ]
        ]
    ];
    
    $text = "❓ *Sara Uylar - Yordam*\n\n";
    $text .= "🚀 *Qanday foydalanish:*\n\n";
    $text .= "1️⃣ 🏠 Platformani oching\n";
    $text .= "2️⃣ 🔍 E'lonlarni qidiring\n";
    $text .= "3️⃣ ❤️ Yoqganlarini saqlang\n";
    $text .= "4️⃣ ➕ O'z e'loningizni qo'shing\n\n";
    $text .= "💡 *Inline qidiruv:*\n";
    $text .= "@SaraUylarbot [qidiruv so'zi]\n\n";
    $text .= "📋 *Buyruqlar:*\n";
    $text .= "/start - Asosiy menyu\n";
    $text .= "/help - Yordam\n";
    $text .= "/stats - Statistika\n";
    $text .= "/profile - Profil\n\n";
    $text .= "🎯 Eng yaxshi tajriba uchun web app dan foydalaning!";
    
    sendMessage($chatId, $text, $keyboard);
}

function handleStats($chatId) {
    $listings = json_decode(file_get_contents('data/listings.json'), true) ?: [];
    $users = json_decode(file_get_contents('data/users.json'), true) ?: [];
    
    $active = array_filter($listings, fn($l) => ($l['status'] ?? 'pending') === 'active');
    $today = array_filter($active, fn($l) => date('Y-m-d', strtotime($l['created_at'])) === date('Y-m-d'));
    $week = array_filter($active, fn($l) => strtotime($l['created_at']) > strtotime('-7 days'));
    
    // Eng mashhur shaharlar
    $cities = [];
    foreach ($active as $listing) {
        $city = trim(explode(',', $listing['location'])[0]);
        $cities[$city] = ($cities[$city] ?? 0) + 1;
    }
    arsort($cities);
    $topCities = array_slice($cities, 0, 3, true);
    
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '🏠 E\'lonlarni Ko\'rish', 'web_app' => ['url' => WEBAPP_URL]]
            ],
            [
                ['text' => '🔄 Yangilash', 'callback_data' => 'stats'],
                ['text' => '🔙 Orqaga', 'callback_data' => 'main_menu']
            ]
        ]
    ];
    
    $text = "📊 *Sara Uylar Statistikasi*\n\n";
    $text .= "🏠 *E'lonlar:*\n";
    $text .= "• Jami faol: *" . count($active) . "* ta\n";
    $text .= "• Bugun: *" . count($today) . "* ta\n";
    $text .= "• Bu hafta: *" . count($week) . "* ta\n\n";
    
    $text .= "👥 *Foydalanuvchilar:*\n";
    $text .= "• Ro'yxatdan o'tgan: *" . count($users) . "* kishi\n";
    $text .= "• Faol: *" . count($users) . "* kishi\n\n";
    
    if (!empty($topCities)) {
        $text .= "🏙 *Mashhur shaharlar:*\n";
        foreach ($topCities as $city => $count) {
            $text .= "• {$city}: {$count} ta\n";
        }
        $text .= "\n";
    }
    
    $text .= "📈 Platform faol rivojlanmoqda!";
    
    sendMessage($chatId, $text, $keyboard);
}

function handleProfile($chatId, $userId) {
    $listings = json_decode(file_get_contents('data/listings.json'), true) ?: [];
    $users = json_decode(file_get_contents('data/users.json'), true) ?: [];
    
    $user = array_filter($users, fn($u) => $u['id'] == $userId)[0] ?? null;
    $userListings = array_filter($listings, fn($l) => $l['user_id'] == $userId);
    
    $active = array_filter($userListings, fn($l) => ($l['status'] ?? 'pending') === 'active');
    $pending = array_filter($userListings, fn($l) => ($l['status'] ?? 'pending') === 'pending');
    
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '🏠 Mening E\'lonlarim', 'web_app' => ['url' => WEBAPP_URL . '/#profile']]
            ],
            [
                ['text' => '➕ Yangi E\'lon', 'web_app' => ['url' => WEBAPP_URL . '/#add']],
                ['text' => '❤️ Sevimlilar', 'web_app' => ['url' => WEBAPP_URL . '/#favorites']]
            ],
            [
                ['text' => '🔙 Asosiy Menyu', 'callback_data' => 'main_menu']
            ]
        ]
    ];
    
    $text = "👤 *Sizning Profilingiz*\n\n";
    $text .= "📝 Ism: " . ($user['first_name'] ?? 'User');
    if (!empty($user['last_name'])) {
        $text .= " " . $user['last_name'];
    }
    $text .= "\n";
    
    if (!empty($user['username'])) {
        $text .= "🔗 Username: @{$user['username']}\n";
    }
    
    $text .= "🆔 ID: {$userId}\n\n";
    
    $text .= "📊 *E'lonlar statistikasi:*\n";
    $text .= "• Jami: *" . count($userListings) . "* ta\n";
    $text .= "• Faol: *" . count($active) . "* ta\n";
    $text .= "• Kutilayotgan: *" . count($pending) . "* ta\n\n";
    
    if (!empty($userListings)) {
        $totalViews = array_sum(array_column($userListings, 'views'));
        $text .= "👁 Jami ko'rishlar: *{$totalViews}*\n\n";
        
        // Eng mashhur e'lon
        $mostViewed = null;
        $maxViews = 0;
        foreach ($userListings as $listing) {
            if (($listing['views'] ?? 0) > $maxViews) {
                $maxViews = $listing['views'] ?? 0;
                $mostViewed = $listing;
            }
        }
        
        if ($mostViewed && $maxViews > 0) {
            $text .= "🏆 Eng mashhur:\n";
            $text .= "_{$mostViewed['title']}_ ({$maxViews} ko'rishlar)\n\n";
        }
    }
    
    $text .= "📅 Ro'yxatdan: " . date('d.m.Y', $user['join_date'] ?? time());
    
    sendMessage($chatId, $text, $keyboard);
}

function handleAdmin($chatId) {
    $listings = json_decode(file_get_contents('data/listings.json'), true) ?: [];
    $users = json_decode(file_get_contents('data/users.json'), true) ?: [];
    $blocked = json_decode(file_get_contents('data/blocked_users.json'), true) ?: [];
    
    $pending = array_filter($listings, fn($l) => ($l['status'] ?? 'pending') === 'pending');
    
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '📋 Kutilayotgan (' . count($pending) . ')', 'callback_data' => 'admin_pending']
            ],
            [
                ['text' => '📊 To\'liq Statistika', 'callback_data' => 'admin_stats'],
                ['text' => '👥 Foydalanuvchilar', 'callback_data' => 'admin_users']
            ],
            [
                ['text' => '🌐 Web Admin Panel', 'web_app' => ['url' => WEBAPP_URL . '/admin/']]
            ],
            [
                ['text' => '📢 Xabar Yuborish', 'callback_data' => 'admin_broadcast']
            ]
        ]
    ];
    
    $text = "👑 *Admin Panel*\n\n";
    $text .= "📊 *Tizim holati:*\n";
    $text .= "• Jami e'lonlar: *" . count($listings) . "*\n";
    $text .= "• Kutilayotgan: *" . count($pending) . "*\n";
    $text .= "• Foydalanuvchilar: *" . count($users) . "*\n";
    $text .= "• Bloklangan: *" . count($blocked) . "*\n\n";
    $text .= "⚡ Tezkor boshqaruv uchun web admin panel dan foydalaning!";
    
    sendMessage($chatId, $text, $keyboard);
}

function handleTextMessage($chatId, $text) {
    if (strlen(trim($text)) < 2) {
        return;
    }
    
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '🔍 "' . substr($text, 0, 20) . '" ni qidirish', 'switch_inline_query_current_chat' => $text]
            ],
            [
                ['text' => '🏠 Platformaga O\'tish', 'web_app' => ['url' => WEBAPP_URL . '?search=' . urlencode($text)]]
            ]
        ]
    ];
    
    $response = "🔍 *Qidiruv taklifi*\n\n";
    $response .= "Siz \"*{$text}*\" ni qidirmoqchimisiz?\n\n";
    $response .= "💡 Inline qidiruv yoki web app orqali qidiring!";
    
    sendMessage($chatId, $response, $keyboard);
}

function handleCallbackQuery($chatId, $userId, $data, $messageId, $callbackId) {
    switch ($data) {
        case 'stats':
            answerCallback($callbackId, '📊 Statistika yangilandi');
            handleStats($chatId);
            break;
            
        case 'main_menu':
            answerCallback($callbackId, '🏠 Asosiy menyu');
            $user = getUserById($userId);
            handleStart($chatId, $user['first_name'] ?? 'User');
            break;
            
        case 'help':
            answerCallback($callbackId, '❓ Yordam');
            handleHelp($chatId);
            break;
            
        case 'admin_pending':
            if ($userId != ADMIN_ID) {
                answerCallback($callbackId, '❌ Ruxsat yo\'q');
                return;
            }
            handleAdminPending($chatId, $callbackId);
            break;
            
        default:
            if (strpos($data, 'approve_') === 0) {
                if ($userId != ADMIN_ID) {
                    answerCallback($callbackId, '❌ Ruxsat yo\'q');
                    return;
                }
                $listingId = str_replace('approve_', '', $data);
                handleApprove($chatId, $listingId, $callbackId);
            }
            elseif (strpos($data, 'reject_') === 0) {
                if ($userId != ADMIN_ID) {
                    answerCallback($callbackId, '❌ Ruxsat yo\'q');
                    return;
                }
                $listingId = str_replace('reject_', '', $data);
                handleReject($chatId, $listingId, $callbackId);
            }
            else {
                answerCallback($callbackId, 'Noma\'lum buyruq');
            }
    }
}

function handleInlineQuery($inlineQuery) {
    $query = trim($inlineQuery['query']);
    $results = [];
    
    if (strlen($query) >= 2) {
        $listings = json_decode(file_get_contents('data/listings.json'), true) ?: [];
        $active = array_filter($listings, fn($l) => ($l['status'] ?? 'pending') === 'active');
        
        // Smart search
        $scored = [];
        foreach ($active as $listing) {
            $score = 0;
            $queryLower = mb_strtolower($query);
            
            // Title match
            if (stripos($listing['title'], $query) !== false) {
                $score += 10;
            }
            
            // Location match
            if (stripos($listing['location'], $query) !== false) {
                $score += 8;
            }
            
            // Description match
            if (!empty($listing['description']) && stripos($listing['description'], $query) !== false) {
                $score += 5;
            }
            
            // Property type match
            $typeMap = [
                'apartment' => ['kvartira', 'xonadon'],
                'house' => ['uy', 'hovli'],
                'commercial' => ['tijorat', 'biznes'],
                'office' => ['ofis', 'ishxona']
            ];
            
            foreach ($typeMap as $type => $keywords) {
                if ($listing['property_type'] === $type) {
                    foreach ($keywords as $keyword) {
                        if (stripos($queryLower, $keyword) !== false) {
                            $score += 6;
                            break;
                        }
                    }
                }
            }
            
            if ($score > 0) {
                $listing['search_score'] = $score;
                $scored[] = $listing;
            }
        }
        
        // Sort by score
        usort($scored, fn($a, $b) => $b['search_score'] - $a['search_score']);
        
        foreach (array_slice($scored, 0, 10) as $listing) {
            $description = substr($listing['description'] ?? '', 0, 80);
            if (strlen($listing['description'] ?? '') > 80) $description .= '...';
            
            $scoreEmoji = $listing['search_score'] > 15 ? '🎯' : ($listing['search_score'] > 10 ? '✨' : '📍');
            
            $results[] = [
                'type' => 'article',
                'id' => (string)$listing['id'],
                'title' => $scoreEmoji . ' ' . $listing['title'],
                'description' => "💰 $" . number_format($listing['price']) . " • 📍 " . $listing['location'],
                'input_message_content' => [
                    'message_text' => "🏠 *{$listing['title']}*\n\n" .
                                    "💰 Narx: $" . number_format($listing['price']) . "\n" .
                                    "📍 Joylashuv: {$listing['location']}\n" .
                                    "🚪 Xonalar: {$listing['rooms']}\n" .
                                    "📏 Maydon: {$listing['area']}m²\n" .
                                    "👁 Ko'rishlar: " . ($listing['views'] ?? 0) . "\n\n" .
                                    $description . "\n\n" .
                                    "🔗 To'liq ko'rish: " . WEBAPP_URL . "/#listing-{$listing['id']}",
                    'parse_mode' => 'Markdown'
                ],
                'reply_markup' => [
                    'inline_keyboard' => [
                        [
                            ['text' => '👁 To\'liq ko\'rish', 'web_app' => ['url' => WEBAPP_URL . "/#listing-{$listing['id']}"]],
                            ['text' => '💬 Bog\'lanish', 'url' => 'https://t.me/' . BOT_USERNAME . "?start=contact_{$listing['user_id']}"]
                        ]
                    ]
                ]
            ];
        }
        
        if (empty($results)) {
            $results[] = [
                'type' => 'article',
                'id' => 'no_results',
                'title' => '❌ Natija topilmadi',
                'description' => "\"$query\" bo'yicha e'lonlar yo'q",
                'input_message_content' => [
                    'message_text' => "🔍 *Qidiruv natijalari*\n\nSo'rov: \"$query\"\n❌ Afsuski, hech narsa topilmadi.\n\n🏠 [Platformaga o'tish](" . WEBAPP_URL . ")",
                    'parse_mode' => 'Markdown'
                ]
            ];
        }
    } else {
        $results[] = [
            'type' => 'article',
            'id' => 'help',
            'title' => '🔍 E\'lonlarni qidiring',
            'description' => 'Kalit so\'zlarni kiriting (kamida 2 harf)',
            'input_message_content' => [
                'message_text' => "🏠 *Sara Uylar*\n\n🔍 Qidiruv uchun kalit so'zlarni kiriting\n\n🏠 [Platformaga o'tish](" . WEBAPP_URL . ")",
                'parse_mode' => 'Markdown'
            ]
        ];
    }
    
    answerInlineQuery($inlineQuery['id'], $results);
}

function showListingDetails($chatId, $listingId) {
    $listings = json_decode(file_get_contents('data/listings.json'), true) ?: [];
    $listing = array_filter($listings, fn($l) => $l['id'] == $listingId)[0] ?? null;
    
    if (!$listing || ($listing['status'] ?? 'pending') !== 'active') {
        sendMessage($chatId, "❌ E'lon topilmadi yoki mavjud emas.");
        return;
    }
    
    // Ko'rishlar sonini oshirish
    foreach ($listings as &$l) {
        if ($l['id'] == $listingId) {
            $l['views'] = ($l['views'] ?? 0) + 1;
            break;
        }
    }
    file_put_contents('data/listings.json', json_encode($listings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '🌐 To\'liq ko\'rish', 'web_app' => ['url' => WEBAPP_URL . "/#listing-{$listingId}"]]
            ],
            [
                ['text' => '💬 Bog\'lanish', 'url' => 'https://t.me/' . BOT_USERNAME . "?start=contact_{$listing['user_id']}"],
                ['text' => '📤 Ulashish', 'callback_data' => "share_{$listingId}"]
            ],
            [
                ['text' => '🏠 Boshqa e\'lonlar', 'web_app' => ['url' => WEBAPP_URL]]
            ]
        ]
    ];
    
    $text = "🏠 *{$listing['title']}*\n\n";
    $text .= "💰 Narx: $" . number_format($listing['price']) . "\n";
    $text .= "📍 Joylashuv: {$listing['location']}\n";
    $text .= "🚪 Xonalar: {$listing['rooms']}\n";
    
    if (!empty($listing['area'])) {
        $text .= "📏 Maydon: {$listing['area']}m²\n";
    }
    
    if (!empty($listing['description'])) {
        $text .= "\n📝 Tavsif:\n{$listing['description']}\n";
    }
    
    $text .= "\n👁 Ko'rishlar: " . ($listing['views'] ?? 0);
    $text .= "\n📅 Sana: " . date('d.m.Y', strtotime($listing['created_at']));
    
    sendMessage($chatId, $text, $keyboard);
}

function handleContactRequest($chatId, $userId, $ownerId) {
    $users = json_decode(file_get_contents('data/users.json'), true) ?: [];
    $requester = array_filter($users, fn($u) => $u['id'] == $userId)[0] ?? null;
    $owner = array_filter($users, fn($u) => $u['id'] == $ownerId)[0] ?? null;
    
    if (!$owner) {
        sendMessage($chatId, "❌ E'lon egasi topilmadi.");
        return;
    }
    
    // Bog'lanish so'rovi yuborish
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '💬 Javob berish', 'url' => "https://t.me/{$requester['username']}"]
            ]
        ]
    ];
    
    $ownerText = "📞 *Yangi bog'lanish so'rovi*\n\n";
    $ownerText .= "👤 Foydalanuvchi: " . ($requester['first_name'] ?? 'User');
    if (!empty($requester['last_name'])) {
        $ownerText .= " " . $requester['last_name'];
    }
    $ownerText .= "\n";
    
    if (!empty($requester['username'])) {
        $ownerText .= "🔗 Username: @{$requester['username']}\n";
    }
    
    $ownerText .= "\n💬 Sizning e'loningiz bilan qiziqishmoqda!";
    
    sendMessage($ownerId, $ownerText, $keyboard);
    sendMessage($chatId, "✅ Bog'lanish so'rovi yuborildi! E'lon egasi tez orada javob beradi.");
}

function handleApprove($chatId, $listingId, $callbackId) {
    $listings = json_decode(file_get_contents('data/listings.json'), true) ?: [];
    
    foreach ($listings as &$listing) {
        if ($listing['id'] == $listingId) {
            $listing['status'] = 'active';
            $listing['approved_at'] = date('Y-m-d H:i:s');
            
            // Kanalga yuborish
            sendToChannel($listing);
            
            // Egaga xabar
            $keyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => '👁 E\'lonni ko\'rish', 'web_app' => ['url' => WEBAPP_URL . "/#listing-{$listingId}"]]
                    ]
                ]
            ];
            
            sendMessage($listing['user_id'], "✅ *E'loningiz tasdiqlandi!*\n\n🏠 {$listing['title']}\n💰 $" . number_format($listing['price']) . "\n\n🎉 E'loningiz endi barcha foydalanuvchilar ko'ra oladi!", $keyboard);
            break;
        }
    }
    
    file_put_contents('data/listings.json', json_encode($listings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    answerCallback($callbackId, '✅ E\'lon tasdiqlandi');
}

function handleReject($chatId, $listingId, $callbackId) {
    $listings = json_decode(file_get_contents('data/listings.json'), true) ?: [];
    
    foreach ($listings as &$listing) {
        if ($listing['id'] == $listingId) {
            $listing['status'] = 'rejected';
            $listing['rejected_at'] = date('Y-m-d H:i:s');
            
            // Egaga xabar
            $keyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => '➕ Yangi e\'lon', 'web_app' => ['url' => WEBAPP_URL . '/#add']]
                    ]
                ]
            ];
            
            sendMessage($listing['user_id'], "❌ *E'loningiz rad etildi*\n\n🏠 {$listing['title']}\n\n😔 E'loningiz qoidalarga mos kelmadi.\n\n💡 Iltimos, to'liq ma'lumotlar bilan qayta qo'shing.", $keyboard);
            break;
        }
    }
    
    file_put_contents('data/listings.json', json_encode($listings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    answerCallback($callbackId, '❌ E\'lon rad etildi');
}

function sendToChannel($listing) {
    if (!defined('CHANNEL_ID') || empty(CHANNEL_ID)) {
        return;
    }
    
    $keyboard = [
        'inline_keyboard' => [
            [
                ['text' => '👁 To\'liq ko\'rish', 'url' => WEBAPP_URL . "/#listing-{$listing['id']}"],
                ['text' => '💬 Bog\'lanish', 'url' => 'https://t.me/' . BOT_USERNAME . "?start=listing_{$listing['id']}"]
            ]
        ]
    ];
    
    $text = "🏠 *Yangi e'lon!*\n\n";
    $text .= "*{$listing['title']}*\n";
    $text .= "💰 $" . number_format($listing['price']) . "\n";
    $text .= "📍 {$listing['location']}\n";
    $text .= "🚪 {$listing['rooms']} xona\n";
    
    if (!empty($listing['area'])) {
        $text .= "📏 {$listing['area']}m²\n";
    }
    
    $text .= "\n#SaraUylar #" . str_replace(' ', '', $listing['property_type']);
    
    sendMessage(CHANNEL_ID, $text, $keyboard);
}

function saveUser($user) {
    $users = json_decode(file_get_contents('data/users.json'), true) ?: [];
    
    $exists = false;
    foreach ($users as &$u) {
        if ($u['id'] == $user['id']) {
            $u['first_name'] = $user['first_name'];
            if (isset($user['last_name'])) $u['last_name'] = $user['last_name'];
            if (isset($user['username'])) $u['username'] = $user['username'];
            $u['last_activity'] = date('Y-m-d H:i:s');
            $exists = true;
            break;
        }
    }
    
    if (!$exists) {
        $user['join_date'] = time();
        $user['last_activity'] = date('Y-m-d H:i:s');
        $users[] = $user;
    }
    
    file_put_contents('data/users.json', json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function getUserById($userId) {
    $users = json_decode(file_get_contents('data/users.json'), true) ?: [];
    return array_filter($users, fn($u) => $u['id'] == $userId)[0] ?? null;
}

function sendMessage($chatId, $text, $keyboard = null) {
    $data = [
        'chat_id' => $chatId,
        'text' => $text,
        'parse_mode' => 'Markdown',
        'disable_web_page_preview' => true
    ];
    
    if ($keyboard) {
        $data['reply_markup'] = json_encode($keyboard);
    }
    
    return sendRequest('sendMessage', $data);
}

function answerCallback($callbackId, $text) {
    return sendRequest('answerCallbackQuery', [
        'callback_query_id' => $callbackId,
        'text' => $text
    ]);
}

function answerInlineQuery($queryId, $results) {
    return sendRequest('answerInlineQuery', [
        'inline_query_id' => $queryId,
        'results' => json_encode($results),
        'cache_time' => 60
    ]);
}

function sendRequest($method, $data) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.telegram.org/bot" . BOT_TOKEN . "/{$method}");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $result = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($result, true);
}

echo 'OK';
?>