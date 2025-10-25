@echo off
REM 🚀 Auto Deploy Script untuk Whitelist Manager ke Heroku (Windows)
REM Script ini akan otomatis deploy aplikasi tanpa perlu set environment variables manual

echo 🚀 Starting Auto Deploy to Heroku...

REM Cek apakah Heroku CLI sudah terinstall
heroku --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Heroku CLI tidak ditemukan!
    echo 📥 Install Heroku CLI dari: https://devcenter.heroku.com/articles/heroku-cli
    pause
    exit /b 1
)

REM Cek apakah sudah login ke Heroku
heroku auth:whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔐 Login ke Heroku...
    heroku login
)

REM Input nama app
echo 📝 Masukkan nama app Heroku (atau tekan Enter untuk auto-generate):
set /p APP_NAME=

if "%APP_NAME%"=="" (
    REM Generate random app name
    for /f %%i in ('powershell -command "Get-Date -Format 'yyyyMMddHHmmss'"') do set TIMESTAMP=%%i
    set APP_NAME=whitelist-manager-%TIMESTAMP%
    echo 🎲 Menggunakan nama app: %APP_NAME%
)

REM Buat Heroku app
echo 🏗️  Membuat Heroku app: %APP_NAME%
heroku create %APP_NAME% 2>nul || echo ⚠️  App mungkin sudah ada, melanjutkan...

REM Set environment variables (opsional, karena sudah ada fallback di code)
echo 🔧 Setting environment variables...
heroku config:set SUPABASE_URL="https://xyvbbguhmqcrvqumvddc.supabase.co" --app %APP_NAME%
heroku config:set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dmJiZ3VobXFjcnZxdW12ZGRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODExNDAsImV4cCI6MjA3NTc1NzE0MH0.J_f_5WAJdb6A2k05kSUuQCS3iSo56pMR9omOnxie4vU" --app %APP_NAME%
heroku config:set NODE_ENV="production" --app %APP_NAME%

REM Deploy ke Heroku
echo 📦 Deploying ke Heroku...
git add .
git commit -m "Auto deploy: %date% %time%" 2>nul || echo ⚠️  No changes to commit
git push heroku main

REM Buka aplikasi
echo 🌐 Membuka aplikasi...
heroku open --app %APP_NAME%

echo.
echo ✅ Deploy selesai!
echo 🔗 URL: https://%APP_NAME%.herokuapp.com
echo.
echo 📋 Langkah selanjutnya:
echo 1. Buka Supabase Dashboard
echo 2. Jalankan script supabase_setup.sql di SQL Editor
echo 3. Test aplikasi di browser
echo.
echo 🎉 Aplikasi siap digunakan!
pause
