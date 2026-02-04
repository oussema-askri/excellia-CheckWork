const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');

const app = express();

// ✅ 1. SECURITY HEADERS (Allow images from anywhere)
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// ✅ 2. CORS (The Fix)
// We use a function to dynamically allow the incoming origin
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    // Allow any origin (for development convenience)
    // In strict production, you would check against an array here.
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ 3. LOGGING
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ✅ 4. BODY PARSING (Increased limit for Excel files)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ 5. STATIC FILES
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ✅ 6. HEALTH CHECK (For Render)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// ✅ 7. ROOT ROUTE (To prevent 404 on home page)
app.get('/', (req, res) => {
  res.send('✅ Excellia API is Running');
});

// ✅ 8. API ROUTES
app.use('/api', routes);

// 404 Handler
app.use((req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;