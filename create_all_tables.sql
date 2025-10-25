-- =====================================================
-- SQL Commands untuk Reseller Whitelist System
-- =====================================================
-- File: create_all_tables.sql
-- Deskripsi: Membuat semua tabel yang dibutuhkan untuk sistem reseller whitelist
-- =====================================================

-- 1. Tabel untuk menyimpan data whitelist
CREATE TABLE IF NOT EXISTS whitelist (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel untuk menyimpan data reseller
CREATE TABLE IF NOT EXISTS reseller_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    total_limit INTEGER NOT NULL DEFAULT 25,
    used_slots INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel untuk menyimpan reseller keys
CREATE TABLE IF NOT EXISTS reseller_key (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    reseller_username VARCHAR(255) NOT NULL,
    device_id VARCHAR(500),
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (reseller_username) REFERENCES reseller_user(username) ON DELETE CASCADE
);

-- 4. Tabel untuk menyimpan upgrade keys (opsional)
CREATE TABLE IF NOT EXISTS upgrade_keys (
    id SERIAL PRIMARY KEY,
    upgrade_key VARCHAR(255) UNIQUE NOT NULL,
    reseller_key VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (reseller_key) REFERENCES reseller_key(key) ON DELETE CASCADE
);

-- 5. Tabel untuk menyimpan user keys (opsional - untuk backward compatibility)
CREATE TABLE IF NOT EXISTS user_keys (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    limit_count INTEGER NOT NULL DEFAULT 25,
    device_id VARCHAR(500),
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES untuk performa
-- =====================================================

-- Index untuk whitelist
CREATE INDEX IF NOT EXISTS idx_whitelist_username ON whitelist(username);
CREATE INDEX IF NOT EXISTS idx_whitelist_created_at ON whitelist(created_at);

-- Index untuk reseller_user
CREATE INDEX IF NOT EXISTS idx_reseller_user_username ON reseller_user(username);
CREATE INDEX IF NOT EXISTS idx_reseller_user_created_at ON reseller_user(created_at);

-- Index untuk reseller_key
CREATE INDEX IF NOT EXISTS idx_reseller_key_key ON reseller_key(key);
CREATE INDEX IF NOT EXISTS idx_reseller_key_username ON reseller_key(reseller_username);
CREATE INDEX IF NOT EXISTS idx_reseller_key_device ON reseller_key(device_id);
CREATE INDEX IF NOT EXISTS idx_reseller_key_activity ON reseller_key(last_activity);

-- Index untuk upgrade_keys
CREATE INDEX IF NOT EXISTS idx_upgrade_keys_key ON upgrade_keys(upgrade_key);
CREATE INDEX IF NOT EXISTS idx_upgrade_keys_reseller ON upgrade_keys(reseller_key);
CREATE INDEX IF NOT EXISTS idx_upgrade_keys_used ON upgrade_keys(used);

-- Index untuk user_keys
CREATE INDEX IF NOT EXISTS idx_user_keys_key ON user_keys(key);
CREATE INDEX IF NOT EXISTS idx_user_keys_username ON user_keys(username);
CREATE INDEX IF NOT EXISTS idx_user_keys_device ON user_keys(device_id);

-- =====================================================
-- TRIGGERS untuk update timestamp
-- =====================================================

-- Function untuk update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger untuk whitelist
CREATE TRIGGER update_whitelist_updated_at 
    BEFORE UPDATE ON whitelist 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger untuk reseller_user
CREATE TRIGGER update_reseller_user_updated_at 
    BEFORE UPDATE ON reseller_user 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS untuk kemudahan query
-- =====================================================

-- View untuk statistik reseller
CREATE OR REPLACE VIEW reseller_stats AS
SELECT 
    ru.username,
    ru.total_limit,
    ru.used_slots,
    (ru.total_limit - ru.used_slots) as remaining_slots,
    ru.created_at,
    ru.updated_at
FROM reseller_user ru;

-- View untuk reseller dengan key info
CREATE OR REPLACE VIEW reseller_with_keys AS
SELECT 
    ru.username,
    ru.total_limit,
    ru.used_slots,
    rk.key,
    rk.device_id,
    rk.last_activity,
    rk.created_at as key_created_at
FROM reseller_user ru
LEFT JOIN reseller_key rk ON ru.username = rk.reseller_username;

-- View untuk whitelist dengan info tambahan
CREATE OR REPLACE VIEW whitelist_with_info AS
SELECT 
    w.username,
    w.created_at,
    w.updated_at,
    CASE 
        WHEN w.created_at > NOW() - INTERVAL '1 day' THEN 'New'
        WHEN w.created_at > NOW() - INTERVAL '7 days' THEN 'Recent'
        ELSE 'Old'
    END as status
FROM whitelist w;

-- =====================================================
-- FUNCTIONS untuk operasi umum
-- =====================================================

-- Function untuk menambah user ke whitelist
CREATE OR REPLACE FUNCTION add_to_whitelist(username_param VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO whitelist (username) VALUES (username_param);
    RETURN TRUE;
EXCEPTION
    WHEN unique_violation THEN
        RETURN FALSE;
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function untuk menghapus user dari whitelist
CREATE OR REPLACE FUNCTION remove_from_whitelist(username_param VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM whitelist WHERE username = username_param;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function untuk cek apakah user ada di whitelist
CREATE OR REPLACE FUNCTION is_whitelisted(username_param VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(SELECT 1 FROM whitelist WHERE username = username_param);
END;
$$ LANGUAGE plpgsql;

-- Function untuk update reseller used_slots
CREATE OR REPLACE FUNCTION update_reseller_slots(reseller_username_param VARCHAR, increment_count INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE reseller_user 
    SET used_slots = used_slots + increment_count,
        updated_at = NOW()
    WHERE username = reseller_username_param;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SAMPLE DATA (opsional - untuk testing)
-- =====================================================

-- Uncomment untuk menambah sample data
/*
-- Sample reseller user
INSERT INTO reseller_user (username, total_limit, used_slots) 
VALUES ('test_reseller', 50, 0);

-- Sample reseller key
INSERT INTO reseller_key (key, reseller_username) 
VALUES ('test_key_123', 'test_reseller');

-- Sample whitelist entries
INSERT INTO whitelist (username) VALUES 
('test_user_1'),
('test_user_2'),
('test_user_3');
*/

-- =====================================================
-- GRANTS dan PERMISSIONS (sesuaikan dengan kebutuhan)
-- =====================================================

-- Grant permissions untuk anon role (Supabase)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Cek apakah semua tabel berhasil dibuat
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('whitelist', 'reseller_user', 'reseller_key', 'upgrade_keys', 'user_keys')
ORDER BY table_name;

-- Cek indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('whitelist', 'reseller_user', 'reseller_key', 'upgrade_keys', 'user_keys')
ORDER BY tablename, indexname;

-- =====================================================
-- CLEANUP COMMANDS (jika perlu menghapus semua)
-- =====================================================

-- HATI-HATI: Commands di bawah ini akan menghapus semua data!
-- Uncomment hanya jika benar-benar ingin menghapus semua tabel

/*
-- Drop semua triggers
DROP TRIGGER IF EXISTS update_whitelist_updated_at ON whitelist;
DROP TRIGGER IF EXISTS update_reseller_user_updated_at ON reseller_user;

-- Drop semua functions
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS add_to_whitelist(VARCHAR);
DROP FUNCTION IF EXISTS remove_from_whitelist(VARCHAR);
DROP FUNCTION IF EXISTS is_whitelisted(VARCHAR);
DROP FUNCTION IF EXISTS update_reseller_slots(VARCHAR, INTEGER);

-- Drop semua views
DROP VIEW IF EXISTS reseller_stats;
DROP VIEW IF EXISTS reseller_with_keys;
DROP VIEW IF EXISTS whitelist_with_info;

-- Drop semua tabel (dalam urutan yang benar karena foreign keys)
DROP TABLE IF EXISTS upgrade_keys CASCADE;
DROP TABLE IF EXISTS reseller_key CASCADE;
DROP TABLE IF EXISTS reseller_user CASCADE;
DROP TABLE IF EXISTS user_keys CASCADE;
DROP TABLE IF EXISTS whitelist CASCADE;
*/

-- =====================================================
-- END OF FILE
-- =====================================================
