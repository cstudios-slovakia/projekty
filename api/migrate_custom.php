<?php
require 'db.php';

try {
    $pdo->exec("
        ALTER TABLE project_expenses 
        ALTER COLUMN entity_id DROP NOT NULL;

        ALTER TABLE project_expenses 
        ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255) NULL;

        ALTER TABLE project_expenses 
        ADD COLUMN IF NOT EXISTS custom_cost NUMERIC(15,2) NULL;
    ");
    echo json_encode(["status" => "success", "message" => "Migration completed."]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
