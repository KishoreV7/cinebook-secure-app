const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const helmet = require('helmet');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const csrfProtection = csrf({ cookie: false });
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts. Please try again after 15 minutes.'
});

const app = express();

app.use(helmet());
app.use(helmet.xssFilter());
app.use(helmet.noSniff());
app.use(helmet.frameguard({ action: 'deny' }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'cinebook$secret#2024!xK9mN3pQ',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60
  }
}));

app.get('/', (req, res) => {
  res.redirect('/login');
});

app.get('/login', csrfProtection, (req, res) => {
  res.render('login', { error: null, csrfToken: req.csrfToken() });
});

app.post('/login', loginLimiter, csrfProtection, [
  body('username').trim().escape(),
  body('password').trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('login', { error: 'Invalid input', csrfToken: req.csrfToken() });
  }

  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (user && await bcrypt.compare(password, user.password)) {
    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.redirect('/dashboard');
  } else {
    res.render('login', { error: 'Invalid username or password', csrfToken: req.csrfToken() });
  }
});

app.get('/register', csrfProtection, (req, res) => {
  res.render('register', { error: null, csrfToken: req.csrfToken() });
});

app.post('/register', csrfProtection, [
  body('username').trim().isLength({ min: 3 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('register', { error: errors.array()[0].msg, csrfToken: req.csrfToken() });
  }

  const { username, password, email } = req.body;

  const exists = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.render('register', { error: 'Username already taken', csrfToken: req.csrfToken() });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  db.prepare('INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)').run(username, email, hashedPassword, 'user');

  res.redirect('/login');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('dashboard', { user: req.session.user });
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

app.get('/movies', csrfProtection, (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const movies = db.prepare('SELECT * FROM movies').all();
  res.render('movies', { movies: movies, user: req.session.user, csrfToken: req.csrfToken() });
});

app.post('/book', csrfProtection, (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { movieId, seats } = req.body;
  const seatCount = parseInt(seats);

  const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(movieId);
  if (!movie) return res.redirect('/movies');

  if (isNaN(seatCount) || seatCount < 1 || seatCount > 10) {
    return res.redirect('/movies');
  }

  if (seatCount > movie.seats) {
    return res.redirect('/movies');
  }

  const date = new Date().toISOString();
  const totalPrice = movie.price * seatCount;

  db.prepare('INSERT INTO bookings (userId, username, movieTitle, seats, totalPrice, date) VALUES (?, ?, ?, ?, ?, ?)').run(
    req.session.user.id,
    req.session.user.username,
    movie.title,
    seatCount,
    totalPrice,
    date
  );

  db.prepare('UPDATE movies SET seats = seats - ? WHERE id = ?').run(seatCount, movieId);

  const booking = {
    movieTitle: movie.title,
    seats: seatCount,
    totalPrice: totalPrice,
    id: Date.now(),
    date: date
  };

  res.render('booking-confirmation', { booking: booking });
});

app.get('/my-bookings', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const myBookings = db.prepare('SELECT * FROM bookings WHERE userId = ?').all(req.session.user.id);
  res.render('my-bookings', { bookings: myBookings, user: req.session.user });
});

app.post('/admin/add-movie', csrfProtection, (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.role !== 'admin') return res.redirect('/dashboard');

  const { title, genre, price, seats } = req.body;
  db.prepare('INSERT INTO movies (title, genre, price, seats) VALUES (?, ?, ?, ?)').run(
    title,
    genre,
    parseFloat(price),
    parseInt(seats)
  );

  res.redirect('/admin');
});

app.post('/admin/delete-movie', csrfProtection, (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.role !== 'admin') return res.redirect('/dashboard');

  const { movieId } = req.body;
  db.prepare('DELETE FROM movies WHERE id = ?').run(movieId);
  res.redirect('/admin');
});

app.get('/admin', csrfProtection, (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  if (req.session.user.role !== 'admin') return res.redirect('/dashboard');

  const movies = db.prepare('SELECT * FROM movies').all();
  res.render('admin', { movies: movies, user: req.session.user, error: null, csrfToken: req.csrfToken() });
});

app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found!' });
});

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).render('error', { message: 'Invalid form submission. Please try again.' });
  }
  res.status(500).render('error', { message: 'Something went wrong!' });
});

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});