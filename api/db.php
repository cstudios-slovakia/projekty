<?php
// api/db.php

$config_file = __DIR__ . '/config.php';
$is_installed = file_exists($config_file);

if ($is_installed) {
    include $config_file;
    
    // Ensure these variables are set by config.php
    $host = DB_HOST;
    $db   = DB_NAME;
    $user = DB_USER;
    $pass = DB_PASS;
    $port = DB_PORT;
    $type = DB_TYPE; // mysql, mariadb, pgsql
    define('IS_MYSQL', ($type === 'mysql' || $type === 'mariadb'));
    $prefix = defined('DB_PREFIX') ? DB_PREFIX : '';

    if ($type === 'pgsql') {
        $dsn = "pgsql:host=$host;port=$port;dbname=$db;";
    } else {
        // mysql or mariadb
        $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    }

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, $user, $pass, $options);
    } catch (\PDOException $e) {
        if (!defined('ALLOW_NO_DB')) {
            http_response_code(500);
            echo json_encode(["status" => "error", "message" => "Connection failed: " . $e->getMessage()]);
            exit;
        }
    }
} else {
    if (!defined('ALLOW_NO_DB')) {
        http_response_code(503);
        echo json_encode(["status" => "error", "message" => "Software not installed", "needs_setup" => true]);
        exit;
    }
}
?>
