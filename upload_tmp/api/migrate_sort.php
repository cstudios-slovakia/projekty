<?php
require_once 'db.php';
try {
    $pdo->exec("ALTER TABLE projects ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0");
    echo "Success: sort_order column added.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
