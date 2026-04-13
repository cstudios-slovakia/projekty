<?php
require 'db.php';
header('Content-Type: application/json');

try {
    echo "Testing database connection...\n";
    $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);
    echo "Connected successfully to " . DB_TYPE . "\n";

    // 1. Check if leads table exists
    $stmt = $pdo->query("SELECT 1 FROM leads LIMIT 1");
    echo "Table 'leads' exists.\n";

    // 2. Attempt a dummy insert
    echo "Attempting dummy insert...\n";
    $stmt = $pdo->prepare("INSERT INTO leads (company_name, contact_name, email, phone, country, message) VALUES (?, ?, ?, ?, ?, ?)");
    $res = $stmt->execute(["Debug Company", "Debug User", "debug@example.com", "123", "Slovakia", "Testing leads table"]);
    
    if ($res) {
        $id = $pdo->lastInsertId();
        echo "Successfully created lead ID: $id\n";
        
        // Clean up
        $pdo->exec("DELETE FROM leads WHERE id = $id");
        echo "Cleaned up debug lead.\n";
    } else {
        echo "Execute returned false without exception.\n";
    }

} catch (PDOException $e) {
    echo "DATABASE ERROR: " . $e->getMessage() . "\n";
    echo "Error Code: " . $e->getCode() . "\n";
} catch (Exception $e) {
    echo "GENERAL ERROR: " . $e->getMessage() . "\n";
}
?>
