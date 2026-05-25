<?php
header('Content-Type: text/plain');
try {
    $pdo = new PDO('pgsql:host=db.r5.websupport.sk;port=5432;dbname=16AYwX6g', 'EHL9hL8w', 'g&S/vp:E5;393L?h%W($');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Check columns of users table
    $stmt = $pdo->query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
    echo "=== Users Columns ===\n";
    while ($col = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "Column: {$col['column_name']} | Type: {$col['data_type']}\n";
    }
    
    // Check users records
    echo "\n=== Users Records ===\n";
    // We dynamically build the query based on what columns might exist
    $cols = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'")->fetchAll(PDO::FETCH_COLUMN);
    $selected_cols = array_intersect(['id', 'username', 'email', 'role', 'password_hash'], $cols);
    if (empty($selected_cols)) {
        $selected_cols = ['*'];
    }
    $query = "SELECT " . implode(", ", $selected_cols) . " FROM users LIMIT 10";
    $stmt = $pdo->query($query);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        print_r($row);
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
