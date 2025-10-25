-- QUICK SETUP - Copy paste ini ke Supabase SQL Editor

-- 1. Buat tabel whitelist
CREATE TABLE IF NOT EXISTS whitelist (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Buat tabel reseller_user
CREATE TABLE IF NOT EXISTS reseller_user (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    total_limit INTEGER NOT NULL DEFAULT 25,
    used_slots INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Buat tabel reseller_key
CREATE TABLE IF NOT EXISTS reseller_key (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    reseller_username VARCHAR(255) NOT NULL,
    device_id VARCHAR(500),
    last_activity TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (reseller_username) REFERENCES reseller_user(username) ON DELETE CASCADE
);

-- 4. Buat indexes
CREATE INDEX IF NOT EXISTS idx_whitelist_username ON whitelist(username);
CREATE INDEX IF NOT EXISTS idx_reseller_key_key ON reseller_key(key);
CREATE INDEX IF NOT EXISTS idx_reseller_key_username ON reseller_key(reseller_username);
CREATE INDEX IF NOT EXISTS idx_reseller_user_username ON reseller_user(username);

-- 5. Buat trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Buat trigger
DROP TRIGGER IF EXISTS update_reseller_user_updated_at ON reseller_user;
CREATE TRIGGER update_reseller_user_updated_at 
    BEFORE UPDATE ON reseller_user 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable RLS
ALTER TABLE whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_key ENABLE ROW LEVEL SECURITY;

-- 8. Buat policies
CREATE POLICY "Allow all operations" ON whitelist FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON reseller_user FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON reseller_key FOR ALL USING (true);

-- 9. Test insert (optional)
INSERT INTO reseller_user (username, total_limit, used_slots) VALUES 
('test_reseller', 25, 0) ON CONFLICT (username) DO NOTHING;

-- 10. Cek hasil
SELECT 'Tables created successfully!' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('whitelist', 'reseller_user', 'reseller_key');

