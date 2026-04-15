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

    // --- v1.7 User Roles & Unified Management Migration ---
    echo "Checking v1.7 User schema updates...\n";
    if (!column_exists($pdo, 'users', 'name')) {
        echo "Adding name, email, system_role, notify to users...\n";
        $pdo->exec("ALTER TABLE users ADD COLUMN name VARCHAR(255) NULL");
        $pdo->exec("ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL");
        $pdo->exec("ALTER TABLE users ADD COLUMN system_role VARCHAR(20) DEFAULT 'end_user'");
        $pdo->exec("ALTER TABLE users ADD COLUMN notify BOOLEAN DEFAULT FALSE");

        // Convert old roles
        $pdo->exec("UPDATE users SET system_role = 'admin' WHERE role = 'admin'");
        $pdo->exec("UPDATE users SET system_role = 'end_user' WHERE role = 'user'");
    }

    if (!table_exists($pdo, 'user_custom_roles')) {
        echo "Creating user_custom_roles and project_team_members tables...\n";
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE user_custom_roles (
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            role_entity_id INTEGER REFERENCES settings_entities(id) ON DELETE CASCADE,
            PRIMARY KEY (user_id, role_entity_id)
        )");

        $pdo->exec("CREATE TABLE project_team_members (
            project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
            role_entity_id INTEGER REFERENCES settings_entities(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            PRIMARY KEY (project_id, role_entity_id, user_id)
        )");

        // 1. Convert old 'pm', 'developer', 'designer' into 'project_role'
        // First ensure the base roles exist as 'project_role'
        $base_roles = [
            ['project_role', 'Project Manager', '#f59e0b', 'pm'],
            ['project_role', 'Developer', '#3b82f6', 'developer'],
            ['project_role', 'Designer', '#eab308', 'designer']
        ];
        
        $role_map = []; // maps legacy 'type' => new project_role entity id
        
        $insert_role = $pdo->prepare("INSERT INTO settings_entities (type, name, color) VALUES (?, ?, ?)");
        $check_role = $pdo->prepare("SELECT id FROM settings_entities WHERE type = 'project_role' AND name = ?");

        foreach ($base_roles as $b) {
            $check_role->execute([$b[1]]);
            $role_id = $check_role->fetchColumn();
            if (!$role_id) {
                $insert_role->execute([$b[0], $b[1], $b[2]]);
            }
            $check_role->execute([$b[1]]);
            $role_map[$b[3]] = $check_role->fetchColumn();
        }

        // 2. Migrate legacy entities (which are effectively users)
        echo "Migrating legacy team members to users table...\n";
        $legacy_types = ["pm", "developer", "designer"];
        
        $stmtEntities = $pdo->query("SELECT id, name, type, contact_person, email_phone FROM settings_entities WHERE type IN ('pm', 'developer', 'designer')");
        $legacyEntities = $stmtEntities->fetchAll();

        $checkUser = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $insertUser = $pdo->prepare("INSERT INTO users (username, name, email, password_hash, system_role) VALUES (?, ?, ?, ?, 'end_user')");
        $insertCustomRole = $pdo->prepare("INSERT IGNORE INTO user_custom_roles (user_id, role_entity_id) VALUES (?, ?)");
        if ($driver === 'pgsql') {
            $insertCustomRole = $pdo->prepare("INSERT INTO user_custom_roles (user_id, role_entity_id) VALUES (?, ?) ON CONFLICT DO NOTHING");
        }

        $entityToUserMap = []; // old entity_id => new user_id

        foreach ($legacyEntities as $entity) {
            $username = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $entity['name']));
            if (empty($username)) $username = 'user_' . $entity['id'];
            
            // Ensure unique username
            $unique_username = $username;
            $counter = 1;
            while (true) {
                $checkUser->execute([$unique_username]);
                if (!$checkUser->fetch()) break;
                $unique_username = $username . $counter;
                $counter++;
            }

            // Create placeholder password
            $hash = password_hash('password123', PASSWORD_DEFAULT);
            $insertUser->execute([$unique_username, $entity['name'], $entity['email_phone'], $hash]);
            
            $checkUser->execute([$unique_username]);
            $new_user_id = $checkUser->fetchColumn();
            $entityToUserMap[$entity['id']] = $new_user_id;

            // Link them to the custom role based on legacy type
            if (isset($role_map[$entity['type']])) {
                $insertCustomRole->execute([$new_user_id, $role_map[$entity['type']]]);
            }
        }

        // 3. Migrate assignments on projects table
        echo "Migrating project assignments to project_team_members...\n";
        $insertTeam = $pdo->prepare("INSERT INTO project_team_members (project_id, role_entity_id, user_id) VALUES (?, ?, ?)");
        if ($driver === 'pgsql') {
            $insertTeam = $pdo->prepare("INSERT INTO project_team_members (project_id, role_entity_id, user_id) VALUES (?, ?, ?) ON CONFLICT DO NOTHING");
        } else {
            $insertTeam = $pdo->prepare("INSERT IGNORE INTO project_team_members (project_id, role_entity_id, user_id) VALUES (?, ?, ?)");
        }

        $projects = $pdo->query("SELECT id, pm_id, dev_id, designer_id FROM projects")->fetchAll();
        foreach ($projects as $proj) {
            if ($proj['pm_id'] && isset($entityToUserMap[$proj['pm_id']])) {
                $insertTeam->execute([$proj['id'], $role_map['pm'], $entityToUserMap[$proj['pm_id']]]);
            }
            if ($proj['dev_id'] && isset($entityToUserMap[$proj['dev_id']])) {
                $insertTeam->execute([$proj['id'], $role_map['developer'], $entityToUserMap[$proj['dev_id']]]);
            }
            if ($proj['designer_id'] && isset($entityToUserMap[$proj['designer_id']])) {
                $insertTeam->execute([$proj['id'], $role_map['designer'], $entityToUserMap[$proj['designer_id']]]);
            }
        }

        // 4. Update leads.pm_id to map to users instead of entities
        echo "Migrating leads.pm_id...\n";
        $leads = $pdo->query("SELECT id, pm_id FROM leads WHERE pm_id IS NOT NULL")->fetchAll();
        $updateLead = $pdo->prepare("UPDATE leads SET pm_id = ? WHERE id = ?");
        foreach ($leads as $lead) {
            if (isset($entityToUserMap[$lead['pm_id']])) {
                $updateLead->execute([$entityToUserMap[$lead['pm_id']], $lead['id']]);
            } else {
                // Orphaned
                $updateLead->execute([null, $lead['id']]);
            }
        }

        echo "Cleaning up legacy setting entities...\n";
        $pdo->exec("DELETE FROM settings_entities WHERE type IN ('pm', 'developer', 'designer')");
    }

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
