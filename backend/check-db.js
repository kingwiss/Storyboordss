const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('users.db');

console.log('Checking database contents...');

// Check articles
db.all('SELECT id, user_id, title, created_at FROM user_audiobooks ORDER BY created_at DESC', (err, rows) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('\nArticles in database:');
    console.log('Total articles:', rows.length);
    rows.forEach(row => {
      console.log(`ID: ${row.id}, User ID: ${row.user_id}, Title: ${row.title}, Created: ${row.created_at}`);
    });
  }
  
  // Check users
  db.all('SELECT id, username, email FROM users', (err, users) => {
    if (err) {
      console.error('Users database error:', err);
    } else {
      console.log('\nUsers in database:');
      users.forEach(user => {
        console.log(`User ID: ${user.id}, Username: ${user.username}, Email: ${user.email}`);
      });
    }
    
    db.close();
  });
});