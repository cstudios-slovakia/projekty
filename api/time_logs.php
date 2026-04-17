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
        
        $logsToProcess = [];
        if (isset($input['logs']) && is_array($input['logs'])) {
            $logsToProcess = $input['logs'];
        } else {
            $logsToProcess = [$input];
        }
        
        $pdo->beginTransaction();
        try {
            $expenseStmt = $pdo->prepare("INSERT INTO project_expenses (project_id, entity_id, week, custom_name, hours, custom_cost) VALUES (?, ?, ?, ?, ?, 0)");
            $stmt = $pdo->prepare("INSERT INTO time_logs (project_id, user_id, hours, notes, log_date, expense_id) VALUES (?, ?, ?, ?, ?, ?)");
            $userStmt = $pdo->prepare("SELECT member_id FROM users WHERE id = ?");
            
            $insertedIds = [];
            
            foreach ($logsToProcess as $log) {
                if (empty($log['project_id']) || empty($log['user_id']) || !isset($log['hours'])) {
                   continue;
                }
                
                $userStmt->execute([$log['user_id']]);
                $user = $userStmt->fetch();
                $expenseId = null;
                
                if ($user && $user['member_id']) {
                    $logDate = $log['log_date'] ?? date('Y-m-d');
                    $weekStr = date('o-\WW', strtotime($logDate));
                    
                    $expenseStmt->execute([
                        $log['project_id'],
                        $user['member_id'],
                        $weekStr,
                        'Time Log: ' . ($log['notes'] ?? 'Work'),
                        $log['hours']
                    ]);
                    $expenseId = defined('IS_MYSQL') && IS_MYSQL ? $pdo->lastInsertId() : $pdo->lastInsertId('project_expenses_id_seq');
                }
                
                $stmt->execute([
                    $log['project_id'],
                    $log['user_id'],
                    $log['hours'],
                    $log['notes'] ?? null,
                    $log['log_date'] ?? date('Y-m-d'),
                    $expenseId
                ]);
                
                $newId = defined('IS_MYSQL') && IS_MYSQL ? $pdo->lastInsertId() : $pdo->lastInsertId('time_logs_id_seq');
                $insertedIds[] = $newId;
            }
            
            $pdo->commit();
            echo json_encode(["status" => "success", "ids" => $insertedIds]);
        } catch (\Exception $ex) {
            $pdo->rollBack();
            throw $ex;
        }
        
    } elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$logId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing log ID"]);
            exit;
        }
        
        // Fetch current to optionally update expense
        $checkStmt = $pdo->prepare("SELECT * FROM time_logs WHERE id = ?");
        $checkStmt->execute([$logId]);
        $currentLog = $checkStmt->fetch();
        
        if (!$currentLog) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Log not found"]);
            exit;
        }
        
        $pdo->beginTransaction();
        try {
            $projectId = $input['project_id'] ?? $currentLog['project_id'];
            $hours = $input['hours'] ?? $currentLog['hours'];
            $notes = $input['notes'] ?? $currentLog['notes'];
            $logDate = $input['log_date'] ?? $currentLog['log_date'];

            $updateStmt = $pdo->prepare("UPDATE time_logs SET project_id = ?, hours = ?, notes = ?, log_date = ? WHERE id = ?");
            $updateStmt->execute([$projectId, $hours, $notes, $logDate, $logId]);
            
            if ($currentLog['expense_id']) {
                $weekStr = date('o-\WW', strtotime($logDate));
                $expUpdateStmt = $pdo->prepare("UPDATE project_expenses SET project_id = ?, hours = ?, custom_name = ?, week = ? WHERE id = ?");
                $expUpdateStmt->execute([
                    $projectId,
                    $hours,
                    'Time Log: ' . ($notes ?? 'Work'),
                    $weekStr,
                    $currentLog['expense_id']
                ]);
            }
            
            $pdo->commit();
            echo json_encode(["status" => "success", "message" => "Log updated"]);
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
        
        $checkStmt = $pdo->prepare("SELECT expense_id FROM time_logs WHERE id = ?");
        $checkStmt->execute([$logId]);
        $currentLog = $checkStmt->fetch();
        
        $pdo->beginTransaction();
        try {
            // Because ON DELETE SET NULL was used in the schema, we delete the time log, then the expense itself if we want to remove the hours entirely. 
            // WAIT, if we delete the expense, the time log's ON DELETE SET NULL triggers, which is fine. Let's delete the time_log first, then project_expense if exists.
            $stmt = $pdo->prepare("DELETE FROM time_logs WHERE id = ?");
            $stmt->execute([$logId]);
            
            if ($currentLog && $currentLog['expense_id']) {
                $expDelStmt = $pdo->prepare("DELETE FROM project_expenses WHERE id = ?");
                $expDelStmt->execute([$currentLog['expense_id']]);
            }
            
            $pdo->commit();
            echo json_encode(["status" => "success"]);
        } catch (\Exception $ex) {
            $pdo->rollBack();
            throw $ex;
        }
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
