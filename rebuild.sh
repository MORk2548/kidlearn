#!/bin/bash
echo "=== KidLearn Rebuild ==="
docker compose down
docker compose build --no-cache web
docker compose up -d
echo "รอ 30 วินาที..."
sleep 30
echo "เสร็จ! เปิด http://localhost:8080"
echo "Admin: admin / admin01"
