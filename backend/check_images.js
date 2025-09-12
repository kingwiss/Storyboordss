const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking recent articles and their image URLs...');

db.all('SELECT id, title, image_urls, created_at FROM user_audiobooks ORDER BY created_at DESC LIMIT 5', (err, rows) => {
    if (err) {
        console.error('Error querying database:', err);
        return;
    }
    
    console.log('\nFound', rows.length, 'recent articles:');
    
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
                    console.log(`  Image ${i + 1}: ${url}`);
                });
            } else {
                console.log('  No images found');
            }
        } catch (parseError) {
            console.log('Error parsing image URLs:', parseError.message);
        }
    });
    
    db.close();
});