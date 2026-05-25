<?php
header('Content-Type: text/plain');

$users = [
    'EHL9hL8w' => 'g&S/vp:E5;393L?h%W($',
    'kFT04vWO' => '&SF2[vL+SF1(Jb7UAPK*',
    '5tGzuBFv' => 'se/4kQq&St:B^^,0a1}y'
];

foreach ($users as $user => $pass) {
    echo "=== Trying User: $user ===\n";
    try {
        // Connect to pg_database to list databases
        $pdo = new PDO("pgsql:host=db.r5.websupport.sk;port=5432;dbname=template1", $user, $pass);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        $stmt = $pdo->query("SELECT datname FROM pg_database WHERE datistemplate = false");
        $dbs = $stmt->fetchAll(PDO::FETCH_COLUMN);
        echo "Databases visible to $user: " . implode(", ", $dbs) . "\n";
        
        foreach ($dbs as $db) {
            try {
                $dbPdo = new PDO("pgsql:host=db.r5.websupport.sk;port=5432;dbname=$db", $user, $pass);
                $tables = $dbPdo->query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")->fetchAll(PDO::FETCH_COLUMN);
                echo "  - DB: $db | Tables: " . implode(", ", $tables) . "\n";
                if (in_array('projects', $tables)) {
                    $count = $dbPdo->query("SELECT count(*) FROM projects")->fetchColumn();
                    echo "    * Projects count: $count\n";
                }
            } catch (Exception $e) {
                // Not authorized for this DB
            }
        }
    } catch (Exception $e) {
        echo "Error for $user: " . $e->getMessage() . "\n";
    }
    echo "\n";
}
