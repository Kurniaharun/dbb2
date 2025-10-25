# 🏪 Panduan Sistem Reseller - Whitelist Manager

## 📋 Overview
Sistem reseller memungkinkan admin untuk membuat dan mengelola reseller keys yang dapat digunakan untuk mengelola whitelist dengan limit tertentu. Setiap reseller dapat menambah user hingga limit yang ditentukan dan dapat diupgrade menggunakan upgrade keys.

## 🔑 Fitur Utama

### 1. **Sistem Key Authentication**
- Satu key hanya bisa digunakan di satu device
- Jika key sudah digunakan di device lain, tunggu 30 menit
- Key akan otomatis logout setelah 30 menit tidak aktif
- Auto cleanup expired sessions setiap 5 menit

### 2. **Reseller Management**
- Admin dapat membuat reseller keys dengan limit awal (default 25)
- Reseller dapat login menggunakan key mereka
- Dashboard reseller menampilkan statistik dan manajemen user

### 3. **Upgrade System**
- Admin dapat membuat upgrade keys untuk reseller tertentu
- Setiap upgrade menambah 25 slot
- Upgrade key hanya bisa digunakan sekali
- Upgrade key expired setelah 24 jam jika tidak digunakan

### 4. **User Management**
- Reseller dapat menambah user ke whitelist
- Reseller dapat menghapus user dari whitelist
- Reseller dapat mengecek status user di whitelist
- Limit enforcement (tidak bisa menambah user melebihi limit)

## 🚀 Cara Penggunaan

### **Admin Panel** (`/admin/login`)
1. Login dengan password admin: `Kurr123@`
2. Buat reseller key:
   - Masukkan username reseller
   - Set limit awal (default 25)
   - Klik "Buat Reseller Key"
3. Buat upgrade key:
   - Masukkan reseller key yang akan diupgrade
   - Klik "Buat Upgrade Key"
4. Kelola keys:
   - Lihat daftar semua keys
   - Copy atau hapus keys
   - Monitor status aktivitas

### **Reseller Login** (`/reseller-login`)
1. Masukkan reseller key yang diberikan admin
2. Login akan berhasil jika key valid dan tidak digunakan di device lain
3. Redirect ke dashboard reseller

### **Reseller Dashboard** (`/reseller-dashboard`)
1. **Statistik**:
   - Limit saat ini
   - Slot terpakai
   - Sisa slot
   - Nama reseller

2. **Tambah User**:
   - Masukkan username
   - Klik "Tambah User"
   - Sistem akan cek limit dan duplikasi

3. **Manajemen User**:
   - Lihat daftar semua user di whitelist
   - Hapus user jika diperlukan
   - Cek status user

4. **Upgrade Limit**:
   - Masukkan upgrade key dari admin
   - Klik "Upgrade Limit"
   - Limit akan naik 25 slot

## 🔧 API Endpoints

### **Admin Endpoints**
- `POST /api/admin/login` - Login admin
- `POST /api/admin/logout` - Logout admin
- `GET /api/admin/status` - Cek status admin
- `POST /api/admin/create-reseller-key` - Buat reseller key
- `POST /api/admin/create-upgrade-key` - Buat upgrade key
- `GET /api/admin/keys` - List semua keys
- `DELETE /api/admin/delete-key/:key` - Hapus key

### **Reseller Endpoints**
- `POST /api/reseller/login` - Login reseller
- `POST /api/reseller/logout` - Logout reseller
- `GET /api/reseller/stats` - Statistik reseller
- `GET /api/reseller/users` - List user reseller
- `POST /api/reseller/add-user` - Tambah user
- `DELETE /api/reseller/delete-user` - Hapus user
- `GET /api/reseller/check-user` - Cek status user
- `POST /api/reseller/upgrade-limit` - Upgrade limit

### **User Endpoints**
- `POST /api/user/login` - Login user
- `POST /api/user/logout` - Logout user
- `GET /api/user/status` - Cek status user

## 🗄️ Database Schema

### **Tabel `whitelist`**
- `id` - Primary key
- `username` - Username (unique)
- `created_at` - Timestamp pembuatan
- `updated_at` - Timestamp update

### **Tabel `reseller_keys`**
- `id` - Primary key
- `key_hash` - Hash dari reseller key (unique)
- `username` - Username reseller
- `limit_count` - Limit user (default 25)
- `created_at` - Timestamp pembuatan
- `updated_at` - Timestamp update
- `is_active` - Status aktif

### **Tabel `upgrade_keys`**
- `id` - Primary key
- `upgrade_key_hash` - Hash dari upgrade key (unique)
- `reseller_key_hash` - Foreign key ke reseller_keys
- `created_at` - Timestamp pembuatan
- `used_at` - Timestamp penggunaan
- `is_used` - Status penggunaan

### **Tabel `user_activity`**
- `id` - Primary key
- `key_hash` - Foreign key ke reseller_keys
- `device_id` - ID device yang login
- `last_activity` - Timestamp aktivitas terakhir
- `created_at` - Timestamp pembuatan

## 🔒 Security Features

1. **Device Tracking**: Setiap key hanya bisa digunakan di satu device
2. **Session Management**: Auto logout setelah 30 menit tidak aktif
3. **Key Validation**: Validasi key sebelum setiap operasi
4. **Rate Limiting**: Mencegah abuse dengan session timeout
5. **Auto Cleanup**: Hapus session dan key yang expired

## 📱 Halaman Web

1. **`/`** - Halaman utama dengan pilihan login
2. **`/admin/login`** - Login admin
3. **`/admin`** - Dashboard admin
4. **`/reseller-login`** - Login reseller
5. **`/reseller-dashboard`** - Dashboard reseller
6. **`/login`** - Login user biasa
7. **`/user`** - Dashboard user
8. **`/raw`** - Raw JSON whitelist

## 🚀 Deployment

1. **Setup Database**:
   ```sql
   -- Jalankan script di setup_database.sql di Supabase
   ```

2. **Environment Variables**:
   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   PORT=3001
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Start Server**:
   ```bash
   npm start
   ```

## 🔧 Troubleshooting

### **Key tidak bisa login**
- Pastikan key valid dan belum expired
- Cek apakah key sedang digunakan di device lain
- Tunggu 30 menit jika key sedang digunakan

### **Limit tidak cukup**
- Hubungi admin untuk upgrade key
- Gunakan upgrade key yang diberikan admin
- Setiap upgrade menambah 25 slot

### **User tidak bisa ditambah**
- Cek apakah username sudah ada di whitelist
- Pastikan limit belum tercapai
- Cek koneksi ke database

## 📞 Support

Untuk bantuan lebih lanjut, hubungi admin atau cek dokumentasi API di `/api/health` untuk status sistem.
