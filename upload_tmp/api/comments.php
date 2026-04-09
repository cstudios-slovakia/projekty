<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];
$projectId = $_GET['project_id'] ?? null;

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($method === 'GET' && $projectId) {
        $stmt = $pdo->prepare("
            SELECT c.*, u.username 
            FROM comments c 
            LEFT JOIN users u ON c.user_id = u.id 
            WHERE c.project_id = ? 
            ORDER BY c.created_at DESC
        ");
        $stmt->execute([$projectId]);
        echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $pdo->prepare("INSERT INTO comments (project_id, user_id, content) VALUES (?, ?, ?)");
        $stmt->execute([
            $input['project_id'],
            $input['user_id'] ?? null,
            $input['content']
        ]);
        
        $logStmt = $pdo->prepare("INSERT INTO audit_logs (project_id, action, details) VALUES (?, ?, ?)");
        $logStmt->execute([$input['project_id'], 'Comment Added', substr($input['content'], 0, 50)]);

        echo json_encode(["status" => "success", "id" => $pdo->lastInsertId('comments_id_seq')]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
