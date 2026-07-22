<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Function to call ClickUp API v2 using cURL or stream context
function call_clickup($endpoint, $token, $customToken = null) {
    $apiToken = $customToken ?: $token;
    if (empty($apiToken)) {
        return ['code' => 401, 'error' => 'ClickUp API token not configured'];
    }

    $url = "https://api.clickup.com/api/v2/" . ltrim($endpoint, '/');
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: " . trim($apiToken),
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        return ['code' => 500, 'error' => 'cURL error: ' . $curlErr];
    }

    $decoded = json_decode($response, true);
    return ['code' => $httpCode, 'data' => $decoded];
}

try {
    // Get ClickUp token from system_settings
    $tokenStmt = $pdo->prepare("SELECT value FROM system_settings WHERE `key` = 'clickup_api_token'");
    $tokenStmt->execute();
    $savedToken = $tokenStmt->fetchColumn() ?: '';

    $action = $_GET['action'] ?? $_POST['action'] ?? 'test';

    if ($action === 'test') {
        $testToken = $_GET['token'] ?? $_POST['token'] ?? $savedToken;
        $res = call_clickup('user', $savedToken, $testToken);
        if ($res['code'] === 200 && isset($res['data']['user'])) {
            echo json_encode(["status" => "success", "user" => $res['data']['user']]);
        } else {
            http_response_code($res['code'] ?: 400);
            echo json_encode(["status" => "error", "message" => $res['data']['err'] ?? $res['error'] ?? 'Invalid token']);
        }

    } elseif ($action === 'teams') {
        $res = call_clickup('team', $savedToken);
        if ($res['code'] === 200) {
            echo json_encode(["status" => "success", "teams" => $res['data']['teams'] ?? []]);
        } else {
            http_response_code($res['code'] ?: 400);
            echo json_encode(["status" => "error", "message" => $res['data']['err'] ?? 'Failed to fetch teams']);
        }

    } elseif ($action === 'members') {
        $teamId = $_GET['team_id'] ?? null;
        $res = call_clickup('team', $savedToken);
        $members = [];
        if ($res['code'] === 200 && isset($res['data']['teams'])) {
            foreach ($res['data']['teams'] as $t) {
                if (!$teamId || $t['id'] == $teamId) {
                    foreach ($t['members'] as $m) {
                        $members[] = [
                            'id' => $m['user']['id'],
                            'username' => $m['user']['username'],
                            'email' => $m['user']['email'] ?? '',
                            'color' => $m['user']['color'] ?? '#3b82f6',
                            'profilePicture' => $m['user']['profilePicture'] ?? null
                        ];
                    }
                }
            }
        }
        echo json_encode(["status" => "success", "members" => $members]);

    } elseif ($action === 'spaces') {
        $teamId = $_GET['team_id'] ?? null;
        if (!$teamId) {
            // Pick first team
            $teamsRes = call_clickup('team', $savedToken);
            if (!empty($teamsRes['data']['teams'][0]['id'])) {
                $teamId = $teamsRes['data']['teams'][0]['id'];
            }
        }
        if (!$teamId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing team_id"]);
            exit;
        }

        $res = call_clickup("team/{$teamId}/space", $savedToken);
        echo json_encode(["status" => "success", "spaces" => $res['data']['spaces'] ?? []]);

    } elseif ($action === 'folders_and_lists') {
        $spaceId = $_GET['space_id'] ?? null;
        if (!$spaceId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing space_id"]);
            exit;
        }

        $foldersRes = call_clickup("space/{$spaceId}/folder", $savedToken);
        $folderlessRes = call_clickup("space/{$spaceId}/list", $savedToken);

        echo json_encode([
            "status" => "success",
            "folders" => $foldersRes['data']['folders'] ?? [],
            "folderless_lists" => $folderlessRes['data']['lists'] ?? []
        ]);

    } elseif ($action === 'tasks') {
        $listId = $_GET['list_id'] ?? null;
        if (!$listId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing list_id"]);
            exit;
        }

        $res = call_clickup("list/{$listId}/task?subtasks=true", $savedToken);
        echo json_encode(["status" => "success", "tasks" => $res['data']['tasks'] ?? []]);

    } elseif ($action === 'user_mappings') {
        if ($method === 'GET') {
            $stmt = $pdo->query("SELECT * FROM clickup_user_mappings");
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll()]);
        } elseif ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $mappings = $input['mappings'] ?? [];

            $stmt = $pdo->prepare("
                INSERT INTO clickup_user_mappings (clickup_user_id, clickup_username, clickup_email, clickup_avatar, developer_id)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    clickup_username = VALUES(clickup_username),
                    clickup_email = VALUES(clickup_email),
                    clickup_avatar = VALUES(clickup_avatar),
                    developer_id = VALUES(developer_id)
            ");
            if (!IS_MYSQL) {
                $stmt = $pdo->prepare("
                    INSERT INTO clickup_user_mappings (clickup_user_id, clickup_username, clickup_email, clickup_avatar, developer_id)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT (clickup_user_id) DO UPDATE SET
                        clickup_username = EXCLUDED.clickup_username,
                        clickup_email = EXCLUDED.clickup_email,
                        clickup_avatar = EXCLUDED.clickup_avatar,
                        developer_id = EXCLUDED.developer_id
                ");
            }

            foreach ($mappings as $m) {
                if (!empty($m['clickup_user_id'])) {
                    $stmt->execute([
                        (string)$m['clickup_user_id'],
                        $m['clickup_username'] ?? null,
                        $m['clickup_email'] ?? null,
                        $m['clickup_avatar'] ?? null,
                        !empty($m['developer_id']) ? $m['developer_id'] : null
                    ]);
                }
            }
            echo json_encode(["status" => "success", "message" => "Mappings saved"]);
        }

    } elseif ($action === 'sync') {
        $input = json_decode(file_get_contents('php://input'), true);
        $projectId = $input['project_id'] ?? $_GET['project_id'] ?? null;

        if (!$projectId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing project_id"]);
            exit;
        }

        // Get project's active dev clickup settings
        $adStmt = $pdo->prepare("SELECT * FROM active_development_projects WHERE project_id = ?");
        $adStmt->execute([$projectId]);
        $ad = $adStmt->fetch();

        if (!$ad) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Active development settings not found for this project"]);
            exit;
        }

        $sourceType = $ad['clickup_source_type'] ?: 'list';
        $listId = $ad['clickup_list_id'];
        $taskId = $ad['clickup_task_id'];

        $tasksToImport = [];
        $parentDueDate = null;
        $parentStartDate = null;

        $parseClickUpDate = function($raw) {
            if (empty($raw)) return null;
            if (is_numeric($raw)) {
                $ts = intval($raw);
                if ($ts > 100000000000) { // milliseconds
                    $ts = intval($ts / 1000);
                }
                return date('Y-m-d', $ts);
            }
            return date('Y-m-d', strtotime((string)$raw));
        };

        if ($sourceType === 'list' && $listId) {
            $res = call_clickup("list/{$listId}/task?subtasks=true", $savedToken);
            if ($res['code'] === 200 && isset($res['data']['tasks'])) {
                $tasksToImport = $res['data']['tasks'];
            }
        } elseif ($sourceType === 'task' && $taskId) {
            // Fetch task details including subtasks
            $res = call_clickup("task/{$taskId}?include_subtasks=true", $savedToken);
            $taskData = $res['data']['task'] ?? $res['data'] ?? [];
            
            if (isset($taskData['due_date'])) {
                $parentDueDate = $parseClickUpDate($taskData['due_date']);
            }
            if (isset($taskData['start_date'])) {
                $parentStartDate = $parseClickUpDate($taskData['start_date']);
            }

            if (isset($res['data']['subtasks'])) {
                $tasksToImport = $res['data']['subtasks'];
            } elseif (isset($res['data']['task']['subtasks'])) {
                $tasksToImport = $res['data']['task']['subtasks'];
            }
        }

        // If parentDueDate is empty, derive max due_date from subtasks
        if (!$parentDueDate && !empty($tasksToImport)) {
            $maxTs = 0;
            $minTs = 0;
            foreach ($tasksToImport as $t) {
                if (!empty($t['due_date'])) {
                    $ts = is_numeric($t['due_date']) ? (intval($t['due_date']) > 100000000000 ? intval($t['due_date'] / 1000) : intval($t['due_date'])) : strtotime((string)$t['due_date']);
                    if ($ts > $maxTs) $maxTs = $ts;
                }
                if (!empty($t['start_date'])) {
                    $ts = is_numeric($t['start_date']) ? (intval($t['start_date']) > 100000000000 ? intval($t['start_date'] / 1000) : intval($t['start_date'])) : strtotime((string)$t['start_date']);
                    if ($minTs === 0 || $ts < $minTs) $minTs = $ts;
                }
            }
            if ($maxTs > 0) $parentDueDate = date('Y-m-d', $maxTs);
            if ($minTs > 0) $parentStartDate = date('Y-m-d', $minTs);
        }

        // Sync Project Hard Deadline and Soft Deadline in DB
        if ($parentDueDate || $parentStartDate) {
            $updateProjStmt = $pdo->prepare("
                UPDATE projects
                SET hard_deadline = COALESCE(?, hard_deadline),
                    soft_deadline = COALESCE(?, soft_deadline),
                    deadline = COALESCE(?, deadline),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $updateProjStmt->execute([$parentDueDate, $parentStartDate, $parentDueDate, $projectId]);

            $updateAdStmt = $pdo->prepare("
                UPDATE active_development_projects
                SET hard_deadline = COALESCE(?, hard_deadline),
                    soft_deadline = COALESCE(?, soft_deadline),
                    updated_at = CURRENT_TIMESTAMP
                WHERE project_id = ?
            ");
            $updateAdStmt->execute([$parentDueDate, $parentStartDate, $projectId]);
        }

        if (empty($tasksToImport) && $sourceType === 'list' && !$listId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "No ClickUp List configured for this project"]);
            exit;
        }

        // Fetch user mappings lookup table
        $mapStmt = $pdo->query("SELECT clickup_user_id, developer_id FROM clickup_user_mappings");
        $mappingsLookup = $mapStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // Fetch existing subtasks for this project to upsert
        $existingStmt = $pdo->prepare("SELECT id, clickup_id FROM project_subtasks WHERE project_id = ? AND clickup_id IS NOT NULL");
        $existingStmt->execute([$projectId]);
        $existingSubtasks = $existingStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        $upsertCount = 0;
        $order = 1;

        $checkExistStmt = $pdo->prepare("SELECT id FROM project_subtasks WHERE project_id = ? AND clickup_id = ?");
        $insertSubtaskStmt = $pdo->prepare("
            INSERT INTO project_subtasks (project_id, title, status, clickup_id, clickup_assignee_id, assignee_id, due_date, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $updateSubtaskStmt = $pdo->prepare("
            UPDATE project_subtasks
            SET title = ?, status = ?, clickup_assignee_id = ?, assignee_id = ?, due_date = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");

        foreach ($tasksToImport as $t) {
            $cId = (string)$t['id'];
            $title = (string)($t['name'] ?? 'Untitled Subtask');
            
            $rawStatus = $t['status'] ?? null;
            $type = '';
            $sName = '';

            if (is_string($rawStatus)) {
                $sName = strtolower(trim($rawStatus));
            } elseif (is_array($rawStatus)) {
                $type = strtolower(trim((string)($rawStatus['type'] ?? '')));
                $sName = strtolower(trim((string)($rawStatus['status'] ?? '')));
            }

            if ($type === 'closed' || $type === 'done' || in_array($sName, ['complete', 'completed', 'done', 'closed', 'finished', 'resolved', 'vybavené', 'vybavene', 'schválené', 'schvalene']) || strpos($sName, 'complete') !== false || strpos($sName, 'closed') !== false) {
                $statusName = 'complete';
            } elseif ($type === 'open' || in_array($sName, ['to do', 'todo', 'open', 'new', 'backlog', 'vytvorené', 'vytvorene'])) {
                $statusName = 'to do';
            } else {
                $statusName = 'in progress';
            }
            $assigneeClickUpId = !empty($t['assignees'][0]['id']) ? (string)$t['assignees'][0]['id'] : null;
            $devId = $assigneeClickUpId && isset($mappingsLookup[$assigneeClickUpId]) ? $mappingsLookup[$assigneeClickUpId] : null;

            $dueDate = $parseClickUpDate($t['due_date'] ?? null);

            $checkExistStmt->execute([$projectId, $cId]);
            $found = $checkExistStmt->fetchColumn();

            if ($found) {
                $updateSubtaskStmt->execute([$title, $statusName, $assigneeClickUpId, $devId, $dueDate, $order, $found]);
            } else {
                $insertSubtaskStmt->execute([$projectId, $title, $statusName, $cId, $assigneeClickUpId, $devId, $dueDate, $order]);
            }
            $upsertCount++;
            $order++;
        }

        echo json_encode(["status" => "success", "synced_count" => $upsertCount]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
