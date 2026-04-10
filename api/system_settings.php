<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $tableName = (defined('DB_PREFIX') ? DB_PREFIX : '') . 'system_settings';
    $is_mysql = (defined('DB_TYPE') && (DB_TYPE === 'mysql' || DB_TYPE === 'mariadb'));
    $quote = $is_mysql ? '`' : '';
    
    // Initialize table if it doesn't exist
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS $tableName (
            {$quote}key{$quote} VARCHAR(255) PRIMARY KEY,
            {$quote}value{$quote} TEXT
        ) " . ($is_mysql ? "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4" : "") . "
    ");

    // Seed defaults if empty
    $checkStmt = $pdo->query("SELECT COUNT(*) FROM $tableName");
    if ($checkStmt->fetchColumn() == 0) {
        $defaults = [
            ['system_title', 'Lead Tracker'],
            ['accent_color_primary', '#e78b01'],
            ['accent_color_secondary', '#00b800']
        ];
        $insert = $pdo->prepare("INSERT INTO $tableName ({$quote}key{$quote}, {$quote}value{$quote}) VALUES (?, ?)");
        foreach ($defaults as $row) {
            $insert->execute($row);
        }
    }

    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT {$quote}key{$quote}, {$quote}value{$quote} FROM $tableName");
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        echo json_encode(["status" => "success", "data" => $settings]);
    } 
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            throw new Exception("Invalid input format");
        }

        if ($is_mysql) {
            $stmt = $pdo->prepare("INSERT INTO $tableName (`key`, `value`) VALUES (:key, :value) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)");
        } else {
            $stmt = $pdo->prepare("INSERT INTO $tableName (key, value) VALUES (:key, :value) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value");
        }

        foreach ($input as $key => $value) {
            $stmt->execute(['key' => $key, 'value' => $value]);
        }

        echo json_encode(["status" => "success", "message" => "Settings updated"]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
