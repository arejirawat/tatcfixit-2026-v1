@echo off
title Fix IT Center 2026 - Startup
color 0A

echo =======================================================
echo     Fix IT Center Registration (Local Kiosk)
echo =======================================================
echo.

:: 1. Check Node.js
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed on this machine.
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b
)

:: 2. Check Python
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed on this machine.
    echo Please download and install Python from https://www.python.org/
    echo IMPORTANT: Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b
)

:: 3. Install Python Dependencies
echo INFO: Checking Smartcard Reader dependencies...
call python -m pip install pyscard >nul 2>&1

:: 4. Install Node.js Dependencies
IF NOT EXIST "node_modules\" (
    echo INFO: First time setup. Downloading system files. Please wait 2-3 minutes...
    call npm install
    call npx prisma generate
    call npx prisma db push
)

:: 5. Start Python Agent
echo INFO: Starting Smartcard Reader service (Port 8081)...
start "Smartcard Agent" cmd /k "python agent.py"

:: 6. Start Web Server
echo INFO: Starting Web Server (Port 3000)...
echo INFO: If Windows Defender Firewall prompts, please click Allow Access.
start "FixIT Web Server" cmd /k "npm run dev"

:: 7. Wait and open browser
echo INFO: Preparing the web application... 
timeout /t 5 >nul
start http://localhost:3000/dashboard

echo.
echo =======================================================
echo  System started successfully! 
echo  You can minimize these windows, but DO NOT CLOSE them.
echo =======================================================
pause >nul
