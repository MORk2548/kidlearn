@echo off
chcp 65001 > nul
echo ===================================================
echo  KidLearn — Deploy Fix (ไม่ต้อง rebuild)
echo ===================================================
echo.

REM ── ตรวจสอบว่า Docker รันอยู่หรือไม่ ──
docker ps | findstr "kidlearn_web" > nul 2>&1
if errorlevel 1 (
    echo [!] Container kidlearn_web ไม่ได้รันอยู่
    echo     กำลังเปิด Docker...
    docker compose up -d
    echo     รอ 30 วินาที...
    timeout /t 30 /nobreak > nul
) else (
    echo [✓] Container kidlearn_web รันอยู่แล้ว
)

echo.
echo [1] Copy ไฟล์ที่แก้ไขเข้า container...
docker cp api/init_db.php kidlearn_web:/var/www/html/api/init_db.php
if errorlevel 1 (
    echo     [!] ERROR: copy init_db.php ไม่สำเร็จ
    goto :error
) else (
    echo     [✓] init_db.php — OK
)

echo.
echo [2] รัน init_db.php เพื่อ setup ข้อมูล...
curl -s http://localhost:8080/api/init_db.php > init_result.json 2>&1
if errorlevel 1 (
    echo     [!] curl ไม่สำเร็จ — ลองเปิด browser แทน
    start http://localhost:8080/api/init_db.php
) else (
    echo     [✓] init_db.php รันสำเร็จ
    echo     ผลลัพธ์:
    type init_result.json
    del init_result.json
)

echo.
echo ===================================================
echo  เสร็จแล้ว!
echo  - เปิดแอป:     http://localhost:8080
echo  - init DB:     http://localhost:8080/api/init_db.php
echo  - phpMyAdmin:  http://localhost:8081
echo  - Login admin: admin / admin01
echo ===================================================
echo.
pause
goto :end

:error
echo.
echo [!] เกิดข้อผิดพลาด — ลอง rebuild แทน:
echo     rebuild.bat
pause

:end
