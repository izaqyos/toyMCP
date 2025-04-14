const request = require('supertest');

const app = require('../../src/server'); // Import app normally
const { pool, query, initializeDatabase } = require('../../src/db');

// Database setup/teardown for integration tests
beforeAll(async () => {
    try {
        // Ensure schema exists. If server.js already ran initializeDatabase,
        // this call might be redundant but is safe due to "IF NOT EXISTS".
        await initializeDatabase();
    } catch (error) {
        console.error("Failed to initialize database for server tests:", error);
        process.exit(1);
    }
});

beforeEach(async () => {
    try {
        await query('DELETE FROM todos'); // Clean table before each test
    } catch (error) {
        console.error("Failed to clean todos table before server test:", error);
    }
});

afterAll(async () => {
    await pool.end(); // Close DB pool after all tests
});

describe('MCP Endpoint (/mcp)', () => {

    // Helper to create JSON-RPC request objects
    const createRpcRequest = (method, params, id = 1) => ({
        jsonrpc: '2.0',
        method,
        params,
        id,
    });

    describe('Valid Requests', () => {
        it('should handle todo.add request successfully', async () => {
            const todoText = 'Integration test add';
            const rpcRequest = createRpcRequest('todo.add', { text: todoText });

            const res = await request(app)
                .post('/mcp')
                .send(rpcRequest)
                .expect('Content-Type', /json/)
                .expect(200);

            // Check JSON-RPC response structure
            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeUndefined();
            expect(res.body.result).toBeDefined();

            // Check the result content
            expect(res.body.result.text).toBe(todoText);
            expect(res.body.result.id).toBeDefined();
            const addedItemId = res.body.result.id;

            // Verify in DB
            const dbRes = await query('SELECT * FROM todos WHERE id = $1', [addedItemId]);
            expect(dbRes.rows.length).toBe(1);
            expect(dbRes.rows[0].text).toBe(todoText);
        });

        it('should handle todo.list request successfully (empty)', async () => {
            const rpcRequest = createRpcRequest('todo.list', undefined, 2); // No params needed

            const res = await request(app)
                .post('/mcp')
                .send(rpcRequest)
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeUndefined();
            expect(res.body.result).toEqual([]); // Expect empty array
        });

        it('should handle todo.list request successfully (with items)', async () => {
            // Add items first
            await query('INSERT INTO todos(text) VALUES($1), ($2)', ['Item A', 'Item B']);
            const rpcRequest = createRpcRequest('todo.list', undefined, 3);

            const res = await request(app)
                .post('/mcp')
                .send(rpcRequest)
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeUndefined();
            expect(res.body.result).toBeInstanceOf(Array);
            expect(res.body.result.length).toBe(2);
            expect(res.body.result[0].text).toBe('Item A');
            expect(res.body.result[1].text).toBe('Item B');
        });

        it('should handle todo.remove request successfully', async () => {
            // Add an item to remove
            const insertRes = await query('INSERT INTO todos(text) VALUES($1) RETURNING id', ['Item to Delete']);
            const itemId = insertRes.rows[0].id;

            const rpcRequest = createRpcRequest('todo.remove', { id: itemId }, 4);

            const res = await request(app)
                .post('/mcp')
                .send(rpcRequest)
                .expect(200);

             // Check JSON-RPC response structure
            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeUndefined();
            expect(res.body.result).toBeDefined();
            expect(res.body.result.id).toBe(itemId);
            expect(res.body.result.text).toBe('Item to Delete');

            // Verify in DB
             const dbRes = await query('SELECT * FROM todos WHERE id = $1', [itemId]);
             expect(dbRes.rows.length).toBe(0); // Should be gone
        });
    });

    describe('Error Handling', () => {
        it('should return JSON-RPC error for invalid JSON', async () => {
             const res = await request(app)
                .post('/mcp')
                .set('Content-Type', 'application/json')
                .send('{"jsonrpc": "2.0", "method": "foo", "params": "bar", "id": 1') // Malformed JSON
                .expect(200); // The dedicated error handler should now return 200 OK

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe(-32700); // Parse error
            expect(res.body.error.message).toContain('Parse error: Invalid JSON received.'); // Check new message
            expect(res.body.id).toBeNull(); // Per JSON-RPC spec for parse error
        });

         it('should return JSON-RPC error for non-RPC JSON object', async () => {
             const res = await request(app)
                .post('/mcp')
                .send({ foo: "bar" }) // Valid JSON, but not JSON-RPC
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe(-32600); // Invalid Request
            expect(res.body.error.message).toBeDefined();
            expect(res.body.id).toBeNull();
        });

        it('should return JSON-RPC error for non-existent method', async () => {
            const rpcRequest = createRpcRequest('nonexistent.method', {}, 5);
             const res = await request(app)
                .post('/mcp')
                .send(rpcRequest)
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe(-32601); // Method not found
            expect(res.body.error.message).toBeDefined();
        });

        it('should return JSON-RPC error for todo.add with missing text', async () => {
            const rpcRequest = createRpcRequest('todo.add', {}, 6); // Missing 'text' param
            const res = await request(app)
                .post('/mcp')
                .send(rpcRequest)
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe(-32602); // Invalid params
            expect(res.body.error.message).toContain('Missing required parameter: text');
        });

         it('should return JSON-RPC error for todo.add with invalid text type', async () => {
            const rpcRequest = createRpcRequest('todo.add', { text: 123 }, 7); // Invalid type for 'text'
            const res = await request(app)
                .post('/mcp')
                .send(rpcRequest)
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe(-32602); // Invalid params
            expect(res.body.error.message).toContain('Parameter "text" must be a non-empty string');
        });

         it('should return JSON-RPC error for todo.remove with missing id', async () => {
            const rpcRequest = createRpcRequest('todo.remove', {}, 8); // Missing 'id' param
            const res = await request(app)
                .post('/mcp')
                .send(rpcRequest)
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe(-32602); // Invalid params
            expect(res.body.error.message).toContain('Missing required parameter: id');
        });

        it('should return JSON-RPC error for todo.remove with non-existent id', async () => {
            const nonExistentId = 9999;
            const rpcRequest = createRpcRequest('todo.remove', { id: nonExistentId }, 9);
            const res = await request(app)
                .post('/mcp')
                .send(rpcRequest)
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeDefined();
            // Check custom error code defined in mcp_methods.js
            expect(res.body.error.code).toBe(1001); // Our custom 'Not Found' code
            expect(res.body.error.message).toContain(`Todo item with ID ${nonExistentId} not found`);
        });
    });

    describe('Notifications', () => {
        it('should handle a notification request (no id) with 204 No Content', async () => {
            const notificationRequest = {
                jsonrpc: '2.0',
                method: 'todo.add', // Method doesn't strictly matter, id absence is key
                params: { text: 'This is a notification' }
                // No 'id' field
            };

            await request(app)
                .post('/mcp')
                .send(notificationRequest)
                .expect(204); // Expect No Content status, no body
        });
    });

    describe('Root Endpoint (/)', () => {
        it('should return introductory text for GET /', async () => {
            const res = await request(app)
                .get('/')
                .expect(200);
            expect(res.text).toBe('MCP To-Do List Server is running!');
        });
    });
}); 