@echo off
REM Запуск прокси Sigur на Windows-сервере клуба
REM Требуется Python 3.10+ в PATH

cd /d %~dp0

if not exist .env (
  echo Создайте файл .env на основе config.example.env
  pause
  exit /b 1
)

python proxy.py
pause
