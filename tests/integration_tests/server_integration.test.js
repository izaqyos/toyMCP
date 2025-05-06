const request = require('supertest');

const app = require('../../src/server'); // Import app normally
const { pool, query, initializeDatabase } = require('../../src/db');
const seedDefaultUser = require('../../src/auth/seedUser'); // Need to seed for login test

// Global variable to store JWT for tests
let authToken;

// Database setup/teardown for integration tests
beforeAll(async () => {
    try {
        await initializeDatabase();
        // Ensure the default user exists for login tests
        await seedDefaultUser(); 

        // Login once before all tests to get a valid token
        const res = await request(app)
            .post('/auth/login')
            .send({ username: 'testuser', password: 'password123' })
            .expect(200);
        
        expect(res.body.token).toBeDefined();
        authToken = res.body.token; // Store the token
        console.log('Auth token obtained for integration tests.');

    } catch (error) {
        console.error("Failed during test setup (DB init, seeding, or login):", error);
        process.exit(1);
    }
}, 40000); // Increased timeout slightly more for init+seed+login

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

describe('Authentication Endpoint (/auth)', () => {
    it('should return 401 for invalid credentials', async () => {
        await request(app)
            .post('/auth/login')
            .send({ username: 'testuser', password: 'wrongpassword' })
            .expect(401)
            .then((res) => {
                expect(res.body.message).toContain('Incorrect username or password');
            });
    });

    it('should return 401 for non-existent user', async () => {
        await request(app)
            .post('/auth/login')
            .send({ username: 'nosuchuser', password: 'password123' })
            .expect(401)
            .then((res) => {
                expect(res.body.message).toContain('Incorrect username or password');
            });
    });

    it('should return JWT for valid credentials', async () => {
        const res = await request(app)
            .post('/auth/login')
            .send({ username: 'testuser', password: 'password123' })
            .expect(200)
            .expect('Content-Type', /json/);

        expect(res.body.message).toBe('Login successful');
        expect(res.body.user).toBeDefined();
        expect(res.body.user.username).toBe('testuser');
        expect(res.body.token).toBeDefined();
        expect(typeof res.body.token).toBe('string');
    });
});

describe('JSON-RPC Endpoint (/rpc)', () => {

    // Helper to create JSON-RPC request objects
    const createRpcRequest = (method, params, id = 1) => ({
        jsonrpc: '2.0',
        method,
        params,
        id,
    });

    it('should return 401 Unauthorized if no token is provided', async () => {
        const rpcRequest = createRpcRequest('mcp.discover', undefined, 99);
        await request(app)
            .post('/rpc')
            .send(rpcRequest)
            .expect(401);
    });

    it('should return 401 Unauthorized if token is invalid/expired', async () => {
        const rpcRequest = createRpcRequest('mcp.discover', undefined, 98);
        await request(app)
            .post('/rpc')
            .set('Authorization', 'Bearer invalidtoken123')
            .send(rpcRequest)
            .expect(401);
    });

    describe('Valid Authenticated Requests', () => {
        // Use the authToken obtained in beforeAll
        if (!authToken) {
            throw new Error('Authentication token not obtained in beforeAll hook');
        }

        it('should handle mcp.discover request successfully', async () => {
            const rpcRequest = createRpcRequest('mcp.discover', undefined, 0);

            const res = await request(app)
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(rpcRequest)
                .expect('Content-Type', /json/)
                .expect(200);

            // Check JSON-RPC structure
            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeUndefined();
            expect(res.body.result).toBeDefined();

            // Check discovery structure
            const discovery = res.body.result;
            expect(discovery.mcp_version).toBeDefined();
            expect(discovery.name).toEqual('ToyMCP Todo Service');
            expect(discovery.description).toBeDefined();
            expect(discovery.methods).toBeInstanceOf(Array);
            expect(discovery.methods.length).toBeGreaterThanOrEqual(4); // At least list, add, remove, discover

            // Check if expected methods are present
            const methodNames = discovery.methods.map(m => m.name);
            expect(methodNames).toContain('mcp.discover');
            expect(methodNames).toContain('todo.list');
            expect(methodNames).toContain('todo.add');
            expect(methodNames).toContain('todo.remove');
        });

        it('should handle todo.add request successfully', async () => {
            const todoText = 'Integration test add';
            const rpcRequest = createRpcRequest('todo.add', { text: todoText });

            const res = await request(app)
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
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
            const rpcRequest = createRpcRequest('todo.list', undefined, 2);

            const res = await request(app)
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(rpcRequest)
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeUndefined();
            expect(res.body.result).toEqual([]); // Expect empty array
        });

        it('should handle todo.list request successfully (with items)', async () => {
            await query('INSERT INTO todos(text) VALUES($1), ($2)', ['Item A', 'Item B']);
            const rpcRequest = createRpcRequest('todo.list', undefined, 3);

            const res = await request(app)
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
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
            const insertRes = await query('INSERT INTO todos(text) VALUES($1) RETURNING id', ['Item to Delete']);
            const itemId = insertRes.rows[0].id;
            const rpcRequest = createRpcRequest('todo.remove', { id: itemId }, 4);

            const res = await request(app)
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
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

    describe('Error Handling (Authenticated)', () => {
        // Ensure authToken is available for these tests too
        if (!authToken) {
            throw new Error('Authentication token not obtained in beforeAll hook');
        }

        it('should return JSON-RPC error for invalid JSON', async () => {
             const res = await request(app)
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
                .set('Content-Type', 'application/json')
                .send('{"jsonrpc": "2.0", "method": "foo", "params": "bar", "id": 1')
                .expect(200); 

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe(-32700); // Parse error
            expect(res.body.error.message).toContain('Parse error: Invalid JSON received.'); // Check new message
            expect(res.body.id).toBeNull(); // Per JSON-RPC spec for parse error
        });

         it('should return JSON-RPC error for non-RPC JSON object', async () => {
             const res = await request(app)
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ foo: "bar" })
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
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(rpcRequest)
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe(-32601); // Method not found
            expect(res.body.error.message).toBeDefined();
        });

        it('should return JSON-RPC error for todo.add with missing text', async () => {
            const rpcRequest = createRpcRequest('todo.add', {}, 6); 
            const res = await request(app)
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(rpcRequest)
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe(-32602); // Invalid params
            expect(res.body.error.message).toContain('Missing required parameter: text');
        });

         it('should return JSON-RPC error for todo.add with invalid text type', async () => {
            const rpcRequest = createRpcRequest('todo.add', { text: 123 }, 7); 
            const res = await request(app)
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(rpcRequest)
                .expect(200);

            expect(res.body.jsonrpc).toBe('2.0');
            expect(res.body.id).toBe(rpcRequest.id);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.code).toBe(-32602); // Invalid params
            expect(res.body.error.message).toContain('Parameter "text" must be a non-empty string');
        });

         it('should return JSON-RPC error for todo.remove with missing id', async () => {
            const rpcRequest = createRpcRequest('todo.remove', {}, 8); 
            const res = await request(app)
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
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
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
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

    describe('Notifications (Authenticated)', () => {
         if (!authToken) {
            throw new Error('Authentication token not obtained in beforeAll hook');
        }
        it('should handle a notification request (no id) with 204 No Content', async () => {
            const notificationRequest = {
                jsonrpc: '2.0',
                method: 'todo.add', 
                params: { text: 'This is a notification' }
            };

            await request(app)
                .post('/rpc')
                .set('Authorization', `Bearer ${authToken}`)
                .send(notificationRequest)
                .expect(204); 
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