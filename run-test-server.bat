@echo off
setlocal

cd /d "%~dp0"

echo Starting test server at http://127.0.0.1:5173/
echo Close this window to stop the server.
echo.

npm.cmd run dev -- --host 127.0.0.1

pause
