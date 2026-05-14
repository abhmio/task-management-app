const { Strategy: GoogleStrategy } = require('passport-google-oauth20');

const { env } = require('./env');
const authService = require('../services/authService');

function configurePassport(passport) {
  if (!env.google.clientId || !env.google.clientSecret) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: env.google.clientId,
        clientSecret: env.google.clientSecret,
        callbackURL: env.google.callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase() || '';
          const name = profile.displayName || profile.name?.givenName || 'Google User';

          const user = await authService.findOrCreateGoogleUser({
            email,
            name,
          });

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      },
    ),
  );
}

module.exports = configurePassport;
