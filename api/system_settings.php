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
    // Initialize table if it doesn't exist
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS system_settings (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT
        )
    ");

    // Seed defaults if empty
    $checkStmt = $pdo->query("SELECT COUNT(*) FROM system_settings");
    if ($checkStmt->fetchColumn() == 0) {
        $defaults = [
            ['system_title', 'Lead Tracker'],
            ['accent_color_primary', '#e78b01'],
            ['accent_color_secondary', '#00b800']
        ];
        $insert = $pdo->prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)");
        foreach ($defaults as $row) {
            $insert->execute($row);
        }
    }

    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT key, value FROM system_settings");
        $settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        echo json_encode(["status" => "success", "data" => $settings]);
    } 
    elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!is_array($input)) {
            throw new Exception("Invalid input format");
        }

        $stmt = $pdo->prepare("INSERT INTO system_settings (key, value) VALUES (:key, :value) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value");
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
