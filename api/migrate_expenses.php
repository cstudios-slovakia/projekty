<?php
// api/migrate_expenses.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require 'db.php';

try {
    // 1. Add hourly_rate to settings_entities
    $pdo->exec("ALTER TABLE settings_entities ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(15,2) DEFAULT 0;");

    // 2. Add dev_budget to projects
    $pdo->exec("ALTER TABLE projects ADD COLUMN IF NOT EXISTS dev_budget NUMERIC(15,2) DEFAULT 0;");

    // 3. Create project_expenses table
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS project_expenses (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            entity_id INTEGER REFERENCES settings_entities(id) ON DELETE CASCADE,
            hours NUMERIC(10,2) NOT NULL DEFAULT 0,
            week VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ");

    echo json_encode(["status" => "success", "message" => "Expenses migration completed."]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Migration failed: " . $e->getMessage()]);
}
?>
