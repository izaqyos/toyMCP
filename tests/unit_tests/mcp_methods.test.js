// tests/unit_tests/mcp_methods.test.js
const mcpMethods = require('../../src/mcp_methods');
const db = require('../../src/db'); // Import the original db module to be mocked
const { JSONRPCErrorException } = require('json-rpc-2.0'); // To check for specific error types

// Mock the db module
jest.mock('../../src/db', () => ({
    query: jest.fn(), // Mock the query function
    // We don't need to mock pool or initializeDatabase for these unit tests
}));

describe('MCP Methods', () => {

    beforeEach(() => {
        // Clear mock usage history before each test
        db.query.mockClear();
    });

    // --- todo.list ---
    describe('todo.list', () => {
        it('should query the database for all todos and return them', async () => {
            const mockTodos = [
                { id: 1, text: 'Item 1', created_at: new Date().toISOString() },
                { id: 2, text: 'Item 2', created_at: new Date().toISOString() },
            ];
            // Configure the mock db query to return mock data
            db.query.mockResolvedValueOnce({ rows: mockTodos });

            // Assuming mcpMethods['todo.list'] exists and is async
            const result = await mcpMethods['todo.list']();

            // Verify db.query was called correctly
            expect(db.query).toHaveBeenCalledTimes(1);
            // Check the SQL query loosely (should select from todos)
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM todos'), []);

            // Verify the result matches the mock data
            expect(result).toEqual(mockTodos);
        });

        it('should return an empty array if the database query returns no rows', async () => {
             db.query.mockResolvedValueOnce({ rows: [] }); // Simulate empty table
             const result = await mcpMethods['todo.list']();
             expect(db.query).toHaveBeenCalledTimes(1);
             expect(result).toEqual([]);
        });

        it('should propagate database errors', async () => {
            const errorMessage = 'Database connection failed';
            db.query.mockRejectedValueOnce(new Error(errorMessage)); // Simulate DB error

            // Expect the method to re-throw the error
            await expect(mcpMethods['todo.list']()).rejects.toThrow(errorMessage);
            expect(db.query).toHaveBeenCalledTimes(1);
        });
    });

    // --- todo.add ---
    describe('todo.add', () => {
        it('should insert a new todo item and return it', async () => {
            const newItemText = 'New todo test';
            const mockInsertedTodo = { id: 3, text: newItemText, created_at: new Date().toISOString() };
            const params = { text: newItemText };

            db.query.mockResolvedValueOnce({ rows: [mockInsertedTodo] }); // Simulate DB returning the new row

            const result = await mcpMethods['todo.add'](params);

            expect(db.query).toHaveBeenCalledTimes(1);
            // Check the SQL query loosely (should insert into todos)
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO todos(text)'),
                [newItemText] // Check the parameter passed to the query
            );
            expect(result).toEqual(mockInsertedTodo);
        });

        it('should throw JSONRPCErrorException if params are missing', async () => {
            // Test with undefined, null, or empty object
            await expect(mcpMethods['todo.add']())
                  .rejects.toThrow(new JSONRPCErrorException('Missing required parameter: text', -32602));
            await expect(mcpMethods['todo.add'](null))
                  .rejects.toThrow(new JSONRPCErrorException('Missing required parameter: text', -32602));
             await expect(mcpMethods['todo.add']({})) // Missing text property
                  .rejects.toThrow(new JSONRPCErrorException('Missing required parameter: text', -32602));
            expect(db.query).not.toHaveBeenCalled();
        });

         it('should throw JSONRPCErrorException if text parameter is empty or not a string', async () => {
            await expect(mcpMethods['todo.add']({ text: '' }))
                 .rejects.toThrow(new JSONRPCErrorException('Parameter "text" must be a non-empty string', -32602));
             await expect(mcpMethods['todo.add']({ text: 123 }))
                 .rejects.toThrow(new JSONRPCErrorException('Parameter "text" must be a non-empty string', -32602));
            expect(db.query).not.toHaveBeenCalled();
        });

        it('should propagate database errors during insertion', async () => {
            const errorMessage = 'Insert conflict';
            db.query.mockRejectedValueOnce(new Error(errorMessage));
            const params = { text: 'Valid text' };

            await expect(mcpMethods['todo.add'](params)).rejects.toThrow(errorMessage);
            expect(db.query).toHaveBeenCalledTimes(1);
        });
    });

    // --- todo.remove ---
    describe('todo.remove', () => {
        it('should delete a todo item by ID and return the deleted item', async () => {
            const itemIdToRemove = 5;
            const mockDeletedTodo = { id: itemIdToRemove, text: 'Item to delete', created_at: new Date().toISOString() };
            const params = { id: itemIdToRemove };

            // Simulate DB finding and returning the deleted row
            db.query.mockResolvedValueOnce({ rows: [mockDeletedTodo], rowCount: 1 });

            const result = await mcpMethods['todo.remove'](params);

            expect(db.query).toHaveBeenCalledTimes(1);
            // Check the SQL query loosely (should delete from todos where id matches)
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM todos WHERE id = $1'),
                [itemIdToRemove]
            );
            expect(result).toEqual(mockDeletedTodo);
        });

        it('should throw JSONRPCErrorException if the todo item ID is not found', async () => {
            const itemIdToRemove = 99;
            const params = { id: itemIdToRemove };

            // Simulate DB returning no rows for the delete
            db.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

            await expect(mcpMethods['todo.remove'](params))
                .rejects.toThrow(new JSONRPCErrorException(`Todo item with ID ${itemIdToRemove} not found`, 1001)); // Using custom code 1001 for Not Found

            expect(db.query).toHaveBeenCalledTimes(1);
            expect(db.query).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM todos WHERE id = $1'), [itemIdToRemove]);
        });

        it('should throw JSONRPCErrorException if params are missing or id is missing', async () => {
             await expect(mcpMethods['todo.remove']())
                  .rejects.toThrow(new JSONRPCErrorException('Missing required parameter: id', -32602));
            await expect(mcpMethods['todo.remove'](null))
                  .rejects.toThrow(new JSONRPCErrorException('Missing required parameter: id', -32602));
            await expect(mcpMethods['todo.remove']({})) // Missing id property
                 .rejects.toThrow(new JSONRPCErrorException('Missing required parameter: id', -32602));
            expect(db.query).not.toHaveBeenCalled();
        });

         it('should throw JSONRPCErrorException if id parameter is not a number', async () => {
            await expect(mcpMethods['todo.remove']({ id: 'abc' }))
                 .rejects.toThrow(new JSONRPCErrorException('Parameter "id" must be a number', -32602));
             await expect(mcpMethods['todo.remove']({ id: null }))
                 .rejects.toThrow(new JSONRPCErrorException('Parameter "id" must be a number', -32602));
             await expect(mcpMethods['todo.remove']({ id: true }))
                 .rejects.toThrow(new JSONRPCErrorException('Parameter "id" must be a number', -32602));
            expect(db.query).not.toHaveBeenCalled();
        });

        it('should propagate database errors during deletion', async () => {
            const errorMessage = 'Delete failed due to constraint';
            db.query.mockRejectedValueOnce(new Error(errorMessage));
            const params = { id: 1 };

            await expect(mcpMethods['todo.remove'](params)).rejects.toThrow(errorMessage);
            expect(db.query).toHaveBeenCalledTimes(1);
        });
    });

    // --- mcp.discover ---
    describe('mcp.discover', () => {
        it('should return the discovery document without database interaction', async () => {
            const result = await mcpMethods['mcp.discover']();

            // Verify the basic structure
            expect(result).toBeDefined();
            expect(result.mcp_version).toBeDefined();
            expect(result.name).toBeDefined();
            expect(result.description).toBeDefined();
            expect(result.methods).toBeInstanceOf(Array);

            // Verify that all expected methods are listed
            const methodNames = result.methods.map(m => m.name);
            expect(methodNames).toContain('todo.list');
            expect(methodNames).toContain('todo.add');
            expect(methodNames).toContain('todo.remove');
            expect(methodNames).toContain('mcp.discover');

            // Optional: Add more detailed checks for specific method definitions if needed
            const todoAddDef = result.methods.find(m => m.name === 'todo.add');
            expect(todoAddDef).toBeDefined();
            expect(todoAddDef.parameters).toBeInstanceOf(Array);
            expect(todoAddDef.parameters.length).toBe(1);
            expect(todoAddDef.parameters[0].name).toBe('text');
            expect(todoAddDef.parameters[0].required).toBe(true);
            expect(todoAddDef.returns.schema['$ref']).toContain('TodoItem');

            // Ensure no database interaction occurred
            expect(db.query).not.toHaveBeenCalled();
        });
    });

}); 