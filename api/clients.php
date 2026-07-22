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
        $params = [];
        $whereClause = "";

        if ($id) {
            $whereClause = "AND se.id = ?";
            $params[] = $id;
        }

        $querySql = "
            SELECT se.*,
                   (
                       SELECT COUNT(*) FROM projects p WHERE p.client_id = se.id AND (p.is_archived = 0 OR p.is_archived = FALSE)
                   ) as active_projects_count,
                   (
                       SELECT COALESCE(SUM(p.total_value), 0) FROM projects p WHERE p.client_id = se.id
                   ) as total_budget,
                   (
                       SELECT COALESCE(SUM(pi.amount), 0)
                       FROM project_invoices pi
                       JOIN projects p ON pi.project_id = p.id
                       WHERE p.client_id = se.id
                   ) as total_invoiced,
                   (
                       SELECT COALESCE(SUM(pi.amount), 0)
                       FROM project_invoices pi
                       JOIN projects p ON pi.project_id = p.id
                       WHERE p.client_id = se.id AND pi.status = 'paid'
                   ) as total_paid,
                   (
                       SELECT COALESCE(SUM(
                           CASE WHEN pe.entity_id IS NOT NULL THEN pe.hours * ent.hourly_rate ELSE pe.custom_cost END
                       ), 0)
                       FROM project_expenses pe
                       JOIN projects p ON pe.project_id = p.id
                       LEFT JOIN settings_entities ent ON pe.entity_id = ent.id
                       WHERE p.client_id = se.id
                   ) as total_time_expenses,
                   (
                       SELECT COALESCE(SUM(pme.cost), 0)
                       FROM project_manual_expenses pme
                       JOIN projects p ON pme.project_id = p.id
                       WHERE p.client_id = se.id
                   ) as total_manual_expenses
            FROM settings_entities se
            WHERE se.type = 'client' $whereClause
            ORDER BY se.name ASC
        ";

        $stmt = $pdo->prepare($querySql);
        $stmt->execute($params);
        $clients = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch associated projects for each client
        $projStmt = $pdo->prepare("SELECT id, name, status, total_value, is_archived, deadline FROM projects WHERE client_id = ? ORDER BY id DESC");

        foreach ($clients as &$c) {
            $projStmt->execute([$c['id']]);
            $c['projects'] = $projStmt->fetchAll(PDO::FETCH_ASSOC);

            $totBudget = (float)($c['total_budget'] ?? 0);
            $totPaid = (float)($c['total_paid'] ?? 0);
            $totInvoiced = (float)($c['total_invoiced'] ?? 0);
            $totExp = (float)($c['total_time_expenses'] ?? 0) + (float)($c['total_manual_expenses'] ?? 0);

            // Revenue calculation
            $c['revenue'] = $totPaid > 0 ? $totPaid : $totInvoiced;
            $c['total_expenses'] = $totExp;
            
            // Profit calculation: Total Budget - Total Expenses (or Revenue - Total Expenses)
            $c['profit'] = $totBudget - $totExp;
            $c['profit_percentage'] = $totBudget > 0 ? round((($totBudget - $totExp) / $totBudget) * 100, 1) : 0;
        }

        if ($id) {
            echo json_encode(["status" => "success", "data" => $clients[0] ?? null]);
        } else {
            echo json_encode(["status" => "success", "data" => $clients]);
        }

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['name'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Client name is required"]);
            exit;
        }

        $stmt = $pdo->prepare("INSERT INTO settings_entities (type, name, color, contact_person, email_phone, hourly_rate) VALUES ('client', ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['name'],
            $input['color'] ?? '#3b82f6',
            $input['contact_person'] ?? null,
            $input['email_phone'] ?? null,
            $input['hourly_rate'] ?? 0
        ]);

        $newId = IS_MYSQL ? $pdo->lastInsertId() : $pdo->lastInsertId('settings_entities_id_seq');
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
        $allowed = ['name', 'color', 'contact_person', 'email_phone', 'hourly_rate'];

        foreach ($allowed as $f) {
            if (array_key_exists($f, $input)) {
                $fields[] = "$f = ?";
                $values[] = $input[$f] === '' ? null : $input[$f];
            }
        }

        if (!empty($fields)) {
            $values[] = $id;
            $sql = "UPDATE settings_entities SET " . implode(", ", $fields) . " WHERE id = ? AND type = 'client'";
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

        $stmt = $pdo->prepare("DELETE FROM settings_entities WHERE id = ? AND type = 'client'");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
