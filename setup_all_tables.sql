-- =============================================
-- SETUP ALL TABLES FOR RESELLER WHITELIST SYSTEM
-- =============================================

-- 1. Tabel whitelist (sudah ada, tapi pastikan strukturnya benar)
CREATE TABLE IF NOT EXISTS whitelist (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel reseller_user (untuk data reseller)
CREATE TABLE IF NOT EXISTS reseller_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    total_limit INTEGER NOT NULL DEFAULT 25,
    used_slots INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabel reseller_key (untuk key reseller)
CREATE TABLE IF NOT EXISTS reseller_key (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    reseller_username VARCHAR(255) NOT NULL,
    device_id VARCHAR(500),
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (reseller_username) REFERENCES reseller_user(username) ON DELETE CASCADE
);

-- 4. Index untuk performa
CREATE INDEX IF NOT EXISTS idx_whitelist_username ON whitelist(username);
CREATE INDEX IF NOT EXISTS idx_reseller_key_key ON reseller_key(key);
CREATE INDEX IF NOT EXISTS idx_reseller_key_username ON reseller_key(reseller_username);
CREATE INDEX IF NOT EXISTS idx_reseller_user_username ON reseller_user(username);

-- 5. Trigger untuk update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Trigger untuk reseller_user
DROP TRIGGER IF EXISTS update_reseller_user_updated_at ON reseller_user;
CREATE TRIGGER update_reseller_user_updated_at 
    BEFORE UPDATE ON reseller_user 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Row Level Security (RLS) - Optional untuk keamanan
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_key ENABLE ROW LEVEL SECURITY;

-- 8. Policy untuk allow all (karena menggunakan anon key)
CREATE POLICY "Allow all operations" ON whitelist FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON reseller_user FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON reseller_key FOR ALL USING (true);

-- 9. Insert sample data (optional)
-- INSERT INTO reseller_user (username, total_limit, used_slots) VALUES 
-- ('sample_reseller', 25, 0) ON CONFLICT (username) DO NOTHING;

-- 10. View untuk monitoring (optional)
CREATE OR REPLACE VIEW reseller_stats AS
SELECT 
    ru.username,
    ru.total_limit,
    ru.used_slots,
    (ru.total_limit - ru.used_slots) as remaining_slots,
    ru.created_at,
    ru.updated_at,
    rk.key,
    rk.last_activity,
    rk.device_id
FROM reseller_user ru
LEFT JOIN reseller_key rk ON ru.username = rk.reseller_username;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Cek apakah tabel sudah dibuat
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('whitelist', 'reseller_user', 'reseller_key')
ORDER BY table_name;

-- Cek struktur tabel
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'reseller_user' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Cek foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('reseller_key')
AND tc.table_schema = 'public';

