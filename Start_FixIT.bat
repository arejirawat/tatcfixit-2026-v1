@echo off
chcp 65001 >nul
title Fix IT Center 2026 - Startup
color 0A

echo =======================================================
echo     ระบบลงทะเบียน Fix IT Center - Local Kiosk
echo =======================================================
echo.

:: 1. Check Node.js
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: ไม่พบโปรแกรม Node.js ในเครื่องนี้
    echo กรุณาดาวน์โหลดและติดตั้ง Node.js จาก https://nodejs.org/ ก่อนครับ
    pause
    exit /b
)

:: 2. Check Python
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: ไม่พบโปรแกรม Python ในเครื่องนี้
    echo กรุณาดาวน์โหลดและติดตั้ง Python จาก https://www.python.org/
    echo แนะนำ: ตอนติดตั้ง อย่าลืมติ๊กถูกที่ Add Python to PATH ด้วยนะครับ
    pause
    exit /b
)

:: 3. Install Python Dependencies
echo INFO: กำลังตรวจสอบส่วนเสริมของเครื่องอ่านบัตรประชาชน...
pip install pyscard >nul 2>&1

:: 4. Install Node.js Dependencies
IF NOT EXIST "node_modules\" (
    echo INFO: ติดตั้งครั้งแรก กำลังดาวน์โหลดไฟล์ระบบ โปรดรอ 2-3 นาที...
    call npm install
    call npx prisma generate
    call npx prisma db push
)

:: 5. Start Python Agent
echo INFO: กำลังเปิดระบบเชื่อมต่อเครื่องอ่านบัตรประชาชน พอร์ต 8081...
start "Smartcard Agent" cmd /c "python agent.py"

:: 6. Start Web Server
echo INFO: กำลังเปิดระบบเว็บ พอร์ต 3000...
echo INFO: หากมีหน้าต่างแจ้งเตือน Windows Defender Firewall ให้กด Allow Access นะครับ
start "Fix IT Web Server" cmd /c "npm run dev"

:: 7. Wait and open browser
echo INFO: กำลังเตรียมหน้าเว็บ... 
timeout /t 5 >nul
start http://localhost:3000/dashboard

echo.
echo =======================================================
echo  เปิดระบบสำเร็จ! หน้าต่างนี้สามารถย่อพับเก็บไว้ได้ 
echo  ห้ามกดปิดกากบาท มิฉะนั้นระบบจะหยุดทำงาน
echo =======================================================
pause >nul
