const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const config = require('../config');

const router = express.Router();

/**
 * POST /login
 * Authenticates a user using the 'local' strategy (username/password).
 * If successful, generates and returns a JWT.
 */
router.post('/login', (req, res, next) => {
  // Use passport.authenticate with the 'local' strategy.
  // session: false because we are using tokens, not sessions.
  // The callback receives (err, user, info) from the LocalStrategy's done() function.
  passport.authenticate('local', { session: false }, (err, user, info) => {
    console.log('Inside /login passport.authenticate callback'); // Debug log
    if (err) {
      console.error('Error during local authentication:', err); // Debug log
      return next(err); // Pass internal errors (like DB errors) to the error handler
    }
    if (!user) {
      // Authentication failed (user not found or password incorrect)
      // info contains the message from the strategy's done(null, false, { message: ... })
      console.log('Authentication failed:', info ? info.message : 'No user returned'); // Debug log
      return res.status(401).json({ message: info ? info.message : 'Authentication failed' });
    }

    // Authentication succeeded, user object is available (e.g., { id: ..., username: ... })
    console.log('Authentication successful for user:', user); // Debug log

    // Generate the JWT
    const payload = {
      id: user.id,
      username: user.username
      // Add other relevant non-sensitive info if needed
    };

    const tokenOptions = {
      expiresIn: config.auth.tokenExpiresIn // e.g., '1h', '7d'
    };

    console.log('Generating JWT with payload:', payload); // Debug log
    const token = jwt.sign(payload, config.auth.jwtSecret, tokenOptions);

    // Send the token back to the client
    console.log('JWT generated. Sending token to client.'); // Debug log
    return res.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username }, // Send back basic user info
      token: token
    });

  })(req, res, next); // Important: call the middleware function returned by authenticate
});

// Future: Add /register endpoint here if needed

module.exports = router; 