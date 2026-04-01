const session = require('express-session');
const { Pool } = require('pg');
const createPgSessionStore = require('connect-pg-simple');

const PgSessionStore = createPgSessionStore(session);
const SESSION_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 7;
const DEV_SESSION_SECRET = 'dzung9fbook-dev-session-secret';

const normalizeBooleanEnv = function (value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
};

const isProduction = function () {
  return String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
};

const shouldUseSecureCookies = function () {
  if (process.env.SESSION_COOKIE_SECURE !== undefined) {
    return normalizeBooleanEnv(process.env.SESSION_COOKIE_SECURE);
  }

  return isProduction();
};

const getSessionSecret = function () {
  const sessionSecret = String(process.env.SESSION_SECRET || '').trim();

  if (sessionSecret) {
    return sessionSecret;
  }

  if (isProduction()) {
    throw new Error('SESSION_SECRET is required when NODE_ENV=production.');
  }

  return DEV_SESSION_SECRET;
};

const getSessionDatabaseConfig = function () {
  const rawDatabaseUrl = String(process.env.DATABASE_URL || '').trim();

  if (!rawDatabaseUrl) {
    throw new Error('DATABASE_URL is required for PostgreSQL-backed session storage.');
  }

  const databaseUrl = new URL(rawDatabaseUrl);
  const schemaName = String(databaseUrl.searchParams.get('schema') || 'public').trim() || 'public';

  // Prisma supports ?schema=..., but pg/connect-pg-simple expects a plain connection string.
  databaseUrl.searchParams.delete('schema');

  return {
    connectionString: databaseUrl.toString(),
    schemaName
  };
};

const sessionDatabaseConfig = getSessionDatabaseConfig();
const sessionPool = new Pool({
  connectionString: sessionDatabaseConfig.connectionString
});

module.exports = session({
  name: 'dzung9fbook.sid',
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  store: new PgSessionStore({
    pool: sessionPool,
    schemaName: sessionDatabaseConfig.schemaName,
    tableName: process.env.SESSION_TABLE_NAME || 'session',
    createTableIfMissing: true,
    ttl: Math.ceil(SESSION_COOKIE_MAX_AGE / 1000)
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookies(),
    maxAge: SESSION_COOKIE_MAX_AGE
  }
});
