<?php
// ใช้: docker compose exec -T web php scripts/db/apply-sql.php api/<patch>.sql
$e = fn($k) => getenv($k);
$pdo = new PDO(sprintf('pgsql:host=%s;port=%s;dbname=%s;sslmode=require', $e('DB_HOST'), $e('DB_PORT') ?: 5432, $e('DB_NAME') ?: 'postgres'),
    $e('DB_USER'), $e('DB_PASS'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec(file_get_contents($argv[1]));
echo "applied {$argv[1]}\n";
