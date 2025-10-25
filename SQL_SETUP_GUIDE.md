# 🗄️ SQL Setup Guide untuk Reseller Whitelist System

## 📋 Daftar File SQL

### 1. `create_all_tables.sql` - Setup Lengkap
**Untuk:** Production environment dengan fitur lengkap
**Fitur:**
- ✅ Semua tabel yang dibutuhkan
- ✅ Index untuk performa optimal
- ✅ Triggers untuk auto-update timestamp
- ✅ Views untuk kemudahan query
- ✅ Functions untuk operasi umum
- ✅ Sample data untuk testing

### 2. `quick_create_tables.sql` - Setup Cepat
**Untuk:** Development atau testing cepat
**Fitur:**
- ✅ Tabel minimal yang dibutuhkan
- ✅ Index dasar
- ✅ Sample data

### 3. `supabase_setup.sql` - Setup Supabase
**Untuk:** Supabase database
**Fitur:**
- ✅ RLS (Row Level Security) policies
- ✅ Permissions untuk anon role
- ✅ Optimized untuk Supabase
- ✅ Triggers dan functions

## 🚀 Cara Penggunaan

### Option 1: Supabase (Recommended)
```sql
-- Copy paste isi file supabase_setup.sql ke Supabase SQL Editor
-- Atau jalankan via Supabase CLI
```

### Option 2: PostgreSQL Manual
```bash
# Jalankan file SQL
psql -d your_database -f create_all_tables.sql
```

### Option 3: Quick Setup
```bash
# Untuk testing cepat
psql -d your_database -f quick_create_tables.sql
```

## 📊 Struktur Tabel

### 1. `whitelist` - Tabel Utama
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR(255) UNIQUE)
- created_at (TIMESTAMP)
```

### 2. `reseller_user` - Data Reseller
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR(255) UNIQUE)
- total_limit (INTEGER DEFAULT 25)
- used_slots (INTEGER DEFAULT 0)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 3. `reseller_key` - Key Reseller
```sql
- id (SERIAL PRIMARY KEY)
- key (VARCHAR(255) UNIQUE)
- reseller_username (VARCHAR(255))
- device_id (VARCHAR(500))
- last_activity (TIMESTAMP)
- created_at (TIMESTAMP)
```

## 🔧 Verifikasi Setup

### Cek Tabel
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('whitelist', 'reseller_user', 'reseller_key');
```

### Cek Index
```sql
SELECT indexname, tablename FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('whitelist', 'reseller_user', 'reseller_key');
```

### Cek Data
```sql
SELECT COUNT(*) as whitelist_count FROM whitelist;
SELECT COUNT(*) as reseller_count FROM reseller_user;
SELECT COUNT(*) as key_count FROM reseller_key;
```

## 🧪 Testing

### Test Insert Data
```sql
-- Test whitelist
INSERT INTO whitelist (username) VALUES ('test_user');

-- Test reseller
INSERT INTO reseller_user (username, total_limit) VALUES ('test_reseller', 50);

-- Test reseller key
INSERT INTO reseller_key (key, reseller_username) 
VALUES ('test_key_123', 'test_reseller');
```

### Test Functions (jika menggunakan create_all_tables.sql)
```sql
-- Test add to whitelist
SELECT add_to_whitelist('new_user');

-- Test check whitelist
SELECT is_whitelisted('new_user');

-- Test remove from whitelist
SELECT remove_from_whitelist('new_user');
```

## 🗑️ Cleanup (Hati-hati!)

### Hapus Semua Tabel
```sql
-- Uncomment di create_all_tables.sql bagian cleanup
-- Atau jalankan manual:
DROP TABLE IF EXISTS reseller_key CASCADE;
DROP TABLE IF EXISTS reseller_user CASCADE;
DROP TABLE IF EXISTS whitelist CASCADE;
```

## 🔍 Troubleshooting

### Error: Permission Denied
```sql
-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

### Error: Table Already Exists
```sql
-- Gunakan IF NOT EXISTS atau DROP dulu
DROP TABLE IF EXISTS whitelist CASCADE;
-- Lalu jalankan CREATE TABLE
```

### Error: Foreign Key Constraint
```sql
-- Pastikan urutan pembuatan tabel benar
-- reseller_user dulu, baru reseller_key
```

## 📝 Notes

- **Supabase**: Gunakan `supabase_setup.sql`
- **PostgreSQL**: Gunakan `create_all_tables.sql`
- **Testing**: Gunakan `quick_create_tables.sql`
- **Production**: Pastikan backup database sebelum setup

## 🆘 Support

Jika ada masalah dengan setup SQL, cek:
1. ✅ Database connection
2. ✅ User permissions
3. ✅ SQL syntax
4. ✅ Foreign key constraints
5. ✅ Index creation
