<?php
session_start();
header('Content-Type: application/json');

if (isset($_SESSION['user_id'])) {
    echo json_encode([
        'logged_in' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'first_name' => $_SESSION['user_name'] ?? 'Foydalanuvchi'
        ]
    ]);
} else {
    echo json_encode(['logged_in' => false]);
}
?>