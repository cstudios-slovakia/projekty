<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

try {
    // 1. Fetch active projects with dates
    $projectsStmt = $pdo->prepare("
        SELECT p.id, p.name, p.status, p.deadline, p.designer_id, p.design_start, p.design_end, p.dev_id, p.dev_start, p.dev_end,
               (
                   " . (IS_MYSQL ? "
                   SELECT JSON_ARRAYAGG(JSON_OBJECT('role_id', pa.role_id, 'member_id', pa.member_id, 'start_date', pa.start_date, 'end_date', pa.end_date))
                   " : "
                   SELECT json_agg(json_build_object('role_id', pa.role_id, 'member_id', pa.member_id, 'start_date', pa.start_date, 'end_date', pa.end_date))
                   ") . "
                   FROM project_assignments pa
                   WHERE pa.project_id = p.id AND pa.start_date IS NOT NULL
               ) as custom_assignments
        FROM projects p
        WHERE p.is_archived = FALSE
    ");
    $projectsStmt->execute();
    $projects = $projectsStmt->fetchAll();

    // 2. Fetch lead meetings (future or all meetings)
    // We fetch any activity with type = 'Meeting' from non-archived leads
    $meetingsStmt = $pdo->prepare("
        SELECT la.id, la.lead_id, la.activity_date, la.notes, la.type, 
               l.company_name, l.contact_name, l.pm_id
        FROM lead_activities la
        JOIN leads l ON la.lead_id = l.id
        WHERE la.type = 'Meeting' AND l.is_archived = FALSE
    ");
    $meetingsStmt->execute();
    $meetings = $meetingsStmt->fetchAll();

    // 3. Fetch lead creations
    $leadsStmt = $pdo->prepare("
        SELECT id, company_name, contact_name, created_at 
        FROM leads 
        WHERE is_archived = FALSE
    ");
    $leadsStmt->execute();
    $leads = $leadsStmt->fetchAll();

    // 4. Fetch designers and developers for rows, plus PMs for meeting context if needed
    $entitiesStmt = $pdo->prepare("
        SELECT id, type, name, color 
        FROM settings_entities 
        WHERE type IN ('designer', 'developer', 'pm')
    ");
    $entitiesStmt->execute();
    $entities = $entitiesStmt->fetchAll();

    // 5. Fetch dynamic role definitions
    $rolesStmt = $pdo->prepare("
        SELECT id, label, is_timeline_group, sort_order 
        FROM role_definitions 
        ORDER BY sort_order ASC
    ");
    $rolesStmt->execute();
    $roles = $rolesStmt->fetchAll();

    echo json_encode([
        "status" => "success", 
        "data" => [
            "projects" => $projects,
            "meetings" => $meetings,
            "leads" => $leads,
            "entities" => $entities,
            "roles" => $roles
        ]
    ]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
