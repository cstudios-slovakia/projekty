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
    } else {
        $stmt = $pdo->prepare("SELECT 1 FROM information_schema.columns WHERE table_name = ? AND column_name = ? AND table_schema = DATABASE()");
        $stmt->execute([$table, $column]);
    }
    return (bool)$stmt->fetch();
}

function table_exists($pdo, $table) {
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver === 'pgsql') {
        $stmt = $pdo->prepare("SELECT 1 FROM information_schema.tables WHERE table_name = ?");
        $stmt->execute([$table]);
    } else {
        $stmt = $pdo->prepare("SELECT 1 FROM information_schema.tables WHERE table_name = ? AND table_schema = DATABASE()");
        $stmt->execute([$table]);
    }
    return (bool)$stmt->fetch();
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

    // 2c. Add daily_salary, is_fixed_salary, monthly_salary, target_hours_per_day to settings_entities if missing
    if (!column_exists($pdo, 'settings_entities', 'daily_salary')) {
        echo "Adding daily_salary to settings_entities...\n";
        $pdo->exec("ALTER TABLE settings_entities ADD COLUMN daily_salary DECIMAL(10,2) DEFAULT 0.00");
    }
    if (!column_exists($pdo, 'settings_entities', 'is_fixed_salary')) {
        echo "Adding is_fixed_salary to settings_entities...\n";
        $pdo->exec("ALTER TABLE settings_entities ADD COLUMN is_fixed_salary INTEGER DEFAULT 0");
    }
    if (!column_exists($pdo, 'settings_entities', 'monthly_salary')) {
        echo "Adding monthly_salary to settings_entities...\n";
        $pdo->exec("ALTER TABLE settings_entities ADD COLUMN monthly_salary DECIMAL(10,2) DEFAULT 0.00");
    }
    if (!column_exists($pdo, 'settings_entities', 'target_hours_per_day')) {
        echo "Adding target_hours_per_day to settings_entities...\n";
        $pdo->exec("ALTER TABLE settings_entities ADD COLUMN target_hours_per_day DECIMAL(4,2) DEFAULT 8.00");
    }

    // 2b. Add project_category to projects if missing
    if (!column_exists($pdo, 'projects', 'project_category')) {
        echo "Adding project_category to projects...\n";
        $pdo->exec("ALTER TABLE projects ADD COLUMN project_category VARCHAR(50) DEFAULT 'project'");
    }

    // 2c. Add project_category to active_development_projects if missing
    if (table_exists($pdo, 'active_development_projects') && !column_exists($pdo, 'active_development_projects', 'project_category')) {
        echo "Adding project_category to active_development_projects...\n";
        $pdo->exec("ALTER TABLE active_development_projects ADD COLUMN project_category VARCHAR(50) DEFAULT 'project'");
    }

    // 2d. Add is_completed to projects if missing
    if (!column_exists($pdo, 'projects', 'is_completed')) {
        echo "Adding is_completed to projects...\n";
        $pdo->exec("ALTER TABLE projects ADD COLUMN is_completed INTEGER DEFAULT 0");
    }

    // 2e. Add is_completed to active_development_projects if missing
    if (table_exists($pdo, 'active_development_projects') && !column_exists($pdo, 'active_development_projects', 'is_completed')) {
        echo "Adding is_completed to active_development_projects...\n";
        $pdo->exec("ALTER TABLE active_development_projects ADD COLUMN is_completed INTEGER DEFAULT 0");
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
    // 8. Add project_activities table
    if (!table_exists($pdo, 'project_activities')) {
        echo "Creating project_activities table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        if ($driver === 'pgsql') {
            $pdo->exec("CREATE TABLE project_activities (
                id SERIAL PRIMARY KEY,
                project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL,
                notes TEXT,
                activity_date TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )");
        } else {
            $pdo->exec("CREATE TABLE project_activities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                project_id INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                notes TEXT,
                activity_date TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
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
    if (!column_exists($pdo, 'users', 'email')) {
        echo "Adding email to users...\n";
        $pdo->exec("ALTER TABLE users ADD COLUMN email VARCHAR(255) NULL");
    }

    // 13. Ensure time_logs has expense_id
    if (!column_exists($pdo, 'time_logs', 'expense_id')) {
        echo "Adding expense_id to time_logs...\n";
        $pdo->exec("ALTER TABLE time_logs ADD COLUMN expense_id INTEGER REFERENCES project_expenses(id) ON DELETE SET NULL");
    }

    // 14. Active Development Projects
    if (!table_exists($pdo, 'active_development_projects')) {
        echo "Creating active_development_projects table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE active_development_projects (
            id $pk,
            project_id INTEGER UNIQUE NOT NULL,
            client_id INTEGER NULL,
            pm_id INTEGER NULL,
            dev_id INTEGER NULL,
            budget NUMERIC(15,2) DEFAULT 0,
            dev_budget NUMERIC(15,2) DEFAULT 0,
            clickup_source_type VARCHAR(20) DEFAULT 'list',
            clickup_space_id VARCHAR(100) NULL,
            clickup_folder_id VARCHAR(100) NULL,
            clickup_list_id VARCHAR(100) NULL,
            clickup_task_id VARCHAR(100) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    }

    // 15. ClickUp User Mappings
    if (!table_exists($pdo, 'clickup_user_mappings')) {
        echo "Creating clickup_user_mappings table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE clickup_user_mappings (
            id $pk,
            clickup_user_id VARCHAR(100) UNIQUE NOT NULL,
            clickup_username VARCHAR(255) NULL,
            clickup_email VARCHAR(255) NULL,
            clickup_avatar VARCHAR(500) NULL,
            developer_id INTEGER NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    }

    // 16. Project Invoices
    if (!table_exists($pdo, 'project_invoices')) {
        echo "Creating project_invoices table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE project_invoices (
            id $pk,
            project_id INTEGER NOT NULL,
            invoice_number VARCHAR(100) NULL,
            amount NUMERIC(15,2) DEFAULT 0,
            pdf_path VARCHAR(500) NULL,
            status VARCHAR(50) DEFAULT 'not_issued',
            issued_date DATE NULL,
            paid_date DATE NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    } else {
        try { $pdo->exec("ALTER TABLE project_invoices ADD COLUMN pdf_path VARCHAR(500) NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE project_invoices ADD COLUMN issued_date DATE NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE project_invoices ADD COLUMN paid_date DATE NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE project_invoices ADD COLUMN due_date DATE NULL"); } catch (Exception $e) {}
        try { $pdo->exec("ALTER TABLE project_invoices ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"); } catch (Exception $e) {}
    }

    try { $pdo->exec("ALTER TABLE projects ADD COLUMN soft_deadline DATE NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE projects ADD COLUMN hard_deadline DATE NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE projects ADD COLUMN start_date DATE NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE active_development_projects ADD COLUMN soft_deadline DATE NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE active_development_projects ADD COLUMN hard_deadline DATE NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE active_development_projects ADD COLUMN start_date DATE NULL"); } catch (Exception $e) {}

    // 17. Project Manual Expenses
    if (!table_exists($pdo, 'project_manual_expenses')) {
        echo "Creating project_manual_expenses table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE project_manual_expenses (
            id $pk,
            project_id INTEGER NOT NULL,
            name VARCHAR(255) NOT NULL,
            cost NUMERIC(15,2) NOT NULL DEFAULT 0,
            expense_date DATE NOT NULL,
            entity_id INTEGER NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    }

    // 18. Project Subtasks
    if (!table_exists($pdo, 'project_subtasks')) {
        echo "Creating project_subtasks table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE project_subtasks (
            id $pk,
            project_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            status VARCHAR(100) DEFAULT 'to do',
            clickup_id VARCHAR(100) NULL,
            clickup_assignee_id VARCHAR(100) NULL,
            assignee_id INTEGER NULL,
            due_date DATE NULL,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    } else {
        try {
            if (IS_MYSQL) {
                $pdo->exec("ALTER TABLE project_subtasks MODIFY COLUMN title TEXT NOT NULL");
            } else {
                $pdo->exec("ALTER TABLE project_subtasks ALTER COLUMN title TYPE TEXT");
            }
        } catch (Exception $e) {}
    }

    // 10. Company Expenses (Other Expenses) Table
    if (!table_exists($pdo, 'company_expenses')) {
        echo "Creating company_expenses table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE company_expenses (
            id $pk,
            title VARCHAR(255) NOT NULL,
            category VARCHAR(100) DEFAULT 'Other',
            amount NUMERIC(15,2) DEFAULT 0,
            expense_type VARCHAR(20) DEFAULT 'one_time',
            expense_date DATE NULL,
            recurrence_interval INTEGER DEFAULT 1,
            recurrence_unit VARCHAR(20) DEFAULT 'month',
            recurrence_days VARCHAR(255) NULL,
            recurrence_ends_type VARCHAR(20) DEFAULT 'never',
            recurrence_ends_date DATE NULL,
            recurrence_ends_occurrences INTEGER NULL,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    }

    // 11. Bank Cash Adjustments Table
    if (!table_exists($pdo, 'bank_cash_adjustments')) {
        echo "Creating bank_cash_adjustments table...\n";
        $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
        $pk = ($driver === 'pgsql') ? "SERIAL PRIMARY KEY" : "INTEGER AUTO_INCREMENT PRIMARY KEY";
        $pdo->exec("CREATE TABLE bank_cash_adjustments (
            id $pk,
            adjustment_date DATE NOT NULL,
            balance_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
            notes TEXT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )");
    }

    // Ensure default admin user has admin role
    $pdo->exec("UPDATE users SET role = 'admin' WHERE id = 1 AND (role IS NULL OR role = 'user')");

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
