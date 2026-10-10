@echo off
title Update Fix IT Center 2026
color 0B

echo =======================================================
echo     Fix IT Center - Auto Update System
echo =======================================================
echo.

echo [1/3] Downloading latest updates from GitHub...
git pull origin main
echo.

echo [2/3] Checking and installing new components...
call npm install
call npx prisma generate
echo.

echo [3/3] Synchronizing database structure...
call npx prisma db push --accept-data-loss
echo.

echo =======================================================
echo  UPDATE COMPLETED SUCCESSFULLY!
echo  Please close any running FixIT windows, 
echo  then double-click 'Start_FixIT.bat' to start the system.
echo =======================================================
pause
