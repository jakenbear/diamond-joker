@echo off
REM build-desktop.bat — Build Windows desktop package
REM Usage: scripts\build-desktop.bat
REM Prerequisites: npm install -g nw-builder

setlocal
set ROOT=%~dp0..
set BUILD=%ROOT%\desktop\build
set OUT=%ROOT%\desktop\dist\win64

echo ==> Cleaning build dir...
if exist "%BUILD%" rmdir /s /q "%BUILD%"
mkdir "%BUILD%"

echo ==> Copying game files...
copy "%ROOT%\desktop\package.json" "%BUILD%\"
copy "%ROOT%\index.html" "%BUILD%\"
xcopy /E /I /Q "%ROOT%\src" "%BUILD%\src"
xcopy /E /I /Q "%ROOT%\data" "%BUILD%\data"
xcopy /E /I /Q "%ROOT%\vendor" "%BUILD%\vendor"
xcopy /E /I /Q "%ROOT%\assets" "%BUILD%\assets"

echo ==> Packaging for Windows...
where nwbuild >nul 2>&1
if errorlevel 1 (
    echo ERROR: nwbuild not found. Run: npm install -g nw-builder
    exit /b 1
)

nwbuild "%BUILD%" --mode build --version 0.85.0 --platform win --arch x64 --outDir "%OUT%" --glob false

echo ==> Done! Output: %OUT%
echo    Run: %OUT%\aces-loaded.exe
