<?php
/**
 * Migration Engine
 * Safely updates the database schema without destroying data.
 * Supports MySQL and PostgreSQL.
 */

define('ALLOW_NO_DB', true);
require_once __DIR__ . '/db.php';

if (!$is_installed) {
    echo "Software not installed. Skipping migration.\n";
    exit;
}

function column_exists($pdo, $table, $column) {
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver === 'pgsql') {
        $stmt = $pdo->prepare("SELECT 1 FROM information_schema.columns WHERE table_name = ? AND column_name = ?");
        $stmt->execute([$table, $column]);
        return (bool)$stmt->fetch();
    } else {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
        $stmt->execute([$column]);
        return (bool)$stmt->fetch();
    }
}

function table_exists($pdo, $table) {
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver === 'pgsql') {
        $stmt = $pdo->prepare("SELECT 1 FROM information_schema.tables WHERE table_name = ?");
        $stmt->execute([$table]);
        return (bool)$stmt->fetch();
    } else {
        $stmt = $pdo->prepare("SHOW TABLES LIKE ?");
        $stmt->execute([$table]);
        return (bool)$stmt->fetch();
    }
}

try {
    echo "Starting migration check...\n";

    // 1. Ensure system_settings table exists
    if (!table_exists($pdo, 'system_settings')) {
        echo "Creating system_settings table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'pgsql') {
            $pdo->exec("CREATE TABLE system_settings (key VARCHAR(255) PRIMARY KEY, value TEXT)");
        } else {
            $pdo->exec("CREATE TABLE system_settings (`key` VARCHAR(255) PRIMARY KEY, `value` TEXT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
        }
    }

    // 2. Add sort_order to projects if missing
    if (!column_exists($pdo, 'projects', 'sort_order')) {
        echo "Adding sort_order to projects...\n";
        $pdo->exec("ALTER TABLE projects ADD COLUMN sort_order INTEGER DEFAULT 0");
    }

    // 3. Add timestamps to projects if missing
    if (!column_exists($pdo, 'projects', 'created_at')) {
        echo "Adding created_at to projects...\n";
        $pdo->exec("ALTER TABLE projects ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    }
    if (!column_exists($pdo, 'projects', 'updated_at')) {
        echo "Adding updated_at to projects...\n";
        $pdo->exec("ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    }

    // --- Data Normalization (Fix for legacy NULLs) ---
    echo "Normalizing project data defaults...\n";
    $pdo->exec("UPDATE projects SET is_archived = FALSE WHERE is_archived IS NULL");
    if (column_exists($pdo, 'projects', 'sort_order')) {
        $pdo->exec("UPDATE projects SET sort_order = 0 WHERE sort_order IS NULL");
    }
    if (column_exists($pdo, 'projects', 'complexity')) {
        $pdo->exec("UPDATE projects SET complexity = 1 WHERE complexity IS NULL");
    }
    if (column_exists($pdo, 'projects', 'created_at')) {
        $pdo->exec("UPDATE projects SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL");
    }
    if (column_exists($pdo, 'projects', 'updated_at')) {
        $pdo->exec("UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL");
    }

    // 4. Add updated_at to expenses if missing
    if (!column_exists($pdo, 'project_expenses', 'updated_at')) {
        echo "Adding updated_at to project_expenses...\n";
        $pdo->exec("ALTER TABLE project_expenses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    }

    // 5. Add language to users if missing
    if (!column_exists($pdo, 'users', 'language')) {
        echo "Adding language to users...\n";
        $pdo->exec("ALTER TABLE users ADD COLUMN language VARCHAR(5) DEFAULT 'en'");
    }

    // 6. Seed default settings if missing
    $defaults = [
        ['system_title', 'Lead Tracker'],
        ['accent_color_primary', '#e78b01'],
        ['accent_color_secondary', '#00b800'],
        ['default_language', 'en']
    ];
    $stmt = $pdo->prepare("SELECT 1 FROM system_settings WHERE \"key\" = ?");
    $insert = $pdo->prepare("INSERT INTO system_settings (\"key\", \"value\") VALUES (?, ?)");
    
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    $q = ($driver === 'pgsql') ? '"' : '`';
    $stmt = $pdo->prepare("SELECT 1 FROM system_settings WHERE {$q}key{$q} = ?");
    $insert = $pdo->prepare("INSERT INTO system_settings ({$q}key{$q}, {$q}value{$q}) VALUES (?, ?)");

    foreach ($defaults as $row) {
        $stmt->execute([$row[0]]);
        if (!$stmt->fetch()) {
            echo "Seeding default setting: {$row[0]}...\n";
            $insert->execute($row);
        }
    }

    // 6. Create leads table if missing
    if (!table_exists($pdo, 'leads')) {
        echo "Creating leads table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE leads (
            id $pk,
            company_name VARCHAR(255),
            contact_name VARCHAR(255),
            email VARCHAR(255),
            phone VARCHAR(50),
            country VARCHAR(100),
            message TEXT,
            status_id INTEGER,
            source_id INTEGER,
            pm_id INTEGER,
            is_archived BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    }

    // 7. Create lead_activities table if missing
    if (!table_exists($pdo, 'lead_activities')) {
        echo "Creating lead_activities table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE lead_activities (
            id $pk,
            lead_id INTEGER,
            type VARCHAR(50),
            notes TEXT,
            activity_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    }

    // 8. Seed Default Lead Statuses and Sources
    $seed_entities = [
        ['lead_status', 'New', '#34d399'],
        ['lead_status', 'In Contact', '#3b82f6'],
        ['lead_status', 'Qualified', '#8b5cf6'],
        ['lead_status', 'Lost', '#ef4444'],
        ['lead_source', 'Website', '#94a3b8'],
        ['lead_source', 'LinkedIn', '#0077b5'],
        ['lead_source', 'Referral', '#f59e0b'],
        ['lead_source', 'Direct', '#64748b']
    ];
    
    $check_entity = $pdo->prepare("SELECT 1 FROM settings_entities WHERE type = ? AND name = ?");
    $insert_entity = $pdo->prepare("INSERT INTO settings_entities (type, name, color) VALUES (?, ?, ?)");
    
    foreach ($seed_entities as $ent) {
        $check_entity->execute([$ent[0], $ent[1]]);
        if (!$check_entity->fetch()) {
            echo "Seeding {$ent[0]}: {$ent[1]}...\n";
            $insert_entity->execute($ent);
        }
    }

    // 9. v1.7.0 Features: Dynamic Roles & Permissions
    if (!table_exists($pdo, 'role_definitions')) {
        echo "Creating role_definitions table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE role_definitions (
            id $pk,
            label VARCHAR(255) NOT NULL,
            is_timeline_group BOOLEAN DEFAULT TRUE,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        
        // Seed default roles to ensure system operates seamlessly initially
        $seed_roles = [
            ['Developer', 1, 10],
            ['Designer', 1, 20],
            ['QA', 1, 30]
        ];
        $insert_role = $pdo->prepare("INSERT INTO role_definitions (label, is_timeline_group, sort_order) VALUES (?, ?, ?)");
        foreach ($seed_roles as $role) {
            $insert_role->execute($role);
        }
    }

    // 10. Multi-assignment storage
    if (!table_exists($pdo, 'project_assignments')) {
        echo "Creating project_assignments table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE project_assignments (
            id $pk,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role_id INTEGER,
            member_id INTEGER,
            start_date TIMESTAMP,
            end_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
        // role_id references role_definitions
        // member_id references settings_entities (legacy support)
    }

    // 11. Time tracking with markdown
    if (!table_exists($pdo, 'time_logs')) {
        echo "Creating time_logs table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE time_logs (
            id $pk,
            project_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            hours NUMERIC(10,2) NOT NULL DEFAULT 0.00,
            notes TEXT,
            log_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    }

    // 12. Update Users table for RBAC
    if (!column_exists($pdo, 'users', 'role')) {
        echo "Adding role to users...\n";
        $pdo->exec("ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'viewer'");
    }
    if (!column_exists($pdo, 'users', 'member_id')) {
        echo "Adding member_id to users (link to entity)...\n";
        $pdo->exec("ALTER TABLE users ADD COLUMN member_id INTEGER NULL");
    }

    // Ensure default admin user has admin role
    $pdo->exec("UPDATE users SET role = 'admin' WHERE id = 1 AND (role IS NULL OR role = 'user')");

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
