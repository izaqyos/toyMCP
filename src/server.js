const express = require('express');
const config = require('./config');
const { initializeDatabase } = require('./db');
const mcpRouter = require('./mcp_router'); // We'll create this next

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Middleware specifically to catch JSON parsing errors from express.json()
app.use((err, req, res, next) => {
  // Check if it's a syntax error related to body parsing
  // --- DEBUG LOGGING START ---
  console.log('--- JSON Syntax Error Handler Triggered ---');
  console.log('Error Type:', Object.prototype.toString.call(err));
  console.log('Is SyntaxError?:', err instanceof SyntaxError);
  console.log('Error Status Code:', err.statusCode);
  console.log('Has Body Property?:', 'body' in err);
  console.log('Error Message:', err.message);
  // console.log('Full Error Object:', err); // Uncomment if more detail needed
  console.log('-----------------------------------------');
  // --- DEBUG LOGGING END ---
  if (err instanceof SyntaxError && err.statusCode >= 400 && err.statusCode < 500 && 'body' in err) {
    console.log('Caught body-parser JSON SyntaxError, sending JSON-RPC Parse Error (-32700)');
    return res.status(200).json({ // Send 200 OK for JSON-RPC spec compliance
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error: Invalid JSON received." },
        id: null // id is null for Parse error according to spec
    });
  }
  // If it's not this specific error, pass it on to the next error handler
  next(err);
});

// Mount the MCP router
app.use('/mcp', mcpRouter);

// Basic Root Route (optional, for simple check)
app.get('/', (req, res) => {
  res.send('MCP To-Do List Server is running!');
});

// Basic Error Handler Middleware
// Catches errors thrown from async route handlers, etc.
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]:', err);

  if (res.headersSent) {
    // Response already started, delegate to default Express handler
    return next(err);
  }

  try {
      // Set status and headers first
      res.status(500);
      res.setHeader('Content-Type', 'application/json');

      // Prepare payload
      const errorPayload = {
        error: {
          message: err.message || 'Internal Server Error',
          // Include stack trace in development for debugging
          stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        },
      };

      // Send the response body
      res.send(JSON.stringify(errorPayload));

      // Note: We are not calling next() here because we've handled the error

  } catch (handlerError) {
      // If sending our custom error response fails, log it
      // and delegate to the default Express handler with the *original* error.
      console.error("Error occurred within global error handler:", handlerError);
      next(err);
  }
});

async function startServer() {
    try {
        // Ensure DB is ready before starting the server
        await initializeDatabase();

        app.listen(config.server.port, () => {
            console.log(`Server listening on http://localhost:${config.server.port}`);
            console.log(`MCP endpoint available at http://localhost:${config.server.port}/mcp`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1); // Exit if server can't start (e.g., DB init failed)
    }
}

// Only start server if this file is run directly
if (require.main === module) {
    startServer();
}

// Export the app mainly for testing purposes
module.exports = app; 