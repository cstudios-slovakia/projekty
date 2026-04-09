<?php
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($method === 'GET') {
        // 1. Funnel: Group by status
        $funnelStmt = $pdo->query("
            SELECT status, COUNT(*) as count, SUM(total_value) as total_value 
            FROM projects 
            WHERE is_archived = FALSE
            GROUP BY status
        ");
        $funnel = $funnelStmt->fetchAll();

        // 2. Expected Income: Group by Month of Deadline
        $incomeStmt = $pdo->query("
            SELECT TO_CHAR(deadline, 'YYYY-MM') as month, SUM(total_value - already_paid) as expected_income 
            FROM projects 
            WHERE is_archived = FALSE AND deadline IS NOT NULL AND status != 'Price Offer Rejected'
            GROUP BY TO_CHAR(deadline, 'YYYY-MM')
            ORDER BY month ASC
            LIMIT 12
        ");
        $income = $incomeStmt->fetchAll();

        // 3. Workload (Developer): Breakdown with Complexity
        $workloadStmt = $pdo->query("
            SELECT 
                d.name, 
                d.color,
                COUNT(*) as total_count, 
                SUM(CASE WHEN p.dev_status = 'In Progress' THEN 1 ELSE 0 END) as active_count,
                SUM(p.complexity) as total_complexity,
                SUM(CASE WHEN p.dev_status = 'In Progress' THEN p.complexity ELSE 0 END) as active_complexity
            FROM projects p
            JOIN settings_entities d ON p.dev_id = d.id
            WHERE p.is_archived = FALSE
            GROUP BY d.name, d.color
        ");
        $workload = $workloadStmt->fetchAll();
        
        // 4. Workload (Designer): Breakdown with Complexity
        $designWorkloadStmt = $pdo->query("
            SELECT 
                ds.name, 
                ds.color,
                COUNT(*) as total_count, 
                SUM(CASE WHEN p.design_status = 'In Progress' THEN 1 ELSE 0 END) as active_count,
                SUM(p.complexity) as total_complexity,
                SUM(CASE WHEN p.design_status = 'In Progress' THEN p.complexity ELSE 0 END) as active_complexity
            FROM projects p
            JOIN settings_entities ds ON p.designer_id = ds.id
            WHERE p.is_archived = FALSE
            GROUP BY ds.name, ds.color
        ");
        $designWorkload = $designWorkloadStmt->fetchAll();

        // 5. Workload (PM): Breakdown with Complexity
        $pmWorkloadStmt = $pdo->query("
            SELECT 
                pm.name, 
                pm.color,
                COUNT(*) as total_count, 
                SUM(CASE WHEN p.status NOT IN ('Price Offer Sent', 'New Lead', 'Price Offer Rejected') AND p.status != 'Closed' THEN 1 ELSE 0 END) as active_count,
                SUM(p.complexity) as total_complexity,
                SUM(CASE WHEN p.status NOT IN ('Price Offer Sent', 'New Lead', 'Price Offer Rejected') AND p.status != 'Closed' THEN p.complexity ELSE 0 END) as active_complexity
            FROM projects p
            JOIN settings_entities pm ON p.pm_id = pm.id
            WHERE p.is_archived = FALSE
            GROUP BY pm.name, pm.color
        ");
        $pmWorkload = $pmWorkloadStmt->fetchAll();

        echo json_encode([
            "status" => "success", 
            "data" => [
                "funnel" => $funnel,
                "income" => $income,
                "workload_dev" => $workload,
                "workload_design" => $designWorkload,
                "workload_pm" => $pmWorkload
            ]
        ]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
