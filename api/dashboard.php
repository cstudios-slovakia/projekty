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
        $is_mysql = (defined('DB_TYPE') && (DB_TYPE === 'mysql' || DB_TYPE === 'mariadb'));
        $quote = $is_mysql ? '`' : '';
        // 1. Funnel: 4-Stage Cumulative Data
        $funnel = [
            "sent_unaccepted" => $pdo->query("SELECT COUNT(*) as count, SUM(COALESCE(total_value, 0)) as amount FROM projects WHERE is_archived = FALSE AND status = 'Price Offer Sent'")->fetch(),
            "remaining_invoicable" => $pdo->query("SELECT COUNT(*) as count, SUM(COALESCE(total_value, 0) - COALESCE(already_paid, 0)) as amount FROM projects WHERE is_archived = FALSE AND status IN ('Price Offer Accepted', 'Price Offer Closed')")->fetch()
        ];

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

        $settingsStmt = $pdo->query("SELECT {$quote}key{$quote}, {$quote}value{$quote} FROM " . (defined('DB_PREFIX') ? DB_PREFIX : '') . 'system_settings');
        $settings = $settingsStmt->fetchAll(PDO::FETCH_KEY_PAIR);

        // 6. Executive Manager KPIs
        $totalInvoicableStmt = $pdo->query("
            SELECT COALESCE(SUM(COALESCE(p.total_value, 0) - COALESCE(inv.total_invoiced, 0)), 0) as amount
            FROM projects p
            LEFT JOIN (
                SELECT project_id, SUM(amount) as total_invoiced
                FROM project_invoices
                GROUP BY project_id
            ) inv ON p.id = inv.project_id
            WHERE p.is_archived = FALSE AND COALESCE(p.is_completed, 0) = 0 AND p.status IN ('Price Offer Accepted', 'Accepted', 'Price Offer Closed', 'In Progress')
        ");
        $totalInvoicable = floatval($totalInvoicableStmt->fetchColumn());

        $totalActiveValueStmt = $pdo->query("
            SELECT COALESCE(SUM(COALESCE(p.total_value, 0)), 0) as amount
            FROM projects p
            WHERE p.is_archived = FALSE AND COALESCE(p.is_completed, 0) = 0 AND p.status IN ('Price Offer Accepted', 'Accepted', 'Price Offer Closed', 'In Progress')
        ");
        $totalActiveValue = floatval($totalActiveValueStmt->fetchColumn());

        $totalSentOffersStmt = $pdo->query("
            SELECT COALESCE(SUM(COALESCE(p.total_value, 0)), 0) as amount
            FROM projects p
            WHERE p.is_archived = FALSE AND p.status = 'Price Offer Sent'
        ");
        $totalSentOffersValue = floatval($totalSentOffersStmt->fetchColumn());

        // Active Projects Budget & Burn details
        $activeProjectsBurnedStmt = $pdo->query("
            SELECT ad.id, ad.project_id, p.name as project_name, 
                   COALESCE(ad.budget, p.total_value, 0) as budget,
                   COALESCE(ad.dev_budget, p.dev_budget, 0) as dev_budget,
                   pm.name as pm_name, dev.name as dev_name,
                   (
                       SELECT COALESCE(SUM(cost), 0) FROM project_manual_expenses WHERE project_id = ad.project_id
                   ) as manual_expenses,
                   (
                       SELECT COALESCE(SUM(pe.hours * COALESCE(se.hourly_rate, 0)), 0)
                       FROM project_expenses pe
                       LEFT JOIN settings_entities se ON pe.entity_id = se.id
                       WHERE pe.project_id = ad.project_id
                   ) as time_expenses
            FROM active_development_projects ad
            JOIN projects p ON ad.project_id = p.id
            LEFT JOIN settings_entities pm ON ad.pm_id = pm.id
            LEFT JOIN settings_entities dev ON ad.dev_id = dev.id
            WHERE p.is_archived = FALSE AND COALESCE(ad.is_completed, p.is_completed, 0) = 0
            ORDER BY ad.id DESC
        ");
        $rawActiveBurned = $activeProjectsBurnedStmt->fetchAll(PDO::FETCH_ASSOC);

        $activeProjectsBurned = [];
        foreach ($rawActiveBurned as $ab) {
            $budget = floatval($ab['budget']);
            $devBudget = floatval($ab['dev_budget']);
            $totExp = floatval($ab['manual_expenses']) + floatval($ab['time_expenses']);
            $baseForPct = $devBudget > 0 ? $devBudget : ($budget > 0 ? $budget : 1);
            $pctBurned = round(($totExp / $baseForPct) * 100, 1);

            $activeProjectsBurned[] = [
                "id" => $ab['id'],
                "project_id" => $ab['project_id'],
                "project_name" => $ab['project_name'],
                "pm_name" => $ab['pm_name'],
                "dev_name" => $ab['dev_name'],
                "budget" => $budget,
                "dev_budget" => $devBudget,
                "total_expenses" => $totExp,
                "burned_percentage" => $pctBurned
            ];
        }

        // Developer Time Log Comparative Matrix
        $now = new DateTime();
        $thisWeekStart = (clone $now)->modify('this week monday')->format('Y-m-d');
        $thisWeekEnd = (clone $now)->modify('this week sunday')->format('Y-m-d');
        $prevWeekStart = (clone $now)->modify('last week monday')->format('Y-m-d');
        $prevWeekEnd = (clone $now)->modify('last week sunday')->format('Y-m-d');
        $thisMonthStart = (clone $now)->modify('first day of this month')->format('Y-m-d');
        $thisMonthEnd = (clone $now)->modify('last day of this month')->format('Y-m-d');
        $prevMonthStart = (clone $now)->modify('first day of last month')->format('Y-m-d');
        $prevMonthEnd = (clone $now)->modify('last day of last month')->format('Y-m-d');

        $devUsers = $pdo->query("
            SELECT u.id as user_id, u.username, se.name, se.color
            FROM users u
            LEFT JOIN settings_entities se ON u.member_id = se.id
            WHERE u.role IN ('employee', 'developer', 'member') OR u.member_id IS NOT NULL
        ")->fetchAll(PDO::FETCH_ASSOC);

        $developerTimeStats = [];
        $hoursStmt = $pdo->prepare("
            SELECT COALESCE(SUM(hours), 0) as total
            FROM time_logs
            WHERE user_id = ? AND log_date >= ? AND log_date <= ?
        ");

        foreach ($devUsers as $dUser) {
            $uId = $dUser['user_id'];
            $dName = !empty($dUser['name']) ? $dUser['name'] : $dUser['username'];

            $hoursStmt->execute([$uId, $thisWeekStart, $thisWeekEnd]);
            $tw = floatval($hoursStmt->fetchColumn());

            $hoursStmt->execute([$uId, $prevWeekStart, $prevWeekEnd]);
            $pw = floatval($hoursStmt->fetchColumn());

            $hoursStmt->execute([$uId, $thisMonthStart, $thisMonthEnd]);
            $tm = floatval($hoursStmt->fetchColumn());

            $hoursStmt->execute([$uId, $prevMonthStart, $prevMonthEnd]);
            $pm = floatval($hoursStmt->fetchColumn());

            $developerTimeStats[] = [
                "user_id" => $uId,
                "name" => $dName,
                "color" => $dUser['color'] ?? '#3b82f6',
                "this_week" => $tw,
                "prev_week" => $pw,
                "this_month" => $tm,
                "prev_month" => $pm
            ];
        }

        // Fetch Company Expenses for cashflow calculations
        $companyExpensesList = $pdo->query("SELECT * FROM company_expenses")->fetchAll(PDO::FETCH_ASSOC);

        // Fetch Latest Bank Cash Adjustment
        $latestCashAdjStmt = $pdo->query("SELECT * FROM bank_cash_adjustments ORDER BY adjustment_date DESC, created_at DESC LIMIT 1");
        $latestCashAdj = $latestCashAdjStmt->fetch(PDO::FETCH_ASSOC);
        $initialBankBalance = $latestCashAdj ? floatval($latestCashAdj['balance_amount']) : 0;
        $runningBankBalance = $initialBankBalance;

        // Cashflow Projection Graph (Weekly Resolution: -15 Days to +90 Days)
        $cashflowProjection = [];
        $startDateObj = (clone $now)->modify('-15 days')->modify('this week monday');
        $endDateObj = (clone $now)->modify('+90 days');

        $currWeekStart = clone $startDateObj;

        while ($currWeekStart <= $endDateObj) {
            $currWeekEnd = (clone $currWeekStart)->modify('+6 days');
            $wStartStr = $currWeekStart->format('Y-m-d');
            $wEndStr = $currWeekEnd->format('Y-m-d');
            $weekNum = $currWeekStart->format('W');
            $wLabel = "W" . $weekNum . " (" . $currWeekStart->format('M d') . ")";

            $incomeItems = [];
            $expenseItems = [];

            // 1. Invoice Income Details
            $incStmt = $pdo->prepare("
                SELECT pi.amount, pi.invoice_number, pi.status, p.name as project_name
                FROM project_invoices pi
                LEFT JOIN projects p ON pi.project_id = p.id
                WHERE (pi.paid_date >= ? AND pi.paid_date <= ?)
                   OR (pi.paid_date IS NULL AND pi.issued_date >= ? AND pi.issued_date <= ?)
                   OR (pi.paid_date IS NULL AND pi.issued_date IS NULL AND pi.due_date >= ? AND pi.due_date <= ?)
                   OR (pi.paid_date IS NULL AND pi.issued_date IS NULL AND pi.due_date IS NULL AND pi.created_at >= ? AND pi.created_at <= ?)
            ");
            $incStmt->execute([$wStartStr, $wEndStr, $wStartStr, $wEndStr, $wStartStr, $wEndStr, $wStartStr . ' 00:00:00', $wEndStr . ' 23:59:59']);
            $invoiceRows = $incStmt->fetchAll(PDO::FETCH_ASSOC);
            $invoiceIncome = 0;
            foreach ($invoiceRows as $invRow) {
                $amt = floatval($invRow['amount']);
                $invoiceIncome += $amt;
                $pName = $invRow['project_name'] ?: 'General Project';
                $invNum = $invRow['invoice_number'] ? "#" . $invRow['invoice_number'] : "Draft";
                $st = ucfirst($invRow['status'] ?: 'Issued');
                $incomeItems[] = [
                    "title" => "Invoice {$invNum}",
                    "scope" => "project",
                    "category_label" => "Project: {$pName}",
                    "amount" => $amt,
                    "type" => "Invoice ({$st})"
                ];
            }

            // 2. Future Project Income Details (Deadline in this week)
            $futIncStmt = $pdo->prepare("
                SELECT p.name as project_name, GREATEST(0, COALESCE(ad.budget, p.total_value, 0) - COALESCE(inv.tot_inv, 0)) as remaining_inc
                FROM active_development_projects ad
                JOIN projects p ON ad.project_id = p.id
                LEFT JOIN (
                    SELECT project_id, SUM(amount) as tot_inv
                    FROM project_invoices
                    GROUP BY project_id
                ) inv ON ad.project_id = inv.project_id
                WHERE p.is_archived = FALSE AND COALESCE(ad.is_completed, p.is_completed, 0) = 0
                  AND (
                      (COALESCE(p.hard_deadline, p.deadline, p.soft_deadline) >= ? AND COALESCE(p.hard_deadline, p.deadline, p.soft_deadline) <= ?)
                  )
            ");
            $futIncStmt->execute([$wStartStr, $wEndStr]);
            $futIncRows = $futIncStmt->fetchAll(PDO::FETCH_ASSOC);
            $futureProjectIncome = 0;
            foreach ($futIncRows as $fRow) {
                $amt = floatval($fRow['remaining_inc']);
                $futureProjectIncome += $amt;
                if ($amt > 0) {
                    $pName = $fRow['project_name'] ?: 'General Project';
                    $incomeItems[] = [
                        "title" => "Contract Balance (Project Deadline)",
                        "scope" => "project",
                        "category_label" => "Project: {$pName}",
                        "amount" => $amt,
                        "type" => "Project Future Contract Income"
                    ];
                }
            }

            $totalWeekIncome = $invoiceIncome + $futureProjectIncome;

            // 3. Expenses in this week:
            // A. Monthly Salary Payouts for Devs & PMs (Paid on the 14th day of each month)
            $salaryExpensesForWeek = 0;

            // Check if the 14th day of any month falls within this weekly window [$wStartStr, $wEndStr]
            $wStartObj = new DateTime($wStartStr);
            $wEndObj = new DateTime($wEndStr);
            $checkDay = clone $wStartObj;
            $payDayDate = null;
            while ($checkDay <= $wEndObj) {
                if ($checkDay->format('d') === '14') {
                    $payDayDate = clone $checkDay;
                    break;
                }
                $checkDay->modify('+1 day');
            }

// Pure PHP Easter Sunday calculation algorithm (dependency-free)
if (!function_exists('getEasterSundayDate')) {
    function getEasterSundayDate($year) {
        $a = $year % 19;
        $b = floor($year / 100);
        $c = $year % 100;
        $d = floor($b / 4);
        $e = $b % 4;
        $f = floor(($b + 8) / 25);
        $g = floor(($b - $f + 1) / 3);
        $h = (19 * $a + $b - $d - $g + 15) % 30;
        $i = floor($c / 4);
        $k = $c % 4;
        $l = (32 + 2 * $e + 2 * $i - $h - $k) % 7;
        $m = floor(($a + 11 * $h + 22 * $l) / 451);
        $month = floor(($h + $l - 7 * $m + 114) / 31);
        $day = (($h + $l - 7 * $m + 114) % 31) + 1;
        return sprintf('%04d-%02d-%02d', $year, $month, $day);
    }
}

// Helper function: Calculate Slovak working days in a specific year/month (subtracting weekends & SK national holidays)
if (!function_exists('getSlovakWorkingDaysInMonth')) {
    function getSlovakWorkingDaysInMonth($year, $month) {
        $year = intval($year);
        $month = intval($month);
        $daysInMonth = intval(date('t', strtotime(sprintf('%04d-%02d-01', $year, $month))));

        $easterSundayStr = getEasterSundayDate($year);
        $goodFridayStr = date('Y-m-d', strtotime('-2 days', strtotime($easterSundayStr)));
        $easterMondayStr = date('Y-m-d', strtotime('+1 day', strtotime($easterSundayStr)));

        $fixedHolidays = [
            '01-01', '01-06', '05-01', '05-08', '07-05',
            '08-29', '09-01', '09-15', '11-01', '11-17',
            '12-24', '12-25', '12-26'
        ];

        $workingDays = 0;
        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dateStr = sprintf('%04d-%02d-%02d', $year, $month, $d);
            $dayOfWeek = date('N', strtotime($dateStr)); // 1=Mon .. 7=Sun

            if ($dayOfWeek <= 5) {
                $md = sprintf('%02d-%02d', $month, $d);
                $isFixedHoliday = in_array($md, $fixedHolidays);
                $isMovableHoliday = ($dateStr === $goodFridayStr || $dateStr === $easterMondayStr);

                if (!$isFixedHoliday && !$isMovableHoliday) {
                    $workingDays++;
                }
            }
        }
        return max(1, $workingDays);
    }
}

            if ($payDayDate) {
                // The salary paid on Month X 14th is for the work of Month (X - 1)
                $workMonthStart = (clone $payDayDate)->modify('first day of previous month')->format('Y-m-01');
                $workMonthEnd = (clone $payDayDate)->modify('last day of previous month')->format('Y-m-t');
                $workMonthLabel = (clone $payDayDate)->modify('previous month')->format('F Y');

                $workYear = intval(date('Y', strtotime($workMonthStart)));
                $workMonthNum = intval(date('m', strtotime($workMonthStart)));
                $skWorkDays = getSlovakWorkingDaysInMonth($workYear, $workMonthNum);

                $salaryEntities = $pdo->query("
                    SELECT id, name, type, COALESCE(hourly_rate, 0) as hourly_rate, COALESCE(daily_salary, 0) as daily_salary,
                           COALESCE(is_fixed_salary, 0) as is_fixed_salary, COALESCE(monthly_salary, 0) as monthly_salary,
                           COALESCE(target_hours_per_day, 8.0) as target_hours_per_day
                    FROM settings_entities
                    WHERE type IN ('developer', 'pm', 'member')
                ")->fetchAll(PDO::FETCH_ASSOC);

                foreach ($salaryEntities as $ent) {
                    $entId = $ent['id'];
                    $entName = $ent['name'];
                    $isFixed = !empty($ent['is_fixed_salary']);
                    $monthlySal = floatval($ent['monthly_salary']);
                    $targetHours = floatval($ent['target_hours_per_day'] ?? 8.0);
                    if ($targetHours <= 0) $targetHours = 8.0;

                    if ($isFixed && $monthlySal > 0) {
                        $dailySal = round($monthlySal / $skWorkDays, 2);
                        $hourlyRate = round($dailySal / $targetHours, 2);
                    } else {
                        $dailySal = floatval($ent['daily_salary']);
                        $hourlyRate = floatval($ent['hourly_rate']);
                    }

                    // Count total logged hours and calculate days worked using target_hours_per_day
                    $daysStmt = $pdo->prepare("
                        SELECT COALESCE(SUM(pe.hours), 0) as total_hours
                        FROM time_logs tl
                        JOIN project_expenses pe ON tl.expense_id = pe.id
                        WHERE pe.entity_id = ? AND tl.log_date >= ? AND tl.log_date <= ?
                    ");
                    $daysStmt->execute([$entId, $workMonthStart, $workMonthEnd]);
                    $row = $daysStmt->fetch(PDO::FETCH_ASSOC);
                    $hoursWorked = floatval($row['total_hours'] ?? 0);
                    $daysWorked = $targetHours > 0 ? round($hoursWorked / $targetHours, 2) : 0;

                    $entSalary = 0;
                    $salaryNote = "";

                    if ($hoursWorked > 0 || $daysWorked > 0) {
                        if ($isFixed) {
                            if ($daysWorked >= $skWorkDays) {
                                $entSalary = $monthlySal;
                                $salaryNote = "Full Fixed Monthly Salary (€" . number_format($monthlySal, 2) . " / {$skWorkDays} SK workdays)";
                            } else {
                                $entSalary = round($daysWorked * $dailySal, 2);
                                $salaryNote = "{$daysWorked} days worked @ €" . number_format($dailySal, 2) . "/day (Fixed €" . number_format($monthlySal, 2) . " / {$skWorkDays} SK workdays)";
                            }
                        } else if ($dailySal > 0) {
                            $entSalary = round($daysWorked * $dailySal, 2);
                            $salaryNote = "{$daysWorked} days worked ({$hoursWorked}h) @ €" . number_format($dailySal, 2) . "/day";
                        } else {
                            $entSalary = round($hoursWorked * $hourlyRate, 2);
                            $salaryNote = "{$hoursWorked} hrs worked @ €" . number_format($hourlyRate, 2) . "/h";
                        }
                    } else if ($workMonthEnd >= $now->format('Y-m-d')) {
                        // Future month estimation using Slovak working days in that month
                        if ($isFixed && $monthlySal > 0) {
                            $entSalary = $monthlySal;
                            $salaryNote = "Fixed Monthly Salary (€" . number_format($monthlySal, 2) . " / {$skWorkDays} SK workdays)";
                        } else if ($dailySal > 0) {
                            $entSalary = round($skWorkDays * $dailySal, 2);
                            $salaryNote = "Projected {$skWorkDays} SK workdays @ €" . number_format($dailySal, 2) . "/day";
                        } else if ($hourlyRate > 0) {
                            $projHrs = $skWorkDays * $targetHours;
                            $entSalary = round($projHrs * $hourlyRate, 2);
                            $salaryNote = "Projected {$projHrs} hrs ({$skWorkDays} SK workdays) @ €" . number_format($hourlyRate, 2) . "/h";
                        }
                    }

                    if ($entSalary > 0) {
                        $salaryExpensesForWeek += $entSalary;
                        $expenseItems[] = [
                            "title" => "{$entName} - {$workMonthLabel} Salary ({$salaryNote})",
                            "scope" => "salary",
                            "category_label" => "Employee Salary Payout",
                            "amount" => $entSalary,
                            "type" => "Monthly Salary Payout (14th)"
                        ];
                    }
                }
            }

            // B. Manual Project Expenses in this week
            $manExpStmt = $pdo->prepare("
                SELECT p.name as project_name, pme.name as expense_title, pme.cost
                FROM project_manual_expenses pme
                LEFT JOIN projects p ON pme.project_id = p.id
                WHERE pme.expense_date >= ? AND pme.expense_date <= ?
            ");
            $manExpStmt->execute([$wStartStr, $wEndStr]);
            $manRows = $manExpStmt->fetchAll(PDO::FETCH_ASSOC);
            $manualProjectExpenses = 0;
            foreach ($manRows as $manRow) {
                $cost = floatval($manRow['cost']);
                $manualProjectExpenses += $cost;
                $pTitle = $manRow['project_name'] ?: 'General Project';
                $desc = $manRow['expense_title'] ?: 'Manual Cost';
                $expenseItems[] = [
                    "title" => $desc,
                    "scope" => "project",
                    "category_label" => "Project: {$pTitle}",
                    "amount" => $cost,
                    "type" => "Project Expense: {$pTitle}"
                ];
            }

            // C. Company Overhead Expenses (One-time and Recurring evaluation)
            $companyExpensesForWeek = 0;
            foreach ($companyExpensesList as $cExp) {
                $eType = $cExp['expense_type'] ?? 'one_time';
                $eAmount = floatval($cExp['amount'] ?? 0);
                $eDateStr = !empty($cExp['expense_date']) ? $cExp['expense_date'] : date('Y-m-d');

                $isMatch = false;
                if ($eType === 'one_time') {
                    if ($eDateStr >= $wStartStr && $eDateStr <= $wEndStr) {
                        $isMatch = true;
                    }
                } else {
                    // Recurring Evaluation
                    $interval = max(1, intval($cExp['recurrence_interval'] ?? 1));
                    $unit = $cExp['recurrence_unit'] ?? 'month';
                    $endsType = $cExp['recurrence_ends_type'] ?? 'never';
                    $endsDate = !empty($cExp['recurrence_ends_date']) ? $cExp['recurrence_ends_date'] : null;
                    $maxOccurrences = !empty($cExp['recurrence_ends_occurrences']) ? intval($cExp['recurrence_ends_occurrences']) : null;

                    $cDate = new DateTime($eDateStr);
                    $rStart = new DateTime($wStartStr);
                    $rEnd = new DateTime($wEndStr);

                    $occCount = 0;
                    $iter = 0;
                    while ($cDate <= $rEnd && $iter < 300) {
                        $iter++;
                        if ($endsType === 'on_date' && $endsDate && $cDate->format('Y-m-d') > $endsDate) break;
                        if ($endsType === 'after_occurrences' && $maxOccurrences && $occCount >= $maxOccurrences) break;

                        $occCount++;
                        if ($cDate >= $rStart && $cDate <= $rEnd) {
                            $isMatch = true;
                            break;
                        }

                        if ($unit === 'day') $cDate->modify("+$interval day");
                        elseif ($unit === 'week') $cDate->modify("+$interval week");
                        elseif ($unit === 'month') $cDate->modify("+$interval month");
                        elseif ($unit === 'year') $cDate->modify("+$interval year");
                        else $cDate->modify("+$interval month");
                    }
                }

                if ($isMatch) {
                    $companyExpensesForWeek += $eAmount;
                    $cat = $cExp['category'] ? " ({$cExp['category']})" : "";
                    $expTypeLabel = $eType === 'recurring' ? 'Company Recurring Expense' : 'Company One-Time Expense';
                    $expenseItems[] = [
                        "title" => "{$cExp['title']}{$cat}",
                        "scope" => "company",
                        "category_label" => "Company Expense{$cat}",
                        "amount" => $eAmount,
                        "type" => $expTypeLabel
                    ];
                }
            }

            $totalWeeklyExpenses = $salaryExpensesForWeek + $manualProjectExpenses + $companyExpensesForWeek;
            $weeklyNet = $totalWeekIncome - $totalWeeklyExpenses;
            $runningBankBalance += $weeklyNet;

            $cashflowProjection[] = [
                "period" => $wLabel,
                "start_date" => $wStartStr,
                "end_date" => $wEndStr,
                "invoice_income" => $invoiceIncome,
                "future_project_income" => $futureProjectIncome,
                "expected_income" => $totalWeekIncome,
                "projected_expenses" => $totalWeeklyExpenses,
                "salary_expenses" => $salaryExpensesForWeek,
                "manual_project_expenses" => $manualProjectExpenses,
                "company_expenses" => $companyExpensesForWeek,
                "income_items" => $incomeItems,
                "expense_items" => $expenseItems,
                "weekly_net" => $weeklyNet,
                "net_cashflow" => $runningBankBalance
            ];

            $currWeekStart->modify('+7 days');
        }

        // Distribute unassigned remaining unbilled active project income across future weeks if no specific week deadline is set
        $unassignedUnbilledStmt = $pdo->query("
            SELECT COALESCE(SUM(GREATEST(0, COALESCE(ad.budget, p.total_value, 0) - COALESCE(inv.tot_inv, 0))), 0)
            FROM active_development_projects ad
            JOIN projects p ON ad.project_id = p.id
            LEFT JOIN (
                SELECT project_id, SUM(amount) as tot_inv
                FROM project_invoices
                GROUP BY project_id
            ) inv ON ad.project_id = inv.project_id
            WHERE p.is_archived = FALSE AND COALESCE(ad.is_completed, p.is_completed, 0) = 0
              AND COALESCE(p.hard_deadline, p.deadline, p.soft_deadline) IS NULL
        ");
        $totalUnassignedUnbilledBalance = floatval($unassignedUnbilledStmt->fetchColumn());

        $todayStr = $now->format('Y-m-d');
        $futureWeeksCount = 0;
        foreach ($cashflowProjection as $c) {
            if ($c['end_date'] >= $todayStr) $futureWeeksCount++;
        }

        if ($futureWeeksCount > 0 && $totalUnassignedUnbilledBalance > 0) {
            $weeklyIncPortion = round($totalUnassignedUnbilledBalance / $futureWeeksCount, 2);

            for ($i = 0; $i < count($cashflowProjection); $i++) {
                if ($cashflowProjection[$i]['end_date'] >= $todayStr) {
                    $cashflowProjection[$i]['future_project_income'] += $weeklyIncPortion;
                    $cashflowProjection[$i]['expected_income'] += $weeklyIncPortion;
                    $cashflowProjection[$i]['income_items'][] = [
                        "title" => "Unassigned Contract Balance Portion",
                        "scope" => "project",
                        "category_label" => "Active Projects Unassigned Balance",
                        "amount" => $weeklyIncPortion,
                        "type" => "Unassigned Project Contract Projection"
                    ];
                }
            }
        }

        // Recalculate net cashflow cumulative trendline
        $cum = $initialBankBalance;
        for ($i = 0; $i < count($cashflowProjection); $i++) {
            $cashflowProjection[$i]['weekly_net'] = $cashflowProjection[$i]['expected_income'] - $cashflowProjection[$i]['projected_expenses'];
            $cum += $cashflowProjection[$i]['weekly_net'];
            $cashflowProjection[$i]['net_cashflow'] = $cum;
        }

        // Upcoming Deadlines
        $deadlinesStmt = $pdo->query("
            SELECT 
                p.id, 
                p.name as project_title, 
                p.deadline, 
                pm.name as pm_name, 
                dev.name as dev_name
            FROM projects p
            LEFT JOIN settings_entities pm ON p.pm_id = pm.id
            LEFT JOIN settings_entities dev ON p.dev_id = dev.id
            WHERE p.is_archived = FALSE 
              AND p.deadline IS NOT NULL 
              AND p.status NOT IN ('Price Offer Rejected', 'Closed', 'Price Offer Sent', 'New Lead', 'Finished', 'Price Offer Closed', 'Completed', 'Done')
              AND NOT (p.design_status = 'Finished' AND p.dev_status = 'Finished')
            ORDER BY p.deadline ASC
            LIMIT 50
        ");
        $deadlines = $deadlinesStmt->fetchAll();

        echo json_encode([
            "status" => "success", 
            "data" => [
                "funnel" => $funnel,
                "income" => $income,
                "workload_dev" => $workload,
                "workload_design" => $designWorkload,
                "workload_pm" => $pmWorkload,
                "settings" => $settings,
                "deadlines" => $deadlines,
                "executive" => [
                    "total_invoicable_amount" => $totalInvoicable,
                    "total_active_projects_value" => $totalActiveValue,
                    "total_sent_offers_value" => $totalSentOffersValue,
                    "active_projects_burned" => $activeProjectsBurned,
                    "developer_time_stats" => $developerTimeStats,
                    "cashflow_projection" => $cashflowProjection
                ]
            ]
        ]);
    }
} catch (\PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
