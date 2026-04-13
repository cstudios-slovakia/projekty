<?php
require 'db.php';
header('Content-Type: application/json');

try {
    $tables = [];
    if (DB_TYPE === 'pgsql') {
        $stmt = $pdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    } else {
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    $leads_info = [];
    if (in_array('leads', $tables)) {
        if (DB_TYPE === 'pgsql') {
            $stmt = $pdo->prepare("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads'");
            $stmt->execute();
            $leads_info = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $stmt = $pdo->query("DESCRIBE leads");
            $leads_info = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
    }

    echo json_encode([
        "status" => "success",
        "tables" => $tables,
        "leads_structure" => $leads_info
    ]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
