const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 900000), // 15 minutes
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 100),
  message: { message: 'Too many authentication attempts from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordLimiter = rateLimit({
  windowMs: Number(process.env.PASSWORD_RATE_LIMIT_WINDOW_MS || 3600000), // 1 hour
  max: Number(process.env.PASSWORD_RATE_LIMIT_MAX || 20),
  message: { message: 'Too many password requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { limiter, authLimiter, passwordLimiter };
