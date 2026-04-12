<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];
$leadId = $_GET['id'] ?? null;

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($method === 'GET') {
        if ($leadId) {
            $stmt = $pdo->prepare("
                SELECT l.*, 
                       s.name as status_name, s.color as status_color,
                       src.name as source_name, src.color as source_color,
                       pm.name as pm_name, pm.color as pm_color,
                       (SELECT MAX(activity_date) FROM lead_activities WHERE lead_id = l.id) as last_activity
                FROM leads l
                LEFT JOIN settings_entities s ON l.status_id = s.id
                LEFT JOIN settings_entities src ON l.source_id = src.id
                LEFT JOIN settings_entities pm ON l.pm_id = pm.id
                WHERE l.id = ?
            ");
            $stmt->execute([$leadId]);
            echo json_encode(["status" => "success", "data" => $stmt->fetch()]);
        } else {
            $archived = isset($_GET['archived']) && $_GET['archived'] === 'true' ? 'TRUE' : 'FALSE';
            $stmt = $pdo->query("
                SELECT l.*, 
                       s.name as status_name, s.color as status_color,
                       src.name as source_name, src.color as source_color,
                       pm.name as pm_name, pm.color as pm_color,
                       (SELECT MAX(activity_date) FROM lead_activities WHERE lead_id = l.id) as last_activity
                FROM leads l
                LEFT JOIN settings_entities s ON l.status_id = s.id
                LEFT JOIN settings_entities src ON l.source_id = src.id
                LEFT JOIN settings_entities pm ON l.pm_id = pm.id
                WHERE l.is_archived = $archived
                ORDER BY CASE WHEN (SELECT MAX(activity_date) FROM lead_activities WHERE lead_id = l.id) IS NULL THEN 1 ELSE 0 END, last_activity DESC, l.created_at DESC
            ");
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        }
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("INSERT INTO leads (company_name, contact_name, email, phone, country, message, status_id, source_id, pm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['company_name'] ?? '',
            $input['contact_name'] ?? '',
            $input['email'] ?? '',
            $input['phone'] ?? '',
            $input['country'] ?? '',
            $input['message'] ?? '',
            $input['status_id'] ?? null,
            $input['source_id'] ?? null,
            $input['pm_id'] ?? null
        ]);
        echo json_encode(["status" => "success", "id" => $pdo->lastInsertId()]);
    } elseif ($method === 'PUT') {
        if (!$leadId) throw new Exception("Missing ID");
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Handle "Upgrade to Project"
        if (isset($input['upgrade']) && $input['upgrade']) {
            $pdo->beginTransaction();
            
            // 1. Fetch lead info
            $stmt = $pdo->prepare("SELECT * FROM leads WHERE id = ?");
            $stmt->execute([$leadId]);
            $lead = $stmt->fetch();
            
            // 2. Create Project
            $pStmt = $pdo->prepare("INSERT INTO projects (name, status, pm_id, notes, created_at) VALUES (?, 'New Lead', ?, ?, ?)");
            $pStmt->execute([
                $lead['company_name'] ?: ($lead['contact_name'] ?: 'Upgraded Lead'),
                $lead['pm_id'],
                "Upgraded from lead. Contact: {$lead['contact_name']}\nEmail: {$lead['email']}\nPhone: {$lead['phone']}\n\nOriginal Message:\n{$lead['message']}",
                date('Y-m-d H:i:s')
            ]);
            $projectId = $pdo->lastInsertId();
            
            // 3. Mark Lead as Archived or set a status
            $uStmt = $pdo->prepare("UPDATE leads SET is_archived = TRUE WHERE id = ?");
            $uStmt->execute([$leadId]);
            
            // 4. Audit Log
            $logStmt = $pdo->prepare("INSERT INTO audit_logs (project_id, action, details) VALUES (?, 'Created', 'Project created by upgrading lead #$leadId')");
            $logStmt->execute([$projectId]);
            
            $pdo->commit();
            echo json_encode(["status" => "success", "project_id" => $projectId]);
            exit;
        }

        // Handle General Update
        $fields = []; $values = [];
        $allowed = ['company_name', 'contact_name', 'email', 'phone', 'country', 'message', 'status_id', 'source_id', 'pm_id', 'is_archived'];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $input)) {
                $fields[] = "$f = ?";
                $values[] = $f === 'is_archived' ? ($input[$f] ? 1 : 0) : $input[$f];
            }
        }
        $values[] = $leadId;
        $sql = "UPDATE leads SET " . implode(', ', $fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($values);
        echo json_encode(["status" => "success"]);
    } elseif ($method === 'DELETE') {
        if (!$leadId) throw new Exception("Missing ID");
        $stmt = $pdo->prepare("DELETE FROM leads WHERE id = ?");
        $stmt->execute([$leadId]);
        echo json_encode(["status" => "success"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
