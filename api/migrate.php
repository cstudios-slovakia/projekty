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

    // 4. Add updated_at to expenses if missing
    if (!column_exists($pdo, 'project_expenses', 'updated_at')) {
        echo "Adding updated_at to project_expenses...\n";
        $pdo->exec("ALTER TABLE project_expenses ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    }

    // 5. Seed default settings if missing
    $defaults = [
        ['system_title', 'Lead Tracker'],
        ['accent_color_primary', '#e78b01'],
        ['accent_color_secondary', '#00b800']
    ];
    $stmt = $pdo->prepare("SELECT 1 FROM system_settings WHERE \"key\" = ?");
    $insert = $pdo->prepare("INSERT INTO system_settings (\"key\", \"value\") VALUES (?, ?)");
    
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    if ($driver !== 'pgsql') {
        $stmt = $pdo->prepare("SELECT 1 FROM system_settings WHERE `key` = ?");
        $insert = $pdo->prepare("INSERT INTO system_settings (`key`, `value`) VALUES (?, ?)");
    }

    foreach ($defaults as $row) {
        $stmt->execute([$row[0]]);
        if (!$stmt->fetch()) {
            echo "Seeding default setting: {$row[0]}...\n";
            $insert->execute($row);
        }
    }

    echo "Migration completed successfully.\n";

} catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
?>
