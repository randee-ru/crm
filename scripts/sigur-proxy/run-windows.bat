@echo off
REM Запуск Sigur-прокси на Windows-сервере клуба
setlocal
cd /d %~dp0

if exist .env (
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" if not "%%A:~0,1%"=="#" set %%A=%%B
  )
)

python proxy.py
pause
