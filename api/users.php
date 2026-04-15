<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];
$userId = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($method === 'GET') {
        $stmt = $pdo->query("SELECT id, username, name, email, system_role, notify, language FROM users ORDER BY id ASC");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $customRolesStmt = $pdo->query("SELECT user_id, role_entity_id FROM user_custom_roles");
        $allCustomRoles = $customRolesStmt->fetchAll(PDO::FETCH_ASSOC);
        
        $roleMap = [];
        foreach ($allCustomRoles as $cr) {
            $roleMap[$cr['user_id']][] = (int)$cr['role_entity_id'];
        }

        foreach ($users as &$user) {
            $user['custom_roles'] = $roleMap[$user['id']] ?? [];
            $user['notify'] = (bool)$user['notify'];
        }

        echo json_encode(["status" => "success", "data" => $users]);
        
    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if ($action === 'reset') {
            // Password reset
            if (!$userId || !empty($input['new_password']) === false) {
                http_response_code(400);
                echo json_encode(["status" => "error", "message" => "Missing data for password reset"]);
                exit;
            }
            $hash = password_hash($input['new_password'], PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
            $stmt->execute([$hash, $userId]);
            echo json_encode(["status" => "success", "message" => "Password reset successfully"]);
        } else {
            // Register new user
            $hash = password_hash($input['password'] ?? 'password123', PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (username, name, email, password_hash, system_role, notify) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $input['username'] ?? '',
                $input['name'] ?? '',
                $input['email'] ?? '',
                $hash,
                $input['system_role'] ?? 'end_user',
                !empty($input['notify']) ? 1 : 0
            ]);
            $is_mysql = (defined('DB_TYPE') && (DB_TYPE === 'mysql' || DB_TYPE === 'mariadb'));
            $newId = $is_mysql ? $pdo->lastInsertId() : $pdo->lastInsertId('users_id_seq');

            $insertCr = $pdo->prepare("INSERT INTO user_custom_roles (user_id, role_entity_id) VALUES (?, ?)");
            if (!empty($input['custom_roles']) && is_array($input['custom_roles'])) {
                foreach ($input['custom_roles'] as $cr_id) {
                    $insertCr->execute([$newId, $cr_id]);
                }
            }

            echo json_encode(["status" => "success", "id" => $newId]);
        }
    } elseif ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$userId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }

        if (isset($input['language']) && count($input) === 1) {
            // only language update
            $stmt = $pdo->prepare("UPDATE users SET language = ? WHERE id = ?");
            $stmt->execute([$input['language'], $userId]);
            echo json_encode(["status" => "success", "message" => "Language updated"]);
        } else {
            // full update
            $stmt = $pdo->prepare("UPDATE users SET username=?, name=?, email=?, system_role=?, notify=?, language=? WHERE id=?");
            $stmt->execute([
                $input['username'] ?? '', 
                $input['name'] ?? '', 
                $input['email'] ?? '', 
                $input['system_role'] ?? 'end_user', 
                !empty($input['notify']) ? 1 : 0, 
                $input['language'] ?? 'en', 
                $userId
            ]);
            
            // Update custom roles
            $pdo->prepare("DELETE FROM user_custom_roles WHERE user_id=?")->execute([$userId]);
            $insertCr = $pdo->prepare("INSERT INTO user_custom_roles (user_id, role_entity_id) VALUES (?, ?)");
            if (!empty($input['custom_roles']) && is_array($input['custom_roles'])) {
                foreach ($input['custom_roles'] as $cr_id) {
                    $insertCr->execute([$userId, $cr_id]);
                }
            }

            if (!empty($input['password'])) {
                $hash = password_hash($input['password'], PASSWORD_DEFAULT);
                $pdo->prepare("UPDATE users SET password_hash=? WHERE id=?")->execute([$hash, $userId]);
            }
            
            echo json_encode(["status" => "success", "message" => "User updated"]);
        }
    } elseif ($method === 'DELETE') {
        if (!$userId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        echo json_encode(["status" => "success"]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
