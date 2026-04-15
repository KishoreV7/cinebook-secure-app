# CineBook - Secure Movie Ticket Booking Application

## Project Title and Overview

CineBook is a web-based Movie Ticket Booking Application developed as part of the Secure Web Development module at National College of Ireland. The application allows users to register, login, browse movies, and book tickets online. An admin role is also included to manage the movie listings.

The primary security focus of this project is to demonstrate common web application vulnerabilities by first building an intentionally insecure version, then systematically identifying and fixing each vulnerability using industry-standard security practices and packages.

---

## Features and Security Objectives

### Application Features
- User registration and login
- Browse currently showing movies
- Book movie tickets with seat selection
- View personal booking history
- Booking confirmation page
- Admin panel to add and delete movies
- Role-based access control (User and Admin)
- Custom error pages (404 and 500)

### Security Objectives
- Prevent plain text password storage
- Validate and sanitize all user inputs
- Protect against Cross-Site Scripting (XSS)
- Protect against Cross-Site Request Forgery (CSRF)
- Enforce role-based access on admin routes
- Secure session configuration
- Prevent brute force login attacks

---

## Project Structure
```
cinebook-secure-app/
│
├── public/                  # Static files served to the browser
│   └── css/
│       └── style.css        # Main stylesheet for the application
│
├── views/                   # EJS template files (HTML pages)
│   ├── login.ejs            # Login page
│   ├── register.ejs         # Registration page
│   ├── dashboard.ejs        # User dashboard after login
│   ├── movies.ejs           # Movie listing and booking page
│   ├── my-bookings.ejs      # User's booking history
│   ├── booking-confirmation.ejs  # Booking confirmation page
│   ├── admin.ejs            # Admin panel for managing movies
│   └── error.ejs            # Custom error page
│
├── database.json            # JSON file acting as the database
├── server.js                # Main application file with all routes
├── package.json             # Project dependencies and scripts
└── README.md                # Project documentation
```
---

## Setup and Installation Instructions

### Prerequisites
Make sure you have the following installed:
- Node.js (v18 or higher) — download from https://nodejs.org
- Git — download from https://git-scm.com

### Step 1 — Clone the Repository
```bash
git clone https://github.com/KishoreV7/cinebook-secure-app.git
cd cinebook-secure-app
```

### Step 2 — Install Dependencies
```bash
npm install
```

### Step 3 — Set Up the Database
Make sure database.json exists in the root folder with this content:
```json
{
  "users": [],
  "movies": [
    { "id": 1, "title": "Avengers Endgame", "genre": "Action", "price": 12.50, "seats": 50 },
    { "id": 2, "title": "The Lion King", "genre": "Animation", "price": 10.00, "seats": 30 },
    { "id": 3, "title": "Inception", "genre": "Sci-Fi", "price": 11.00, "seats": 40 }
  ],
  "bookings": []
}
```

### Step 4 — Run the Application
```bash
node server.js
```

### Step 5 — Open in Browser
http://localhost:3000

---

## Usage Guidelines

### Registering an Account
1. Go to http://localhost:3000/register
2. Enter a username (minimum 3 characters)
3. Enter a valid email address
4. Enter a password (minimum 6 characters)
5. Click Create Account

### Logging In
1. Go to http://localhost:3000/login
2. Enter your username and password
3. Click Login

### Browsing and Booking Movies
1. After login, click Movies in the navigation bar
2. Browse the available movies
3. Select the number of seats (maximum 10)
4. Click Book Now
5. A booking confirmation page will be shown

### Viewing Bookings
1. Click My Bookings in the navigation bar
2. All your bookings will be listed with movie name, seats, price and date

### Admin Access
1. Manually set a user's role to admin in database.json
2. Login with that account
3. Click Admin Panel in the navigation bar
4. Add new movies or delete existing ones

---

## Security Improvements

### 1. Password Hashing with bcrypt
- **Vulnerability:** Passwords were stored as plain text in the database
- **Fix:** Implemented bcrypt with salt rounds of 10
- **Result:** Passwords are stored as irreversible hashes

### 2. Input Validation with express-validator
- **Vulnerability:** No validation on user inputs, allowing malformed or malicious data
- **Fix:** Added validation rules — username minimum 3 characters, password minimum 6 characters, valid email format required, all inputs trimmed and escaped
- **Result:** Invalid and potentially malicious inputs are rejected before processing

### 3. Secure Session Configuration
- **Vulnerability:** Weak session secret, no cookie expiry, cookies accessible by JavaScript
- **Fix:** Strong session secret, httpOnly cookie flag set to true, session expires after 1 hour
- **Result:** Session cookies cannot be stolen via JavaScript and expire automatically

### 4. XSS Prevention with Helmet
- **Vulnerability:** No security headers, allowing script injection attacks
- **Fix:** Implemented Helmet.js with XSS filter, noSniff, and frameguard
- **Result:** Security headers sent with every response, blocking common XSS attacks

### 5. CSRF Protection with csurf
- **Vulnerability:** Forms had no CSRF tokens, allowing cross-site request forgery
- **Fix:** Added CSRF tokens to all forms using csurf middleware
- **Result:** All form submissions are verified with a unique token

### 6. Role-Based Access Control
- **Vulnerability:** Any logged-in user could access /admin by typing it in the browser
- **Fix:** Added role check on all admin routes
- **Result:** Non-admin users are redirected to dashboard automatically

### 7. Rate Limiting with express-rate-limit
- **Vulnerability:** No limit on login attempts, allowing brute force attacks
- **Fix:** Login limited to 5 attempts per 15 minutes
- **Result:** Brute force password attacks are blocked automatically

### 8. Booking Validation
- **Vulnerability:** No server-side validation on seat numbers
- **Fix:** Seat count must be between 1 and 10, cannot exceed available seats
- **Result:** Invalid booking attempts are rejected server-side

---

## Testing Process

### Manual Security Testing

| Test | Method | Expected Result | Status |
|------|--------|-----------------|--------|
| Plain text password | Check database.json after register | Password shown as bcrypt hash | ✅ Pass |
| Short username | Enter 2 character username | Validation error shown | ✅ Pass |
| Short password | Enter 3 character password | Validation error shown | ✅ Pass |
| Invalid email | Enter text without @ | Validation error shown | ✅ Pass |
| Admin access by normal user | Type /admin in browser | Redirected to dashboard | ✅ Pass |
| Brute force login | Enter wrong password 6 times | Rate limit message shown | ✅ Pass |
| Invalid seat count | Try booking 999 seats | Redirected back to movies | ✅ Pass |
| CSRF token | Inspect form in DevTools | Hidden _csrf field present | ✅ Pass |
| XSS headers | Check response headers | Security headers present | ✅ Pass |
| Session expiry | Check cookie settings | httpOnly flag set | ✅ Pass |

### Tools Used
- **Browser DevTools** — Inspecting CSRF tokens and security headers
- **Manual testing** — Testing all security features directly in the browser
- **Node.js terminal** — Monitoring server responses and errors

---

## Contributions and References

### Frameworks and Libraries
- [Express.js](https://expressjs.com) — Web application framework
- [EJS](https://ejs.co) — Embedded JavaScript templating
- [bcrypt](https://www.npmjs.com/package/bcrypt) — Password hashing
- [express-validator](https://express-validator.github.io) — Input validation
- [express-session](https://www.npmjs.com/package/express-session) — Session management
- [Helmet.js](https://helmetjs.github.io) — HTTP security headers
- [csurf](https://www.npmjs.com/package/csurf) — CSRF protection
- [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) — Rate limiting

### References
- OWASP Top 10 — https://owasp.org/www-project-top-ten
- Node.js Security Best Practices — https://nodejs.org/en/docs/guides/security
- Express.js Security Best Practices — https://expressjs.com/en/advanced/best-practice-security.html
- bcrypt Documentation — https://www.npmjs.com/package/bcrypt
- Helmet.js Documentation — https://helmetjs.github.io

---

*Developed by Kishore | National College of Ireland | Secure Web Development Module | 2026*
Save with Ctrl+S then commit:
bashgit add .
git commit -m "docs: update README with full project documentation

- Added project overview and security focus
- Listed all features and security objectives
- Added full project structure explanation
- Added setup and installation instructions
- Added usage guidelines
- Documented all security improvements
- Added testing process and results table
- Added contributions and references"
