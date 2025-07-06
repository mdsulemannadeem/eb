const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const expressSession = require("express-session");
const flash = require("connect-flash");
const passport = require("./config/passport-config");
// const compression = require("compression"); // Temporarily disabled

require("dotenv").config();

const ownersRouter = require("./routes/ownersRouter");
const productsRouter = require("./routes/productsRouter");
const usersRouter = require("./routes/usersRouter");
const indexRouter = require("./routes/index");

const db = require("./config/mongoose-connection");

// Enable compression for better performance (temporarily disabled)
// app.use(compression());

// Configure body parsers with optimized limits
app.use(express.json({ limit: '50mb' })); // Reduced from 100mb
app.use(express.urlencoded({ extended: true, limit: '50mb', parameterLimit: 10000 })); // Reduced limits
app.use(express.raw({ limit: '50mb' })); // Reduced from 100mb
app.use(express.text({ limit: '50mb' })); // Reduced from 100mb
app.use(cookieParser());
app.use(
    expressSession({
        resave: false,
        saveUninitialized: false,
        secret: process.env.EXPRESS_SESSION_SECRET || "default_secret_key",
        cookie: { 
            secure: false, // Set to true if using HTTPS
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }
    })
);
app.use(flash());

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Optimized static file serving with better caching
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: '7d',  // Reduced from 30d for development
  etag: true,
  lastModified: true
}));
app.set("view engine", "ejs");

app.use("/", indexRouter);
app.use("/owners", ownersRouter);
app.use("/users", usersRouter);
app.use("/products", productsRouter);

// Handle 413 Payload Too Large errors specifically
app.use((err, req, res, next) => {
  if (err.status === 413 || err.code === 'LIMIT_FILE_SIZE' || err.type === 'entity.too.large') {
    console.error('File upload size error:', err);
    req.flash("error", "File too large. Maximum file size is 50MB per image.");
    return res.redirect(req.get('Referer') || '/products/create');
  }
  next(err);
});

app.use((err, req, res, next) => {
  console.error('Error details:', err);
  console.error('Error stack:', err.stack);
  
  if (process.env.NODE_ENV === 'development') {
    res.status(500).json({
      error: err.message,
      stack: err.stack
    });
  } else {
    res.status(500).send('Internal Server Error');
  }
});

app.use((req, res) => {
  res.status(404).send('Page not found');
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is busy, trying port ${PORT + 1}`);
    server.listen(PORT + 1);
  } else {
    console.error('Server error:', err);
  }
});