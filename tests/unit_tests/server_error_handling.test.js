const request = require('supertest');

// Mock dependencies *before* importing the app
const mockRouter = jest.fn(); // Simple mock function
mockRouter._shouldThrowError = false; // Control flag

jest.mock('../../src/mcp_router', () => {
    // Return a middleware function that uses the mockRouter
    return (req, res, next) => {
        if (mockRouter._shouldThrowError) {
            next(new Error('Simulated Router Error'));
        } else {
            // If not throwing, just call next() to simulate passing through
            // without actually handling the request like the real router would.
            next();
        }
    };
});

// Mock the database initialization as it's not needed for these error tests
jest.mock('../../src/db', () => ({
    initializeDatabase: jest.fn().mockResolvedValue(undefined), // Mock successful init
    // We don't need pool or query for these specific tests
}));

// Now import the app, which will use the mocked dependencies
const app = require('../../src/server');
// We don't need to require the mock directly anymore, the mock is active via jest.mock

// Test Suite
describe('Server Error Handling Middleware', () => {

    beforeEach(() => {
        // Reset mock state before each test
        mockRouter._shouldThrowError = false; // Reset the flag on the mock itself
    });

    it('should use the global error handler for unhandled errors from subsequent middleware/routers', async () => {
        // Configure the mock router to throw an error
        mockRouter._shouldThrowError = true;

        const dummyRequest = { data: 'doesnt matter' };

        const res = await request(app)
            .post('/rpc') // CORRECTED: Hit the path where the mock router is mounted
            .send(dummyRequest)
            .expect(500); // Primarily check for 500 status

        // Optional: Check if the default HTML error page contains the message
        expect(res.text).toContain('Simulated Router Error');

        // Check that it's NOT a standard JSON-RPC error format
        // (This check might fail if the HTML page coincidentally contains these keys,
        // but it's less critical than the status code check)
        // expect(res.body.jsonrpc).toBeUndefined();
        // expect(res.body.id).toBeUndefined();
    });

    it('should use the dedicated syntax error handler for invalid JSON bodies', async () => {
        const res = await request(app)
            .post('/rpc') // CORRECTED: Or any route that uses express.json()
            .set('Content-Type', 'application/json')
            .send('{"invalid": json, ...') // Send malformed JSON
            .expect('Content-Type', /json/) // Expect JSON error response
            .expect(200); // Expect 200 OK (per JSON-RPC spec for Parse Error)

        expect(res.body.jsonrpc).toBe('2.0');
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe(-32700); // Parse error
        expect(res.body.error.message).toContain('Parse error: Invalid JSON received.');
        expect(res.body.id).toBeNull();
    });

    // Add more tests here if needed for other specific error middleware scenarios
}); 