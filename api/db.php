<?php
// api/db.php
$host = 'db.r5.websupport.sk';
$db   = '16AYwX6g';
$user = 'EHL9hL8w';
$pass = 'g&S/vp:E5;393L?h%W($';
$port = "5432";

$dsn = "pgsql:host=$host;port=$port;dbname=$db;";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Connection failed: " . $e->getMessage()]);
    exit;
}
?>
