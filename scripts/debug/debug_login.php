<?php
$dsn = sprintf(
    'pgsql:host=%s;port=%s;dbname=%s;sslmode=require',
    getenv('DB_HOST'),
    getenv('DB_PORT'),
    getenv('DB_NAME')
);

$pdo = new PDO($dsn, getenv('DB_USER'), getenv('DB_PASS'), [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
]);

$stmt = $pdo->prepare(
    "SELECT u.*, s.student_id, s.grade, s.parent_phone,
            p.parent_id, p.phone,
            t.teacher_id, t.department,
            o.officer_id, o.permissions as officer_permissions,
            e.executive_id, e.title as executive_title, e.permissions as executive_permissions
     FROM users u
     LEFT JOIN students s ON s.user_id = u.user_id
     LEFT JOIN parents  p ON p.user_id = u.user_id
     LEFT JOIN teachers t ON t.user_id = u.user_id
     LEFT JOIN officers o ON o.user_id = u.user_id
     LEFT JOIN executives e ON e.user_id = u.user_id
     WHERE (u.username=? OR u.email=?) AND u.is_active=TRUE"
);
$stmt->execute(['admin', 'admin']);
$user = $stmt->fetch();

echo json_encode([
    'found' => (bool)$user,
    'username' => $user['username'] ?? null,
    'password_ok' => $user ? password_verify('password', $user['password']) : false,
], JSON_UNESCAPED_UNICODE), PHP_EOL;
