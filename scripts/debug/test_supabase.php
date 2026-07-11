<?php
$dsn = sprintf(
    'pgsql:host=%s;port=%s;dbname=%s;sslmode=require',
    getenv('DB_HOST'),
    getenv('DB_PORT'),
    getenv('DB_NAME')
);

try {
    $pdo = new PDO($dsn, getenv('DB_USER'), getenv('DB_PASS'));
    $row = $pdo->query('SELECT current_database() AS db, current_user AS usr')->fetch(PDO::FETCH_ASSOC);
    echo json_encode(['ok' => true, 'row' => $row], JSON_UNESCAPED_UNICODE), PHP_EOL;
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}
