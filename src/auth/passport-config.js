const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcrypt');
const db = require('../db');
const config = require('../config');

// --- Local Strategy (Username/Password Login) ---
passport.use(new LocalStrategy(
  // Options: Specify fields if not 'username' and 'password'
  // { usernameField: 'email' },
  async (username, password, done) => {
    console.log(`Attempting local strategy login for user: ${username}`); // Debug log
    try {
      // Find user by username
      const result = await db.query('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
      const user = result.rows[0];

      if (!user) {
        console.log(`Local strategy: User '${username}' not found.`); // Debug log
        // User not found
        return done(null, false, { message: 'Incorrect username or password.' });
      }

      // Compare submitted password with stored hash
      console.log(`Local strategy: User '${username}' found. Comparing password...`); // Debug log
      const isMatch = await bcrypt.compare(password, user.password_hash);

      if (!isMatch) {
        console.log(`Local strategy: Password for '${username}' does not match.`); // Debug log
        // Password doesn't match
        return done(null, false, { message: 'Incorrect username or password.' });
      }

      // Password matches, authentication successful
      console.log(`Local strategy: Password for '${username}' matches. Authentication successful.`); // Debug log
      // Return user object (without password hash)
      return done(null, { id: user.id, username: user.username });

    } catch (error) {
      console.error('Local strategy error:', error); // Debug log
      // Database or other error
      return done(error);
    }
  }
));

// --- JWT Strategy (Verify Token on Protected Routes) ---
const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract token from 'Authorization: Bearer <token>'
  secretOrKey: config.auth.jwtSecret // The secret used to sign the tokens
};

passport.use(new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
  console.log('JWT strategy executing...'); // Debug log
  console.log('JWT payload received:', jwt_payload); // Debug log
  try {
    // jwt_payload contains the decoded payload (e.g., { id: user.id, username: user.username, iat: ..., exp: ... })
    // Find the user specified in the token
    console.log(`JWT strategy: Finding user with ID: ${jwt_payload.id}`); // Debug log
    const result = await db.query('SELECT id, username FROM users WHERE id = $1', [jwt_payload.id]);
    const user = result.rows[0];

    if (user) {
      console.log(`JWT strategy: User ${user.username} (ID: ${user.id}) found.`); // Debug log
      // User found, attach user object (without hash) to the request (req.user)
      return done(null, { id: user.id, username: user.username });
    } else {
      console.log(`JWT strategy: User with ID ${jwt_payload.id} not found in database.`); // Debug log
      // User not found (e.g., deleted after token was issued)
      return done(null, false);
    }
  } catch (error) {
    console.error('JWT strategy error:', error); // Debug log
    return done(error, false);
  }
}));

// Export configured passport instance (optional, but can be useful)
// module.exports = passport; // No need to export if just requiring for side-effects 