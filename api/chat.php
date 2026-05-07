<?php
require_once 'db.php';
header('Content-Type: application/json');

// Get the POST payload
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!isset($input['message'])) {
    echo json_encode(['status' => 'error', 'message' => 'No message provided.']);
    exit;
}

// Fetch OpenAI API Key and System Prompt
$is_mysql = (defined('DB_TYPE') && (DB_TYPE === 'mysql' || DB_TYPE === 'mariadb'));
$quote = $is_mysql ? '`' : '';
$stmt = $pdo->prepare("SELECT {$quote}key{$quote}, {$quote}value{$quote} FROM {$quote}system_settings{$quote} WHERE {$quote}key{$quote} IN ('openai_api_key', 'openai_system_prompt')");
$stmt->execute();
$settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

$openaiKey = $settings['openai_api_key'] ?? null;
$customPrompt = $settings['openai_system_prompt'] ?? '';

if (!$openaiKey) {
    echo json_encode(['status' => 'error', 'message' => 'OpenAI API key is not configured in System Settings.']);
    exit;
}

$userMessage = $input['message'];
$history = $input['history'] ?? [];

// Fetch project data to feed to the LLM (Simple implementation of Phase 1)
$archivedCondition = $is_mysql ? "p.is_archived = 0" : "p.is_archived = FALSE";
$projectsStmt = $pdo->query("
    SELECT p.name, p.status, p.total_value, p.already_paid, p.deadline,
           d.name as dev_name, ds.name as designer_name, pm.name as pm_name
    FROM projects p
    LEFT JOIN settings_entities d ON p.dev_id = d.id
    LEFT JOIN settings_entities ds ON p.designer_id = ds.id
    LEFT JOIN settings_entities pm ON p.pm_id = pm.id
    WHERE $archivedCondition
");
$projects = $projectsStmt->fetchAll(PDO::FETCH_ASSOC);

$systemPrompt = ($customPrompt ? $customPrompt . "\n\n" : "You are RolAI, a highly intelligent and professional AI assistant for a digital agency's project management system.\nYou answer questions accurately based ONLY on the provided data. Do not make up numbers.\nIf asked to sum up budgets or remaining values, do the exact math based on this data.\nIMPORTANT: Ignore projects whose status is 'Closed', 'Completed', 'Rejected', or 'Done' when answering questions about 'active', 'upcoming', or 'future' projects or deadlines, unless the user explicitly asks for closed projects.\n\n") . 
"CURRENT ACTIVE PROJECTS DATA (JSON Format):
" . json_encode($projects) . "

When returning financials, format them nicely with the € symbol.";

// Build messages array
$messagesPayload = [
    ['role' => 'system', 'content' => $systemPrompt]
];

foreach ($history as $msg) {
    if (isset($msg['role']) && isset($msg['content']) && in_array($msg['role'], ['user', 'assistant'])) {
        $messagesPayload[] = ['role' => $msg['role'], 'content' => $msg['content']];
    }
}

$messagesPayload[] = ['role' => 'user', 'content' => $userMessage];

// Call OpenAI API
$ch = curl_init('https://api.openai.com/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'model' => 'gpt-4o',
    'messages' => $messagesPayload,
    'temperature' => 0.2
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $openaiKey
]);

$responseRaw = curl_exec($ch);
curl_close($ch);

$openAiData = json_decode($responseRaw, true);

if (isset($openAiData['choices'][0]['message']['content'])) {
    echo json_encode([
        'status' => 'success',
        'reply' => $openAiData['choices'][0]['message']['content']
    ]);
} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to get response from OpenAI.',
        'debug' => $openAiData
    ]);
}
