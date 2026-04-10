<?php
// api/schema.php
ini_set('display_errors', 1);
error_reporting(E_ALL);

require 'db.php';
require 'install_utils.php';

header('Content-Type: application/json');

if (!$is_installed) {
    echo json_encode(["status" => "error", "message" => "Software not installed. Use the setup wizard."]);
    exit;
}

$result = run_schema($pdo, DB_TYPE, defined('DB_PREFIX') ? DB_PREFIX : '', 'cstudiosmoney');
echo json_encode($result);
?>
