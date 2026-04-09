<?php
// api/schema.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require 'db.php';

try {
    $pdo->exec("
        DROP TABLE IF EXISTS comments CASCADE;
        DROP TABLE IF EXISTS audit_logs CASCADE;
        DROP TABLE IF EXISTS project_tags CASCADE;
        DROP TABLE IF EXISTS projects CASCADE;
        DROP TABLE IF EXISTS settings_entities CASCADE;
        DROP TABLE IF EXISTS users CASCADE;

        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'user',
            reset_token VARCHAR(255) NULL
        );
        
        CREATE TABLE IF NOT EXISTS settings_entities (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(50) DEFAULT '#8a8c89',
            contact_person VARCHAR(255) NULL,
            email_phone VARCHAR(255) NULL,
            hourly_rate NUMERIC(15,2) DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS projects (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            client_id INTEGER REFERENCES settings_entities(id) ON DELETE SET NULL,
            status VARCHAR(50) DEFAULT 'New Lead',
            accepted_date DATE NULL,
            design_status VARCHAR(50) DEFAULT 'Not Started',
            dev_status VARCHAR(50) DEFAULT 'Not Started',
            pm_id INTEGER REFERENCES settings_entities(id) ON DELETE SET NULL,
            dev_id INTEGER REFERENCES settings_entities(id) ON DELETE SET NULL,
            designer_id INTEGER REFERENCES settings_entities(id) ON DELETE SET NULL,
            project_type_id INTEGER REFERENCES settings_entities(id) ON DELETE SET NULL,
            deadline DATE NULL,
            est_dev_time INTEGER DEFAULT 0,
            design_start DATE NULL,
            design_end DATE NULL,
            dev_start DATE NULL,
            dev_end DATE NULL,
            complexity INTEGER DEFAULT 1,
            total_value NUMERIC(15,2) DEFAULT 0,
            already_paid NUMERIC(15,2) DEFAULT 0,
            dev_budget NUMERIC(15,2) DEFAULT 0,
            is_archived BOOLEAN DEFAULT FALSE,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS project_tags (
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            tag_id INTEGER REFERENCES settings_entities(id) ON DELETE CASCADE,
            PRIMARY KEY (project_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            action VARCHAR(50) NOT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS project_expenses (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            entity_id INTEGER REFERENCES settings_entities(id) ON DELETE CASCADE,
            hours NUMERIC(10,2) NOT NULL DEFAULT 0,
            week VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS comments (
            id SERIAL PRIMARY KEY,
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ");
    
    // Create admin user if it doesn't exist
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = 'admin'");
    $stmt->execute();
    if (!$stmt->fetch()) {
        $hash = password_hash('cstudiosmoney', PASSWORD_DEFAULT);
        $insertStmt = $pdo->prepare("INSERT INTO users (username, password_hash, role) VALUES ('admin', :hash, 'admin')");
        $insertStmt->execute(['hash' => $hash]);
    }

    echo json_encode(["status" => "success", "message" => "Database schema generated successfully"]);

} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Schema creation failed: " . $e->getMessage()]);
}
?>
