const db = require('./db');
const { JSONRPCErrorException } = require('json-rpc-2.0');

// Define custom error code for Not Found
const TODO_NOT_FOUND_ERROR_CODE = 1001;

const methods = {
    /**
     * Lists all todo items.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of todo items.
     */
    'todo.list': async () => {
        try {
            const result = await db.query('SELECT * FROM todos ORDER BY created_at ASC', []);
            return result.rows;
        } catch (err) {
            console.error('Error fetching todo list:', err);
            // Re-throw database errors to be handled by the server/RPC handler
            throw err;
        }
    },

    /**
     * Adds a new todo item.
     * @param {object} params - The parameters object.
     * @param {string} params.text - The text of the todo item.
     * @returns {Promise<object>} A promise that resolves to the newly added todo item.
     * @throws {JSONRPCErrorException} If parameters are invalid.
     */
    'todo.add': async (params) => {
        if (!params || typeof params.text !== 'string' || params.text.trim() === '') {
            throw new JSONRPCErrorException(
                !params || params.text === undefined ? 'Missing required parameter: text' : 'Parameter "text" must be a non-empty string',
                -32602 // Invalid params code
            );
        }
        const { text } = params;
        try {
            const result = await db.query(
                'INSERT INTO todos(text) VALUES($1) RETURNING *',
                [text.trim()]
            );
            return result.rows[0];
        } catch (err) {
            console.error('Error adding todo item:', err);
            throw err;
        }
    },

    /**
     * Removes a todo item by its ID.
     * @param {object} params - The parameters object.
     * @param {number} params.id - The ID of the todo item to remove.
     * @returns {Promise<object>} A promise that resolves to the removed todo item.
     * @throws {JSONRPCErrorException} If parameters are invalid or item not found.
     */
    'todo.remove': async (params) => {
        if (!params || typeof params.id !== 'number') {
            throw new JSONRPCErrorException(
                !params || params.id === undefined ? 'Missing required parameter: id' : 'Parameter "id" must be a number',
                -32602 // Invalid params code
            );
        }
        const { id } = params;
        try {
            const result = await db.query(
                'DELETE FROM todos WHERE id = $1 RETURNING *',
                [id]
            );
            if (result.rowCount === 0) {
                throw new JSONRPCErrorException(
                    `Todo item with ID ${id} not found`,
                    TODO_NOT_FOUND_ERROR_CODE
                );
            }
            return result.rows[0];
        } catch (err) {
            // If it's already a JSONRPCErrorException (like our Not Found), re-throw it
            if (err instanceof JSONRPCErrorException) {
                throw err;
            }
            // Otherwise, log and re-throw as a potential database error
            console.error(`Error removing todo item with ID ${id}:`, JSON.stringify(err));
            throw err;
        }
    },
};

module.exports = methods; 