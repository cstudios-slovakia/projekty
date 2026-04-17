<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT * FROM role_definitions ORDER BY sort_order ASC, id ASC");
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("INSERT INTO role_definitions (label, is_timeline_group, sort_order) VALUES (?, ?, ?)");
        $stmt->execute([
            $input['label'],
            $input['is_timeline_group'] ?? true,
            $input['sort_order'] ?? 0
        ]);
        $newId = IS_MYSQL ? $pdo->lastInsertId() : $pdo->lastInsertId('role_definitions_id_seq');
        echo json_encode(["status" => "success", "id" => $newId]);
        
    } elseif ($method === 'PUT') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }
        $input = json_decode(file_get_contents('php://input'), true);
        
        $fields = [];
        $values = [];
        if (isset($input['label'])) {
            $fields[] = "label = ?";
            $values[] = $input['label'];
        }
        if (isset($input['is_timeline_group'])) {
            $fields[] = "is_timeline_group = ?";
            $values[] = $input['is_timeline_group'];
        }
        if (isset($input['sort_order'])) {
            $fields[] = "sort_order = ?";
            $values[] = $input['sort_order'];
        }
        
        if (!empty($fields)) {
            $values[] = $id;
            $stmt = $pdo->prepare("UPDATE role_definitions SET " . implode(", ", $fields) . " WHERE id = ?");
            $stmt->execute($values);
            echo json_encode(["status" => "success"]);
        } else {
             echo json_encode(["status" => "success", "message" => "No changes"]);
        }
    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM role_definitions WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
