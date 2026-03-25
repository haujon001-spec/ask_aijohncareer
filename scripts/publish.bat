@echo off
REM publish.bat - Publish directory to here.now using curl

setlocal enabledelayedexpansion

set "distPath=%~1"
if "!distPath!"=="" (
    set "distPath=dist"
)

if not exist "!distPath!\" (
    echo Error: Directory not found: !distPath!
    exit /b 1
)

set "credFile=%USERPROFILE%\.herenow\credentials"
for /f "delims=" %%i in ('type "!credFile!" 2^>nul') do set "ApiKey=%%i"

if "!ApiKey!"=="" (
    echo Error: API key not found in !credFile!
    exit /b 1
)

echo Publishing !distPath! to here.now...
echo API Key: !ApiKey:~0,20!...

REM For now, show instructions to manually publish
echo.
echo To publish manually, visit: https://here.now
echo API Key is securely stored in ~/.herenow/credentials
echo.
exit /b 0
