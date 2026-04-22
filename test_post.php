<?php
require 'api/db.php';
try {
    $stmt = $pdo->prepare("INSERT INTO project_activities (project_id, type, notes, activity_date) VALUES (?, ?, ?, ?)");
    $stmt->execute([1, 'Call', 'Test', '2026-04-22 10:00:00']);
    echo "SUCCESS";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
