const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'boards.json');

// CORS configuration for production with your Lightsail IP
const corsOptions = {
    origin: [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'https://localhost:3000',
        // Your AWS Amplify domain (update when you get it)
        'https://main.d*.amplifyapp.com',
        'https://*.amplifyapp.com',
        // Allow your Lightsail server IP
        'http://18.141.202.4:3000',
        'https://18.141.202.4:3000',
        // Add your custom domain if you have one
        'https://kelist.your-domain.com'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.static('static')); // Serve static files from 'static' directory

// Ensure data directory exists
fs.ensureDirSync(path.dirname(DATA_FILE));

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeJsonSync(DATA_FILE, []);
}

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/boards', async (req, res) => {
    try {
        const boards = await fs.readJson(DATA_FILE);
        res.json(boards);
    } catch (error) {
        console.error('Error reading boards:', error);
        res.status(500).json({ error: 'Failed to read boards' });
    }
});

app.post('/api/boards', async (req, res) => {
    try {
        const boards = req.body;
        
        // Validate data structure
        if (!Array.isArray(boards)) {
            return res.status(400).json({ error: 'Invalid data format' });
        }
        
        // Add sync timestamp
        const syncData = {
            boards: boards,
            lastSync: new Date().toISOString(),
            syncId: Date.now().toString()
        };
        
        await fs.writeJson(DATA_FILE, boards);
        
        // Also save sync metadata
        const metaFile = path.join(__dirname, 'data', 'sync-meta.json');
        await fs.writeJson(metaFile, syncData);
        
        res.json({ 
            success: true, 
            syncId: syncData.syncId,
            timestamp: syncData.lastSync 
        });
    } catch (error) {
        console.error('Error saving boards:', error);
        res.status(500).json({ error: 'Failed to save boards' });
    }
});

app.get('/api/sync-info', async (req, res) => {
    try {
        const metaFile = path.join(__dirname, 'data', 'sync-meta.json');
        if (await fs.pathExists(metaFile)) {
            const syncMeta = await fs.readJson(metaFile);
            res.json(syncMeta);
        } else {
            res.json({ lastSync: null, syncId: null });
        }
    } catch (error) {
        console.error('Error reading sync info:', error);
        res.status(500).json({ error: 'Failed to read sync info' });
    }
});

// Backup functionality
app.post('/api/backup', async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(__dirname, 'data', 'backups', `boards-${timestamp}.json`);
        
        const boards = await fs.readJson(DATA_FILE);
        await fs.ensureDir(path.dirname(backupFile));
        await fs.writeJson(backupFile, boards);
        
        res.json({ success: true, backupFile: `boards-${timestamp}.json` });
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// Serve the Kelist app
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(__dirname));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🌸 Kelist Server running on http://localhost:${PORT}`);
    console.log(`📊 Data stored in: ${DATA_FILE}`);
    console.log(`🔄 Sync API available at: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Server shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Server shutting down gracefully...');
    process.exit(0);
});
