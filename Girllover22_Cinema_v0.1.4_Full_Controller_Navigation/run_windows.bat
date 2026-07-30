@echo off
setlocal
cd /d "%~dp0"
title Girllover22 Cinema Launcher

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js LTS is required for this developer build.
  echo Install Node.js LTS and then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo Installing the local Electron runtime...
  call npm install --no-fund --no-audit
  if errorlevel 1 (
    echo.
    echo Installation failed. The error above explains what went wrong.
    pause
    exit /b 1
  )
)

echo Starting Girllover22 Cinema...
call npm start
set EXITCODE=%errorlevel%

if not "%EXITCODE%"=="0" (
  echo.
  echo Girllover22 Cinema exited with code %EXITCODE%.
  echo Please send a screenshot of the messages above.
  pause
)
endlocal
