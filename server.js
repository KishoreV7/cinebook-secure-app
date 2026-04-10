// We're bringing in all the tools we installed
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs'); // fs = file system, lets us read/write files
const path = require('path');

const app = express(); // This creates our web application

// ---- SETUP ----

// Tell Express to use EJS as our "view engine" (for rendering HTML pages)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Tell Express to serve static files (like CSS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Tell Express to read form data
app.use(bodyParser.urlencoded({ extended: true }));

// ⚠️ INSECURE SESSION SETUP (we will fix this on Day 4)
// This stores sessions in memory and uses a weak secret
app.use(session({
  secret: 'mysecret', // ⚠️ SECURITY FLAW: weak, hardcoded secret
  resave: false,
  saveUninitialized: true,
  // ⚠️ SECURITY FLAW: no cookie settings, no expiry
}));

// ---- HELPER FUNCTIONS ----
// This function reads our database.json file and returns the data
function getDB() {
  const data = fs.readFileSync('./database.json', 'utf8');
  return JSON.parse(data);
}

// This function saves data back to database.json
function saveDB(data) {
  fs.writeFileSync('./database.json', JSON.stringify(data, null, 2));
}

// ---- ROUTES ----

// HOME PAGE - redirect to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// SHOW LOGIN PAGE
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// HANDLE LOGIN FORM SUBMISSION
// ⚠️ SECURITY FLAW: Plain text password comparison, no hashing
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = getDB();

  // Find user where username AND password match
  // ⚠️ SECURITY FLAW: passwords stored and compared in plain text
  const user = db.users.find(u => u.username === username && u.password === password);

  if (user) {
    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.redirect('/dashboard');
  } else {
    res.render('login', { error: 'Invalid username or password' });
  }
});

// SHOW REGISTER PAGE
app.get('/register', (req, res) => {
  res.render('register', { error: null });
});

// HANDLE REGISTER FORM SUBMISSION
// ⚠️ SECURITY FLAW: No input validation, password stored in plain text
app.post('/register', (req, res) => {
  const { username, password, email } = req.body;
  const db = getDB();

  // Check if username already exists
  const exists = db.users.find(u => u.username === username);
  if (exists) {
    return res.render('register', { error: 'Username already taken' });
  }

  // ⚠️ SECURITY FLAW: password stored as plain text!
  const newUser = {
    id: Date.now(),
    username: username, // ⚠️ No sanitization — XSS risk
    email: email,       // ⚠️ No email validation
    password: password, // ⚠️ Plain text password!
    role: 'user'
  };

  db.users.push(newUser);
  saveDB(db);

  res.redirect('/login');
});

// DASHBOARD - shows after login
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('dashboard', { user: req.session.user });
});

// LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// SHOW ALL MOVIES
app.get('/movies', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const db = getDB();
  res.render('movies', { movies: db.movies, user: req.session.user });
});

// BOOK A TICKET
// ⚠️ SECURITY FLAW: No validation on seat count, no CSRF protection
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
    seats: seats, // ⚠️ No validation — what if someone books 9999 seats?
    totalPrice: movie.price * seats,
    date: new Date().toISOString()
  };

  db.bookings.push(booking);
  movie.seats -= seats;
  saveDB(db);

  res.redirect('/my-bookings');
});

// VIEW MY BOOKINGS
app.get('/my-bookings', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const db = getDB();
  const myBookings = db.bookings.filter(b => b.userId === req.session.user.id);
  res.render('my-bookings', { bookings: myBookings, user: req.session.user });
});

// ADMIN: ADD MOVIE
// ⚠️ SECURITY FLAW: Only checks if logged in, not if user is admin
app.post('/admin/add-movie', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  // ⚠️ Missing: check if req.session.user.role === 'admin'

  const { title, genre, price, seats } = req.body;
  const db = getDB();

  const newMovie = {
    id: Date.now(),
    title: title,   // ⚠️ No sanitization
    genre: genre,
    price: parseFloat(price),
    seats: parseInt(seats)
  };

  db.movies.push(newMovie);
  saveDB(db);
  res.redirect('/admin');
});

// ADMIN: DELETE MOVIE
app.post('/admin/delete-movie', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  // ⚠️ Missing role check!

  const { movieId } = req.body;
  const db = getDB();
  db.movies = db.movies.filter(m => m.id != movieId);
  saveDB(db);
  res.redirect('/admin');
});

// ADMIN PANEL
app.get('/admin', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  // ⚠️ SECURITY FLAW: Any logged-in user can access admin!

  const db = getDB();
  res.render('admin', { movies: db.movies, user: req.session.user, error: null });
});

// START THE SERVER
app.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000');
});