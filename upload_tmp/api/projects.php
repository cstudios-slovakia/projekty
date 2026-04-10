<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];
$projectId = $_GET['id'] ?? null;

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($method === 'GET') {
        $filters = [];
        $params = [];
        $whereClause = "";

        if (isset($_GET['archived']) && $_GET['archived'] === 'true') {
            $filters[] = "p.is_archived = TRUE";
        } else {
            $filters[] = "p.is_archived = FALSE";
        }

        if ($projectId) {
            $filters[] = "p.id = ?";
            $params[] = $projectId;
        }

        if (!empty($filters)) {
            $whereClause = "WHERE " . implode(" AND ", $filters);
        }

        $allowedSortFields = ['name', 'status', 'accepted_date', 'deadline', 'total_value', 'created_at', 'id', 'sort_order'];
        $sortBy = isset($_GET['sort_by']) && in_array($_GET['sort_by'], $allowedSortFields) ? $_GET['sort_by'] : (isset($_GET['reorder_view']) ? 'sort_order' : 'created_at');
        $sortOrder = isset($_GET['sort_order']) && strtoupper($_GET['sort_order']) === 'DESC' ? 'DESC' : 'ASC';

        $stmt = $pdo->prepare("
            SELECT p.*, 
                   c.name as client_name, c.color as client_color,
                   d.name as dev_name, d.color as dev_color,
                   ds.name as designer_name, ds.color as designer_color,
                   pm.name as pm_name, pm.color as pm_color,
                   pt.name as project_type_name, pt.color as project_type_color,
                   (
                       SELECT COALESCE(SUM(
                           CASE WHEN pe.entity_id IS NOT NULL THEN pe.hours * se.hourly_rate ELSE pe.custom_cost END
                       ), 0)
                       FROM project_expenses pe
                       LEFT JOIN settings_entities se ON pe.entity_id = se.id
                       WHERE pe.project_id = p.id
                   ) as total_spent,
                   (
                       SELECT json_agg(json_build_object('color', COALESCE(se.color, '#94a3b8'), 'cost', CASE WHEN pe.entity_id IS NOT NULL THEN pe.hours * se.hourly_rate ELSE pe.custom_cost END))
                       FROM project_expenses pe
                       LEFT JOIN settings_entities se ON pe.entity_id = se.id
                       WHERE pe.project_id = p.id AND (pe.hours > 0 OR pe.custom_cost > 0)
                   ) as expenses_breakdown
            FROM projects p
            LEFT JOIN settings_entities c ON p.client_id = c.id
            LEFT JOIN settings_entities d ON p.dev_id = d.id
            LEFT JOIN settings_entities ds ON p.designer_id = ds.id
            LEFT JOIN settings_entities pm ON p.pm_id = pm.id
            LEFT JOIN settings_entities pt ON p.project_type_id = pt.id
            $whereClause
            ORDER BY p.$sortBy $sortOrder, p.id DESC
        ");
        $stmt->execute($params);
        
        if ($projectId) {
            echo json_encode(["status" => "success", "data" => $stmt->fetch()]);
        } else {
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        }
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("INSERT INTO projects (name, status, total_value, complexity) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $input['name'] ?? 'New Project',
            $input['status'] ?? 'New Lead',
            $input['total_value'] ?? 0,
            $input['complexity'] ?? 3
        ]);
        $newId = $pdo->lastInsertId('projects_id_seq');
        
        $logStmt = $pdo->prepare("INSERT INTO audit_logs (project_id, action, details) VALUES (?, ?, ?)");
        $logStmt->execute([$newId, 'Created', 'Project created via POST']);
        
        echo json_encode(["status" => "success", "id" => $newId]);
    } elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Handle batch reorder
        if (!$projectId && isset($input['order'])) {
             $pdo->beginTransaction();
             try {
                 foreach ($input['order'] as $index => $id) {
                     $stmt = $pdo->prepare("UPDATE projects SET sort_order = ? WHERE id = ?");
                     $stmt->execute([$index, $id]);
                 }
                 $pdo->commit();
                 echo json_encode(["status" => "success"]);
             } catch (Exception $e) {
                 $pdo->rollBack();
                 throw $e;
             }
             exit;
        }

        if (!$projectId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing project ID"]);
            exit;
        }

        $fields = [];
        $values = [];
        $allowedFields = ['name', 'client_id', 'status', 'accepted_date', 'design_status', 'dev_status', 
                          'pm_id', 'dev_id', 'designer_id', 'project_type_id', 'deadline', 'est_dev_time', 
                          'design_start', 'design_end', 'dev_start', 'dev_end', 'complexity', 'total_value', 'already_paid', 'dev_budget', 'is_archived', 'notes', 'sort_order'];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $input)) {
                $fields[] = "$field = ?";
                // Handle nullable dates / numeric conversions
                if (($field === 'deadline' || $field === 'accepted_date') && empty($input[$field])) {
                    $values[] = null;
                } elseif (in_array($field, ['is_archived'])) {
                     $values[] = $input[$field] ? 1 : 0;
                } else {
                    $values[] = $input[$field] === '' ? null : $input[$field];
                }
            }
        }

        if (empty($fields)) {
            echo json_encode(["status" => "success", "message" => "No fields to update"]);
            exit;
        }

        $values[] = $projectId;
        $sql = "UPDATE projects SET " . implode(", ", $fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);

        $logStmt = $pdo->prepare("INSERT INTO audit_logs (project_id, action, details) VALUES (?, ?, ?)");
        $logStmt->execute([$projectId, 'Updated', "Updated fields: " . implode(", ", array_keys($input))]);

        echo json_encode(["status" => "success"]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
