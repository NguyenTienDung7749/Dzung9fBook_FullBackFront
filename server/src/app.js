const path = require('node:path');
const express = require('express');
const sessionMiddleware = require('./config/session');
const apiRoutes = require('./routes');
const notFoundMiddleware = require('./middleware/not-found');
const errorHandler = require('./middleware/error-handler');

const app = express();
const publicRoot = path.resolve(process.cwd(), 'public');
const port = Number(process.env.PORT || 4173);
const normalizeBooleanEnv = function (value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
};
const shouldTrustProxy = function () {
  if (process.env.TRUST_PROXY !== undefined) {
    return normalizeBooleanEnv(process.env.TRUST_PROXY);
  }

  if (process.env.SESSION_COOKIE_SECURE !== undefined) {
    return normalizeBooleanEnv(process.env.SESSION_COOKIE_SECURE);
  }

  return String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';
};

app.disable('x-powered-by');
if (shouldTrustProxy()) {
  app.set('trust proxy', 1);
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

app.get('/runtime-config.js', function (_req, res) {
  res.type('application/javascript');
  res.send(`window.__DZUNG9FBOOK_RUNTIME__ = Object.freeze({
  providerMode: 'api',
  apiBaseUrl: '/api'
});
`);
});

app.use('/api', apiRoutes);
app.use(express.static(publicRoot));

app.get('/', function (_req, res) {
  res.sendFile(path.join(publicRoot, 'index.html'));
});

app.use(notFoundMiddleware);
app.use(errorHandler);

if (require.main === module) {
  app.listen(port, function () {
    console.log(`Dzung9fBook server dang chay tai http://127.0.0.1:${port}`);
  });
}

module.exports = app;
