<?php
require 'db.php';

try {
    $pdo->exec("
        ALTER TABLE project_expenses 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        
        -- Update existing rows to have updated_at equal to created_at
        UPDATE project_expenses SET updated_at = created_at WHERE updated_at IS NULL;
    ");
    echo json_encode(["status" => "success", "message" => "Updated_at column added to project_expenses."]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
