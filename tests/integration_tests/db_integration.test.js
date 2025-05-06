// tests/db.test.js

// DO NOT MOCK pg or fs HERE - These tests need the real DB
const { pool, query, initializeDatabase } = require('../../src/db');

// --- Real DB Tests --- 

// Ensure the *real* database schema is initialized before integration tests run
// This relies on the actual initializeDatabase connecting to the Docker container.
beforeAll(async () => {
    try {
        await initializeDatabase(); // Let errors propagate
        // If successful, continue
        console.log('Test DB schema initialized successfully for integration tests.');
    } catch (error) {
        console.error("FATAL: Failed to initialize database for integration testing:", error);
        throw error; // <-- Re-throw the error so Jest handles it
    }
}, 30000);

// Clean the todos table before each test using the *real* query function
beforeEach(async () => {
    try {
        await query('DELETE FROM todos');
    } catch (error) {
        // Log error but don't necessarily fail the suite, individual tests might handle it
        console.error("Error cleaning todos table before test:", error);
    }
});

// Close the *real* pool after all tests are done
afterAll(async () => {
    await pool.end();
});


// Original describe blocks for actual DB interaction tests
describe('Database Initialization (Integration - Real DB)', () => {
    it('should create the todos table', async () => {
        // Check if the table exists in pg_catalog.pg_tables using the real query
        const res = await query(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema' AND tablename = $1",
            ['todos']
        );
        expect(res.rows.length).toBe(1);
        expect(res.rows[0].tablename).toBe('todos');
    });
});

describe('Todo Table Operations (Integration - Real DB)', () => {
    it('should allow inserting a new todo item', async () => {
        const text = 'Test todo item';
        // Use real query
        const insertRes = await query('INSERT INTO todos(text) VALUES($1) RETURNING *', [text]);
        expect(insertRes.rows.length).toBe(1);
        expect(insertRes.rows[0].text).toBe(text);
        expect(insertRes.rows[0].id).toBeDefined();
        expect(insertRes.rows[0].created_at).toBeDefined();

        // Verify it's actually in the table
        const selectRes = await query('SELECT * FROM todos WHERE id = $1', [insertRes.rows[0].id]);
        expect(selectRes.rows.length).toBe(1);
        expect(selectRes.rows[0].text).toBe(text);
    });

    it('should allow selecting all todo items', async () => {
        // Insert multiple items
        await query('INSERT INTO todos(text) VALUES($1), ($2)', ['Item 1', 'Item 2']);

        const selectRes = await query('SELECT * FROM todos ORDER BY created_at ASC');
        expect(selectRes.rows.length).toBe(2);
        expect(selectRes.rows[0].text).toBe('Item 1');
        expect(selectRes.rows[1].text).toBe('Item 2');
    });

    it('should allow deleting a todo item', async () => {
        // Insert an item
        const text = 'Item to delete';
        const insertRes = await query('INSERT INTO todos(text) VALUES($1) RETURNING id', [text]);
        const itemId = insertRes.rows[0].id;

        // Delete the item
        const deleteRes = await query('DELETE FROM todos WHERE id = $1 RETURNING *', [itemId]);
        expect(deleteRes.rows.length).toBe(1);
        expect(deleteRes.rows[0].id).toBe(itemId);

        // Verify it's gone
        const selectRes = await query('SELECT * FROM todos WHERE id = $1', [itemId]);
        expect(selectRes.rows.length).toBe(0);
    });

     it('should return an empty array when selecting from an empty table', async () => {
        const selectRes = await query('SELECT * FROM todos');
        expect(selectRes.rows.length).toBe(0);
        expect(selectRes.rows).toEqual([]);
    });
}); 