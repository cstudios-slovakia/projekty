<?php
/**
 * API Shell Publisher
 * Generates shell files that proxy calls to the vendor core.
 * Best for servers where .htaccess rewrites are restricted.
 */

// Robust path detection
$is_vendor = strpos(__DIR__, '/vendor/') !== false;
$root = $is_vendor ? dirname(dirname(dirname(__DIR__))) : __DIR__;

$api_dir = $root . '/api';
if (!file_exists($api_dir)) mkdir($api_dir, 0755, true);

$files = ['db.php', 'projects.php', 'pipeline.php', 'settings.php', 'users.php', 'migrate.php', 'status.php', 'dashboard.php', 'expenses.php', 'comments.php', 'system_settings.php', 'reorder.php', 'install.php', 'roles.php', 'time_logs.php', 'calendar.php', 'login.php', 'lead_activities.php'];

foreach ($files as $f) {
    $proxy = "<?php require_once dirname(__DIR__) . '/vendor/cstudios-slovakia/projekty/api/$f'; ?>";
    file_put_contents("$api_dir/$f", $proxy);
    echo "Fixed: api/$f\n";
}
?>
