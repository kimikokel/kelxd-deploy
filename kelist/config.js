const CONFIG = {
    // Production server URL (your Lightsail server)
    PRODUCTION_API_URL: 'http://18.141.202.4:80/api',
    
    // Development server URL (for local testing)
    DEVELOPMENT_API_URL: 'http://localhost:3000/api',
    
    // Auto-detect environment - USE VERCEL PROXY, NOT DIRECT IP
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : 'https://www.kelxd.lol/api',  // ✅ This goes through Vercel proxy
    
    // Sync settings
    SYNC_INTERVAL: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 2000, // 2 seconds
};

// Debug logging - REMOVE AFTER FIXING
console.log('🔧 Kelist Config Debug:');
console.log('- Current URL:', window.location.href);
console.log('- Hostname:', window.location.hostname);
console.log('- API URL being used:', CONFIG.API_URL);
console.log('- Is localhost?', window.location.hostname === 'localhost');

// Export for use in other files
window.KELIST_CONFIG = CONFIG;