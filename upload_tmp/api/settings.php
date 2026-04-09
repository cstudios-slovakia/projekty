<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];
$type = $_GET['type'] ?? null;

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($method === 'GET') {
        if ($type) {
            $stmt = $pdo->prepare("SELECT * FROM settings_entities WHERE type = ? ORDER BY id ASC");
            $stmt->execute([$type]);
        } else {
            $stmt = $pdo->query("SELECT * FROM settings_entities ORDER BY id ASC");
        }
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("INSERT INTO settings_entities (type, name, color, contact_person, email_phone, hourly_rate) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['type'],
            $input['name'],
            $input['color'] ?? '#8a8c89',
            $input['contact_person'] ?? null,
            $input['email_phone'] ?? null,
            $input['hourly_rate'] ?? 0
        ]);
        echo json_encode(["status" => "success", "id" => $pdo->lastInsertId('settings_entities_id_seq')]);
    } elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }
        $stmt = $pdo->prepare("UPDATE settings_entities SET name = ?, color = ?, hourly_rate = ? WHERE id = ?");
        $stmt->execute([
            $input['name'],
            $input['color'] ?? '#8a8c89',
            $input['hourly_rate'] ?? 0,
            $id
        ]);
        echo json_encode(["status" => "success"]);
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM settings_entities WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
