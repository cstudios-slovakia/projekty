<?php
require 'db.php';

$csv_data = <<<EOF
Project name,Price offer sent,Price offer accepted,Accepted,Design,Development,All invoiced,Note,Type,Price,Creation date
pekabau,TRUE,TRUE,,,,FALSE,,,,4808,
naptar web,TRUE,TRUE,2026-03-30,,,FALSE,"ez itt volt, kitörlödött?",,1461,
LAURINCOVA photography,TRUE,TRUE,,Finished,In progress,FALSE,,,,0,
Realtherm magazin,TRUE,TRUE,,,,FALSE,aprilis 25,"web, design",1100,2026-03-24
ADCAR,TRUE,TRUE,,,,FALSE,DEADLINE majus 31,,6300,2026-03-30
Proimpex,TRUE,TRUE,,,,FALSE,DEADLINE majus 15,"web, design",4000,2026-03-26
castel mierovo webshop,TRUE,FALSE,,,,FALSE,,,,1730,
DAC Eshop,FALSE,FALSE,,,,FALSE,,,,1,
vásár web,TRUE,FALSE,,,,FALSE,,,,3822,
count update,TRUE,TRUE,,,,FALSE,,,,1100,
firol,TRUE,FALSE,,,,FALSE,,,,5005,
sunflower,TRUE,TRUE,,,,FALSE,,"web, design, eshop",6970,2026-03-09
Moov cars,TRUE,TRUE,,,,FALSE,,"web, design",1819,2026-02-18
JOer,TRUE,TRUE,,In progress,,FALSE,,"web, design",7890,2026-02-18
story bar,TRUE,TRUE,,Finished,Finished,FALSE,,,,3500,
dunaszerdahelyi.sk,TRUE,FALSE,,,,FALSE,"ez craft licencek utan van, negy honapon keresztul havi ...",,7342,
Dukátablak,TRUE,TRUE,2026-01-29,,,FALSE,,"web, design, eshop",6800,2026-01-22
hisec update,TRUE,TRUE,,Finished,In progress,FALSE,,,,1000,
Vilagi Winery,TRUE,TRUE,,In progress,In progress,FALSE,az ar meg valtozik!,eshop,1,2025-11-27
OIF,TRUE,TRUE,,In progress,In progress,FALSE,szerzodesre varunk,web,1,2025-11-27
Villatesta new,TRUE,TRUE,,In progress,In progress,FALSE,"folyamatban, februar vege a deadline , feltoltes nincs!",web,7000,2025-11-27
EOF;

try {
    // 1. Ensure project types exist in settings_entities
    $types = ['web', 'design', 'eshop', 'web, design', 'web, design, eshop'];
    $type_map = [];
    
    foreach ($types as $t) {
        $check = $pdo->prepare("SELECT id FROM settings_entities WHERE type='project_type' AND name = ?");
        $check->execute([$t]);
        $row = $check->fetch();
        if ($row) {
            $type_map[$t] = $row['id'];
        } else {
            $ins = $pdo->prepare("INSERT INTO settings_entities (type, name, color) VALUES ('project_type', ?, ?)");
            $ins->execute([$t, '#' . substr(md5($t), 0, 6)]);
            $type_map[$t] = $pdo->lastInsertId();
        }
    }

    $lines = explode("\n", trim($csv_data));
    $header = str_getcsv(array_shift($lines));

    foreach ($lines as $line) {
        $data = str_getcsv($line);
        if (count($data) < 2) continue;

        // Basic mapping
        $name = trim($data[0] ?? 'Unnamed');
        $sent = (strtoupper(trim($data[1] ?? '')) === 'TRUE');
        $accepted_offer = (strtoupper(trim($data[2] ?? '')) === 'TRUE');
        $accepted_date = !empty(trim($data[3] ?? '')) ? trim($data[3]) : null;
        $design_status = !empty(trim($data[4] ?? '')) ? trim($data[4]) : 'Not Started';
        $dev_status = !empty(trim($data[5] ?? '')) ? trim($data[5]) : 'Not Started';
        $invoiced = (strtoupper(trim($data[6] ?? '')) === 'TRUE');
        $note = trim($data[7] ?? '');
        $type_str = trim($data[8] ?? '');
        
        // Robust Price and Creation Date logic
        $price = 0;
        $creation_date = date('Y-m-d H:i:s');
        
        // Check field 9, 10, 11 for numeric vs date
        for ($i = 9; $i < count($data); $i++) {
            $val = trim($data[$i] ?? '');
            if (empty($val)) continue;
            if (preg_match('/^\d{4}-\d{2}-\d{2}/', $val)) {
                $creation_date = $val;
            } elseif (is_numeric($val)) {
                $price = floatval($val);
            }
        }

        // Derived status
        $status = 'New Lead';
        if ($accepted_offer) {
            $status = 'Price Offer Accepted';
        } elseif ($sent) {
            $status = 'Price Offer Sent';
        }

        $already_paid = $invoiced ? $price : 0;
        $type_id = isset($type_map[$type_str]) ? $type_map[$type_str] : null;

        // Insert project
        $sql = "INSERT INTO projects (name, status, accepted_date, design_status, dev_status, notes, project_type_id, total_value, already_paid, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $name,
            $status,
            $accepted_date,
            $design_status,
            $dev_status,
            $note,
            $type_id,
            $price,
            $already_paid,
            $creation_date
        ]);
    }

    echo json_encode(["status" => "success", "message" => "Data imported successfully"]);

} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
