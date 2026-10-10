@echo off
title Update Fix IT Center 2026
color 0B

echo =======================================================
echo     Fix IT Center - Auto Update System
echo =======================================================
echo.

echo [1/4] Backing up database to prevent data loss...
if exist "prisma\dev.db" (
    copy /Y "prisma\dev.db" "dev_backup_safe.db" >nul 2>&1
    echo Database backed up successfully.
) else (
    echo No existing database found, skipping backup.
)
echo.

echo [2/4] Downloading latest updates from GitHub...
git fetch --all
git reset --hard origin/main
echo.

echo [3/4] Restoring database...
if exist "dev_backup_safe.db" (
    copy /Y "dev_backup_safe.db" "prisma\dev.db" >nul 2>&1
    echo Database restored successfully.
)
echo.

echo [4/4] Checking and installing new components...
call npm install
call npx prisma generate
echo.

echo Synchronizing database structure...
call npx prisma db push --accept-data-loss
echo.

echo =======================================================
echo  UPDATE COMPLETED SUCCESSFULLY!
echo  Please close any running FixIT windows, 
echo  then double-click 'Start_FixIT.bat' to start the system.
echo =======================================================
pause
