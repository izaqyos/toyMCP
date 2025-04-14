const express = require('express');
const { JSONRPCServer } = require('json-rpc-2.0');
const mcpMethods = require('./mcp_methods');

const router = express.Router();

// Create the JSON-RPC server
const server = new JSONRPCServer();

// Register the methods from mcp_methods.js
for (const methodName in mcpMethods) {
    server.addMethod(methodName, mcpMethods[methodName]);
}

// Middleware to handle JSON-RPC requests
router.post('/', (req, res) => {
    // --- DEBUG LOGGING START ---
    console.log('--- MCP Request Received ---');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Raw Body:', req.body);
    console.log('----------------------------');
    // --- DEBUG LOGGING END ---

    const jsonRPCRequest = req.body;

    // Pre-check: If body parsing failed or it's not a plausible object,
    // return Parse Error. Note: express.json() middleware might have already caught
    // syntax errors, but this handles cases where the body is parsed but isn't an object.
    if (
        typeof jsonRPCRequest !== 'object' ||
        jsonRPCRequest === null ||
        Array.isArray(jsonRPCRequest)
    ) {
        // Only send response if headers not already sent (e.g., by global error handler)
        if (!res.headersSent) {
             res.status(200).json({
                jsonrpc: "2.0",
                error: { code: -32700, message: "Parse error: Invalid JSON received." },
                id: null
             });
        }
        return;
    }

    // server.receive returns a Promise of a JSONRPCResponse based on the request
    // It handles method execution, parameter validation (basic structure), and error formatting
    server.receive(jsonRPCRequest).then((jsonRPCResponse) => {
        if (jsonRPCResponse) {
            res.json(jsonRPCResponse);
        } else {
            // If response is absent, it's a JSON-RPC Notification (no response required)
            // Although our methods don't seem to be notifications
            res.sendStatus(204); // No Content
        }
    }).catch(err => {
        // This catch is typically for errors *during* receive processing,
        // not usually errors from the method itself (those are in the JSONRPCResponse.error)
        // However, if an unexpected error occurs, handle it.
        console.error('[JSON-RPC Receive Error]:', err);
        // Send a generic server error response if something went wrong with the RPC processing itself
        res.status(500).json({ 
            jsonrpc: "2.0", 
            error: { code: -32000, message: "Internal Server Error during RPC processing" },
            id: jsonRPCRequest ? jsonRPCRequest.id : null 
        });
    });
});

module.exports = router; 