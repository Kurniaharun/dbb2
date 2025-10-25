# 🗄️ Command untuk Setup Database Supabase

## 📋 **Cara Menjalankan SQL Commands:**

### **1. Via Supabase Dashboard (Recommended):**
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Pergi ke **SQL Editor**
4. Copy semua isi file `setup_all_tables.sql`
5. Paste di SQL Editor
6. Klik **Run** atau tekan `Ctrl+Enter`

### **2. Via Supabase CLI (Jika sudah install):**
```bash
# Install Supabase CLI (jika belum)
npm install -g supabase

# Login ke Supabase
supabase login

# Link ke project
supabase link --project-ref YOUR_PROJECT_REF

# Jalankan SQL file
supabase db reset --file setup_all_tables.sql
```

### **3. Via psql (PostgreSQL client):**
```bash
# Connect ke database
psql "postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres"

# Jalankan SQL file
\i setup_all_tables.sql
```

## 🔍 **Verification Commands:**

Setelah menjalankan script, jalankan query ini untuk memverifikasi:

```sql
-- Cek semua tabel
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('whitelist', 'reseller_user', 'reseller_key');

-- Cek struktur reseller_user
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'reseller_user' AND table_schema = 'public';

-- Test insert data
INSERT INTO reseller_user (username, total_limit, used_slots) 
VALUES ('test_reseller', 25, 0);

-- Test insert key
INSERT INTO reseller_key (key, reseller_username) 
VALUES ('test_key_123', 'test_reseller');

-- Cek data
SELECT * FROM reseller_user;
SELECT * FROM reseller_key;
```

## ⚠️ **Important Notes:**

1. **Backup dulu** jika ada data penting
2. **Ganti project reference** dengan yang sesuai
3. **Set password** yang benar
4. **Cek permissions** untuk anon key

## 🎯 **Expected Results:**

Setelah berhasil, Anda akan melihat:
- ✅ 3 tabel: `whitelist`, `reseller_user`, `reseller_key`
- ✅ Foreign key relationship
- ✅ Indexes untuk performa
- ✅ Triggers untuk auto-update
- ✅ RLS policies
- ✅ View untuk monitoring

## 🚀 **Next Steps:**

1. Jalankan script SQL
2. Restart server: `node server.js`
3. Test create reseller key di admin panel
4. Test add user di reseller dashboard
5. Verify limit berkurang dengan benar

