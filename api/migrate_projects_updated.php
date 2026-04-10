<?php
require 'db.php';

try {
    $pdo->exec("
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        
        -- Update existing rows to have updated_at equal to created_at
        UPDATE projects SET updated_at = created_at WHERE updated_at IS NULL;
        
        -- Trigger for automatic updated_at update
        /*
        CREATE OR REPLACE FUNCTION update_modified_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER update_projects_modtime
            BEFORE UPDATE ON projects
            FOR EACH ROW
            EXECUTE FUNCTION update_modified_column();
        */
    ");
    echo json_encode(["status" => "success", "message" => "Updated_at column added to projects."]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
