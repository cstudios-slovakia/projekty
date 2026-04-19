<?php
require 'api/db.php';
try {
    $expenseStmt = $pdo->prepare("INSERT INTO project_expenses (project_id, entity_id, week, custom_name, hours, custom_cost) VALUES (?, ?, ?, ?, ?, 0)");
    $expenseStmt->execute([1, null, '2026-W16', 'Time Log: Test', 2]);
    echo "Expense insert success! ID: " . $pdo->lastInsertId() . "\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
