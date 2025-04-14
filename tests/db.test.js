// tests/db.test.js
const { pool, query, initializeDatabase } = require('../src/db'); // Adjust path as necessary

// Ensure the database schema is initialized before any tests run
beforeAll(async () => {
    try {
        // Use the same retry logic as the main app initialization
        await initializeDatabase();
        console.log('Test DB schema initialized successfully.');
    } catch (error) {
        console.error("FATAL: Failed to initialize database for testing after retries:", error);
        // Force exit if DB init fails, as tests are likely pointless
        process.exit(1);
    }
});

// Clean the todos table before each test
beforeEach(async () => {
    try {
        await query('DELETE FROM todos');
    } catch (error) {
        console.error("Failed to clean todos table before test:", error);
        // Handle error appropriately, maybe skip test or fail suite
    }
});

// Close the pool after all tests are done
afterAll(async () => {
    await pool.end();
});

describe('Database Initialization', () => {
    it('should create the todos table', async () => {
        // Check if the table exists in pg_catalog.pg_tables
        const res = await query(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema' AND tablename = $1",
            ['todos']
        );
        expect(res.rows.length).toBe(1);
        expect(res.rows[0].tablename).toBe('todos');
    });
});

describe('Todo Table Operations', () => {
    it('should allow inserting a new todo item', async () => {
        const text = 'Test todo item';
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