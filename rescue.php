<?php
/**
 * RESCUE SCRIPT
 * Cleans up manual API proxies and ensures Root index.php is functional.
 */

$root = __DIR__;
$api_dir = $root . '/api';

if (file_exists($api_dir)) {
    // Delete files inside
    foreach (glob("$api_dir/*.php") as $file) {
        unlink($file);
        echo "Deleted proxy: $file<br>";
    }
    rmdir($api_dir);
    echo "Deleted api directory.<br>";
}

$index_file = $root . '/index.php';
if (file_exists($index_file)) {
    echo "Checking root index.php...<br>";
    $content = file_get_contents($index_file);
    if (strpos($content, 'vendor/cstudios-slovakia/projekty') !== false) {
        echo "Root index.php looks correctly configured.<br>";
    } else {
        echo "WARNING: Root index.php might be outdated or incorrect.<br>";
    }
}

$env_file = $root . '/.env';
if (file_exists($env_file)) {
    echo "SUCCESS: .env found.<br>";
} else {
    echo "ERROR: .env MISSING in root!<br>";
}

echo "<br><b>Rescue completed. Try visiting the dashboard now.</b>";
?>
