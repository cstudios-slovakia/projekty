<?php
/**
 * Original Server Update Bridge
 * Converts an old manual installation to the new Composer-managed system.
 * Run this ONCE on the original server.
 */

$old_db_file = __DIR__ . '/db.php';
$env_file = dirname(__DIR__) . '/.env';

if (file_exists($env_file)) {
    die("Error: .env already exists. It seems the bridge was already run or the server is already updated.");
}

if (!file_exists($old_db_file)) {
    die("Error: api/db.php not found. Cannot migrate credentials.");
}

// 1. Extract credentials from old db.php
$content = file_get_contents($old_db_file);
preg_match("/\$host\s*=\s*['\"]([^'\"]+)['\"]/", $content, $m_host);
preg_match("/\$db\s*=\s*['\"]([^'\"]+)['\"]/", $content, $m_db);
preg_match("/\$user\s*=\s*['\"]([^'\"]+)['\"]/", $content, $m_user);
preg_match("/\$pass\s*=\s*['\"]([^'\"]+)['\"]/", $content, $m_pass);
preg_match("/\$port\s*=\s*['\"]([^'\"]+)['\"]/", $content, $m_port);

$host = $m_host[1] ?? 'localhost';
$dbname = $m_db[1] ?? '';
$user = $m_user[1] ?? '';
$pass = $m_pass[1] ?? '';
$port = $m_port[1] ?? '5432';
$driver = (strpos($content, 'pgsql') !== false) ? 'pgsql' : 'mysql';

if (!$dbname || !$user) {
    die("Error: Could not extract database credentials from db.php.");
}

// 2. Generate .env
$env_content = "APP_INSTALLED=true\n";
$env_content .= "DB_DRIVER=$driver\n";
$env_content .= "DB_HOST=$host\n";
$env_content .= "DB_PORT=$port\n";
$env_content .= "DB_NAME=$dbname\n";
$env_content .= "DB_USER=$user\n";
$env_content .= "DB_PASS=$pass\n";
$env_content .= "INSTALLED_AT=" . date('Y-m-d H:i:s') . "\n";

file_put_contents($env_file, $env_content);
echo "SUCCESS: .env file created from old db.php.\n";

// 3. Backup notification
echo "IMPORTANT: Please backup your database manually before proceeding with 'composer update'.\n";
echo "The new system will now use the .env file for configuration.\n";
echo "You can now run 'php api/migrate.php' to update your schema safely.\n";
?>
