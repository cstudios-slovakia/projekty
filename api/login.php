<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Adjust in production
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? '';

if (!$username || !$password) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Username and password required"]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, username, password_hash, system_role, language FROM users WHERE username = :username");
    $stmt->execute(['username' => $username]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        // Return a simple token or user details (In production use JWT)
        $token = base64_encode(json_encode(['id' => $user['id'], 'username' => $user['username'], 'role' => $user['system_role']]));
        echo json_encode([
            "status" => "success",
            "user" => [
                "id" => $user['id'],
                "username" => $user['username'],
                "role" => $user['system_role'],
                "language" => $user['language'] ?? 'en',
                "token" => $token
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid credentials"]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Server error"]);
}
?>
