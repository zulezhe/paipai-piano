@echo off
set WIX=%~dp0src-tauri\wix\wix314
set NSIS=%~dp0src-tauri\nsis\nsis-3.08
set PATH=%WIX%;%NSIS%;%PATH%

echo ========================================
echo Using local tools:
echo WIX: %WIX%
echo NSIS: %NSIS%
echo ========================================

echo Current PATH includes NSIS: 
echo %PATH% | findstr /i "nsis"

cd src-tauri
cargo tauri build