<?php
header('Content-Type: text/plain');
try {
    $pdo = new PDO('pgsql:host=db.r5.websupport.sk;port=5432;dbname=16AYwX6g', 'EHL9hL8w', 'g&S/vp:E5;393L?h%W($');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Projects in 16AYwX6g:\n";
    $stmt = $pdo->query('SELECT id, name, status, created_at FROM projects ORDER BY id DESC');
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "ID: " . $row["id"] . " | Name: " . $row["name"] . " | Status: " . $row["status"] . " | Created: " . $row["created_at"] . "\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
