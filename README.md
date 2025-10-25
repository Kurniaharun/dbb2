# 🔐 Whitelist Manager

Aplikasi web untuk mengelola daftar username yang diizinkan (whitelist) menggunakan Supabase sebagai database. Dilengkapi dengan sistem reseller yang memungkinkan manajemen whitelist dengan limit dan upgrade system. Siap untuk di-deploy ke Heroku tanpa konfigurasi manual!

## ✨ Fitur Utama

### 🔐 **Sistem Autentikasi**
- **User Login**: Login dengan user key untuk akses whitelist
- **Reseller Login**: Login sebagai reseller dengan limit management
- **Admin Panel**: Panel admin untuk mengelola keys dan upgrade
- **Device Tracking**: Satu key hanya bisa digunakan di satu device
- **Auto Session**: Auto logout setelah 30 menit tidak aktif

### 🏪 **Sistem Reseller**
- **Reseller Keys**: Admin dapat membuat reseller keys dengan limit
- **Limit Management**: Setiap reseller memiliki limit user (default 25)
- **Upgrade System**: Upgrade limit dengan upgrade keys (+25 per upgrade)
- **User Management**: Reseller dapat menambah/hapus user dalam limit
- **Real-time Stats**: Monitor penggunaan slot dan sisa limit

### 📋 **Whitelist Management**
- ➕ **Add Whitelist**: Tambah username ke daftar whitelist
- 🗑️ **Delete Whitelist**: Hapus username dari daftar whitelist  
- 🔍 **Check Whitelist**: Cek apakah username ada di whitelist
- 📋 **Get Raw Link**: Ambil semua username dalam format JSON
- 📋 **Copy to Clipboard**: Salin hasil raw link ke clipboard
- 📊 **Real-time Stats**: Tampilkan statistik whitelist secara real-time

### 🚀 **Deployment & Security**
- 🌐 **Heroku Ready**: Siap di-deploy ke Heroku dengan environment variables
- 🔒 **Security**: Row Level Security, input validation, error handling
- 🔄 **Auto Cleanup**: Auto cleanup expired sessions dan keys
- 📱 **Responsive**: Design responsive untuk desktop, tablet, dan mobile

## 🚀 Quick Start

### Option 1: One-Click Deploy ke Heroku (Recommended)
```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh
./deploy.sh
```
**✅ Environment variables sudah AUTO-SET! Tidak perlu konfigurasi manual!**

### Option 2: Manual Deploy
1. **Setup Supabase**: Jalankan `supabase_setup.sql` di Supabase Dashboard
2. **Deploy ke Heroku**: Ikuti panduan di `DEPLOYMENT.md`
3. **Done!** Aplikasi langsung online

### Option 3: Run Local
1. **Install Dependencies**: `npm install`
2. **Run Server**: `npm start`
3. **Open**: http://localhost:3001

## 🏪 Cara Menggunakan Sistem Reseller

### 1. **Admin Panel** (`/admin/login`)
- **Password Admin**: `Kurr123@`
- **Buat Reseller Key**: Masukkan username reseller dan set limit
- **Buat Upgrade Key**: Generate upgrade key untuk reseller tertentu
- **Kelola Keys**: Monitor, copy, atau hapus keys

### 2. **Reseller Login** (`/reseller-login`)
- Masukkan reseller key yang diberikan admin
- Sistem akan validasi key dan device
- Redirect ke dashboard reseller

### 3. **Reseller Dashboard** (`/reseller-dashboard`)
- **Statistik**: Lihat limit, slot terpakai, dan sisa slot
- **Tambah User**: Tambah user ke whitelist (dalam limit)
- **Manajemen User**: Lihat, hapus, atau cek status user
- **Upgrade Limit**: Gunakan upgrade key untuk naik 25 slot

### 4. **User Login** (`/login`)
- Login dengan user key untuk akses whitelist
- Dashboard user untuk manajemen whitelist

> 📖 **Panduan Lengkap**: Lihat `RESELLER_GUIDE.md` untuk detail lengkap

## 📁 Struktur File

```
├── server.js                    # Express server dengan auto-configured Supabase
├── package.json                 # Dependencies dan scripts
├── Procfile                     # Heroku deployment config
├── deploy.sh                    # Auto deploy script (Linux/Mac)
├── deploy.bat                   # Auto deploy script (Windows)
├── public/
│   ├── index.html              # Halaman utama dengan pilihan login
│   ├── user.html               # Dashboard user whitelist
│   ├── user-login.html         # Login page untuk user
│   ├── reseller-login.html     # Login page untuk reseller
│   ├── reseller-dashboard.html # Dashboard reseller
│   ├── admin.html              # Dashboard admin
│   └── admin-login.html        # Login page untuk admin
├── setup_database.sql          # Script SQL untuk setup database
├── env.example                 # Template environment variables
├── .gitignore                  # Git ignore rules
├── DEPLOYMENT.md              # Panduan deployment ke Heroku
├── RESELLER_GUIDE.md          # Panduan lengkap sistem reseller
└── README.md                  # Dokumentasi ini
```

## 🗄️ Database Schema

### Tabel `whitelist`
- `id`: Primary key (auto increment)
- `username`: Username yang diwhitelist (unique)
- `created_at`: Timestamp pembuatan
- `updated_at`: Timestamp update terakhir

### Tabel `reseller_keys`
- `id`: Primary key (auto increment)
- `key_hash`: Hash dari reseller key (unique)
- `username`: Username reseller
- `limit_count`: Limit user (default 25)
- `created_at`: Timestamp pembuatan
- `updated_at`: Timestamp update
- `is_active`: Status aktif

### Tabel `upgrade_keys`
- `id`: Primary key (auto increment)
- `upgrade_key_hash`: Hash dari upgrade key (unique)
- `reseller_key_hash`: Foreign key ke reseller_keys
- `created_at`: Timestamp pembuatan
- `used_at`: Timestamp penggunaan
- `is_used`: Status penggunaan

### Tabel `user_activity`
- `id`: Primary key (auto increment)
- `key_hash`: Foreign key ke reseller_keys
- `device_id`: ID device yang login
- `last_activity`: Timestamp aktivitas terakhir
- `created_at`: Timestamp pembuatan

### Functions yang Tersedia
- `cleanup_expired_sessions()`: Hapus session dan key yang expired
- `update_updated_at_column()`: Trigger untuk update timestamp

## 🔧 Konfigurasi

### Supabase Configuration
**Project URL**: `https://qtzhybwvpcukffqsqjgt.supabase.co`
**API Key**: Sudah dikonfigurasi otomatis di server.js

### Row Level Security (RLS)
Script setup menggunakan RLS dengan policy public untuk kemudahan testing. Untuk produksi, sesuaikan policy sesuai kebutuhan keamanan.

### Customization
Anda dapat mengubah:
- Warna tema di CSS
- Nama tabel dan kolom di SQL
- Policy keamanan di Supabase

## 📱 Responsive Design

Aplikasi sudah responsive dan dapat digunakan di:
- Desktop
- Tablet  
- Mobile

## 🛡️ Keamanan

- Menggunakan Supabase RLS untuk kontrol akses
- Input validation di frontend
- Error handling yang komprehensif

## 🎨 UI/UX Features

- Modern gradient design
- Loading indicators
- Success/error notifications
- Copy to clipboard functionality
- Keyboard support (Enter key)

## 📝 Contoh Output Raw Link

```
arix12
asaw1
adcasaww1
```

## 🔄 Update dan Maintenance

Untuk update database schema atau menambah fitur:
1. Edit `supabase_setup.sql`
2. Jalankan script di Supabase SQL Editor
3. Update `index.html` jika diperlukan

## 🆘 Troubleshooting

### Error "Could not find the table 'public.whitelist'"
**Solusi**: Jalankan script `setup_database.sql` di Supabase Dashboard
1. Buka Supabase Dashboard → SQL Editor
2. Copy-paste isi `setup_database.sql`
3. Klik "Run"
4. Refresh halaman aplikasi

### Error "Failed to connect to Supabase"
- Pastikan URL dan Key sudah benar
- Cek koneksi internet
- Pastikan project Supabase aktif

### Error "Table doesn't exist"
- Jalankan script `setup_database.sql` terlebih dahulu
- Pastikan script berhasil dijalankan tanpa error

### Error "Permission denied"
- Cek RLS policy di Supabase
- Pastikan policy mengizinkan operasi yang diperlukan

### Error "Key sedang digunakan di device lain"
- Key hanya bisa digunakan di satu device
- Tunggu 30 menit atau logout dari device lain
- Sistem akan auto cleanup expired sessions

### Error "Limit whitelist tercapai"
- Reseller sudah mencapai limit user
- Hubungi admin untuk upgrade key
- Gunakan upgrade key untuk menambah 25 slot

### Error "Upgrade key tidak valid"
- Pastikan upgrade key benar
- Cek apakah upgrade key sudah digunakan
- Upgrade key expired setelah 24 jam

## 📞 Support

Jika mengalami masalah, cek:
1. Console browser untuk error JavaScript
2. Network tab untuk error API
3. Supabase logs di dashboard

---

**Dibuat dengan ❤️ menggunakan HTML, CSS, JavaScript, dan Supabase**
