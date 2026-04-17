<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];
$logId = $_GET['id'] ?? null;
$projectId = $_GET['project_id'] ?? null;
$userId = $_GET['user_id'] ?? null;

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($method === 'GET') {
        $filters = [];
        $params = [];
        
        if ($projectId) {
            $filters[] = "tl.project_id = ?";
            $params[] = $projectId;
        }
        if ($userId) {
            $filters[] = "tl.user_id = ?";
            $params[] = $userId;
        }
        
        $whereClause = !empty($filters) ? "WHERE " . implode(" AND ", $filters) : "";
        
        $stmt = $pdo->prepare("
            SELECT tl.*, u.username, u.member_id, p.name as project_name
            FROM time_logs tl
            LEFT JOIN users u ON tl.user_id = u.id
            LEFT JOIN projects p ON tl.project_id = p.id
            $whereClause
            ORDER BY tl.log_date DESC, tl.created_at DESC
        ");
        $stmt->execute($params);
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (empty($input['project_id']) || empty($input['user_id']) || !isset($input['hours'])) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing required fields (project_id, user_id, hours)"]);
            exit;
        }
        
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("INSERT INTO time_logs (project_id, user_id, hours, notes, log_date) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['project_id'],
                $input['user_id'],
                $input['hours'],
                $input['notes'] ?? null,
                $input['log_date'] ?? date('Y-m-d')
            ]);
            
            $newId = IS_MYSQL ? $pdo->lastInsertId() : $pdo->lastInsertId('time_logs_id_seq');
            
            // Link to project_expenses
            // Get user's member_id to link properly
            $userStmt = $pdo->prepare("SELECT member_id FROM users WHERE id = ?");
            $userStmt->execute([$input['user_id']]);
            $user = $userStmt->fetch();
            
            if ($user && $user['member_id']) {
                $expenseStmt = $pdo->prepare("INSERT INTO project_expenses (project_id, entity_id, type, name, hours, custom_cost) VALUES (?, ?, 'dev', ?, ?, 0)");
                $expenseStmt->execute([
                    $input['project_id'],
                    $user['member_id'],
                    'Time Log: ' . ($input['notes'] ?? 'Work'),
                    $input['hours']
                ]);
            }
            
            $pdo->commit();
            echo json_encode(["status" => "success", "id" => $newId]);
        } catch (\Exception $ex) {
            $pdo->rollBack();
            throw $ex;
        }
        
    } elseif ($method === 'DELETE') {
        if (!$logId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing log ID"]);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM time_logs WHERE id = ?");
        $stmt->execute([$logId]);
        echo json_encode(["status" => "success"]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
