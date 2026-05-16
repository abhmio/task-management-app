const dotenv = require('dotenv');

dotenv.config({ path: '.env' });

function parseOrigins(value) {
  return String(value || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const clientUrls = parseOrigins(process.env.CLIENT_URLS || process.env.CLIENT_URL);
const clientUrlPatterns = parseOrigins(process.env.CLIENT_URL_PATTERNS);

const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: clientUrls[0] || 'http://localhost:5173',
  clientUrls,
  clientUrlPatterns,
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mongoUri:
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb://127.0.0.1:27017/taskflow',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:5000/api/auth/google/callback',
  },
  mail: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'TaskFlow <no-reply@taskflow.local>',
    resetPasswordUrl:
      process.env.RESET_PASSWORD_URL || `${clientUrls[0] || 'http://localhost:5173'}/reset-password`,
  },
};

const requiredProductionEnv = [
  ['JWT_SECRET', env.jwtSecret && env.jwtSecret !== 'change-me'],
  ['CLIENT_URL or CLIENT_URLS', env.clientUrls.length > 0],
  ['MONGO_URI', Boolean(env.mongoUri)],
];

if (env.nodeEnv === 'production') {
  const missingKeys = requiredProductionEnv
    .filter(([, isConfigured]) => !isConfigured)
    .map(([key]) => key);

  if (missingKeys.length) {
    throw new Error(
      `Missing required production environment configuration: ${missingKeys.join(', ')}`,
    );
  }
}

module.exports = { env };
