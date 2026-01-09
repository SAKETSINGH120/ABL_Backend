const express = require('express');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const { appRoutes } = require('./routes/appRoutes');
const AppError = require('./utils/AppError');
const globalErrorHandler = require('./controllers/errorController');

const app = express();

/**
 * 🔥 CORS Middleware (for REST API)
 * Must be BEFORE all other middleware & routes
 */
app.use((req, res, next) => {
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];

  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

/**
 * Middleware
 */
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/**
 * ✅ Serve static files (images, products, etc.)
 */
app.use('/public', express.static(path.join(__dirname, '../public')));

/**
 * Routes
 */
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ message: 'this is home route' });
});

router.get('/test', (req, res) => {
  res.status(200).json({ message: 'this is test route' });
});

app.use(router);
appRoutes(app);

/**
 * Handle undefined routes
 */
app.all('*', (req, res, next) => {
  next(new AppError(`The route ${req.originalUrl} not run on this server.`, 404));
});

/**
 * Global error handler
 */
app.use(globalErrorHandler);

module.exports = app;
