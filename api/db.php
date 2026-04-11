<?php
/**
 * api/db.php
 * Robust database connection handler.
 * Supports legacy config.php and modern .env files.
 */

$config_file = __DIR__ . '/config.php';
$env_file    = dirname(__DIR__) . '/.env';

// 1. Loader for .env (no dependencies)
function load_env($path) {
    if (!file_exists($path)) return [];
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $data = [];
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $data[trim($name)] = trim($value);
    }
    return $data;
}

$is_installed = false;
$env_data = [];

if (file_exists($env_file)) {
    $env_data = load_env($env_file);
    $is_installed = isset($env_data['APP_INSTALLED']) && $env_data['APP_INSTALLED'] === 'true';
} elseif (file_exists($config_file)) {
    $is_installed = true;
}

if ($is_installed) {
    // 2. Define constants from either source
    if (file_exists($config_file)) {
        include_once $config_file;
    } else {
        define('DB_DRIVER', $env_data['DB_DRIVER'] ?? 'mysql');
        define('DB_HOST', $env_data['DB_HOST'] ?? 'localhost');
        define('DB_PORT', $env_data['DB_PORT'] ?? '3306');
        define('DB_NAME', $env_data['DB_NAME'] ?? '');
        define('DB_USER', $env_data['DB_USER'] ?? '');
        define('DB_PASS', $env_data['DB_PASS'] ?? '');
        define('DB_TYPE', $env_data['DB_DRIVER'] ?? 'mysql');
    }

    $host   = DB_HOST;
    $db     = DB_NAME;
    $user   = DB_USER;
    $pass   = DB_PASS;
    $port   = DB_PORT;
    $type   = DB_TYPE;
    $prefix = defined('DB_PREFIX') ? DB_PREFIX : '';

    if ($type === 'pgsql') {
        $dsn = "pgsql:host=$host;port=$port;dbname=$db;";
    } else {
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
        header('Content-Type: application/json');
        echo json_encode(["status" => "error", "message" => "Software not installed", "needs_setup" => true]);
        exit;
    }
}
?>
