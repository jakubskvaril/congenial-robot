@echo off
rem Asks the running monitor to check the website right now.
cd /d "%~dp0"
type nul > SCAN_NOW
echo Scan requested - see the monitor window.
