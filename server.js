const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Auto-set Supabase credentials (fallback jika env tidak ada)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qtzhybwvpcukffqsqjgt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0emh5Ynd2cGN1a2ZmcXNxamd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzOTc1NDEsImV4cCI6MjA3Njk3MzU0MX0.WmofAOtSTpjt_TVxhtN75CkC4iPRDySxihgIzw9mNeE';

// Password untuk admin
const ADMIN_PASSWORD = 'Kurr123@';

// Store untuk device tracking (dalam production gunakan Redis atau database)
const deviceSessions = new Map();
const userSessions = new Map();
const resellerSessions = new Map();
const upgradeKeys = new Map(); // Store untuk upgrade keys

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Session middleware
app.use(session({
    secret: 'reseller-whitelist-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 30 * 60 * 1000 // 30 menit
    }
}));

// Helper functions
function generateKey() {
    return crypto.randomBytes(16).toString('hex');
}

function getDeviceId(req) {
    return req.headers['user-agent'] + req.ip;
}

function isDeviceAllowed(key, deviceId) {
    const keyData = deviceSessions.get(key);
    if (!keyData) return false;
    
    // Jika device sama, allow
    if (keyData.deviceId === deviceId) return true;
    
    // Jika device berbeda, cek apakah sudah 30 menit
    const now = Date.now();
    if (now - keyData.lastActivity > 30 * 60 * 1000) {
        // Update device
        keyData.deviceId = deviceId;
        keyData.lastActivity = now;
        return true;
    }
    
    return false;
}

// Helper function untuk reseller authentication (DEPRECATED - menggunakan database langsung)
// function isResellerKeyValid(key, deviceId) {
//     const keyData = resellerSessions.get(key);
//     if (!keyData) return false;
//     
//     // Jika device sama, allow
//     if (keyData.deviceId === deviceId) return true;
//     
//     // Jika device berbeda, cek apakah sudah 30 menit
//     const now = Date.now();
//     if (now - keyData.lastActivity > 30 * 60 * 1000) {
//         // Update device
//         keyData.deviceId = deviceId;
//         keyData.lastActivity = now;
//         return true;
//     }
//     
//     return false;
// }

function updateResellerActivity(key, deviceId) {
    const keyData = resellerSessions.get(key);
    if (keyData) {
        keyData.lastActivity = Date.now();
        keyData.deviceId = deviceId;
    } else {
        // Jika tidak ada di memory, buat entry baru untuk backward compatibility
        resellerSessions.set(key, {
            deviceId: deviceId,
            lastActivity: Date.now(),
            type: 'reseller'
        });
    }
}

function updateDeviceActivity(key, deviceId) {
    const keyData = deviceSessions.get(key);
    if (keyData) {
        keyData.lastActivity = Date.now();
        keyData.deviceId = deviceId;
    }
}

// Middleware untuk cek admin auth
function requireAdminAuth(req, res, next) {
    if (req.session && req.session.adminAuthenticated) {
        return next();
    } else {
        if (req.accepts('html')) {
            return res.redirect('/admin/login');
        }
        return res.status(401).json({ 
            error: 'Unauthorized', 
            message: 'Admin access required' 
        });
    }
}

// Middleware untuk cek key auth
function requireKeyAuth(req, res, next) {
    const key = req.headers['x-api-key'] || req.body.key || req.query.key;
    const deviceId = getDeviceId(req);
    
    if (!key) {
        return res.status(401).json({ 
            error: 'Unauthorized', 
            message: 'API key required' 
        });
    }
    
    if (!isDeviceAllowed(key, deviceId)) {
        return res.status(403).json({ 
            error: 'Device not allowed', 
            message: 'Device limit exceeded or session expired' 
        });
    }
    
    // Update activity
    updateDeviceActivity(key, deviceId);
    
    req.key = key;
    req.deviceId = deviceId;
    next();
}

// Middleware untuk cek reseller key auth
async function requireResellerAuth(req, res, next) {
    try {
        const key = req.headers['x-api-key'] || req.body.key || req.query.key;
        const deviceId = getDeviceId(req);
        
        if (!key) {
            return res.status(401).json({ 
                error: 'Unauthorized', 
                message: 'Reseller key required' 
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Cek key di database
        const { data: keyData, error: keyError } = await supabase
            .from('reseller_key')
            .select('key, device_id, last_activity')
            .eq('key', key)
            .single();
        
        if (keyError || !keyData) {
            return res.status(404).json({ 
                error: 'Key not found', 
                message: 'Reseller key tidak valid' 
            });
        }
        
        // Cek device binding
        const now = Date.now();
        if (keyData.device_id && keyData.device_id !== deviceId) {
            // Cek apakah sudah 30 menit
            if (keyData.last_activity && (now - new Date(keyData.last_activity).getTime()) < 30 * 60 * 1000) {
                return res.status(403).json({ 
                    error: 'Device not allowed', 
                    message: 'Key sedang digunakan di device lain atau session expired' 
                });
            }
        }
        
        // Update device dan last activity di database
        await supabase
            .from('reseller_key')
            .update({
                device_id: deviceId,
                last_activity: new Date().toISOString()
            })
            .eq('key', key);
        
        // Update juga di memory untuk backward compatibility
        updateResellerActivity(key, deviceId);
        
        req.resellerKey = key;
        req.deviceId = deviceId;
        next();
        
    } catch (error) {
        return res.status(500).json({ 
            error: 'Server error', 
            message: 'Terjadi kesalahan: ' + error.message 
        });
    }
}

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
        req.session.adminAuthenticated = true;
        res.json({ 
            success: true, 
            message: 'Admin login berhasil!' 
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: 'Password admin salah!' 
        });
    }
});




// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Gagal logout' 
            });
        }
        res.json({ 
            success: true, 
            message: 'Admin logout berhasil!' 
        });
    });
});

// Cek status admin
app.get('/api/admin/status', (req, res) => {
    res.json({ 
        authenticated: !!(req.session && req.session.adminAuthenticated) 
    });
});

// Create new key
app.post('/api/admin/create-key', requireAdminAuth, (req, res) => {
    const { username, limit = 25 } = req.body;
    
    if (!username) {
        return res.status(400).json({
            success: false,
            message: 'Username diperlukan'
        });
    }
    
    const key = generateKey();
    const deviceId = getDeviceId(req);
    
    // Simpan key data
    deviceSessions.set(key, {
        username,
        limit: parseInt(limit),
        deviceId,
        lastActivity: Date.now(),
        createdAt: new Date().toISOString()
    });
    
    res.json({
        success: true,
        message: 'Key berhasil dibuat',
        data: {
            key,
            username,
            limit: parseInt(limit)
        }
    });
});

// Create reseller key
app.post('/api/admin/create-reseller-key', requireAdminAuth, async (req, res) => {
    try {
        const { username, limit = 25 } = req.body;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username diperlukan'
            });
        }
        
        const key = generateKey();
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Cek apakah username reseller sudah ada
        const { data: existingReseller, error: checkError } = await supabase
            .from('reseller_user')
            .select('username')
            .eq('username', username)
            .single();
        
        if (existingReseller) {
            return res.status(400).json({
                success: false,
                message: `Reseller "${username}" sudah ada!`
            });
        }
        
        // Insert reseller user ke database
        const { data: resellerData, error: resellerError } = await supabase
            .from('reseller_user')
            .insert([{
                username: username,
                total_limit: parseInt(limit),
                used_slots: 0
            }])
            .select();
        
        if (resellerError) {
            return res.status(500).json({
                success: false,
                message: 'Gagal membuat reseller user: ' + resellerError.message
            });
        }
        
        // Insert reseller key ke database
        const { data: keyData, error: keyError } = await supabase
            .from('reseller_key')
            .insert([{
                key: key,
                reseller_username: username,
                device_id: null,
                last_activity: null
            }])
            .select();
        
        if (keyError) {
            // Rollback reseller user jika key gagal
            await supabase
                .from('reseller_user')
                .delete()
                .eq('username', username);
            
            return res.status(500).json({
                success: false,
                message: 'Gagal membuat reseller key: ' + keyError.message
            });
        }
        
        // Simpan juga di memory untuk backward compatibility
        resellerSessions.set(key, {
            username,
            limit: parseInt(limit),
            deviceId: null,
            lastActivity: 0,
            createdAt: new Date().toISOString(),
            type: 'reseller'
        });
        
        res.json({
            success: true,
            message: 'Reseller key berhasil dibuat',
            data: {
                key,
                username,
                limit: parseInt(limit)
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// Create upgrade key
app.post('/api/admin/create-upgrade-key', requireAdminAuth, (req, res) => {
    const { resellerKey } = req.body;
    
    if (!resellerKey) {
        return res.status(400).json({
            success: false,
            message: 'Reseller key diperlukan'
        });
    }
    
    // Cek apakah reseller key ada
    const resellerData = resellerSessions.get(resellerKey);
    if (!resellerData) {
        return res.status(404).json({
            success: false,
            message: 'Reseller key tidak ditemukan'
        });
    }
    
    const upgradeKey = generateKey();
    
    // Simpan upgrade key
    upgradeKeys.set(upgradeKey, {
        resellerKey,
        createdAt: new Date().toISOString(),
        used: false
    });
    
    res.json({
        success: true,
        message: 'Upgrade key berhasil dibuat',
        data: {
            upgradeKey,
            resellerUsername: resellerData.username,
            currentLimit: resellerData.limit
        }
    });
});

// Delete key
app.delete('/api/admin/delete-key/:key', requireAdminAuth, async (req, res) => {
    try {
        const { key } = req.params;
        
        let deleted = false;
        let keyType = '';
        
        // Try to delete from device sessions (user keys)
        if (deviceSessions.has(key)) {
            deviceSessions.delete(key);
            deleted = true;
            keyType = 'user';
        }
        
        // Try to delete from reseller sessions (database)
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const { data: resellerKeyData, error: resellerError } = await supabase
            .from('reseller_key')
            .select('reseller_username')
            .eq('key', key)
            .single();
        
        if (!resellerError && resellerKeyData) {
            // Hapus reseller key dari database
            const { error: deleteKeyError } = await supabase
                .from('reseller_key')
                .delete()
                .eq('key', key);
            
            if (!deleteKeyError) {
                // Hapus reseller user dari database
                const { error: deleteUserError } = await supabase
                    .from('reseller_user')
                    .delete()
                    .eq('username', resellerKeyData.reseller_username);
                
                if (!deleteUserError) {
                    deleted = true;
                    keyType = 'reseller';
                }
            }
        }
        
        // Hapus juga dari memory untuk backward compatibility
        if (resellerSessions.has(key)) {
            resellerSessions.delete(key);
        }
        
        if (deleted) {
            res.json({
                success: true,
                message: `${keyType} key berhasil dihapus`
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Key tidak ditemukan'
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// List all keys
app.get('/api/admin/keys', requireAdminAuth, async (req, res) => {
    try {
        // User keys dari memory
        const userKeys = Array.from(deviceSessions.entries()).map(([key, data]) => ({
            key,
            username: data.username,
            limit: data.limit,
            createdAt: data.createdAt,
            lastActivity: new Date(data.lastActivity).toLocaleString(),
            isActive: Date.now() - data.lastActivity < 30 * 60 * 1000,
            type: 'user'
        }));
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Reseller keys dari database
        const { data: resellerKeysData, error: resellerError } = await supabase
            .from('reseller_key')
            .select(`
                key,
                reseller_username,
                device_id,
                last_activity,
                created_at,
                reseller_user (
                    username,
                    total_limit,
                    used_slots
                )
            `);
        
        let resellerKeys = [];
        if (!resellerError && resellerKeysData) {
            resellerKeys = resellerKeysData.map((keyData) => ({
                key: keyData.key,
                username: keyData.reseller_username,
                limit: keyData.reseller_user.total_limit,
                usedSlots: keyData.reseller_user.used_slots,
                createdAt: new Date(keyData.created_at).toLocaleString(),
                lastActivity: keyData.last_activity ? new Date(keyData.last_activity).toLocaleString() : 'Never',
                isActive: keyData.last_activity && (Date.now() - new Date(keyData.last_activity).getTime()) < 30 * 60 * 1000,
                type: 'reseller'
            }));
        }
        
        const allKeys = [...userKeys, ...resellerKeys];
        
        res.json({
            success: true,
            data: allKeys
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// Update user limit
app.put('/api/admin/update-limit', requireAdminAuth, (req, res) => {
    const { key, newLimit } = req.body;
    
    if (!key || !newLimit) {
        return res.status(400).json({
            success: false,
            message: 'Key dan limit baru diperlukan'
        });
    }
    
    const keyData = deviceSessions.get(key);
    if (!keyData) {
        return res.status(404).json({
            success: false,
            message: 'Key tidak ditemukan'
        });
    }
    
    keyData.limit = parseInt(newLimit);
    
    res.json({
        success: true,
        message: 'Limit berhasil diupdate',
        data: {
            key,
            username: keyData.username,
            newLimit: parseInt(newLimit)
        }
    });
});

// User login dengan key
app.post('/api/user/login', (req, res) => {
    const { key } = req.body;
    const deviceId = getDeviceId(req);
    
    if (!key) {
        return res.status(400).json({
            success: false,
            message: 'Key diperlukan'
        });
    }
    
    const keyData = deviceSessions.get(key);
    if (!keyData) {
        return res.status(404).json({
            success: false,
            message: 'Key tidak valid'
        });
    }
    
    if (!isDeviceAllowed(key, deviceId)) {
        return res.status(403).json({
            success: false,
            message: 'Device limit exceeded atau session expired. Coba lagi dalam 30 menit.'
        });
    }
    
    // Set user session
    req.session.userAuthenticated = true;
    req.session.userKey = key;
    req.session.username = keyData.username;
    
    res.json({
        success: true,
        message: 'Login berhasil',
        data: {
            username: keyData.username,
            limit: keyData.limit
        }
    });
});

// User logout
app.post('/api/user/logout', (req, res) => {
    const key = req.session.userKey;
    
    if (key && deviceSessions.has(key)) {
        // Reset device untuk allow login di device lain
        const keyData = deviceSessions.get(key);
        keyData.deviceId = null;
        keyData.lastActivity = 0;
    }
    
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Gagal logout' 
            });
        }
        res.json({ 
            success: true, 
            message: 'Logout berhasil!' 
        });
    });
});

// Cek status user
app.get('/api/user/status', (req, res) => {
    const isAuthenticated = !!(req.session && req.session.userAuthenticated);
    let userData = null;
    
    if (isAuthenticated) {
        const key = req.session.userKey;
        const keyData = deviceSessions.get(key);
        if (keyData) {
            userData = {
                username: keyData.username,
                limit: keyData.limit
            };
        }
    }
    
    res.json({ 
        authenticated: isAuthenticated,
        user: userData
    });
});

// ===== RESELLER ENDPOINTS =====

// Reseller login
app.post('/api/reseller/login', async (req, res) => {
    try {
        const { key } = req.body;
        const deviceId = getDeviceId(req);
        
        if (!key) {
            return res.status(400).json({
                success: false,
                message: 'Key diperlukan'
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Cek key di database
        const { data: keyData, error: keyError } = await supabase
            .from('reseller_key')
            .select(`
                key,
                reseller_username,
                device_id,
                last_activity,
                reseller_user (
                    username,
                    total_limit,
                    used_slots
                )
            `)
            .eq('key', key)
            .single();
        
        if (keyError || !keyData) {
            return res.status(404).json({
                success: false,
                message: 'Key tidak valid'
            });
        }
        
        // Cek device binding
        const now = Date.now();
        if (keyData.device_id && keyData.device_id !== deviceId) {
            // Cek apakah sudah 30 menit
            if (keyData.last_activity && (now - new Date(keyData.last_activity).getTime()) < 30 * 60 * 1000) {
                return res.status(403).json({
                    success: false,
                    message: 'Key sedang digunakan di device lain atau session expired. Coba lagi dalam 30 menit.'
                });
            }
        }
        
        // Update device dan last activity
        await supabase
            .from('reseller_key')
            .update({
                device_id: deviceId,
                last_activity: new Date().toISOString()
            })
            .eq('key', key);
        
        // Set reseller session
        req.session.resellerAuthenticated = true;
        req.session.resellerKey = key;
        req.session.resellerUsername = keyData.reseller_username;
        
        res.json({
            success: true,
            message: 'Login reseller berhasil',
            data: {
                username: keyData.reseller_username,
                limit: keyData.reseller_user.total_limit,
                usedSlots: keyData.reseller_user.used_slots
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// Reseller logout
app.post('/api/reseller/logout', async (req, res) => {
    try {
        const key = req.resellerKey || req.session.resellerKey;
        
        if (key) {
            // Import Supabase client
            const { createClient } = require('@supabase/supabase-js');
            const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            
            // Reset device di database untuk allow login di device lain
            await supabase
                .from('reseller_key')
                .update({
                    device_id: null,
                    last_activity: null
                })
                .eq('key', key);
            
            // Reset juga di memory untuk backward compatibility
            if (resellerSessions.has(key)) {
                const resellerData = resellerSessions.get(key);
                resellerData.deviceId = null;
                resellerData.lastActivity = 0;
            }
        }
        
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Gagal logout' 
                });
            }
            res.json({ 
                success: true, 
                message: 'Reseller logout berhasil!' 
            });
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan: ' + error.message 
        });
    }
});

// Get reseller stats
app.get('/api/reseller/stats', requireResellerAuth, async (req, res) => {
    try {
        const resellerKey = req.resellerKey;
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Ambil data reseller dari database
        const { data: resellerData, error: resellerError } = await supabase
            .from('reseller_key')
            .select(`
                reseller_username,
                reseller_user (
                    username,
                    total_limit,
                    used_slots
                )
            `)
            .eq('key', resellerKey)
            .single();
        
        if (resellerError || !resellerData) {
            return res.status(404).json({
                success: false,
                message: 'Reseller data tidak ditemukan'
            });
        }
        
        const usedSlots = resellerData.reseller_user.used_slots;
        const remainingSlots = Math.max(0, resellerData.reseller_user.total_limit - usedSlots);
        
        res.json({
            success: true,
            data: {
                username: resellerData.reseller_username,
                limit: resellerData.reseller_user.total_limit,
                usedSlots,
                remainingSlots
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// Get reseller users
app.get('/api/reseller/users', requireResellerAuth, async (req, res) => {
    try {
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Ambil semua user dari whitelist
        const { data, error } = await supabase
            .from('whitelist')
            .select('username')
            .order('username');
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Gagal mengambil data user: ' + error.message
            });
        }
        
        res.json({
            success: true,
            data: data || []
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// Add user by reseller
app.post('/api/reseller/add-user', requireResellerAuth, async (req, res) => {
    try {
        const { username } = req.body;
        const resellerKey = req.resellerKey;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username diperlukan'
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Ambil data reseller dari database
        const { data: resellerData, error: resellerError } = await supabase
            .from('reseller_key')
            .select(`
                reseller_username,
                reseller_user (
                    username,
                    total_limit,
                    used_slots
                )
            `)
            .eq('key', resellerKey)
            .single();
        
        if (resellerError || !resellerData) {
            return res.status(404).json({
                success: false,
                message: 'Reseller data tidak ditemukan'
            });
        }
        
        // Cek limit
        const usedSlots = resellerData.reseller_user.used_slots;
        const totalLimit = resellerData.reseller_user.total_limit;
        
        if (usedSlots >= totalLimit) {
            return res.status(403).json({
                success: false,
                message: `Limit whitelist tercapai (${totalLimit}). Tidak bisa menambah lagi.`
            });
        }
        
        // Cek apakah username sudah ada
        const { data: existing, error: checkError } = await supabase
            .from('whitelist')
            .select('username')
            .eq('username', username)
            .single();
        
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Username "${username}" sudah ada di whitelist!`
            });
        }
        
        // Tambah username baru ke whitelist
        const { data, error } = await supabase
            .from('whitelist')
            .insert([{ username: username }])
            .select();
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Gagal menambah ke whitelist: ' + error.message
            });
        }
        
        // Update used_slots di reseller_user
        const { error: updateError } = await supabase
            .from('reseller_user')
            .update({ used_slots: usedSlots + 1 })
            .eq('username', resellerData.reseller_username);
        
        if (updateError) {
            // Rollback whitelist jika update reseller gagal
            await supabase
                .from('whitelist')
                .delete()
                .eq('username', username);
            
            return res.status(500).json({
                success: false,
                message: 'Gagal update limit reseller: ' + updateError.message
            });
        }
        
        res.json({
            success: true,
            message: `Username "${username}" berhasil ditambahkan ke whitelist! Limit tersisa: ${totalLimit - usedSlots - 1}`
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// Delete user by reseller
app.delete('/api/reseller/delete-user', requireResellerAuth, async (req, res) => {
    try {
        const { username } = req.body;
        const resellerKey = req.resellerKey;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username diperlukan'
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Ambil data reseller dari database
        const { data: resellerData, error: resellerError } = await supabase
            .from('reseller_key')
            .select(`
                reseller_username,
                reseller_user (
                    username,
                    total_limit,
                    used_slots
                )
            `)
            .eq('key', resellerKey)
            .single();
        
        if (resellerError || !resellerData) {
            return res.status(404).json({
                success: false,
                message: 'Reseller data tidak ditemukan'
            });
        }
        
        // Hapus dari whitelist
        const { data, error } = await supabase
            .from('whitelist')
            .delete()
            .eq('username', username)
            .select();
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Gagal menghapus dari whitelist: ' + error.message
            });
        }
        
        if (data && data.length > 0) {
            // Update used_slots di reseller_user (kurangi 1)
            const usedSlots = resellerData.reseller_user.used_slots;
            const { error: updateError } = await supabase
                .from('reseller_user')
                .update({ used_slots: Math.max(0, usedSlots - 1) })
                .eq('username', resellerData.reseller_username);
            
            if (updateError) {
                return res.status(500).json({
                    success: false,
                    message: 'Gagal update limit reseller: ' + updateError.message
                });
            }
            
            res.json({
                success: true,
                message: `Username "${username}" berhasil dihapus dari whitelist!`
            });
        } else {
            res.status(404).json({
                success: false,
                message: `Username "${username}" tidak ditemukan di whitelist!`
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// Check user by reseller
app.get('/api/reseller/check-user', requireResellerAuth, async (req, res) => {
    try {
        const { username } = req.query;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username diperlukan'
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const { data, error } = await supabase
            .from('whitelist')
            .select('username')
            .eq('username', username)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            return res.status(500).json({
                success: false,
                message: 'Gagal mengecek whitelist: ' + error.message
            });
        }
        
        if (data) {
            res.json({
                success: true,
                message: `Username "${username}" ADA di whitelist!`,
                data: { found: true }
            });
        } else {
            res.json({
                success: true,
                message: `Username "${username}" TIDAK ADA di whitelist!`,
                data: { found: false }
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// Upgrade reseller limit
app.post('/api/reseller/upgrade-limit', requireResellerAuth, async (req, res) => {
    try {
        const { upgradeKey } = req.body;
        const resellerKey = req.resellerKey;
        
        if (!upgradeKey) {
            return res.status(400).json({
                success: false,
                message: 'Upgrade key diperlukan'
            });
        }
        
        // Cek apakah upgrade key valid
        const upgradeData = upgradeKeys.get(upgradeKey);
        if (!upgradeData) {
            return res.status(404).json({
                success: false,
                message: 'Upgrade key tidak valid'
            });
        }
        
        if (upgradeData.used) {
            return res.status(400).json({
                success: false,
                message: 'Upgrade key sudah digunakan'
            });
        }
        
        if (upgradeData.resellerKey !== resellerKey) {
            return res.status(403).json({
                success: false,
                message: 'Upgrade key tidak cocok dengan reseller key Anda'
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Ambil data reseller dari database
        const { data: resellerData, error: resellerError } = await supabase
            .from('reseller_key')
            .select(`
                reseller_username,
                reseller_user (
                    username,
                    total_limit,
                    used_slots
                )
            `)
            .eq('key', resellerKey)
            .single();
        
        if (resellerError || !resellerData) {
            return res.status(404).json({
                success: false,
                message: 'Reseller data tidak ditemukan'
            });
        }
        
        const currentLimit = resellerData.reseller_user.total_limit;
        const newLimit = currentLimit + 25;
        
        // Update limit di database
        const { error: updateError } = await supabase
            .from('reseller_user')
            .update({ total_limit: newLimit })
            .eq('username', resellerData.reseller_username);
        
        if (updateError) {
            return res.status(500).json({
                success: false,
                message: 'Gagal update limit: ' + updateError.message
            });
        }
        
        // Update juga di memory untuk backward compatibility
        const memoryResellerData = resellerSessions.get(resellerKey);
        if (memoryResellerData) {
            memoryResellerData.limit = newLimit;
        }
        
        // Mark upgrade key as used
        upgradeData.used = true;
        upgradeData.usedAt = new Date().toISOString();
        
        res.json({
            success: true,
            message: 'Limit berhasil diupgrade!',
            data: {
                newLimit,
                addedSlots: 25
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// Serve halaman admin login
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// Serve halaman admin
app.get('/admin', requireAdminAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});


// Serve halaman reseller login
app.get('/reseller-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reseller-login.html'));
});

// Serve halaman reseller dashboard
app.get('/reseller-dashboard', (req, res) => {
    if (req.session && req.session.resellerAuthenticated) {
        res.sendFile(path.join(__dirname, 'public', 'reseller-dashboard.html'));
    } else {
        res.redirect('/reseller-login');
    }
});

// Serve halaman utama
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// API endpoint untuk mendapatkan konfigurasi Supabase (dilindungi dengan key)
app.get('/api/config', requireKeyAuth, (req, res) => {
    const config = {
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_ANON_KEY
    };
    
    res.json(config);
});

// Admin whitelist operations (tidak perlu key auth)
app.post('/api/whitelist/add', requireAdminAuth, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username diperlukan'
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Cek apakah username sudah ada
        const { data: existing, error: checkError } = await supabase
            .from('whitelist')
            .select('username')
            .eq('username', username)
            .single();
        
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Username "${username}" sudah ada di whitelist!`
            });
        }
        
        // Tambah username baru
        const { data, error } = await supabase
            .from('whitelist')
            .insert([{ username: username }])
            .select();
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Gagal menambah ke whitelist: ' + error.message
            });
        }
        
        res.json({
            success: true,
            message: `Username "${username}" berhasil ditambahkan ke whitelist!`
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

app.delete('/api/whitelist/delete', requireAdminAuth, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username diperlukan'
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const { data, error } = await supabase
            .from('whitelist')
            .delete()
            .eq('username', username)
            .select();
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Gagal menghapus dari whitelist: ' + error.message
            });
        }
        
        if (data && data.length > 0) {
            res.json({
                success: true,
                message: `Username "${username}" berhasil dihapus dari whitelist!`
            });
        } else {
            res.status(404).json({
                success: false,
                message: `Username "${username}" tidak ditemukan di whitelist!`
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

app.get('/api/whitelist/check', requireAdminAuth, async (req, res) => {
    try {
        const { username } = req.query;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username diperlukan'
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const { data, error } = await supabase
            .from('whitelist')
            .select('username')
            .eq('username', username)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            return res.status(500).json({
                success: false,
                message: 'Gagal mengecek whitelist: ' + error.message
            });
        }
        
        if (data) {
            res.json({
                success: true,
                message: `Username "${username}" ADA di whitelist!`,
                found: true
            });
        } else {
            res.json({
                success: true,
                message: `Username "${username}" TIDAK ADA di whitelist!`,
                found: false
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// Whitelist operations (dilindungi dengan key)
app.post('/api/whitelist/add', requireKeyAuth, async (req, res) => {
    try {
        const { username } = req.body;
        const key = req.key;
        const keyData = deviceSessions.get(key);
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username diperlukan'
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Cek limit
        const { data: currentCount, error: countError } = await supabase
            .from('whitelist')
            .select('count', { count: 'exact', head: true });
        
        if (countError) {
            return res.status(500).json({
                success: false,
                message: 'Gagal mengecek limit: ' + countError.message
            });
        }
        
        if (currentCount >= keyData.limit) {
            return res.status(403).json({
                success: false,
                message: `Limit whitelist tercapai (${keyData.limit}). Tidak bisa menambah lagi.`
            });
        }
        
        // Cek apakah username sudah ada
        const { data: existing, error: checkError } = await supabase
            .from('whitelist')
            .select('username')
            .eq('username', username)
            .single();
        
        if (existing) {
            return res.status(400).json({
                success: false,
                message: `Username "${username}" sudah ada di whitelist!`
            });
        }
        
        // Tambah username baru
        const { data, error } = await supabase
            .from('whitelist')
            .insert([{ username: username }])
            .select();
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Gagal menambah ke whitelist: ' + error.message
            });
        }
        
        res.json({
            success: true,
            message: `Username "${username}" berhasil ditambahkan ke whitelist!`
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

app.delete('/api/whitelist/delete', requireKeyAuth, async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username diperlukan'
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const { data, error } = await supabase
            .from('whitelist')
            .delete()
            .eq('username', username)
            .select();
        
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Gagal menghapus dari whitelist: ' + error.message
            });
        }
        
        if (data && data.length > 0) {
            res.json({
                success: true,
                message: `Username "${username}" berhasil dihapus dari whitelist!`
            });
        } else {
            res.status(404).json({
                success: false,
                message: `Username "${username}" tidak ditemukan di whitelist!`
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

app.get('/api/whitelist/check', requireKeyAuth, async (req, res) => {
    try {
        const { username } = req.query;
        
        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'Username diperlukan'
            });
        }
        
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        const { data, error } = await supabase
            .from('whitelist')
            .select('username')
            .eq('username', username)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            return res.status(500).json({
                success: false,
                message: 'Gagal mengecek whitelist: ' + error.message
            });
        }
        
        if (data) {
            res.json({
                success: true,
                message: `Username "${username}" ADA di whitelist!`,
                found: true
            });
        } else {
            res.json({
                success: true,
                message: `Username "${username}" TIDAK ADA di whitelist!`,
                found: false
            });
        }
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan: ' + error.message
        });
    }
});

// Raw endpoint untuk menampilkan username dalam format JSON (PUBLIC ACCESS - tidak memerlukan API key)
app.get('/raw', async (req, res) => {
    try {
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Ambil semua username dari database
        const { data, error } = await supabase
            .from('whitelist')
            .select('username')
            .order('username');
        
        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }
        
        // Format username dalam JSON sesuai format yang diminta
        const usernames = data.map(item => item.username);
        const jsonResponse = {
            "whitelisted_users": usernames,
            "info": {
                "last_updated": new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
                "total_users": usernames.length,
                "contact": "085351187520",
                "price_extend": "25k"
            },
            "kick_message": {
                "title": "KAMU TIDAK TERWHITELIST DI DB",
                "main_text": "Garansi Habis atau Belum Beli Script",
                "price_info": "Harga Extend: 25k",
                "contact": "WA: 085351187520",
                "show_username": true
            }
        };
        
        // Set header untuk JSON
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        
        // Kirim response dengan pretty print
        res.send(JSON.stringify(jsonResponse, null, 2));
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Raw endpoint dengan API key (untuk user yang memerlukan autentikasi)
app.get('/raw/secure', requireKeyAuth, async (req, res) => {
    try {
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Ambil semua username dari database
        const { data, error } = await supabase
            .from('whitelist')
            .select('username')
            .order('username');
        
        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }
        
        // Format username dalam JSON sesuai format yang diminta
        const usernames = data.map(item => item.username);
        const jsonResponse = {
            "whitelisted_users": usernames,
            "info": {
                "last_updated": new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
                "total_users": usernames.length,
                "contact": "085351187520",
                "price_extend": "25k"
            },
            "kick_message": {
                "title": "KAMU TIDAK TERWHITELIST DI DB",
                "main_text": "Garansi Habis atau Belum Beli Script",
                "price_info": "Harga Extend: 25k",
                "contact": "WA: 085351187520",
                "show_username": true
            }
        };
        
        // Set header untuk JSON
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        
        // Kirim response dengan pretty print
        res.send(JSON.stringify(jsonResponse, null, 2));
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Raw endpoint untuk admin (tidak memerlukan key auth)
app.get('/admin/raw', requireAdminAuth, async (req, res) => {
    try {
        // Import Supabase client
        const { createClient } = require('@supabase/supabase-js');
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Ambil semua username dari database
        const { data, error } = await supabase
            .from('whitelist')
            .select('username')
            .order('username');
        
        if (error) {
            return res.status(500).json({
                error: error.message
            });
        }
        
        // Format username dalam JSON sesuai format yang diminta
        const usernames = data.map(item => item.username);
        const jsonResponse = {
            "whitelisted_users": usernames,
            "info": {
                "last_updated": new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
                "total_users": usernames.length,
                "contact": "085351187520",
                "price_extend": "25k"
            },
            "kick_message": {
                "title": "KAMU TIDAK TERWHITELIST DI DB",
                "main_text": "Garansi Habis atau Belum Beli Script",
                "price_info": "Harga Extend: 25k",
                "contact": "WA: 085351187520",
                "show_username": true
            }
        };
        
        // Set header untuk JSON
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        
        // Kirim response dengan pretty print
        res.send(JSON.stringify(jsonResponse, null, 2));
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        activeKeys: deviceSessions.size
    });
});

// Auto cleanup expired sessions setiap 5 menit
setInterval(() => {
    const now = Date.now();
    
    // Cleanup device sessions
    for (const [key, data] of deviceSessions.entries()) {
        if (now - data.lastActivity > 30 * 60 * 1000) {
            deviceSessions.delete(key);
            console.log(`Auto cleanup: Device key ${key} expired`);
        }
    }
    
    // Cleanup reseller sessions
    for (const [key, data] of resellerSessions.entries()) {
        if (data.lastActivity > 0 && now - data.lastActivity > 30 * 60 * 1000) {
            resellerSessions.delete(key);
            console.log(`Auto cleanup: Reseller key ${key} expired`);
        }
    }
    
    // Cleanup expired upgrade keys (24 jam)
    for (const [key, data] of upgradeKeys.entries()) {
        if (now - new Date(data.createdAt).getTime() > 24 * 60 * 60 * 1000) {
            upgradeKeys.delete(key);
            console.log(`Auto cleanup: Upgrade key ${key} expired`);
        }
    }
}, 5 * 60 * 1000);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Reseller Whitelist Server berjalan di port ${PORT}`);
    console.log(`👑 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`👤 User Login: http://localhost:${PORT}/login`);
    console.log(`🏪 Reseller Login: http://localhost:${PORT}/reseller-login`);
    console.log(`🔗 Raw Link (Public): http://localhost:${PORT}/raw (no API key required)`);
    console.log(`🔗 Raw Link (Secure): http://localhost:${PORT}/raw/secure (requires API key)`);
    console.log(`🔗 Raw Link (Admin): http://localhost:${PORT}/admin/raw (requires admin login)`);
    
    // Cek environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
        console.log('🔧 Menggunakan konfigurasi default Supabase');
        console.log('📝 URL:', SUPABASE_URL);
        console.log('🔑 Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
    } else {
        console.log('✅ Menggunakan environment variables');
    }
});


