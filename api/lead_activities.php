<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];
$leadId = $_GET['lead_id'] ?? null;
$activityId = $_GET['id'] ?? null;

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($method === 'GET') {
        if (!$leadId) throw new Exception("Missing lead_id");
        $stmt = $pdo->prepare("SELECT * FROM lead_activities WHERE lead_id = ? ORDER BY activity_date DESC, created_at DESC");
        $stmt->execute([$leadId]);
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input['lead_id']) throw new Exception("Missing lead_id");
        
        $stmt = $pdo->prepare("INSERT INTO lead_activities (lead_id, type, notes, activity_date) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $input['lead_id'],
            $input['type'] ?? 'Other',
            $input['notes'] ?? '',
            $input['activity_date'] ?? date('Y-m-d H:i:s')
        ]);
        
        // Update lead's updated_at timestamp
        $uStmt = $pdo->prepare("UPDATE leads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $uStmt->execute([$input['lead_id']]);
        
        echo json_encode(["status" => "success", "id" => $pdo->lastInsertId()]);
        
    } elseif ($method === 'DELETE') {
        if (!$activityId) throw new Exception("Missing ID");
        $stmt = $pdo->prepare("DELETE FROM lead_activities WHERE id = ?");
        $stmt->execute([$activityId]);
        echo json_encode(["status" => "success"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
