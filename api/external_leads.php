<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, X-Lead-API-Key');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$apiKey = $_SERVER['HTTP_X_LEAD_API_KEY'] ?? null;

if (!$apiKey || $apiKey !== LEAD_API_KEY) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Unauthorized"]);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // 1. Resolve default status (New)
    $sStmt = $pdo->prepare("SELECT id FROM settings_entities WHERE type = 'lead_status' AND name = 'New' LIMIT 1");
    $sStmt->execute();
    $statusId = $sStmt->fetchColumn() ?: null;

    // 2. Resolve default PM if provided or null
    $pmId = null;
    if (isset($input['pm_username'])) {
        $pmStmt = $pdo->prepare("SELECT id FROM settings_entities WHERE type = 'pm' AND name = ? LIMIT 1");
        $pmStmt->execute([$input['pm_username']]);
        $pmId = $pmStmt->fetchColumn() ?: null;
    }

    // 3. Resolve source if provided or default to 'Website'
    $sourceName = $input['source'] ?? 'Website';
    $srcStmt = $pdo->prepare("SELECT id FROM settings_entities WHERE type = 'lead_source' AND name = ? LIMIT 1");
    $srcStmt->execute([$sourceName]);
    $sourceId = $srcStmt->fetchColumn();
    
    if (!$sourceId) {
        // Create source if it doesn't exist? No, let's keep it clean.
        $srcStmt = $pdo->prepare("SELECT id FROM settings_entities WHERE type = 'lead_source' AND name = 'Website' LIMIT 1");
        $srcStmt->execute();
        $sourceId = $srcStmt->fetchColumn();
    }

    // 4. Insert Lead
    $stmt = $pdo->prepare("INSERT INTO leads (company_name, contact_name, email, phone, country, message, status_id, source_id, pm_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $input['company_name'] ?? ($input['name'] ?? 'Inbound Lead'),
        $input['contact_name'] ?? ($input['name'] ?? ''),
        $input['email'] ?? '',
        $input['phone'] ?? '',
        $input['country'] ?? '',
        $input['message'] ?? ($input['text'] ?? ''),
        $statusId,
        $sourceId,
        $pmId
    ]);
    
    $newLeadId = $pdo->lastInsertId();
    
    // 5. Log activity
    $logStmt = $pdo->prepare("INSERT INTO lead_activities (lead_id, type, notes) VALUES (?, 'System', 'Lead ingested via External API')");
    $logStmt->execute([$newLeadId]);

    echo json_encode(["status" => "success", "id" => $newLeadId, "message" => "Lead created"]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
