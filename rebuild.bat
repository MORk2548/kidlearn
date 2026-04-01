@echo off
echo ===================================
echo  KidLearn — Rebuild Docker
echo ===================================
echo.
echo [1] หยุด containers เดิม...
docker compose down
echo.
echo [2] Build image ใหม่ (clear cache)...
docker compose build --no-cache web
echo.
echo [3] รัน containers ใหม่...
docker compose up -d
echo.
echo [4] รอ DB พร้อม (30 วินาที)...
timeout /t 30
echo.
echo ===================================
echo  เสร็จแล้ว! เปิด http://localhost:8080
echo  Admin: admin / admin01
echo ===================================
pause
