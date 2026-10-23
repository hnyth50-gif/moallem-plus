@echo off
chcp 65001 >nul
REM مشغّل لقطات معلّم بلس — يقبل التعليق كمتغير أول، أو -List لعرض اللقطات
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0snapshot.ps1" %*
pause
