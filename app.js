const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const expressSession = require("express-session");
const flash = require("connect-flash");

require("dotenv").config();

const ownersRouter = require("./routes/ownersRouter");
const productsRouter = require("./routes/productsRouter");
const usersRouter = require("./routes/usersRouter");
const indexRouter = require("./routes/index");

const db = require("./config/mongoose-connection");

// Configure body parsers with increased limits
app.use(express.json({ limit: '100mb' })); // Increase JSON payload limit
app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 50000 })); // Increase URL-encoded payload limit
app.use(express.raw({ limit: '100mb' })); // Add raw body parser for file uploads
app.use(express.text({ limit: '100mb' })); // Add text body parser
app.use(cookieParser());
app.use(
    expressSession({
        resave: false,
        saveUninitialized: false,
        secret: process.env.EXPRESS_SESSION_SECRET || "default_secret_key",
        cookie: { secure: false } // Set to true if using HTTPS
    })
);
app.use(flash());
app.use(express.static(path.join(__dirname, "public"),{
  maxAge: '30d',  // enables browser caching
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

app.listen(3000);