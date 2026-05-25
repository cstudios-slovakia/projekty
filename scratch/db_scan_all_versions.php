<?php
header('Content-Type: text/plain');

$dbs = [
    '16AYwX6g',
    '16AYwX6g_rollback',
    '16AYwX6g_backup',
    '16AYwX6g_rollback_copy_20260417104207'
];

$user = 'EHL9hL8w';
$pass = 'g&S/vp:E5;393L?h%W($';

foreach ($dbs as $db) {
    echo "=== Database: $db ===\n";
    try {
        $pdo = new PDO("pgsql:host=db.r5.websupport.sk;port=5432;dbname=$db", $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $tables = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")->fetchAll(PDO::FETCH_COLUMN);
        echo "Connected successfully! Tables: " . implode(", ", $tables) . "\n";
        
        if (in_array('projects', $tables)) {
            $count = $pdo->query("SELECT count(*) FROM projects")->fetchColumn();
            echo "Total Projects: $count\n";
            
            // Look specifically for ADCAR and firol
            $stmt = $pdo->prepare("SELECT id, name, status, created_at FROM projects WHERE name IN ('ADCAR', 'firol')");
            $stmt->execute();
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($results as $row) {
                echo "  - Project [{$row['id']}]: {$row['name']} | Status: {$row['status']} | Created: {$row['created_at']}\n";
            }
        } else {
            echo "No projects table found!\n";
        }
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
    echo "\n";
}
