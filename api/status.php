<?php
// api/status.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

define('ALLOW_NO_DB', true);
require_once 'db.php';

    $version = '1.9.3';
    $composer_path = dirname(__DIR__) . '/composer.json';
    if (file_exists($composer_path)) {
        $json = json_decode(file_get_contents($composer_path), true);
        if (isset($json['version'])) {
            $version = $json['version'];
        }
    }

    $response = [
        "installed" => $is_installed,
        'version' => $version,
        'status' => 'ok',
        'timestamp' => date('c')
    ];

if ($is_installed) {
    try {
        if (isset($pdo)) {
            $response["db_connected"] = true;
            $response["db_type"] = DB_TYPE;
        } else {
            $response["db_connected"] = false;
        }
    } catch (Exception $e) {
        $response["db_connected"] = false;
        $response["db_error"] = $e->getMessage();
    }
}

echo json_encode($response);
?>
