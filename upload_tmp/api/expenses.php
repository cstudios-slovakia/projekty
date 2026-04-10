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
        $projectId = $_GET['project_id'] ?? null;
        if (!$projectId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing project_id"]);
            exit;
        }
        $stmt = $pdo->prepare("
            SELECT pe.*, se.name as entity_name, se.color as entity_color, se.type as entity_type, se.hourly_rate
            FROM project_expenses pe
            LEFT JOIN settings_entities se ON pe.entity_id = se.id
            WHERE pe.project_id = ?
            ORDER BY pe.week DESC, pe.created_at DESC
        ");
        $stmt->execute([$projectId]);
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("INSERT INTO project_expenses (project_id, entity_id, hours, week, custom_name, custom_cost) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['project_id'],
            $input['entity_id'] ? $input['entity_id'] : null,
            $input['hours'] ?? 0,
            $input['week'] ?? '',
            $input['custom_name'] ?? null,
            $input['custom_cost'] ?? null
        ]);
        echo json_encode(["status" => "success", "id" => $pdo->lastInsertId('project_expenses_id_seq')]);

    } elseif ($method === 'PUT') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }
        $input = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("UPDATE project_expenses SET entity_id = ?, hours = ?, week = ?, custom_name = ?, custom_cost = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([
            $input['entity_id'] ? $input['entity_id'] : null,
            $input['hours'] ?? 0,
            $input['week'],
            $input['custom_name'] ?? null,
            $input['custom_cost'] ?? null,
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
        $stmt = $pdo->prepare("DELETE FROM project_expenses WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
