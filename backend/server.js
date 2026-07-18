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
  throw new Error("Missing required environment variable: JWT_SECRET");
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

    // Check if origin is in allowlist
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Log rejected origins for debugging
    logger.warn(`CORS request rejected from origin: ${origin}`);
    return callback(new Error("CORS origin not allowed"));
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

// Routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/labs", require("./routes/labRoutes"));
app.use("/inventory", require("./routes/inventoryRoutes"));
app.use("/experiments", require("./routes/experimentRoutes"));
app.use("/experiment-requests", require("./routes/experimentRequestRoutes"));
app.use("/store-items", require("./routes/storeRoutes"));
app.use("/store-allotments", require("./routes/storeAllotmentRoutes"));
app.use("/transactions", require("./routes/transactionRoutes"));
app.use("/teams", require("./routes/teamRoutes"));
app.use("/users", require("./routes/userRoutes"));
app.use("/logs", require("./routes/logRoutes"));

// New Store Backend Routes
app.use("/store/inventory", require("./routes/storeInventoryRoutes"));
app.use("/store/requests", require("./routes/storeRequestRoutes"));
app.use("/store/history", require("./routes/storeHistoryRoutes"));
app.use("/store/tracking", require("./routes/storeTrackingRoutes"));
app.use("/notifications", require("./routes/notificationRoutes"));

// New Lab backend routes
app.use("/lab/requests", require("./routes/labRequestRoutes"));
app.use("/lab/history", require("./routes/labHistoryRoutes"));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
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
