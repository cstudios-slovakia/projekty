<?php
require 'db.php';
header('Content-Type: text/plain');
try {
    $pdo->exec("ALTER TABLE projects ADD COLUMN complexity INTEGER DEFAULT 3");
    echo "Complexity column added successfully.\n";
} catch (Exception $e) {
    if (strpos($e->getMessage(), 'duplicate column') !== false || strpos($e->getMessage(), 'already exists') !== false) {
        echo "Complexity column already exists.\n";
    } else {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
?>
