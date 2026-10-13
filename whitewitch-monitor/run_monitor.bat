@echo off
rem Starts the White Witch monitor. Close this window or press Ctrl+C to stop.
cd /d "%~dp0"
if exist ".venv\Scripts\python.exe" (set PY=.venv\Scripts\python.exe) else (set PY=py)
:loop
%PY% monitor.py
rem If Python itself crashes, wait 30 s and start again.
timeout /t 30 /nobreak >nul
goto loop
