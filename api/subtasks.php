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
        
        $whereClause = "";
        $params = [];
        if ($projectId && $projectId !== 'all') {
            $whereClause = "WHERE st.project_id = ?";
            $params[] = $projectId;
        }

        $stmt = $pdo->prepare("
            SELECT st.*,
                   p.name as project_name,
                   c.id as client_id,
                   c.name as client_name,
                   c.color as client_color,
                   dev.name as assignee_name, dev.color as assignee_color,
                   cum.clickup_username, cum.clickup_avatar
            FROM project_subtasks st
            JOIN projects p ON st.project_id = p.id
            LEFT JOIN active_development_projects ad ON ad.project_id = p.id
            LEFT JOIN settings_entities c ON COALESCE(ad.client_id, p.client_id) = c.id
            LEFT JOIN settings_entities dev ON st.assignee_id = dev.id
            LEFT JOIN clickup_user_mappings cum ON st.clickup_assignee_id = cum.clickup_user_id
            $whereClause
            ORDER BY st.sort_order ASC, st.id DESC
        ");
        $stmt->execute($params);
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (empty($input['project_id']) || empty($input['title'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing project_id or title"]);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO project_subtasks (project_id, title, status, clickup_id, clickup_assignee_id, assignee_id, due_date, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $input['project_id'],
            $input['title'],
            $input['status'] ?? 'to do',
            $input['clickup_id'] ?? null,
            $input['clickup_assignee_id'] ?? null,
            !empty($input['assignee_id']) ? $input['assignee_id'] : null,
            !empty($input['due_date']) ? $input['due_date'] : null,
            $input['sort_order'] ?? 0
        ]);

        $newId = IS_MYSQL ? $pdo->lastInsertId() : $pdo->lastInsertId('project_subtasks_id_seq');
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
        $allowed = ['title', 'status', 'clickup_id', 'clickup_assignee_id', 'assignee_id', 'due_date', 'sort_order'];

        foreach ($allowed as $f) {
            if (array_key_exists($f, $input)) {
                $fields[] = "$f = ?";
                if (in_array($f, ['assignee_id', 'due_date']) && empty($input[$f])) {
                    $values[] = null;
                } else {
                    $values[] = $input[$f] === '' ? null : $input[$f];
                }
            }
        }

        if (!empty($fields)) {
            $values[] = $id;
            $sql = "UPDATE project_subtasks SET " . implode(", ", $fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
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

        $stmt = $pdo->prepare("DELETE FROM project_subtasks WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
