<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set appropriate headers
header('Content-Type: application/dash+xml');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get the path parameter
$get = isset($_GET['get']) ? $_GET['get'] : '';

// Validate input
if (empty($get)) {
    http_response_code(400);
    echo 'Error: Missing path parameter';
    exit();
}

// Construct the MPD URL
$mpdUrl = 'https://a5f60e5467fc4389b2c543a65012d87e.mediatailor.us-east-1.amazonaws.com/v1/manifest/85b2e189604a6043ef957e7a3e6ed3bf9b11c843/' . urlencode($get);

// Set up HTTP context with proper headers
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => [
            'User-Agent: Mozilla/5.0 (Linux; Android 15; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.7103.61 Mobile Safari/537.36',
            'Accept: application/dash+xml,application/xml,text/xml,*/*',
            'Accept-Language: en-US,en;q=0.9',
            'Accept-Encoding: gzip, deflate, br',
            'Connection: keep-alive'
        ],
        'follow_location' => true,
        'max_redirects' => 5,
        'timeout' => 30,
        'ignore_errors' => false
    ]
]);

// Fetch the content
$res = @file_get_contents($mpdUrl, false, $context);

// Check for errors
if ($res === false) {
    $error = error_get_last();
    http_response_code(500);
    echo 'Error fetching content: ' . ($error['message'] ?? 'Unknown error');
    exit();
}

// Check HTTP response code
if (isset($http_response_header)) {
    $status_line = $http_response_header[0];
    preg_match('/HTTP\/\d\.\d\s+(\d+)/', $status_line, $matches);
    $status_code = isset($matches[1]) ? (int)$matches[1] : 200;
    
    if ($status_code !== 200) {
        http_response_code($status_code);
        echo 'HTTP Error: ' . $status_code;
        exit();
    }
}

// Output the content
echo $res;
?>
