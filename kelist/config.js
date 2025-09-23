// Kelist Configuration
// Updated with your Lightsail server details

const CONFIG = {
    // Production server URL (your Lightsail server)
    PRODUCTION_API_URL: 'http://18.141.202.4:3000/api',
    
    // Development server URL (for local testing)
    DEVELOPMENT_API_URL: 'http://localhost:3000/api',
    
    // Auto-detect environment
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : window.location.hostname === 'www.kelxd.lol'
        ? 'http://18.141.202.4:3000/api'
        : 'http://18.141.202.4:3000/api',
    
    // Sync settings
    SYNC_INTERVAL: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // 2 seconds
};

// Export for use in other files
window.KELIST_CONFIG = CONFIG;
