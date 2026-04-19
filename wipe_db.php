<?php
define('DB_HOST', 'db.r5.websupport.sk');
define('DB_NAME', '16AYwX6g_composerUpdateTest');
define('DB_USER', 'kFT04vWO');
define('DB_PASS', '&SF2[vL+SF1(Jb7UAPK*');

try {
    $pdo = new PDO("pgsql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);

    $stmt = $pdo->query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($tables)) {
        echo "Database is already empty.\n";
    } else {
        foreach ($tables as $table) {
            $pdo->exec("DROP TABLE IF EXISTS \"$table\" CASCADE");
            echo "Dropped table: $table\n";
        }
        echo "Database successfully wiped.\n";
    }
} catch (Exception $e) {
    echo "Error wiping database: " . $e->getMessage() . "\n";
}
?>
