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
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM bank_cash_adjustments WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["status" => "success", "data" => $stmt->fetch()]);
        } else {
            $stmt = $pdo->query("SELECT * FROM bank_cash_adjustments ORDER BY adjustment_date DESC, created_at DESC");
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        }
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        $date = !empty($input['adjustment_date']) ? $input['adjustment_date'] : date('Y-m-d');
        $amount = floatval($input['balance_amount'] ?? 0);

        $stmt = $pdo->prepare("INSERT INTO bank_cash_adjustments (adjustment_date, balance_amount, notes) VALUES (?, ?, ?)");
        $stmt->execute([$date, $amount, $input['notes'] ?? null]);

        $newId = IS_MYSQL ? $pdo->lastInsertId() : $pdo->lastInsertId('bank_cash_adjustments_id_seq');
        echo json_encode(["status" => "success", "id" => $newId]);

    } elseif ($method === 'PUT') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $stmt = $pdo->prepare("UPDATE bank_cash_adjustments SET adjustment_date = ?, balance_amount = ?, notes = ? WHERE id = ?");
        $stmt->execute([
            !empty($input['adjustment_date']) ? $input['adjustment_date'] : date('Y-m-d'),
            floatval($input['balance_amount'] ?? 0),
            $input['notes'] ?? null,
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
        $stmt = $pdo->prepare("DELETE FROM bank_cash_adjustments WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
