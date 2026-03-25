const db = require('./db');
const bcrypt = require('bcrypt');

const username = 'admin';
const password = 'admin123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;

  db.run(
    `
    INSERT INTO users (username, password_hash, role)
    VALUES (?, ?, ?)
    `,
    [username, hash, 'super_admin'],
    function (err) {
      if (err) {
        console.error(err.message);
        return;
      }

      console.log('Admin user created');
      process.exit();
    }
  );
});