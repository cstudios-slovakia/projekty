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
    $uploadDir = __DIR__ . '/uploads/invoices/';
    if (!file_exists($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    if ($method === 'GET') {
        $projectId = $_GET['project_id'] ?? null;
        $id = $_GET['id'] ?? null;

        if ($id) {
            $stmt = $pdo->prepare("SELECT * FROM project_invoices WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(["status" => "success", "data" => $stmt->fetch(PDO::FETCH_ASSOC)]);
        } elseif ($projectId) {
            $stmt = $pdo->prepare("SELECT * FROM project_invoices WHERE project_id = ? ORDER BY created_at DESC");
            $stmt->execute([$projectId]);
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } else {
            $stmt = $pdo->query("SELECT * FROM project_invoices ORDER BY created_at DESC");
            echo json_encode(["status" => "success", "data" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        }

    } elseif ($method === 'POST') {
        $id = $_POST['id'] ?? $_GET['id'] ?? $_POST['invoice_id'] ?? null;

        // If updating an existing invoice (or uploading PDF for an existing invoice)
        if ($id) {
            $pdfPath = null;
            if (isset($_FILES['pdf_file']) && $_FILES['pdf_file']['error'] === UPLOAD_ERR_OK) {
                $fileTmp = $_FILES['pdf_file']['tmp_name'];
                $fileName = time() . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '_', basename($_FILES['pdf_file']['name']));
                $targetPath = $uploadDir . $fileName;
                if (move_uploaded_file($fileTmp, $targetPath)) {
                    $pdfPath = 'uploads/invoices/' . $fileName;
                }
            }

            $fields = [];
            $values = [];

            if ($pdfPath) {
                $fields[] = "pdf_path = ?";
                $values[] = $pdfPath;
            }

            $allowed = ['invoice_number', 'amount', 'status', 'issued_date', 'paid_date', 'notes'];
            foreach ($allowed as $f) {
                if (array_key_exists($f, $_POST)) {
                    $fields[] = "$f = ?";
                    if (in_array($f, ['issued_date', 'paid_date']) && empty($_POST[$f])) {
                        $values[] = null;
                    } else {
                        $values[] = $_POST[$f] === '' ? null : $_POST[$f];
                    }
                }
            }

            if (!empty($fields)) {
                $values[] = $id;
                $sql = "UPDATE project_invoices SET " . implode(", ", $fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($values);
            }

            echo json_encode(["status" => "success", "pdf_path" => $pdfPath]);
            exit;
        }

        // Creating a new invoice
        $projectId = $_POST['project_id'] ?? null;
        $invoiceNumber = $_POST['invoice_number'] ?? null;
        $amount = $_POST['amount'] ?? 0;
        $status = $_POST['status'] ?? 'not_issued';
        $issuedDate = $_POST['issued_date'] ?? null;
        $paidDate = $_POST['paid_date'] ?? null;
        $notes = $_POST['notes'] ?? null;

        // If JSON payload
        if (!$projectId && empty($_FILES)) {
            $input = json_decode(file_get_contents('php://input'), true);
            if ($input) {
                $projectId = $input['project_id'] ?? null;
                $invoiceNumber = $input['invoice_number'] ?? null;
                $amount = $input['amount'] ?? 0;
                $status = $input['status'] ?? 'not_issued';
                $issuedDate = $input['issued_date'] ?? null;
                $paidDate = $input['paid_date'] ?? null;
                $notes = $input['notes'] ?? null;
            }
        }

        if (!$projectId) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing project_id"]);
            exit;
        }

        $pdfPath = null;
        if (isset($_FILES['pdf_file']) && $_FILES['pdf_file']['error'] === UPLOAD_ERR_OK) {
            $fileTmp = $_FILES['pdf_file']['tmp_name'];
            $fileName = time() . '_' . preg_replace('/[^a-zA-Z0-9_\.-]/', '_', basename($_FILES['pdf_file']['name']));
            $targetPath = $uploadDir . $fileName;
            if (move_uploaded_file($fileTmp, $targetPath)) {
                $pdfPath = 'uploads/invoices/' . $fileName;
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO project_invoices (project_id, invoice_number, amount, pdf_path, status, issued_date, paid_date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $projectId,
            $invoiceNumber,
            $amount,
            $pdfPath,
            $status,
            !empty($issuedDate) ? $issuedDate : null,
            !empty($paidDate) ? $paidDate : null,
            $notes
        ]);

        $newId = IS_MYSQL ? $pdo->lastInsertId() : $pdo->lastInsertId('project_invoices_id_seq');
        echo json_encode(["status" => "success", "id" => $newId, "pdf_path" => $pdfPath]);

    } elseif ($method === 'PUT') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $fields = [];
        $values = [];
        $allowed = ['invoice_number', 'amount', 'status', 'issued_date', 'paid_date', 'notes'];

        foreach ($allowed as $f) {
            if (array_key_exists($f, $input)) {
                $fields[] = "$f = ?";
                if (in_array($f, ['issued_date', 'paid_date']) && empty($input[$f])) {
                    $values[] = null;
                } else {
                    $values[] = $input[$f] === '' ? null : $input[$f];
                }
            }
        }

        if (!empty($fields)) {
            $values[] = $id;
            $sql = "UPDATE project_invoices SET " . implode(", ", $fields) . ", updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($values);
        }

        echo json_encode(["status" => "success"]);

    } elseif ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(["status" => "error", "message" => "Missing ID"]);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM project_invoices WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(["status" => "success"]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>
