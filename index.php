<?php
// Root index.php to direct traffic to the wizard or the frontend
if (!file_exists(__DIR__ . '/api/config.php')) {
    // If not installed, we should ideally redirect to the installation wizard
    // Since the wizard is part of the React app, we point to the frontend
    header('Location: /frontend/dist/index.html');
    exit;
}

// If already installed, we also go to the frontend
header('Location: /frontend/dist/index.html');
exit;
?>
