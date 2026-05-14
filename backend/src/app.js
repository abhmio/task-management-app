const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('passport');

const routes = require('./routes');
const { env } = require('./config/env');
const configurePassport = require('./config/passport');
const notFoundMiddleware = require('./middleware/notFoundMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

configurePassport(passport);

const allowedOrigins = new Set(env.clientUrls);
const originPatterns = env.clientUrlPatterns.map((pattern) => {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
});

function isAllowedOrigin(origin) {
  const normalizedOrigin = origin.replace(/\/$/, '');

  if (!allowedOrigins.size && !originPatterns.length) {
    return true;
  }

  if (allowedOrigins.has(normalizedOrigin)) {
    return true;
  }

  return originPatterns.some((pattern) => pattern.test(normalizedOrigin));
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, '');
      if (
        env.nodeEnv !== 'production' &&
        (normalizedOrigin === 'http://localhost:5173' ||
          normalizedOrigin === 'http://127.0.0.1:5173')
        ) {
        return callback(null, true);
      }

      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.set('trust proxy', 1);
app.use(helmet());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.get('/health', (_request, response) => {
  response.status(200).json({
    success: true,
    message: 'TaskFlow backend is healthy',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_request, response) => {
  response.status(200).json({
    success: true,
    message: 'TaskFlow backend is running',
    docs: '/health',
  });
});

app.use('/api', routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
