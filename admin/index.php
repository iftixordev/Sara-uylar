<?php
session_start();
require_once '../config.php';

if (!isset($_SESSION['admin_logged_in'])) {
    header('Location: login.php');
    exit;
}

$listings = json_decode(file_get_contents('../data/listings.json'), true) ?: [];
$users = json_decode(file_get_contents('../data/users.json'), true) ?: [];
$blocked_users = json_decode(file_get_contents('../data/blocked_users.json'), true) ?: [];

$total_listings = count($listings);
$pending_listings = count(array_filter($listings, fn($l) => ($l['status'] ?? 'pending') === 'pending'));
$active_listings = count(array_filter($listings, fn($l) => ($l['status'] ?? 'pending') === 'active'));
$total_users = count($users);
$today_listings = count(array_filter($listings, fn($l) => date('Y-m-d', strtotime($l['created_at'])) === date('Y-m-d')));
?>
<!DOCTYPE html>
<html lang="uz">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Sara Uylar</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #1a202c;
        }
        
        .admin-container {
            display: grid;
            grid-template-columns: 250px 1fr;
            min-height: 100vh;
        }
        
        .sidebar {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            padding: 2rem 1rem;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
        }
        
        .logo {
            text-align: center;
            margin-bottom: 2rem;
            font-size: 1.5rem;
            font-weight: 700;
            color: #667eea;
        }
        
        .nav-item {
            display: block;
            padding: 1rem;
            margin-bottom: 0.5rem;
            background: transparent;
            border: none;
            border-radius: 12px;
            text-align: left;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
            font-size: 1rem;
            color: #64748b;
            text-decoration: none;
        }
        
        .nav-item:hover, .nav-item.active {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            transform: translateX(5px);
        }
        
        .main-content {
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            background: rgba(255, 255, 255, 0.95);
            padding: 1.5rem;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .stat-card {
            background: rgba(255, 255, 255, 0.95);
            padding: 1.5rem;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: 700;
            color: #667eea;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: #64748b;
            font-weight: 500;
        }
        
        .content-section {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            display: none;
        }
        
        .content-section.active {
            display: block;
        }
        
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
            margin: 0.25rem;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        
        .btn-success {
            background: #22c55e;
            color: white;
        }
        
        .btn-danger {
            background: #ef4444;
            color: white;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        
        .table th, .table td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .table th {
            background: #f8fafc;
            font-weight: 600;
        }
        
        .status-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .status-pending {
            background: #fef3c7;
            color: #92400e;
        }
        
        .status-active {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-rejected {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .form-group {
            margin-bottom: 1rem;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        
        .form-group input, .form-group textarea, .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 1rem;
        }
        
        @media (max-width: 768px) {
            .admin-container {
                grid-template-columns: 1fr;
            }
            .sidebar {
                display: none;
            }
        }
    </style>
</head>
<body>
    <div class="admin-container">
        <div class="sidebar">
            <div class="logo">🏠 Sara Uylar Admin</div>
            <button class="nav-item active" onclick="showSection('dashboard')">📊 Dashboard</button>
            <button class="nav-item" onclick="showSection('listings')">🏠 E'lonlar</button>
            <button class="nav-item" onclick="showSection('users')">👥 Foydalanuvchilar</button>
            <button class="nav-item" onclick="showSection('notifications')">📢 Bildirishnomalar</button>
            <button class="nav-item" onclick="showSection('settings')">⚙️ Sozlamalar</button>
            <a href="logout.php" class="nav-item" style="color: #ef4444;">🚪 Chiqish</a>
        </div>
        
        <div class="main-content">
            <div class="header">
                <h1>Admin Panel</h1>
                <div>
                    <span>Salom, Admin!</span>
                    <button class="btn btn-primary" onclick="showSection('notifications')">📢 Xabar yuborish</button>
                </div>
            </div>
            
            <!-- Dashboard -->
            <div id="dashboard" class="content-section active">
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number"><?= $total_listings ?></div>
                        <div class="stat-label">Jami e'lonlar</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number"><?= $pending_listings ?></div>
                        <div class="stat-label">Kutilayotgan</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number"><?= $active_listings ?></div>
                        <div class="stat-label">Faol e'lonlar</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number"><?= $total_users ?></div>
                        <div class="stat-label">Foydalanuvchilar</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number"><?= $today_listings ?></div>
                        <div class="stat-label">Bugungi e'lonlar</div>
                    </div>
                </div>
                
                <h3>So'nggi e'lonlar</h3>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Sarlavha</th>
                            <th>Narx</th>
                            <th>Holat</th>
                            <th>Sana</th>
                            <th>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach (array_slice($listings, -10) as $listing): ?>
                        <tr>
                            <td><?= htmlspecialchars($listing['title']) ?></td>
                            <td>$<?= number_format($listing['price']) ?></td>
                            <td>
                                <span class="status-badge status-<?= $listing['status'] ?? 'pending' ?>">
                                    <?= ucfirst($listing['status'] ?? 'pending') ?>
                                </span>
                            </td>
                            <td><?= date('d.m.Y', strtotime($listing['created_at'])) ?></td>
                            <td>
                                <button class="btn btn-success" onclick="approveListing(<?= $listing['id'] ?>)">✅</button>
                                <button class="btn btn-danger" onclick="rejectListing(<?= $listing['id'] ?>)">❌</button>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <!-- E'lonlar -->
            <div id="listings" class="content-section">
                <h2>E'lonlar boshqaruvi</h2>
                <div style="margin-bottom: 1rem;">
                    <button class="btn btn-primary" onclick="filterListings('all')">Hammasi</button>
                    <button class="btn" onclick="filterListings('pending')">Kutilayotgan</button>
                    <button class="btn" onclick="filterListings('active')">Faol</button>
                    <button class="btn" onclick="filterListings('rejected')">Rad etilgan</button>
                </div>
                <div id="listingsTable"></div>
            </div>
            
            <!-- Foydalanuvchilar -->
            <div id="users" class="content-section">
                <h2>Foydalanuvchilar</h2>
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Ism</th>
                            <th>Username</th>
                            <th>E'lonlar</th>
                            <th>Holat</th>
                            <th>Amallar</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($users as $user): ?>
                        <tr>
                            <td><?= $user['id'] ?></td>
                            <td><?= htmlspecialchars($user['first_name'] ?? 'N/A') ?></td>
                            <td>@<?= htmlspecialchars($user['username'] ?? 'N/A') ?></td>
                            <td><?= count(array_filter($listings, fn($l) => $l['user_id'] == $user['id'])) ?></td>
                            <td>
                                <?php if (in_array($user['id'], $blocked_users)): ?>
                                    <span class="status-badge status-rejected">Bloklangan</span>
                                <?php else: ?>
                                    <span class="status-badge status-active">Faol</span>
                                <?php endif; ?>
                            </td>
                            <td>
                                <?php if (in_array($user['id'], $blocked_users)): ?>
                                    <button class="btn btn-success" onclick="unblockUser(<?= $user['id'] ?>)">🔓 Blokdan chiqarish</button>
                                <?php else: ?>
                                    <button class="btn btn-danger" onclick="blockUser(<?= $user['id'] ?>)">🔒 Bloklash</button>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            
            <!-- Bildirishnomalar -->
            <div id="notifications" class="content-section">
                <h2>Bildirishnomalar yuborish</h2>
                <form id="notificationForm">
                    <div class="form-group">
                        <label>Xabar turi</label>
                        <select name="type" required>
                            <option value="all">Barcha foydalanuvchilarga</option>
                            <option value="active_users">Faol foydalanuvchilarga</option>
                            <option value="listing_owners">E'lon egalariga</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Sarlavha</label>
                        <input type="text" name="title" required placeholder="Xabar sarlavhasi">
                    </div>
                    <div class="form-group">
                        <label>Xabar matni</label>
                        <textarea name="message" rows="4" required placeholder="Xabar matni..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-primary">📢 Xabar yuborish</button>
                </form>
            </div>
            
            <!-- Sozlamalar -->
            <div id="settings" class="content-section">
                <h2>Tizim sozlamalari</h2>
                <form id="settingsForm">
                    <div class="form-group">
                        <label>Platform nomi</label>
                        <input type="text" name="platform_name" value="Sara Uylar">
                    </div>
                    <div class="form-group">
                        <label>Maksimal e'lonlar soni</label>
                        <input type="number" name="max_listings" value="10">
                    </div>
                    <div class="form-group">
                        <label>Avtomatik tasdiqlash</label>
                        <select name="auto_approve">
                            <option value="0">O'chirilgan</option>
                            <option value="1">Yoqilgan</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Telegram kanal ID</label>
                        <input type="text" name="channel_id" placeholder="@sara_uylar_channel">
                    </div>
                    <button type="submit" class="btn btn-primary">💾 Saqlash</button>
                </form>
            </div>
        </div>
    </div>
    
    <script>
        function showSection(sectionId) {
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.getElementById(sectionId).classList.add('active');
            event.target.classList.add('active');
        }
        
        function approveListing(id) {
            if (confirm('E\'lonni tasdiqlaysizmi?')) {
                fetch('../api/admin_actions.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'approve_listing', listing_id: id })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('E\'lon tasdiqlandi!');
                        location.reload();
                    } else {
                        alert('Xatolik: ' + data.error);
                    }
                });
            }
        }
        
        function rejectListing(id) {
            if (confirm('E\'lonni rad etasizmi?')) {
                fetch('../api/admin_actions.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'reject_listing', listing_id: id })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('E\'lon rad etildi!');
                        location.reload();
                    } else {
                        alert('Xatolik: ' + data.error);
                    }
                });
            }
        }
        
        function blockUser(userId) {
            if (confirm('Foydalanuvchini bloklaysizmi?')) {
                fetch('../api/admin_actions.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'block_user', user_id: userId })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Foydalanuvchi bloklandi!');
                        location.reload();
                    }
                });
            }
        }
        
        function unblockUser(userId) {
            if (confirm('Foydalanuvchini blokdan chiqarasizmi?')) {
                fetch('../api/admin_actions.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'unblock_user', user_id: userId })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Foydalanuvchi blokdan chiqarildi!');
                        location.reload();
                    }
                });
            }
        }
        
        document.getElementById('notificationForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            
            fetch('../api/send_notification.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Xabar yuborildi!');
                    this.reset();
                } else {
                    alert('Xatolik: ' + data.error);
                }
            });
        });
    </script>
</body>
</html>