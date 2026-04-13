<?php
/**
 * API Shell Publisher
 * Generates shell files that proxy calls to the vendor core.
 * Best for servers where .htaccess rewrites are restricted.
 */

// Detect if running from root or vendor
$is_vendor = strpos(__DIR__, '/vendor/') !== false;
$root_dir = $is_vendor ? dirname(dirname(dirname(__DIR__))) : __DIR__;

$vendor_api = $root_dir . '/vendor/cstudios-slovakia/projekty/api';
$api_dir = $root_dir . '/api';

if (!file_exists($api_dir)) {
    mkdir($api_dir, 0755, true);
}

// List of core API files to proxy
$api_files = [
    'status.php',
    'login.php',
    'projects.php',
    'dashboard.php',
    'expenses.php',
    'comments.php',
    'settings.php',
    'system_settings.php',
    'users.php',
    'migrate.php',
    'db.php',
    'reorder.php',
    'install.php',
    'pipeline.php'
];

foreach ($api_files as $file) {
    $content = "<?php\n";
    $content .= "/** Proxy for $file **/\n";
    $content .= "require_once dirname(__DIR__) . '/vendor/cstudios-slovakia/projekty/api/$file';\n";
    
    file_put_contents("$api_dir/$file", $content);
    echo "Published shell: api/$file\n";
}
?>
