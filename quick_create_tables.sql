-- =====================================================
-- QUICK SQL Setup untuk Reseller Whitelist System
-- =====================================================
-- File: quick_create_tables.sql
-- Deskripsi: Command SQL minimal untuk setup sistem
-- =====================================================

-- 1. Tabel whitelist (utama)
CREATE TABLE IF NOT EXISTS whitelist (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel reseller user
CREATE TABLE IF NOT EXISTS reseller_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    total_limit INTEGER NOT NULL DEFAULT 25,
    used_slots INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel reseller key
CREATE TABLE IF NOT EXISTS reseller_key (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    reseller_username VARCHAR(255) NOT NULL,
    device_id VARCHAR(500),
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (reseller_username) REFERENCES reseller_user(username) ON DELETE CASCADE
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_whitelist_username ON whitelist(username);
CREATE INDEX IF NOT EXISTS idx_reseller_key_key ON reseller_key(key);
CREATE INDEX IF NOT EXISTS idx_reseller_user_username ON reseller_user(username);

-- Sample data untuk testing
INSERT INTO reseller_user (username, total_limit, used_slots) 
VALUES ('admin_reseller', 100, 0) 
ON CONFLICT (username) DO NOTHING;

-- Cek hasil
SELECT 'Tables created successfully!' as status;
