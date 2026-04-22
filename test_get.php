<?php
require 'api/db.php';
$stmt = $pdo->prepare("SELECT * FROM project_activities");
$stmt->execute();
print_r($stmt->fetchAll());
