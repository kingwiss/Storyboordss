const { db } = require('./database');

console.log('Checking database for articles with image URLs...');

db.all('SELECT id, title, image_urls, created_at FROM user_audiobooks ORDER BY created_at DESC LIMIT 5', (err, rows) => {
    if (err) {
        console.error('Error querying database:', err);
        return;
    }
    
    console.log(`Found ${rows.length} articles:`);
    
    rows.forEach((row, index) => {
        console.log(`\n--- Article ${index + 1} ---`);
        console.log('ID:', row.id);
        console.log('Title:', row.title);
        console.log('Created:', row.created_at);
        console.log('Image URLs (raw):', row.image_urls);
        
        try {
            const imageUrls = JSON.parse(row.image_urls || '[]');
            console.log('Parsed Image URLs:', imageUrls);
            console.log('Number of images:', imageUrls.length);
            
            if (imageUrls.length > 0) {
                imageUrls.forEach((url, i) => {
                    console.log(`  Image ${i + 1}: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
                });
            } else {
                console.log('  No images found');
            }
        } catch (e) {
            console.log('Error parsing image URLs:', e.message);
        }
    });
    
    if (rows.length === 0) {
        console.log('No articles found in database');
    }
    
    process.exit(0);
});