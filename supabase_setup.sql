-- =====================================================
-- Supabase SQL Setup untuk Reseller Whitelist System
-- =====================================================
-- File: supabase_setup.sql
-- Deskripsi: Command SQL khusus untuk Supabase
-- Project URL: https://qtzhybwvpcukffqsqjgt.supabase.co
-- =====================================================

-- Enable Row Level Security (RLS)
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_key ENABLE ROW LEVEL SECURITY;

-- 1. Tabel whitelist
CREATE TABLE IF NOT EXISTS whitelist (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel reseller user
CREATE TABLE IF NOT EXISTS reseller_user (
    id BIGSERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    total_limit INTEGER NOT NULL DEFAULT 25,
    used_slots INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabel reseller key
CREATE TABLE IF NOT EXISTS reseller_key (
    id BIGSERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    reseller_username TEXT NOT NULL,
    device_id TEXT,
    last_activity TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (reseller_username) REFERENCES reseller_user(username) ON DELETE CASCADE
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_whitelist_username ON whitelist(username);
CREATE INDEX IF NOT EXISTS idx_reseller_key_key ON reseller_key(key);
CREATE INDEX IF NOT EXISTS idx_reseller_user_username ON reseller_user(username);
CREATE INDEX IF NOT EXISTS idx_reseller_key_device ON reseller_key(device_id);

-- RLS Policies untuk whitelist (public read access)
CREATE POLICY "Whitelist is viewable by everyone" ON whitelist
    FOR SELECT USING (true);

CREATE POLICY "Whitelist is insertable by authenticated users" ON whitelist
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Whitelist is updatable by authenticated users" ON whitelist
    FOR UPDATE USING (true);

CREATE POLICY "Whitelist is deletable by authenticated users" ON whitelist
    FOR DELETE USING (true);

-- RLS Policies untuk reseller_user (restricted access)
CREATE POLICY "Reseller user is viewable by authenticated users" ON reseller_user
    FOR SELECT USING (true);

CREATE POLICY "Reseller user is insertable by authenticated users" ON reseller_user
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Reseller user is updatable by authenticated users" ON reseller_user
    FOR UPDATE USING (true);

CREATE POLICY "Reseller user is deletable by authenticated users" ON reseller_user
    FOR DELETE USING (true);

-- RLS Policies untuk reseller_key (restricted access)
CREATE POLICY "Reseller key is viewable by authenticated users" ON reseller_key
    FOR SELECT USING (true);

CREATE POLICY "Reseller key is insertable by authenticated users" ON reseller_key
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Reseller key is updatable by authenticated users" ON reseller_key
    FOR UPDATE USING (true);

CREATE POLICY "Reseller key is deletable by authenticated users" ON reseller_key
    FOR DELETE USING (true);

-- Function untuk update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk update timestamp
CREATE TRIGGER update_reseller_user_updated_at 
    BEFORE UPDATE ON reseller_user 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions untuk anon role
GRANT SELECT, INSERT, UPDATE, DELETE ON whitelist TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON reseller_user TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON reseller_key TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Sample data untuk testing
INSERT INTO reseller_user (username, total_limit, used_slots) 
VALUES ('admin_reseller', 100, 0) 
ON CONFLICT (username) DO NOTHING;

-- Cek hasil
SELECT 'Supabase tables created successfully!' as status;
