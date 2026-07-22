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
            $stmt = $pdo->prepare("SELECT * FROM company_expenses WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["status" => "success", "data" => $stmt->fetch()]);
        } else {
            $stmt = $pdo->query("SELECT * FROM company_expenses ORDER BY created_at DESC");
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        }
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);

        $title = trim($input['title'] ?? '');
        if (empty($title)) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Title is required"]);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO company_expenses (
                title, category, amount, expense_type, expense_date,
                recurrence_interval, recurrence_unit, recurrence_days,
                recurrence_ends_type, recurrence_ends_date, recurrence_ends_occurrences, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $title,
            $input['category'] ?? 'Other',
            floatval($input['amount'] ?? 0),
            $input['expense_type'] ?? 'one_time',
            !empty($input['expense_date']) ? $input['expense_date'] : date('Y-m-d'),
            intval($input['recurrence_interval'] ?? 1),
            $input['recurrence_unit'] ?? 'month',
            is_array($input['recurrence_days'] ?? null) ? json_encode($input['recurrence_days']) : ($input['recurrence_days'] ?? null),
            $input['recurrence_ends_type'] ?? 'never',
            !empty($input['recurrence_ends_date']) ? $input['recurrence_ends_date'] : null,
            !empty($input['recurrence_ends_occurrences']) ? intval($input['recurrence_ends_occurrences']) : null,
            $input['notes'] ?? null
        ]);

        $newId = IS_MYSQL ? $pdo->lastInsertId() : $pdo->lastInsertId('company_expenses_id_seq');
        echo json_encode(["status" => "success", "id" => $newId]);

    } elseif ($method === 'PUT') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);

        $stmt = $pdo->prepare("
            UPDATE company_expenses SET
                title = ?,
                category = ?,
                amount = ?,
                expense_type = ?,
                expense_date = ?,
                recurrence_interval = ?,
                recurrence_unit = ?,
                recurrence_days = ?,
                recurrence_ends_type = ?,
                recurrence_ends_date = ?,
                recurrence_ends_occurrences = ?,
                notes = ?
            WHERE id = ?
        ");

        $stmt->execute([
            $input['title'] ?? 'Expense',
            $input['category'] ?? 'Other',
            floatval($input['amount'] ?? 0),
            $input['expense_type'] ?? 'one_time',
            !empty($input['expense_date']) ? $input['expense_date'] : date('Y-m-d'),
            intval($input['recurrence_interval'] ?? 1),
            $input['recurrence_unit'] ?? 'month',
            is_array($input['recurrence_days'] ?? null) ? json_encode($input['recurrence_days']) : ($input['recurrence_days'] ?? null),
            $input['recurrence_ends_type'] ?? 'never',
            !empty($input['recurrence_ends_date']) ? $input['recurrence_ends_date'] : null,
            !empty($input['recurrence_ends_occurrences']) ? intval($input['recurrence_ends_occurrences']) : null,
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
        $stmt = $pdo->prepare("DELETE FROM company_expenses WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
