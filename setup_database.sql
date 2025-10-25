-- 🗄️ Setup Database Supabase untuk Whitelist Manager
-- Jalankan script ini di SQL Editor di Supabase Dashboard

-- 1. Buat tabel whitelist
CREATE TABLE IF NOT EXISTS whitelist (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Buat tabel reseller_keys untuk tracking reseller
CREATE TABLE IF NOT EXISTS reseller_keys (
    id SERIAL PRIMARY KEY,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    limit_count INTEGER DEFAULT 25,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 3. Buat tabel upgrade_keys untuk tracking upgrade
CREATE TABLE IF NOT EXISTS upgrade_keys (
    id SERIAL PRIMARY KEY,
    upgrade_key_hash VARCHAR(255) UNIQUE NOT NULL,
    reseller_key_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false,
    FOREIGN KEY (reseller_key_hash) REFERENCES reseller_keys(key_hash)
);

-- 4. Buat tabel user_activity untuk tracking aktivitas
CREATE TABLE IF NOT EXISTS user_activity (
    id SERIAL PRIMARY KEY,
    key_hash VARCHAR(255) NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (key_hash) REFERENCES reseller_keys(key_hash)
);

-- 5. Buat index untuk performa
CREATE INDEX IF NOT EXISTS idx_whitelist_username ON whitelist(username);
CREATE INDEX IF NOT EXISTS idx_reseller_keys_hash ON reseller_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_upgrade_keys_hash ON upgrade_keys(upgrade_key_hash);
CREATE INDEX IF NOT EXISTS idx_user_activity_key ON user_activity(key_hash);
CREATE INDEX IF NOT EXISTS idx_user_activity_device ON user_activity(device_id);

-- 6. Enable Row Level Security
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE upgrade_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- 7. Buat policy untuk akses public
CREATE POLICY "Allow public access" ON whitelist
    FOR ALL USING (true);

CREATE POLICY "Allow public access" ON reseller_keys
    FOR ALL USING (true);

CREATE POLICY "Allow public access" ON upgrade_keys
    FOR ALL USING (true);

CREATE POLICY "Allow public access" ON user_activity
    FOR ALL USING (true);

-- 8. Insert data contoh
INSERT INTO whitelist (username) VALUES 
    ('arix12'),
    ('asaw1'),
    ('adcasaww1')
ON CONFLICT (username) DO NOTHING;

-- 9. Buat function untuk cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    -- Hapus aktivitas yang sudah expired (lebih dari 30 menit)
    DELETE FROM user_activity 
    WHERE last_activity < NOW() - INTERVAL '30 minutes';
    
    -- Hapus upgrade keys yang sudah expired (lebih dari 24 jam dan belum digunakan)
    DELETE FROM upgrade_keys 
    WHERE created_at < NOW() - INTERVAL '24 hours' 
    AND is_used = false;
END;
$$ LANGUAGE plpgsql;

-- 10. Buat trigger untuk update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_whitelist_updated_at 
    BEFORE UPDATE ON whitelist 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reseller_keys_updated_at 
    BEFORE UPDATE ON reseller_keys 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ✅ Selesai! Database schema sudah siap untuk fitur reseller
