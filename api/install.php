<?php
// api/install.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if (file_exists(__DIR__ . '/config.php') && file_exists(dirname(__DIR__) . '/.env')) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Software already installed. Delete .env and config.php to reinstall."]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No input data provided"]);
    exit;
}

$driver = $input['driver'] ?? 'mysql'; // mysql, pgsql
$host = $input['host'] ?? '';
$port = $input['port'] ?? ($driver === 'pgsql' ? '5432' : '3306');
$db_name = $input['db_name'] ?? '';
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';
$prefix = $input['prefix'] ?? '';
$admin_pass = $input['admin_password'] ?? '';

if (!$host || !$db_name || !$username || !$admin_pass) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing required fields"]);
    exit;
}

// 1. Test connection
if ($driver === 'pgsql') {
    $dsn = "pgsql:host=$host;port=$port;dbname=$db_name;";
} else {
    $dsn = "mysql:host=$host;port=$port;dbname=$db_name;charset=utf8mb4";
}

try {
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_TIMEOUT => 5
    ]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Connection failed: " . $e->getMessage()]);
    exit;
}

// 2. Generate config.php
$config_content = "<?php
// api/config.php - Generated on " . date('Y-m-d H:i:s') . "
define('DB_TYPE', '" . addslashes($driver) . "');
define('DB_HOST', '" . addslashes($host) . "');
define('DB_PORT', '" . addslashes($port) . "');
define('DB_NAME', '" . addslashes($db_name) . "');
define('DB_USER', '" . addslashes($username) . "');
define('DB_PASS', '" . addslashes($password) . "');
define('DB_PREFIX', '" . addslashes($prefix) . "');
?>";

if (file_put_contents(__DIR__ . '/config.php', $config_content) === false) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Failed to write config.php. Check folder permissions."]);
    exit;
}

// 3. Run Schema
require_once 'install_utils.php';
$result = run_schema($pdo, $driver, $prefix, $admin_pass);

if ($result['status'] === 'success') {
    // 4. Create .env marker
    $env_content = "APP_INSTALLED=true\nINSTALLED_AT=" . date('Y-m-d H:i:s') . "\n";
    file_put_contents(dirname(__DIR__) . '/.env', $env_content);
    echo json_encode($result);
} else {
    // If schema fails, maybe delete config? Or leave it for manual fix?
    // Let's keep it but return error
    http_response_code(500);
    echo json_encode($result);
}
?>
