<?php
/**
 * Unified Entry Point & API Proxy
 * This is the only file needed in your root directory.
 * It routes API calls and serves the frontend assets from the vendor folder.
 */

// 1. Determine paths
$base_dir = __DIR__;
$vendor_core = $base_dir . '/vendor/cstudios-slovakia/projekty';
$local_core = $base_dir; // For development/direct installs

$core_path = file_exists($vendor_core . '/api') ? $vendor_core : $local_core;

// 2. Handle API Routing
$request_uri = $_SERVER['REQUEST_URI'];
$base_path = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
$relative_url = str_replace($base_path, '', $request_uri);

if (strpos($relative_url, '/api/') === 0) {
    // Extract the requested API file
    $api_file = parse_url(str_replace('/api/', '', $relative_url), PHP_URL_PATH);
    if ($api_file && file_exists($core_path . '/api/' . $api_file)) {
        require $core_path . '/api/' . $api_file;
        exit;
    } else {
        http_response_code(404);
        echo json_encode(["status" => "error", "message" => "API endpoint not found"]);
        exit;
    }
}

// 3. Handle Frontend Routing
$dist_path = $core_path . '/frontend/dist';

if (!file_exists($dist_path . '/index.html')) {
    // Check if assets are flattened in root (for legacy support during migration)
    if (file_exists($base_dir . '/assets') && file_exists($base_dir . '/index.html')) {
        // Fallback to local root index.html if it's there
        $html = file_get_contents($base_dir . '/index.html');
        echo $html;
        exit;
    }
    die("Error: Core assets not found. Please run 'composer update'.");
}

$html = file_get_contents($dist_path . '/index.html');

/**
 * Patch Asset Paths
 */
$assets_url_part = str_replace($base_dir, '', $dist_path);
$assets_url = $base_path . $assets_url_part . '/';

// Support both relative versions
$html = str_replace('./assets/', $assets_url . 'assets/', $html);
$html = str_replace('./favicon.png', $assets_url . 'favicon.png', $html);
$html = str_replace('./vite.svg', $assets_url . 'vite.svg', $html);

echo $html;
?>
