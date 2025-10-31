<?php
require_once 'config.php';

$botToken = BOT_TOKEN;
$webappUrl = WEBAPP_URL;
$adminId = ADMIN_ID;

$input = file_get_contents('php://input');
$update = json_decode($input, true);

if (!$update) exit('OK');

$message = $update['message'] ?? null;
$callbackQuery = $update['callback_query'] ?? null;
$inlineQuery = $update['inline_query'] ?? null;

// Message handler
if ($message) {
    $chatId = $message['chat']['id'];
    $userId = $message['from']['id'];
    $text = $message['text'] ?? '';
    $firstName = $message['from']['first_name'] ?? 'User';
    $lastName = $message['from']['last_name'] ?? '';
    $username = $message['from']['username'] ?? '';
    
    if ($text === '/start') {
        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🏠 Sara Uylar Platformasi', 'web_app' => ['url' => $webappUrl]]
                ],
                [
                    ['text' => '🔍 E\'lonlarni Qidirish', 'switch_inline_query_current_chat' => ''],
                    ['text' => '➕ E\'lon Qo\'shish', 'web_app' => ['url' => $webappUrl . '/#add-listing']]
                ],
                [
                    ['text' => '❤️ Sevimlilar', 'web_app' => ['url' => $webappUrl . '/#favorites']],
                    ['text' => '👤 Profil', 'web_app' => ['url' => $webappUrl . '/#profile']]
                ],
                [
                    ['text' => '📊 Statistika', 'callback_data' => 'stats'],
                    ['text' => '⚙️ Sozlamalar', 'web_app' => ['url' => $webappUrl . '/#settings']]
                ],
                [
                    ['text' => '📞 Yordam', 'callback_data' => 'help'],
                    ['text' => 'ℹ️ Ma\'lumot', 'callback_data' => 'about']
                ]
            ]
        ];
        
        $welcomeText = "🏠 *Sara Uylar - Professional Uy-joy E'lonlari*\n\n";
        $welcomeText .= "✨ Salom, {$firstName}! Bizning zamonaviy platformaga xush kelibsiz!\n\n";
        $welcomeText .= "🚀 *Nima qila olasiz:*\n";
        $welcomeText .= "• 🔍 Minglab e'lonlar orasidan qidiring\n";
        $welcomeText .= "• ➕ O'z e'loningizni qo'shing\n";
        $welcomeText .= "• ❤️ Yoqgan e'lonlarni saqlang\n";
        $welcomeText .= "• 💬 Egalar bilan to'g'ridan-to'g'ri bog'laning\n\n";
        $welcomeText .= "👇 Boshlash uchun kerakli tugmani tanlang!";
        
        sendMessage($chatId, $welcomeText, $keyboard);
    }
    
    elseif ($text === '/help') {
        $helpKeyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🏠 Platformaga O\'tish', 'web_app' => ['url' => $webappUrl]]
                ],
                [
                    ['text' => '🔍 Inline Qidiruv', 'switch_inline_query_current_chat' => 'uy'],
                    ['text' => '📊 Statistika', 'callback_data' => 'stats']
                ],
                [
                    ['text' => '🔙 Asosiy Menyu', 'callback_data' => 'main_menu']
                ]
            ]
        ];
        
        $helpText = "❓ *Sara Uylar - Yordam*\n\n";
        $helpText .= "🏠 *Platformamiz haqida:*\n";
        $helpText .= "Sara Uylar - Telegram'dagi eng zamonaviy uy-joy e'lonlari platformasi\n\n";
        $helpText .= "🚀 *Asosiy imkoniyatlar:*\n";
        $helpText .= "• 🔍 Kengaytirilgan qidiruv tizimi\n";
        $helpText .= "• 📱 Zamonaviy web app interfeysi\n";
        $helpText .= "• ❤️ Sevimlilar va tarix saqlash\n";
        $helpText .= "• 💬 To'g'ridan-to'g'ri bog'lanish\n";
        $helpText .= "• 🌙 Tungi/kunduzgi rejim\n";
        $helpText .= "• 📤 E'lonlarni ulashish\n\n";
        $helpText .= "📋 *Buyruqlar:*\n";
        $helpText .= "/start - Asosiy menyu\n";
        $helpText .= "/help - Yordam ma'lumotlari\n";
        $helpText .= "/stats - Platform statistikasi\n\n";
        $helpText .= "🔍 *Inline qidiruv:*\n";
        $helpText .= "@SaraUylarbot [qidiruv so'zi]\n\n";
        $helpText .= "💡 *Maslahat:* Eng yaxshi tajriba uchun web app dan foydalaning!";
        
        sendMessage($chatId, $helpText, $helpKeyboard);
    }
    
    elseif ($text === '/stats') {
        $db = getDB();
        $listings = $db->read('listings');
        $users = $db->read('users');
        $approved = array_filter($listings, fn($l) => ($l['status'] ?? 'approved') === 'approved');
        $today = array_filter($approved, fn($l) => date('Y-m-d', strtotime($l['created_at'])) === date('Y-m-d'));
        
        $statsKeyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🏠 E\'lonlarni Ko\'rish', 'web_app' => ['url' => $webappUrl]]
                ],
                [
                    ['text' => '➕ E\'lon Qo\'shish', 'web_app' => ['url' => $webappUrl . '/#add-listing']],
                    ['text' => '🔍 Qidiruv', 'switch_inline_query_current_chat' => '']
                ],
                [
                    ['text' => '🔄 Yangilash', 'callback_data' => 'stats'],
                    ['text' => '🔙 Orqaga', 'callback_data' => 'main_menu']
                ]
            ]
        ];
        
        $statsText = "📊 *Sara Uylar - Platform Statistikasi*\n\n";
        $statsText .= "🏠 *E'lonlar:*\n";
        $statsText .= "• Jami e'lonlar: *" . count($approved) . "* ta\n";
        $statsText .= "• Bugun qo'shilgan: *" . count($today) . "* ta\n";
        $statsText .= "• Faol e'lonlar: *" . count($approved) . "* ta\n\n";
        $statsText .= "👥 *Foydalanuvchilar:*\n";
        $statsText .= "• Ro'yxatdan o'tganlar: *" . count($users) . "* kishi\n";
        $statsText .= "• Faol foydalanuvchilar: *" . count($users) . "* kishi\n\n";
        $statsText .= "📈 *O'sish:*\n";
        $statsText .= "• Kunlik o'sish: +" . count($today) . " e'lon\n";
        $statsText .= "• Haftalik o'sish: Yuqori\n\n";
        $statsText .= "🎉 Platformamiz har kuni rivojlanib bormoqda!";
        
        sendMessage($chatId, $statsText, $statsKeyboard);
    }
    
    // Admin commands
    elseif ($userId == $adminId && $text === '/admin') {
        $db = getDB();
        $pendingListings = array_filter($db->read('listings'), fn($l) => ($l['status'] ?? 'pending') === 'pending');
        $allListings = $db->read('listings');
        $allUsers = $db->read('users');
        
        $adminKeyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '📋 Kutilayotgan E\'lonlar (' . count($pendingListings) . ')', 'callback_data' => 'admin_pending']
                ],
                [
                    ['text' => '📊 To\'liq Statistika', 'callback_data' => 'admin_stats'],
                    ['text' => '👥 Foydalanuvchilar', 'callback_data' => 'admin_users']
                ],
                [
                    ['text' => '🏠 Barcha E\'lonlar', 'callback_data' => 'admin_all_listings'],
                    ['text' => '⚙️ Tizim Sozlamalari', 'callback_data' => 'admin_settings']
                ],
                [
                    ['text' => '🌐 Web Admin Panel', 'web_app' => ['url' => $webappUrl . '/#admin']]
                ]
            ]
        ];
        
        $adminText = "👑 *Admin Panel - Sara Uylar*\n\n";
        $adminText .= "🎛 *Tizim holati:*\n";
        $adminText .= "• Jami e'lonlar: *" . count($allListings) . "* ta\n";
        $adminText .= "• Kutilayotgan: *" . count($pendingListings) . "* ta\n";
        $adminText .= "• Foydalanuvchilar: *" . count($allUsers) . "* kishi\n\n";
        $adminText .= "⚡ *Tezkor harakatlar:*\n";
        $adminText .= "• E'lonlarni tasdiqlash/rad etish\n";
        $adminText .= "• Foydalanuvchilarni boshqarish\n";
        $adminText .= "• Tizim statistikasini ko'rish\n\n";
        $adminText .= "🔧 To'liq boshqaruv uchun web admin panel dan foydalaning!";
        
        sendMessage($chatId, $adminText, $adminKeyboard);
    }
}

// Callback query handler
if ($callbackQuery) {
    $chatId = $callbackQuery['message']['chat']['id'];
    $userId = $callbackQuery['from']['id'];
    $data = $callbackQuery['data'];
    $messageId = $callbackQuery['message']['message_id'];
    
    if ($data === 'stats') {
        $db = getDB();
        $listings = $db->read('listings');
        $users = $db->read('users');
        $approved = array_filter($listings, fn($l) => ($l['status'] ?? 'approved') === 'approved');
        $today = array_filter($approved, fn($l) => date('Y-m-d', strtotime($l['created_at'])) === date('Y-m-d'));
        
        $statsKeyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🏠 E\'lonlarni Ko\'rish', 'web_app' => ['url' => $webappUrl]]
                ],
                [
                    ['text' => '🔄 Yangilash', 'callback_data' => 'stats'],
                    ['text' => '🔙 Orqaga', 'callback_data' => 'main_menu']
                ]
            ]
        ];
        
        answerCallback($callbackQuery['id'], '📊 Statistika yangilandi');
        editMessage($chatId, $messageId, 
                   "📊 *Platform Statistikasi*\n\n🏠 Jami e'lonlar: *" . count($approved) . "*\n📅 Bugun: *" . count($today) . "*\n👥 Foydalanuvchilar: *" . count($users) . "*\n\n📈 Platformamiz o'sishda!", 
                   $statsKeyboard);
    }
    
    elseif ($data === 'main_menu') {
        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🏠 Sara Uylar Platformasi', 'web_app' => ['url' => $webappUrl]]
                ],
                [
                    ['text' => '🔍 E\'lonlarni Qidirish', 'switch_inline_query_current_chat' => ''],
                    ['text' => '➕ E\'lon Qo\'shish', 'web_app' => ['url' => $webappUrl . '/#add-listing']]
                ],
                [
                    ['text' => '❤️ Sevimlilar', 'web_app' => ['url' => $webappUrl . '/#favorites']],
                    ['text' => '👤 Profil', 'web_app' => ['url' => $webappUrl . '/#profile']]
                ],
                [
                    ['text' => '📊 Statistika', 'callback_data' => 'stats'],
                    ['text' => '❓ Yordam', 'callback_data' => 'help']
                ]
            ]
        ];
        
        answerCallback($callbackQuery['id'], '🏠 Asosiy menyu');
        editMessage($chatId, $messageId, 
                   "🏠 *Sara Uylar - Asosiy Menyu*\n\n👇 Kerakli bo'limni tanlang:", $keyboard);
    }
    
    elseif ($data === 'help') {
        $helpKeyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🏠 Platformaga O\'tish', 'web_app' => ['url' => $webappUrl]]
                ],
                [
                    ['text' => '🔍 Qidiruv Sinab Ko\'rish', 'switch_inline_query_current_chat' => 'uy']
                ],
                [
                    ['text' => '🔙 Asosiy Menyu', 'callback_data' => 'main_menu']
                ]
            ]
        ];
        
        answerCallback($callbackQuery['id'], '❓ Yordam ma\'lumotlari');
        editMessage($chatId, $messageId, 
                   "❓ *Sara Uylar - Yordam*\n\n🚀 *Qanday foydalanish:*\n\n1️⃣ 🏠 Platformani oching\n2️⃣ 🔍 E'lonlarni qidiring\n3️⃣ ❤️ Yoqganlarini saqlang\n4️⃣ ➕ O'z e'loningizni qo'shing\n\n💡 *Maslahat:* Inline qidiruv uchun:\n@SaraUylarbot [qidiruv so'zi]\n\n🎯 Eng yaxshi tajriba uchun web app dan foydalaning!", 
                   $helpKeyboard);
    }
    
    elseif ($data === 'about') {
        $aboutKeyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🏠 Platformaga O\'tish', 'web_app' => ['url' => $webappUrl]]
                ],
                [
                    ['text' => '🔙 Asosiy Menyu', 'callback_data' => 'main_menu']
                ]
            ]
        ];
        
        answerCallback($callbackQuery['id'], 'ℹ️ Ma\'lumot');
        editMessage($chatId, $messageId, 
                   "ℹ️ *Sara Uylar Haqida*\n\n🏠 *Sara Uylar* - Telegram'dagi eng zamonaviy uy-joy e'lonlari platformasi\n\n✨ *Xususiyatlar:*\n• 🔍 Kengaytirilgan qidiruv\n• ❤️ Sevimlilar tizimi\n• 📱 Zamonaviy web app\n• 🌙 Tungi/kunduzgi rejim\n• 📤 Ulashish imkoniyati\n\n📧 *Bog'lanish:*\nTelegram: @SaraUylarbot\nWeb: sarauylar.bigsaver.ru\n\n🎯 Professional uy-joy e'lonlari uchun eng yaxshi tanlov!", 
                   $aboutKeyboard);
    }
    
    // Admin callbacks
    elseif ($userId == $adminId && $data === 'admin_pending') {
        $db = getDB();
        $pendingListings = array_filter($db->read('listings'), fn($l) => ($l['status'] ?? 'pending') === 'pending');
        
        if (empty($pendingListings)) {
            answerCallback($callbackQuery['id'], 'Kutilayotgan e\'lonlar yo\'q');
            return;
        }
        
        $text = "📋 *Kutilayotgan e'lonlar:*\n\n";
        $keyboard = ['inline_keyboard' => []];
        
        foreach (array_slice($pendingListings, 0, 5) as $listing) {
            $text .= "🏠 {$listing['title']}\n💰 $" . number_format($listing['price']) . "\n📍 {$listing['location']}\n\n";
            $keyboard['inline_keyboard'][] = [
                ['text' => '✅ Tasdiqlash #' . $listing['id'], 'callback_data' => 'approve_' . $listing['id']],
                ['text' => '❌ Rad etish #' . $listing['id'], 'callback_data' => 'reject_' . $listing['id']]
            ];
        }
        
        $keyboard['inline_keyboard'][] = [
            ['text' => '🔙 Admin Panel', 'callback_data' => 'admin_menu']
        ];
        
        answerCallback($callbackQuery['id'], 'Kutilayotgan e\'lonlar');
        editMessage($chatId, $messageId, $text, $keyboard);
    }
    
    elseif ($userId == $adminId && strpos($data, 'approve_') === 0) {
        $listingId = intval(str_replace('approve_', '', $data));
        $db = getDB();
        $listings = $db->read('listings');
        
        foreach ($listings as &$listing) {
            if ($listing['id'] == $listingId) {
                $listing['status'] = 'approved';
                break;
            }
        }
        $db->write('listings', $listings);
        
        answerCallback($callbackQuery['id'], '✅ E\'lon tasdiqlandi');
        
        // Notify owner
        $listing = array_filter($listings, fn($l) => $l['id'] == $listingId)[0] ?? null;
        if ($listing) {
            $approveKeyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => '👁️ E\'lonni Ko\'rish', 'web_app' => ['url' => $webappUrl . '/#listing-' . $listingId]]
                    ],
                    [
                        ['text' => '📋 Mening E\'lonlarim', 'web_app' => ['url' => $webappUrl . '/#my-listings']]
                    ]
                ]
            ];
            
            sendMessage($listing['user_id'], "✅ *E'lon tasdiqlandi!*\n\n🏠 *{$listing['title']}*\n💰 $" . number_format($listing['price']) . "\n📍 {$listing['location']}\n\n🎉 Tabriklaymiz! E'loningiz admin tomonidan tasdiqlandi va endi barcha foydalanuvchilar ko'ra oladi.\n\n📈 E'loningiz platformada ko'rsatilmoqda!", $approveKeyboard);
        }
    }
    
    elseif ($userId == $adminId && strpos($data, 'reject_') === 0) {
        $listingId = intval(str_replace('reject_', '', $data));
        $db = getDB();
        $listings = $db->read('listings');
        
        foreach ($listings as &$listing) {
            if ($listing['id'] == $listingId) {
                $listing['status'] = 'rejected';
                break;
            }
        }
        $db->write('listings', $listings);
        
        answerCallback($callbackQuery['id'], '❌ E\'lon rad etildi');
        
        // Notify owner
        $listing = array_filter($listings, fn($l) => $l['id'] == $listingId)[0] ?? null;
        if ($listing) {
            $rejectKeyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => '➕ Yangi E\'lon Qo\'shish', 'web_app' => ['url' => $webappUrl . '/#add-listing']]
                    ],
                    [
                        ['text' => '📞 Yordam So\'rash', 'callback_data' => 'help']
                    ]
                ]
            ];
            
            sendMessage($listing['user_id'], "❌ *E'lon rad etildi*\n\n🏠 *{$listing['title']}*\n\n😔 Afsuski, e'loningiz quyidagi sabablarga ko'ra rad etildi:\n\n• Ma'lumotlar to'liq emas\n• Rasm sifati past\n• Qoidalarga mos kelmaydi\n\n💡 *Tavsiya:* E'lonni qaytadan to'liq ma'lumotlar bilan qo'shing.", $rejectKeyboard);
        }
    }
}

// Inline query handler with smart search
if ($inlineQuery) {
    $query = trim($inlineQuery['query']);
    $results = [];
    
    if (strlen($query) >= 2) {
        // Use smart search API
        $smartSearchUrl = WEBAPP_URL . '/api/smart-search.php?q=' . urlencode($query);
        $searchResponse = @file_get_contents($smartSearchUrl);
        $searchData = json_decode($searchResponse, true);
        
        if ($searchData && $searchData['success']) {
            $listings = array_slice($searchData['results'], 0, 10);
            
            foreach ($listings as $listing) {
                $description = substr($listing['description'] ?? '', 0, 80);
                if (strlen($listing['description'] ?? '') > 80) $description .= '...';
                
                // Add search score indicator
                $scoreEmoji = $listing['search_score'] > 90 ? '🎯' : ($listing['search_score'] > 70 ? '✨' : '📍');
                
                $results[] = [
                    'type' => 'article',
                    'id' => (string)$listing['id'],
                    'title' => $scoreEmoji . ' ' . $listing['title'],
                    'description' => "💰 $" . number_format($listing['price']) . " • 📍 " . $listing['location'] . " • Match: " . round($listing['search_score']) . "%",
                    'input_message_content' => [
                        'message_text' => "🏠 *{$listing['title']}*\n\n💰 *Narx:* $" . number_format($listing['price']) . 
                                        "\n📍 *Joylashuv:* {$listing['location']}" .
                                        "\n🏠 *Turi:* " . ucfirst($listing['property_type']) .
                                        "\n🚪 *Xonalar:* {$listing['rooms']}" .
                                        "\n📏 *Maydon:* {$listing['area']}m²" .
                                        "\n👁️ *Ko'rishlar:* " . ($listing['views'] ?? 0) .
                                        "\n\n" . $description .
                                        "\n\n🎯 *Qidiruv mos kelishi:* " . round($listing['search_score']) . "%",
                        'parse_mode' => 'Markdown'
                    ],
                    'reply_markup' => [
                        'inline_keyboard' => [
                            [
                                ['text' => '👁️ To\'liq ko\'rish', 'web_app' => ['url' => $webappUrl . '/#listing-' . $listing['id']]],
                                ['text' => '💬 Bog\'lanish', 'url' => 'https://t.me/SaraUylarbot?start=contact_' . $listing['user_id']]
                            ],
                            [
                                ['text' => '❤️ Sevimlilar', 'callback_data' => 'fav_' . $listing['id']],
                                ['text' => '📤 Ulashish', 'callback_data' => 'share_' . $listing['id']]
                            ]
                        ]
                    ]
                ];
            }
            
            // Add suggestions if available
            if (!empty($searchData['suggestions'])) {
                $suggestions = implode(', ', array_slice($searchData['suggestions'], 0, 3));
                $results[] = [
                    'type' => 'article',
                    'id' => 'suggestions',
                    'title' => '💡 Tavsiyalar: ' . $suggestions,
                    'description' => 'Qidiruv uchun tavsiyalar',
                    'input_message_content' => [
                        'message_text' => "💡 *Qidiruv takliflari:*\n\n" . implode("\n", array_map(fn($s) => "• $s", $searchData['suggestions'])),
                        'parse_mode' => 'Markdown'
                    ]
                ];
            }
        } else {
            // Fallback to basic search
            $db = getDB();
            $listings = array_filter($db->read('listings'), fn($l) => ($l['status'] ?? 'approved') === 'approved');
            
            $filtered = array_filter($listings, function($listing) use ($query) {
                return stripos($listing['title'], $query) !== false ||
                       stripos($listing['location'], $query) !== false ||
                       stripos($listing['description'] ?? '', $query) !== false;
            });
            
            foreach (array_slice($filtered, 0, 10) as $listing) {
                $description = substr($listing['description'] ?? '', 0, 80);
                if (strlen($listing['description'] ?? '') > 80) $description .= '...';
                
                $results[] = [
                    'type' => 'article',
                    'id' => (string)$listing['id'],
                    'title' => $listing['title'],
                    'description' => "💰 $" . number_format($listing['price']) . " • 📍 " . $listing['location'],
                    'input_message_content' => [
                        'message_text' => "🏠 *{$listing['title']}*\n\n💰 *Narx:* $" . number_format($listing['price']) . 
                                        "\n📍 *Joylashuv:* {$listing['location']}" .
                                        "\n🏠 *Turi:* " . ucfirst($listing['property_type']) .
                                        "\n🚪 *Xonalar:* {$listing['rooms']}" .
                                        "\n📏 *Maydon:* {$listing['area']}m²\n\n" . $description,
                        'parse_mode' => 'Markdown'
                    ],
                    'reply_markup' => [
                        'inline_keyboard' => [
                            [
                                ['text' => '👁️ To\'liq ko\'rish', 'web_app' => ['url' => $webappUrl . '/#listing-' . $listing['id']]],
                                ['text' => '💬 Bog\'lanish', 'url' => 'https://t.me/SaraUylarbot?start=contact_' . $listing['user_id']]
                            ]
                        ]
                    ]
                ];
            }
        }
        
        if (empty($results)) {
            $results[] = [
                'type' => 'article',
                'id' => 'no_results',
                'title' => 'Natija topilmadi',
                'description' => "\"$query\" bo'yicha e'lonlar topilmadi",
                'input_message_content' => [
                    'message_text' => "🔍 *Qidiruv natijalari*\n\nSo'rov: \"$query\"\n❌ Afsuski, hech narsa topilmadi.\n\n[🏠 Platformaga o'tish]($webappUrl)",
                    'parse_mode' => 'Markdown'
                ]
            ];
        }
    } else {
        $results[] = [
            'type' => 'article',
            'id' => 'help',
            'title' => '🔍 E\'lonlarni qidiring',
            'description' => 'Kalit so\'zlarni kiriting (kamida 2 ta harf)',
            'input_message_content' => [
                'message_text' => "🏠 *Sara Uylar - Uy-joy e'lonlari*\n\n🔍 Qidiruv uchun kalit so'zlarni kiriting\n\n[🏠 Platformaga o'tish]($webappUrl)",
                'parse_mode' => 'Markdown'
            ]
        ];
    }
    
    answerInlineQuery($inlineQuery['id'], $results);
}

// Functions
function sendMessage($chatId, $text, $keyboard = null) {
    global $botToken;
    
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

function editMessage($chatId, $messageId, $text, $keyboard = null) {
    $data = [
        'chat_id' => $chatId,
        'message_id' => $messageId,
        'text' => $text,
        'parse_mode' => 'Markdown',
        'disable_web_page_preview' => true
    ];
    
    if ($keyboard) {
        $data['reply_markup'] = json_encode($keyboard);
    }
    
    return sendRequest('editMessageText', $data);
}

function answerCallback($callbackQueryId, $text) {
    return sendRequest('answerCallbackQuery', [
        'callback_query_id' => $callbackQueryId,
        'text' => $text
    ]);
}

function answerInlineQuery($inlineQueryId, $results) {
    return sendRequest('answerInlineQuery', [
        'inline_query_id' => $inlineQueryId,
        'results' => json_encode($results),
        'cache_time' => 60
    ]);
}

function sendRequest($method, $data) {
    global $botToken;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.telegram.org/bot{$botToken}/{$method}");
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