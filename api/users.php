<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, username, role FROM users ORDER BY id ASC");
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if ($action === 'reset') {
            // Password reset
            if (!$userId || !isset($input['new_password'])) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Missing data for password reset"]);
                exit;
            }
            $hash = password_hash($input['new_password'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $stmt->execute([$hash, $userId]);
            echo json_encode(["status" => "success", "message" => "Password reset successfully"]);
        } else {
            // Register new user
            $hash = password_hash($input['password'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)");
            $stmt->execute([
                $input['username'],
                $hash,
                $input['role'] ?? 'user'
            ]);
            $is_mysql = (defined('DB_TYPE') && (DB_TYPE === 'mysql' || DB_TYPE === 'mariadb'));
            $newId = $is_mysql ? $pdo->lastInsertId() : $pdo->lastInsertId('users_id_seq');
            echo json_encode(["status" => "success", "id" => $newId]);
        }
    } elseif ($method === 'DELETE') {
        if (!$userId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        echo json_encode(["status" => "success"]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
