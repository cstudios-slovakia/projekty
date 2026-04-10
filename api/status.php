<?php
// api/status.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

define('ALLOW_NO_DB', true);
require_once 'db.php';

$response = [
    "installed" => $is_installed,
    "version" => "1.0.0"
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
