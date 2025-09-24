#!/usr/bin/env node
// Auto cache-busting script for Kelist
// Updates version numbers in index.html to force browser cache refresh

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'static', 'index.html');
const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 12);

console.log('🔄 Updating cache-busting version...');

try {
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Replace version parameters
    content = content.replace(/\?v=[\w\-]+/g, `?v=${timestamp}`);
    
    fs.writeFileSync(indexPath, content, 'utf8');
    console.log(`✅ Updated version to: ${timestamp}`);
    console.log('📁 File updated:', indexPath);
} catch (error) {
    console.error('❌ Error updating version:', error);
    process.exit(1);
}
