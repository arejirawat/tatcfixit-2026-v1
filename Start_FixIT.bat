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
set PYTHON_CMD=
python --version >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python
) ELSE (
    py --version >nul 2>&1
    IF %ERRORLEVEL% EQU 0 (
        set PYTHON_CMD=py
    )
)

IF "%PYTHON_CMD%"=="" (
    echo INFO: Python is not found or not in PATH.
    echo INFO: Attempting to install Python automatically in the background...
    winget install --id Python.Python.3.11 -e --silent --accept-package-agreements --accept-source-agreements
    
    echo ===================================================================
    echo  SUCCESS: Python has been installed automatically!
    echo  IMPORTANT: You MUST CLOSE THIS WINDOW and open Start_FixIT.bat again
    echo  for the new settings to take effect.
    echo ===================================================================
    pause
    exit /b
)

:: 3. Install Python Dependencies
echo INFO: Checking Smartcard Reader dependencies...
call %PYTHON_CMD% -m pip install pyscard flask flask-cors >nul 2>&1

:: 4. Install Node.js Dependencies
IF NOT EXIST "node_modules\" (
    echo INFO: First time setup. Downloading system files. Please wait 2-3 minutes...
    call npm install
    call npx prisma generate
)

echo INFO: Synchronizing database schema...
call npx prisma db push --accept-data-loss

:: 5. Start Python Agent
echo INFO: Starting Smartcard Reader service (Port 8081)...
start "Smartcard Agent" cmd /k "%PYTHON_CMD% agent.py"

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
