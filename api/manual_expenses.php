<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
            SELECT me.*, se.name as entity_name, se.color as entity_color
            FROM project_manual_expenses me
            LEFT JOIN settings_entities se ON me.entity_id = se.id
            WHERE me.project_id = ?
            ORDER BY me.expense_date DESC, me.created_at DESC
        ");
        $stmt->execute([$projectId]);
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['project_id']) || empty($input['name'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing project_id or name"]);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO project_manual_expenses (project_id, name, cost, expense_date, entity_id, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['project_id'],
            $input['name'],
            $input['cost'] ?? 0,
            $input['expense_date'] ?? date('Y-m-d'),
            !empty($input['entity_id']) ? $input['entity_id'] : null,
            $input['notes'] ?? null
        ]);

        $newId = IS_MYSQL ? $pdo->lastInsertId() : $pdo->lastInsertId('project_manual_expenses_id_seq');
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
        $allowed = ['name', 'cost', 'expense_date', 'entity_id', 'notes'];

        foreach ($allowed as $f) {
            if (array_key_exists($f, $input)) {
                $fields[] = "$f = ?";
                $values[] = ($f === 'entity_id' && empty($input[$f])) ? null : $input[$f];
            }
        }

        if (!empty($fields)) {
            $values[] = $id;
            $sql = "UPDATE project_manual_expenses SET " . implode(", ", $fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
        }

        echo json_encode(["status" => "success"]);

    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM project_manual_expenses WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
