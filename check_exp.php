<?php
require 'api/db.php';
$stmt = $pdo->prepare("SELECT * FROM project_expenses WHERE id = 27");
$stmt->execute();
print_r($stmt->fetch(PDO::FETCH_ASSOC));
