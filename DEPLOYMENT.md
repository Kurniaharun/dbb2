# 🚀 Panduan Deployment ke Heroku (AUTO-CONFIGURED)

Panduan lengkap untuk deploy Whitelist Manager ke Heroku **TANPA PERLU SET ENVIRONMENT VARIABLES MANUAL**!

## ⚡ Quick Deploy (Recommended)

### 🎯 One-Click Deploy
```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh
./deploy.sh
```

**Script akan otomatis:**
- ✅ Login ke Heroku
- ✅ Buat app baru
- ✅ Set environment variables
- ✅ Deploy code
- ✅ Buka aplikasi

## 📋 Prerequisites

1. **Akun Heroku**: Daftar di [heroku.com](https://heroku.com)
2. **Heroku CLI**: Install dari [devcenter.heroku.com](https://devcenter.heroku.com/articles/heroku-cli)
3. **Git**: Install Git di komputer Anda

## 🔧 Step 1: Setup Supabase Database

### 1.1 Database Sudah Siap!
✅ **Database Supabase sudah dikonfigurasi dengan:**
- URL: `https://xyvbbguhmqcrvqumvddc.supabase.co`
- API Key: Sudah terintegrasi di aplikasi

### 1.2 Setup Database Schema
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Login dengan akun yang memiliki akses ke project `xyvbbguhmqcrvqumvddc`
3. Pergi ke **SQL Editor**
4. Copy semua isi file `supabase_setup.sql`
5. Paste di SQL Editor
6. Klik **"Run"** untuk menjalankan script
7. Pastikan tidak ada error

## 🌐 Step 2: Deploy ke Heroku (Auto)

### 2.1 Manual Deploy (Jika Script Tidak Bekerja)
```bash
# Login ke Heroku
heroku login

# Buat app
heroku create your-app-name

# Deploy (environment variables sudah auto-set di code)
git add .
git commit -m "Initial deployment"
git push heroku main

# Buka aplikasi
heroku open
```

### 2.2 Environment Variables (Optional)
Environment variables sudah **AUTO-SET** di code, tapi bisa di-override:
```bash
heroku config:set SUPABASE_URL="https://xyvbbguhmqcrvqumvddc.supabase.co"
heroku config:set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## ✅ Step 3: Verifikasi Deployment

1. **Buka URL Heroku** yang diberikan
2. **Cek Status**: Harus muncul "✅ Terhubung ke Supabase!"
3. **Test Fitur**:
   - Add username: `testuser`
   - Check username: `testuser`
   - Get Raw Link: Harus menampilkan `testuser`
   - Delete username: `testuser`

## 🔍 Troubleshooting

### Error: "Konfigurasi Supabase tidak ditemukan"
```bash
# Cek environment variables
heroku config

# Set ulang jika perlu
heroku config:set SUPABASE_URL="your_url"
heroku config:set SUPABASE_ANON_KEY="your_key"
```

### Error: "Failed to connect to database"
1. Cek apakah script SQL sudah dijalankan di Supabase
2. Cek apakah URL dan Key sudah benar
3. Cek apakah project Supabase masih aktif

### Error: "Permission denied"
1. Di Supabase, pergi ke **Authentication** > **Policies**
2. Pastikan policy untuk tabel `whitelist` sudah dibuat
3. Atau jalankan ulang script `supabase_setup.sql`

### Error: "App crashed"
```bash
# Cek logs
heroku logs --tail

# Restart app
heroku restart
```

## 🔄 Update Aplikasi

Untuk update aplikasi:
```bash
# Edit file yang diperlukan
# Commit perubahan
git add .
git commit -m "Update description"

# Deploy
git push heroku main
```

## 📊 Monitoring

### Cek Status App
```bash
heroku ps
```

### Cek Logs
```bash
heroku logs --tail
```

### Cek Environment Variables
```bash
heroku config
```

## 🛡️ Keamanan

### Production Checklist
- [ ] Environment variables sudah diset
- [ ] Database password kuat
- [ ] RLS policies sudah dikonfigurasi
- [ ] App tidak crash saat startup
- [ ] Semua fitur berfungsi normal

### Custom Domain (Opsional)
```bash
# Add custom domain
heroku domains:add yourdomain.com

# Update DNS records sesuai instruksi Heroku
```

## 💰 Biaya

- **Heroku**: Free tier tersedia (dengan batasan)
- **Supabase**: Free tier tersedia (500MB database)
- **Custom Domain**: Biaya tambahan jika diperlukan

## 📞 Support

Jika mengalami masalah:
1. Cek logs: `heroku logs --tail`
2. Cek status: `heroku ps`
3. Cek config: `heroku config`
4. Restart: `heroku restart`

---

**🎉 Selamat! Aplikasi Whitelist Manager sudah online di Heroku!**
