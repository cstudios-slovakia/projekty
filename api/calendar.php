<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

try {
    // 1. Fetch active projects with dates
    $projectsStmt = $pdo->prepare("
        SELECT id, name, status, deadline, designer_id, design_start, design_end, dev_id, dev_start, dev_end 
        FROM projects 
        WHERE is_archived = FALSE
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

    // 3. Fetch designers and developers for rows, plus PMs for meeting context if needed
    $entitiesStmt = $pdo->prepare("
        SELECT id, type, name, color 
        FROM settings_entities 
        WHERE type IN ('designer', 'developer', 'pm')
    ");
    $entitiesStmt->execute();
    $entities = $entitiesStmt->fetchAll();

    echo json_encode([
        "status" => "success", 
        "data" => [
            "projects" => $projects,
            "meetings" => $meetings,
            "entities" => $entities
        ]
    ]);
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
