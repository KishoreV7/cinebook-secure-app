const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'mysecret',
  resave: false,
  saveUninitialized: true
}));

function getDB() {
  const data = fs.readFileSync('./database.json', 'utf8');
  return JSON.parse(data);
}

function saveDB(data) {
  fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));
}

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDB();

  const user = db.users.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.redirect('/dashboard');
  } else {
    res.render('login', { error: 'Invalid username or password' });
  }
});

app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

app.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  const db = getDB();

  const exists = db.users.find(u => u.username === username);
  if (exists) {
    return res.render('register', { error: 'Username already taken' });
  }

  const newUser = {
    id: Date.now(),
    username: username,
    email: email,
    password: password,
    role: 'user'
  };

  db.users.push(newUser);
  saveDB(db);
  res.redirect('/login');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('dashboard', { user: req.session.user });
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.get('/movies', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const db = getDB();
  res.render('movies', { movies: db.movies, user: req.session.user });
});

app.post('/book', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { movieId, seats } = req.body;
  const db = getDB();

  const movie = db.movies.find(m => m.id == movieId);
  if (!movie) return res.redirect('/movies');

  const booking = {
    id: Date.now(),
    userId: req.session.user.id,
    username: req.session.user.username,
    movieTitle: movie.title,
    seats: seats,
    totalPrice: movie.price * seats,
    date: new Date().toISOString()
  };

  db.bookings.push(booking);
  movie.seats -= seats;
  saveDB(db);

  res.render('booking-confirmation', { booking: booking });
});

app.get('/my-bookings', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const db = getDB();
  const myBookings = db.bookings.filter(b => b.userId === req.session.user.id);
  res.render('my-bookings', { bookings: myBookings, user: req.session.user });
});

app.post('/admin/add-movie', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { title, genre, price, seats } = req.body;
  const db = getDB();

  const newMovie = {
    id: Date.now(),
    title: title,
    genre: genre,
    price: parseFloat(price),
    seats: parseInt(seats)
  };

  db.movies.push(newMovie);
  saveDB(db);
  res.redirect('/admin');
});

app.post('/admin/delete-movie', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { movieId } = req.body;
  const db = getDB();
  db.movies = db.movies.filter(m => m.id != movieId);
  saveDB(db);
  res.redirect('/admin');
});

app.get('/admin', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const db = getDB();
  res.render('admin', { movies: db.movies, user: req.session.user, error: null });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});