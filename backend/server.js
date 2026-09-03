const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');
const { Server } = require('socket.io');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const connectDB = require('./config/db');
const { limiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorMiddleware');
const logger = require('./utils/logger');
const socketHandler = require('./sockets');
const seedSuperAdmin = require('./scripts/seedSuperAdmin');
const seedStoreManager = require('./scripts/seedStoreManager');
const rateLimiter = require("./middleware/rateLimiter");

const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });
dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.JWT_SECRET) {
  logger.warn("JWT_SECRET environment variable is missing. Using default fallback key.");
  process.env.JWT_SECRET = "rasayanflow_jwt_secret_key_2026_fallback";
}

const app = express();
const server = http.createServer(app);
const isProduction = process.env.NODE_ENV === "production";

/**
 * Get allowed origins from environment or defaults
 * Supports both CORS_ORIGIN and FRONTEND_URL env vars
 * Format: comma-separated list of origins (no spaces around commas)
 */
const getAllowedOrigins = () => {
  const envOrigins = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "";
  const productionOrigins = envOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const developmentOrigins = isProduction
    ? []
    : [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:5173",
    ];

  const allOrigins = [
    ...new Set([...productionOrigins, ...developmentOrigins]),
  ];

  if (isProduction && allOrigins.length === 0) {
    logger.warn(
      "No production CORS origins configured. Set CORS_ORIGIN or FRONTEND_URL.",
    );
  }

  logger.info(`CORS allowed origins: ${allOrigins.join(", ") || "none"}`);
  return allOrigins;
};

const allowedOrigins = getAllowedOrigins();

/**
 * CORS configuration object
 * - origin: Validates incoming request origin against allowlist
 * - credentials: Allows cookies and JWT headers to be sent cross-origin
 * - methods: Explicitly list allowed HTTP methods
 * - allowedHeaders: Allow common headers including Authorization
 * - maxAge: Cache preflight response for 1 hour
 */
const corsOptions = {
  origin(origin, callback) {
    // Allow requests with no origin (e.g., mobile apps, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in explicit allowlist or wildcard
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Automatically allow Vercel and Render deployment domains
    try {
      const hostname = new URL(origin).hostname;
      if (
        hostname.endsWith('.vercel.app') ||
        hostname.endsWith('.onrender.com') ||
        hostname === 'localhost' ||
        hostname === '127.0.0.1'
      ) {
        return callback(null, true);
      }
    } catch (e) {
      // Ignore URL parsing errors
    }

    // Log rejected origins for debugging
    logger.warn(`CORS request rejected from origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-Client-Version",
    "x-client-version",
  ],
  exposedHeaders: ["Content-Length", "Content-Range"],
  maxAge: 3600, // Cache preflight for 1 hour
};

// Apply CORS to Socket.IO
const io = new Server(server, {
  cors: corsOptions,
});

socketHandler(io);

// Security headers
app.use(helmet());

// CORS middleware - apply to all routes
app.use(cors(corsOptions));

// Pre-flight request handler
// This ensures OPTIONS requests are handled before hitting rate limiter or other middleware
app.options("*", cors(corsOptions));

// Body parser with size limit to mitigate large payload attacks but allow bulk imports
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Input sanitization to prevent NoSQL injection and XSS
app.use(mongoSanitize());
app.use(xss());

// Logging
app.use(morgan("combined", { stream: logger.stream }));

// Rate limiting (applied after CORS so preflight isn't rate limited)
app.use(limiter);

// Health check endpoint for Render / Uptime monitors
const fs = require('fs');
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'PharmLab API Backend Service is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes & API endpoints
const routePairs = [
  ["/auth", require("./routes/authRoutes")],
  ["/labs", require("./routes/labRoutes")],
  ["/inventory", require("./routes/inventoryRoutes")],
  ["/experiments", require("./routes/experimentRoutes")],
  ["/experiment-requests", require("./routes/experimentRequestRoutes")],
  ["/store-items", require("./routes/storeRoutes")],
  ["/store-allotments", require("./routes/storeAllotmentRoutes")],
  ["/transactions", require("./routes/transactionRoutes")],
  ["/teams", require("./routes/teamRoutes")],
  ["/users", require("./routes/userRoutes")],
  ["/logs", require("./routes/logRoutes")],
  ["/store/inventory", require("./routes/storeInventoryRoutes")],
  ["/store/requests", require("./routes/storeRequestRoutes")],
  ["/store/history", require("./routes/storeHistoryRoutes")],
  ["/store/tracking", require("./routes/storeTrackingRoutes")],
  ["/notifications", require("./routes/notificationRoutes")],
  ["/lab/requests", require("./routes/labRequestRoutes")],
  ["/lab/history", require("./routes/labHistoryRoutes")],
  ["/lab/structure", require("./routes/labStructureRoutes")],
  ["/student/requests", require("./routes/studentRequestRoutes")],
  ["/student-requests", require("./routes/studentRequestRoutes")],
  ["/lab/student-requests", require("./routes/studentRequestRoutes")],
  ["/student/labs", require("./routes/labRoutes")],
  ["/student/research-requests", require("./routes/researchRequestRoutes")],
  ["/student/profile", require("./routes/studentProfileRoutes")],
  ["/super-admin", require("./routes/superAdminRoutes")],
  ["/subjects", require("./routes/subjectRoutes")],
  ["/exam-results", require("./routes/examResultRoutes")],
  ["/promotions", require("./routes/promotionRoutes")],
];

routePairs.forEach(([routePath, router]) => {
  app.use(`/api${routePath}`, router);
  app.use(routePath, (req, res, next) => {
    if (req.headers.accept && req.headers.accept.includes('text/html') && req.method === 'GET') {
      return next();
    }
    router(req, res, next);
  });
});

// Serve frontend in production ONLY if static dist directory exists
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
const frontendIndexFile = path.join(frontendDistPath, 'index.html');
if (process.env.NODE_ENV === 'production' && fs.existsSync(frontendIndexFile)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res) => {
    res.sendFile(frontendIndexFile);
  });
}

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(async () => {
    // Seed superAdmin user if configured
    await seedSuperAdmin();
    // Seed store manager user
    await seedStoreManager();

    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error("Database connection failed", { error });
    process.exit(1);
  });

module.exports = { app, io };
