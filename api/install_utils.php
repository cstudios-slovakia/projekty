<?php
// api/install_utils.php

function get_schema_sql($db_type, $prefix = '') {
    $is_mysql = $db_type === 'mysql' || $db_type === 'mariadb';
    
    $pk = $is_mysql ? "INTEGER AUTO_INCREMENT PRIMARY KEY" : "SERIAL PRIMARY KEY";
    $text = "TEXT";
    $numeric = "NUMERIC(15,2)";
    $timestamp = "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";

    $sql = "
        DROP TABLE IF EXISTS {$prefix}comments CASCADE;
        DROP TABLE IF EXISTS {$prefix}audit_logs CASCADE;
        DROP TABLE IF EXISTS {$prefix}project_expenses CASCADE;
        DROP TABLE IF EXISTS {$prefix}project_tags CASCADE;
        DROP TABLE IF EXISTS {$prefix}projects CASCADE;
        DROP TABLE IF EXISTS {$prefix}settings_entities CASCADE;
        DROP TABLE IF EXISTS {$prefix}users CASCADE;
        DROP TABLE IF EXISTS {$prefix}system_settings CASCADE;

        CREATE TABLE {$prefix}users (
            id $pk,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(20) DEFAULT 'user',
            reset_token VARCHAR(255) NULL
        ) " . ($is_mysql ? "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4" : "") . ";
        
        CREATE TABLE {$prefix}settings_entities (
            id $pk,
            type VARCHAR(50) NOT NULL,
            name VARCHAR(255) NOT NULL,
            color VARCHAR(50) DEFAULT '#8a8c89',
            contact_person VARCHAR(255) NULL,
            email_phone VARCHAR(255) NULL,
            hourly_rate $numeric DEFAULT 0
        ) " . ($is_mysql ? "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4" : "") . ";

        CREATE TABLE {$prefix}projects (
            id $pk,
            name VARCHAR(255) NOT NULL,
            client_id INTEGER REFERENCES {$prefix}settings_entities(id) ON DELETE SET NULL,
            status VARCHAR(50) DEFAULT 'New Lead',
            accepted_date DATE NULL,
            design_status VARCHAR(50) DEFAULT 'Not Started',
            dev_status VARCHAR(50) DEFAULT 'Not Started',
            pm_id INTEGER REFERENCES {$prefix}settings_entities(id) ON DELETE SET NULL,
            dev_id INTEGER REFERENCES {$prefix}settings_entities(id) ON DELETE SET NULL,
            designer_id INTEGER REFERENCES {$prefix}settings_entities(id) ON DELETE SET NULL,
            project_type_id INTEGER REFERENCES {$prefix}settings_entities(id) ON DELETE SET NULL,
            deadline DATE NULL,
            est_dev_time INTEGER DEFAULT 0,
            design_start DATE NULL,
            design_end DATE NULL,
            dev_start DATE NULL,
            dev_end DATE NULL,
            complexity INTEGER DEFAULT 1,
            total_value $numeric DEFAULT 0,
            already_paid $numeric DEFAULT 0,
            dev_budget $numeric DEFAULT 0,
            is_archived BOOLEAN DEFAULT FALSE,
            notes $text NULL,
            sort_order INTEGER DEFAULT 0,
            created_at $timestamp,
            updated_at $timestamp
        ) " . ($is_mysql ? "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4" : "") . ";

        CREATE TABLE {$prefix}project_tags (
            project_id INTEGER REFERENCES {$prefix}projects(id) ON DELETE CASCADE,
            tag_id INTEGER REFERENCES {$prefix}settings_entities(id) ON DELETE CASCADE,
            PRIMARY KEY (project_id, tag_id)
        ) " . ($is_mysql ? "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4" : "") . ";

        CREATE TABLE {$prefix}audit_logs (
            id $pk,
            project_id INTEGER REFERENCES {$prefix}projects(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES {$prefix}users(id) ON DELETE SET NULL,
            action VARCHAR(50) NOT NULL,
            details $text,
            created_at $timestamp
        ) " . ($is_mysql ? "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4" : "") . ";

        CREATE TABLE {$prefix}project_expenses (
            id $pk,
            project_id INTEGER REFERENCES {$prefix}projects(id) ON DELETE CASCADE,
            entity_id INTEGER REFERENCES {$prefix}settings_entities(id) ON DELETE CASCADE NULL,
            hours NUMERIC(10,2) NOT NULL DEFAULT 0,
            week VARCHAR(50) NOT NULL,
            custom_name VARCHAR(255) NULL,
            custom_cost $numeric NULL,
            created_at $timestamp,
            updated_at $timestamp
        ) " . ($is_mysql ? "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4" : "") . ";

        CREATE TABLE {$prefix}comments (
            id $pk,
            project_id INTEGER REFERENCES {$prefix}projects(id) ON DELETE CASCADE,
            user_id INTEGER REFERENCES {$prefix}users(id) ON DELETE SET NULL,
            content $text NOT NULL,
            created_at $timestamp
        ) " . ($is_mysql ? "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4" : "") . ";

        CREATE TABLE {$prefix}system_settings (
            `key` VARCHAR(255) PRIMARY KEY,
            `value` $text
        ) " . ($is_mysql ? "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4" : "") . ";
    ";
    
    // In PG, backticks are not standard, but PDO might handle it? 
    // Actually, PG uses double quotes or nothing. MySQL uses backticks.
    if (!$is_mysql) {
        $sql = str_replace('`', '', $sql);
    }

    return $sql;
}

function run_schema($pdo, $db_type, $prefix = '', $admin_password = null) {
    try {
        $sql = get_schema_sql($db_type, $prefix);
        // Execute multiple queries
        $pdo->exec($sql);
        
        // Seed system settings
        $defaults = [
            ['system_title', 'Lead Tracker'],
            ['accent_color_primary', '#e78b01'],
            ['accent_color_secondary', '#00b800']
        ];
        $insert = $pdo->prepare("INSERT INTO {$prefix}system_settings (`key`, `value`) VALUES (?, ?)");
        if ($db_type === 'pgsql') {
            // Remove backticks for seeding too
            $insert = $pdo->prepare("INSERT INTO {$prefix}system_settings (key, value) VALUES (?, ?)");
        }
        foreach ($defaults as $row) {
            $insert->execute($row);
        }

        // Create admin user
        if ($admin_password) {
            $hash = password_hash($admin_password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO {$prefix}users (username, password_hash, role) VALUES ('admin', ?, 'admin')");
            $stmt->execute([$hash]);
        }

        return ["status" => "success", "message" => "Installation successful"];
    } catch (Exception $e) {
        return ["status" => "error", "message" => "Schema execution failed: " . $e->getMessage()];
    }
}
?>
