const session = require('express-session');

module.exports = session({
  name: 'dzung9fbook.sid',
  secret: process.env.SESSION_SECRET || 'dzung9fbook-dev-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
});
