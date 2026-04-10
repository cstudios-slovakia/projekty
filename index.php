<?php
/**
 * Unified Entry Point
 * Serves the React frontend directly without redirects.
 * Asset paths are patched on-the-fly to support subdirectory installation.
 */

$env_file = __DIR__ . '/.env';
$is_installed = file_exists($env_file);

// Load the built frontend
$html_path = __DIR__ . '/frontend/dist/index.html';

if (!file_exists($html_path)) {
    die("Error: Frontend build not found. Please run 'npm run build' or ensure 'frontend/dist' exists.");
}

$html = file_get_contents($html_path);

/**
 * Patch Asset Paths
 * The React app is built with relative paths (./assets/...).
 * When serving from the root index.php, we must point these to the subfolder.
 */
$base_path = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$assets_url = $base_path . '/frontend/dist/';

// Replace relative references with absolute-looking paths relative to the project root
$html = str_replace('./assets/', $assets_url . 'assets/', $html);
$html = str_replace('./favicon.png', $assets_url . 'favicon.png', $html);
$html = str_replace('./vite.svg', $assets_url . 'vite.svg', $html);

// Echo the patched HTML
echo $html;
?>
