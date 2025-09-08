const express = require('express');
const path = require('path');
const session = require('express-session');
const methodOverride = require('method-override');

// Import routes
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');

const app = express();
const PORT = 3000;

// Set up the view engine to render HTML files with EJS
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(methodOverride('_method')); // Use _method query to override form methods
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (CSS, uploads)

// Session configuration (data stored in memory, lost on restart)
app.use(session({
    secret: 'a-very-secret-key-for-your-blog',
    resave: false,
    saveUninitialized: true,
}));

// Global middleware to pass user session data to all views
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user;
    next();
});

// Route handlers
app.get('/', (req, res) => res.redirect('/posts')); // Redirect root to posts index
app.use('/', authRoutes);
app.use('/posts', postRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});