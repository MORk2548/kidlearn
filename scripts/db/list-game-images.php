<?php
// List objects under game/ in the kidlearn-images bucket, straight from Storage (not the public CDN).
// Run inside the web container: php scripts/db/list-game-images.php [user_id]
foreach (file(__DIR__ . '/../../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (str_contains($line, '=') && $line[0] !== '#') putenv(trim($line));
}
$base = rtrim(getenv('SUPABASE_URL'), '/');
$key  = getenv('SUPABASE_SERVICE_ROLE_KEY');
$ch = curl_init("{$base}/storage/v1/object/list/kidlearn-images");
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode(['prefix' => 'game/' . ($argv[1] ?? ''), 'limit' => 100]),
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ["apikey: {$key}", "Authorization: Bearer {$key}", 'Content-Type: application/json'],
]);
echo curl_exec($ch), "\n";
