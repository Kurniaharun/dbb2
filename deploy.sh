#!/bin/bash

# 🚀 Auto Deploy Script untuk Whitelist Manager ke Heroku
# Script ini akan otomatis deploy aplikasi tanpa perlu set environment variables manual

echo "🚀 Starting Auto Deploy to Heroku..."

# Cek apakah Heroku CLI sudah terinstall
if ! command -v heroku &> /dev/null; then
    echo "❌ Heroku CLI tidak ditemukan!"
    echo "📥 Install Heroku CLI dari: https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

# Cek apakah sudah login ke Heroku
if ! heroku auth:whoami &> /dev/null; then
    echo "🔐 Login ke Heroku..."
    heroku login
fi

# Input nama app
echo "📝 Masukkan nama app Heroku (atau tekan Enter untuk auto-generate):"
read -r APP_NAME

if [ -z "$APP_NAME" ]; then
    # Generate random app name
    APP_NAME="whitelist-manager-$(date +%s)"
    echo "🎲 Menggunakan nama app: $APP_NAME"
fi

# Buat Heroku app
echo "🏗️  Membuat Heroku app: $APP_NAME"
heroku create "$APP_NAME" 2>/dev/null || echo "⚠️  App mungkin sudah ada, melanjutkan..."

# Set environment variables (opsional, karena sudah ada fallback di code)
echo "🔧 Setting environment variables..."
heroku config:set SUPABASE_URL="https://xyvbbguhmqcrvqumvddc.supabase.co" --app "$APP_NAME"
heroku config:set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5dmJiZ3VobXFjcnZxdW12ZGRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxODExNDAsImV4cCI6MjA3NTc1NzE0MH0.J_f_5WAJdb6A2k05kSUuQCS3iSo56pMR9omOnxie4vU" --app "$APP_NAME"
heroku config:set NODE_ENV="production" --app "$APP_NAME"

# Deploy ke Heroku
echo "📦 Deploying ke Heroku..."
git add .
git commit -m "Auto deploy: $(date)" || echo "⚠️  No changes to commit"
git push heroku main

# Buka aplikasi
echo "🌐 Membuka aplikasi..."
heroku open --app "$APP_NAME"

echo ""
echo "✅ Deploy selesai!"
echo "🔗 URL: https://$APP_NAME.herokuapp.com"
echo ""
echo "📋 Langkah selanjutnya:"
echo "1. Buka Supabase Dashboard"
echo "2. Jalankan script supabase_setup.sql di SQL Editor"
echo "3. Test aplikasi di browser"
echo ""
echo "🎉 Aplikasi siap digunakan!"
