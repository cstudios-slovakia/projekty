<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    // Helper function to auto-spawn active development entries for accepted projects
    function sync_accepted_projects($pdo) {
        $acceptedStmt = $pdo->prepare("SELECT id, client_id, pm_id, dev_id, total_value, dev_budget FROM projects WHERE status = 'Price Offer Accepted' OR status = 'Accepted'");
        $acceptedStmt->execute();
        $acceptedProjects = $acceptedStmt->fetchAll();

        $checkStmt = $pdo->prepare("SELECT id FROM active_development_projects WHERE project_id = ?");
        $insertStmt = $pdo->prepare("INSERT INTO active_development_projects (project_id, client_id, pm_id, dev_id, budget, dev_budget) VALUES (?, ?, ?, ?, ?, ?)");

        foreach ($acceptedProjects as $p) {
            $checkStmt->execute([$p['id']]);
            if (!$checkStmt->fetch()) {
                $insertStmt->execute([
                    $p['id'],
                    $p['client_id'],
                    $p['pm_id'],
                    $p['dev_id'],
                    $p['total_value'] ?? 0,
                    $p['dev_budget'] ?? 0
                ]);
            }
        }
    }

    sync_accepted_projects($pdo);

    if ($method === 'GET') {
        $id = $_GET['id'] ?? null;
        $projectId = $_GET['project_id'] ?? null;
        $archivedParam = $_GET['archived'] ?? 'false';

        $whereConditions = [];
        $params = [];

        $statusTab = $_GET['status_tab'] ?? $_GET['tab'] ?? null;

        if ($id) {
            $whereConditions[] = "ad.id = ?";
            $params[] = $id;
        } elseif ($projectId) {
            $whereConditions[] = "ad.project_id = ?";
            $params[] = $projectId;
        } else {
            if ($archivedParam === 'true' || $statusTab === 'archived') {
                $whereConditions[] = (IS_MYSQL ? "p.is_archived = 1" : "p.is_archived = TRUE");
            } elseif ($statusTab === 'completed') {
                $whereConditions[] = (IS_MYSQL ? "p.is_archived = 0 AND (ad.is_completed = 1 OR p.is_completed = 1 OR LOWER(p.status) = 'completed')" : "p.is_archived = FALSE AND (ad.is_completed = 1 OR p.is_completed = 1 OR LOWER(p.status) = 'completed')");
            } elseif ($statusTab === 'all_non_archived') {
                $whereConditions[] = (IS_MYSQL ? "p.is_archived = 0" : "p.is_archived = FALSE");
            } elseif ($archivedParam !== 'all') {
                $whereConditions[] = (IS_MYSQL ? "p.is_archived = 0 AND COALESCE(ad.is_completed, 0) = 0 AND COALESCE(p.is_completed, 0) = 0 AND LOWER(COALESCE(p.status, '')) != 'completed'" : "p.is_archived = FALSE AND COALESCE(ad.is_completed, 0) = 0 AND COALESCE(p.is_completed, 0) = 0 AND LOWER(COALESCE(p.status, '')) != 'completed'");
            }
        }

        $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";

        $stmt = $pdo->prepare("
            SELECT ad.*,
                   p.name as project_name, p.status as project_status, p.accepted_date, p.deadline,
                   COALESCE(ad.project_category, p.project_category, 'project') as project_category,
                   COALESCE(ad.is_completed, p.is_completed, 0) as is_completed,
                   COALESCE(p.hard_deadline, p.deadline) as hard_deadline,
                   p.soft_deadline, p.is_archived,
                   COALESCE(p.start_date, p.accepted_date) as start_date,
                   c.name as client_name, c.color as client_color,
                   pm.name as pm_name, pm.color as pm_color,
                   d.name as dev_name, d.color as dev_color,
                   (
                       SELECT COALESCE(SUM(amount), 0)
                       FROM project_invoices
                       WHERE project_id = ad.project_id
                   ) as total_invoiced,
                   (
                       SELECT COALESCE(SUM(amount), 0)
                       FROM project_invoices
                       WHERE project_id = ad.project_id AND status = 'paid'
                   ) as total_paid,
                   (
                       SELECT COALESCE(SUM(cost), 0)
                       FROM project_manual_expenses
                       WHERE project_id = ad.project_id
                   ) as total_manual_expenses,
                   (
                       SELECT COALESCE(SUM(
                           CASE WHEN pe.entity_id IS NOT NULL THEN pe.hours * se.hourly_rate ELSE pe.custom_cost END
                       ), 0)
                       FROM project_expenses pe
                       LEFT JOIN settings_entities se ON pe.entity_id = se.id
                       WHERE pe.project_id = ad.project_id
                   ) as total_time_log_expenses,
                    (
                        SELECT COUNT(*) FROM project_subtasks WHERE project_id = ad.project_id
                    ) as total_subtasks,
                    (
                        SELECT COUNT(*) FROM project_subtasks WHERE project_id = ad.project_id AND (
                            LOWER(status) IN ('complete', 'completed', 'done', 'closed', 'finished', 'resolved')
                            OR LOWER(status) LIKE '%complete%'
                            OR LOWER(status) LIKE '%done%'
                            OR LOWER(status) LIKE '%closed%'
                        )
                    ) as completed_subtasks,
                    (
                        " . (IS_MYSQL ? "
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT(
                                'assignee_id', sub.assignee_id,
                                'name', COALESCE(se.name, 'Unassigned'),
                                'color', COALESCE(se.color, '#94a3b8'),
                                'total_tasks', sub.total_tasks,
                                'completed_tasks', sub.completed_tasks
                            )
                        )
                        FROM (
                            SELECT ps.project_id, ps.assignee_id,
                                   COUNT(*) as total_tasks,
                                   SUM(IF(
                                       LOWER(ps.status) IN ('complete', 'completed', 'done', 'closed', 'finished', 'resolved')
                                       OR LOWER(ps.status) LIKE '%complete%'
                                       OR LOWER(ps.status) LIKE '%done%'
                                       OR LOWER(ps.status) LIKE '%closed%', 1, 0
                                   )) as completed_tasks
                            FROM project_subtasks ps
                            GROUP BY ps.project_id, ps.assignee_id
                        ) sub
                        LEFT JOIN settings_entities se ON sub.assignee_id = se.id
                        WHERE sub.project_id = ad.project_id
                        " : "
                        SELECT json_agg(
                            json_build_object(
                                'assignee_id', sub.assignee_id,
                                'name', COALESCE(se.name, 'Unassigned'),
                                'color', COALESCE(se.color, '#94a3b8'),
                                'total_tasks', sub.total_tasks,
                                'completed_tasks', sub.completed_tasks
                            )
                        )
                        FROM (
                            SELECT ps.project_id, ps.assignee_id,
                                   COUNT(*) as total_tasks,
                                   SUM(CASE WHEN
                                       LOWER(ps.status) IN ('complete', 'completed', 'done', 'closed', 'finished', 'resolved')
                                       OR LOWER(ps.status) LIKE '%complete%'
                                       OR LOWER(ps.status) LIKE '%done%'
                                       OR LOWER(ps.status) LIKE '%closed%' THEN 1 ELSE 0 END
                                   ) as completed_tasks
                            FROM project_subtasks ps
                            GROUP BY ps.project_id, ps.assignee_id
                        ) sub
                        LEFT JOIN settings_entities se ON sub.assignee_id = se.id
                        WHERE sub.project_id = ad.project_id
                        ") . "
                    ) as assignee_subtasks_breakdown
            FROM active_development_projects ad
            JOIN projects p ON ad.project_id = p.id
            LEFT JOIN settings_entities c ON ad.client_id = c.id
            LEFT JOIN settings_entities pm ON ad.pm_id = pm.id
            LEFT JOIN settings_entities d ON ad.dev_id = d.id
            $whereClause
            ORDER BY ad.id DESC
        ");
        $stmt->execute($params);

        $decodeRow = function(&$row) {
            if ($row && isset($row['assignee_subtasks_breakdown']) && is_string($row['assignee_subtasks_breakdown'])) {
                $row['assignee_subtasks_breakdown'] = json_decode($row['assignee_subtasks_breakdown'], true);
            }
        };

        if ($id || $projectId) {
            $data = $stmt->fetch();
            if ($data) $decodeRow($data);
            echo json_encode(["status" => "success", "data" => $data]);
        } else {
            $data = $stmt->fetchAll();
            foreach ($data as &$r) $decodeRow($r);
            echo json_encode(["status" => "success", "data" => $data]);
        }

    } elseif ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        $projectId = $input['project_id'] ?? null;

        if (!$projectId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing project_id"]);
            exit;
        }

        // Fetch project info
        $projStmt = $pdo->prepare("SELECT client_id, pm_id, dev_id, total_value, dev_budget FROM projects WHERE id = ?");
        $projStmt->execute([$projectId]);
        $project = $projStmt->fetch();

        if (!$project) {
            http_response_code(404);
            echo json_encode(["status" => "error", "message" => "Project not found"]);
            exit;
        }

        // Upsert into active_development_projects
        $checkStmt = $pdo->prepare("SELECT id FROM active_development_projects WHERE project_id = ?");
        $checkStmt->execute([$projectId]);
        $existing = $checkStmt->fetch();

        if ($existing) {
            echo json_encode(["status" => "success", "id" => $existing['id'], "message" => "Already active"]);
            exit;
        }

        $insertStmt = $pdo->prepare("INSERT INTO active_development_projects (project_id, client_id, pm_id, dev_id, budget, dev_budget) VALUES (?, ?, ?, ?, ?, ?)");
        $insertStmt->execute([
            $projectId,
            $input['client_id'] ?? $project['client_id'],
            $input['pm_id'] ?? $project['pm_id'],
            $input['dev_id'] ?? $project['dev_id'],
            $input['budget'] ?? $project['total_value'] ?? 0,
            $input['dev_budget'] ?? $project['dev_budget'] ?? 0
        ]);

        $newId = IS_MYSQL ? $pdo->lastInsertId() : $pdo->lastInsertId('active_development_projects_id_seq');
        echo json_encode(["status" => "success", "id" => $newId]);

    } elseif ($method === 'PUT') {
        $id = $_GET['id'] ?? null;
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }

        $fields = [];
        $values = [];
        $allowedFields = [
            'client_id', 'pm_id', 'dev_id', 'budget', 'dev_budget', 'start_date', 'soft_deadline', 'hard_deadline',
            'project_category', 'is_completed', 'clickup_source_type', 'clickup_space_id', 'clickup_folder_id', 'clickup_list_id', 'clickup_task_id'
        ];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $input)) {
                $fields[] = "$field = ?";
                $values[] = $input[$field] === '' ? null : $input[$field];
            }
        }

        if (!empty($fields)) {
            $values[] = $id;
            $sql = "UPDATE active_development_projects SET " . implode(", ", $fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
        }

        // Fetch project_id to keep projects table synchronized
        $getAd = $pdo->prepare("SELECT project_id FROM active_development_projects WHERE id = ?");
        $getAd->execute([$id]);
        $adRow = $getAd->fetch();

        if ($adRow) {
            $projFields = [];
            $projValues = [];
            if (array_key_exists('name', $input)) { $projFields[] = "name = ?"; $projValues[] = $input['name']; }
            if (array_key_exists('project_name', $input)) { $projFields[] = "name = ?"; $projValues[] = $input['project_name']; }
            if (array_key_exists('project_category', $input)) { $projFields[] = "project_category = ?"; $projValues[] = $input['project_category']; }
            if (array_key_exists('is_completed', $input)) {
                $projFields[] = "is_completed = ?";
                $projValues[] = $input['is_completed'] ? 1 : 0;
                if ($input['is_completed']) {
                    $projFields[] = "status = ?";
                    $projValues[] = 'Completed';
                }
            }
            if (array_key_exists('project_status', $input)) {
                $projFields[] = "status = ?";
                $projValues[] = $input['project_status'];
                if ($input['project_status'] === 'Completed') {
                    $projFields[] = "is_completed = ?";
                    $projValues[] = 1;
                }
            }
            if (array_key_exists('client_id', $input)) { $projFields[] = "client_id = ?"; $projValues[] = $input['client_id']; }
            if (array_key_exists('pm_id', $input)) { $projFields[] = "pm_id = ?"; $projValues[] = $input['pm_id']; }
            if (array_key_exists('dev_id', $input)) { $projFields[] = "dev_id = ?"; $projValues[] = $input['dev_id']; }
            if (array_key_exists('budget', $input)) { $projFields[] = "total_value = ?"; $projValues[] = $input['budget']; }
            if (array_key_exists('dev_budget', $input)) { $projFields[] = "dev_budget = ?"; $projValues[] = $input['dev_budget']; }
            if (array_key_exists('start_date', $input)) { $projFields[] = "start_date = ?"; $projValues[] = $input['start_date'] === '' ? null : $input['start_date']; }
            if (array_key_exists('soft_deadline', $input)) { $projFields[] = "soft_deadline = ?"; $projValues[] = $input['soft_deadline'] === '' ? null : $input['soft_deadline']; }
            if (array_key_exists('hard_deadline', $input)) { 
                $projFields[] = "hard_deadline = ?"; $projValues[] = $input['hard_deadline'] === '' ? null : $input['hard_deadline'];
                $projFields[] = "deadline = ?"; $projValues[] = $input['hard_deadline'] === '' ? null : $input['hard_deadline'];
            }
            if (array_key_exists('is_archived', $input)) { $projFields[] = "is_archived = ?"; $projValues[] = $input['is_archived'] ? 1 : 0; }

            if (!empty($projFields)) {
                $projValues[] = $adRow['project_id'];
                $pdo->prepare("UPDATE projects SET " . implode(", ", $projFields) . " WHERE id = ?")->execute($projValues);
            }
        }

        echo json_encode(["status" => "success"]);

    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM active_development_projects WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
