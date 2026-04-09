<?php
require 'api/db.php';
$stmt = $pdo->query("
    SELECT p.id,
    (
        SELECT json_agg(json_build_object('color', COALESCE(se.color, '#94a3b8'), 'cost', CASE WHEN pe.entity_id IS NOT NULL THEN pe.hours * se.hourly_rate ELSE pe.custom_cost END))
        FROM project_expenses pe
        LEFT JOIN settings_entities se ON pe.entity_id = se.id
        WHERE pe.project_id = p.id AND (pe.hours > 0 OR pe.custom_cost > 0)
    ) as expenses_breakdown
    FROM projects p LIMIT 1;
");
print_r($stmt->fetchAll());
