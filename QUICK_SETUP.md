# ⚡ Quick Setup Database

**Error yang Anda alami**: `"Could not find the table 'public.whitelist' in the schema cache"`

Ini berarti tabel `whitelist` belum dibuat di database Supabase. Ikuti langkah berikut:

## 🔧 Langkah 1: Setup Database

### 1.1 Buka Supabase Dashboard
1. Buka [supabase.com](https://supabase.com)
2. Login ke akun Anda
3. Pilih project: `xyvbbguhmqcrvqumvddc`

### 1.2 Jalankan Script SQL
1. Di Supabase Dashboard, klik **"SQL Editor"**
2. Klik **"New Query"**
3. Copy semua isi file `setup_database.sql`
4. Paste di SQL Editor
5. Klik **"Run"** (tombol hijau)

### 1.3 Verifikasi
Setelah script berhasil dijalankan, Anda akan melihat:
- ✅ Tabel `whitelist` sudah dibuat
- ✅ Data contoh sudah dimasukkan (arix12, asaw1, adcasaww1)
- ✅ Policy sudah dikonfigurasi

## 🎯 Langkah 2: Test Aplikasi

1. **Refresh halaman** aplikasi di browser
2. **Cek status**: Harus muncul "✅ Terhubung ke Supabase!"
3. **Test fitur**:
   - Add username: `testuser`
   - Check username: `testuser`
   - Get Raw Link: Harus menampilkan semua username

## 🆘 Troubleshooting

### Error: "Permission denied"
- Pastikan script SQL berhasil dijalankan tanpa error
- Cek apakah policy sudah dibuat

### Error: "Table still not found"
- Refresh halaman aplikasi
- Tunggu 1-2 menit untuk schema cache update
- Cek di Supabase Dashboard > Table Editor apakah tabel `whitelist` sudah ada

### Error: "Connection failed"
- Cek koneksi internet
- Pastikan project Supabase masih aktif

## 📊 Verifikasi Database

Di Supabase Dashboard > Table Editor, Anda harus melihat:
- Tabel: `whitelist`
- Kolom: `id`, `username`, `created_at`, `updated_at`
- Data: 3 rows (arix12, asaw1, adcasaww1)

---

**🎉 Setelah setup database selesai, aplikasi akan berfungsi normal!**
