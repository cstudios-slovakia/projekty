<?php
require_once 'config.php';
header('Content-Type: application/json');

// Get the POST payload
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!isset($input['message'])) {
    echo json_encode(['status' => 'error', 'message' => 'No message provided.']);
    exit;
}

$userMessage = $input['message'];

// TODO: Integrate OpenAI API and Vector Database
// For now, return a mock response

$response = [
    'status' => 'success',
    'reply' => 'This is a mock response from the Chat API. The AI engine is currently being configured.',
];

echo json_encode($response);
