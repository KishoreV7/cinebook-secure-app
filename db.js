const Database = require('better-sqlite3');
const db = new Database('cinebook.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    price REAL NOT NULL,
    seats INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    username TEXT NOT NULL,
    movieTitle TEXT NOT NULL,
    seats INTEGER NOT NULL,
    totalPrice REAL NOT NULL,
    date TEXT NOT NULL
  );
`);

const existingMovies = db.prepare('SELECT COUNT(*) as count FROM movies').get();
if (existingMovies.count === 0) {
  const insert = db.prepare('INSERT INTO movies (title, genre, price, seats) VALUES (?, ?, ?, ?)');
  insert.run('Avengers Endgame', 'Action', 12.50, 50);
  insert.run('The Lion King', 'Animation', 10.00, 30);
  insert.run('Inception', 'Sci-Fi', 11.00, 40);
}

module.exports = db;