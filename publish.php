<?php
/**
 * Core Deployment Orchestrator
 * Recursively publishes frontend build assets and proxy API shells.
 */

// Robust path detection out of composer vendor directory
$is_vendor = strpos(__DIR__, '/vendor/') !== false || strpos(__DIR__, '\\vendor\\') !== false;
$root = $is_vendor ? dirname(dirname(dirname(__DIR__))) : __DIR__;

echo "\n> Bootstrapping application environment at root: $root\n";

// 1. Publish API Proxy Shells
$api_dir = $root . '/api';
if (!file_exists($api_dir)) {
    mkdir($api_dir, 0755, true);
    echo "Created API proxy destination: $api_dir\n";
}

$files = ['db.php', 'projects.php', 'pipeline.php', 'settings.php', 'users.php', 'migrate.php', 'status.php', 'dashboard.php', 'expenses.php', 'comments.php', 'system_settings.php', 'reorder.php', 'install.php', 'roles.php', 'time_logs.php', 'calendar.php', 'login.php', 'lead_activities.php'];

echo "Publishing API endpoints...\n";
foreach ($files as $f) {
    if ($f === 'config.php.example') continue;
    $proxy = "<?php require_once dirname(__DIR__) . '/vendor/cstudios-slovakia/projekty/api/$f'; ?>";
    file_put_contents("$api_dir/$f", $proxy);
}
echo "API endpoint proxies generated successfully.\n";

// Ensure 'uploads' temp space exists.
$uploads_dir = $root . '/assets/uploads';
if (!file_exists($uploads_dir)) {
    mkdir($uploads_dir, 0755, true);
}


// 2. Publish Frontend Static Build Recursively
$source_frontend = __DIR__ . '/frontend/dist';

/**
 * Recursive File Copier mechanism
 */
function recursiveCopy($source, $dest) {
    if (!is_dir($source)) {
        return false;
    }

    $dir = opendir($source);
    if (!file_exists($dest)) {
        mkdir($dest, 0755, true);
    }

    while (($file = readdir($dir)) !== false) {
        if ($file == '.' || $file == '..') continue;
        
        // Skip .git or other system noise if bundled somehow
        if ($file === '.git' || $file === '.gitignore') continue;

        $sourceFile = $source . '/' . $file;
        $destFile = $dest . '/' . $file;

        if (is_dir($sourceFile)) {
            recursiveCopy($sourceFile, $destFile);
        } else {
            copy($sourceFile, $destFile);
        }
    }
    closedir($dir);
    return true;
}

if (file_exists($source_frontend) && is_dir($source_frontend)) {
    echo "Deploying compiled frontend UI bundles to web root...\n";
    if (recursiveCopy($source_frontend, $root)) {
        echo "Frontend assets deployed successfully.\n";
    } else {
        echo "Failed to deploy frontend assets.\n";
    }
} else {
    echo "Warning: No compiled frontend /dist directory found at $source_frontend. Are you missing a build step?\n";
}

echo "Deployment orchestrator completed.\n\n";
