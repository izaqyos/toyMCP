const db = require('./db');
const { JSONRPCErrorException } = require('json-rpc-2.0');

// Define custom error code for Not Found
const TODO_NOT_FOUND_ERROR_CODE = 1001;

const methods = {
    /**
     * Provides information about the service and its available methods.
     * Follows common conventions for MCP discovery.
     * @returns {Promise<object>} A promise that resolves to the discovery document.
     */
    'mcp.discover': async () => {
        return {
            mcp_version: "1.0.0", // Simple version for now
            name: "ToyMCP Todo Service",
            description: "A simple To-Do list manager implementing MCP concepts.",
            methods: [
                {
                    name: "todo.list",
                    description: "Lists all existing todo items, ordered by creation time.",
                    parameters: [], // No parameters required
                    returns: {
                        description: "An array of TodoItem objects.",
                        schema: { type: "array", items: { "$ref": "#/components/schemas/TodoItem" } } // Reference OpenAPI schema
                    }
                },
                {
                    name: "todo.add",
                    description: "Adds a new todo item to the list.",
                    parameters: [
                        {
                            name: "text",
                            type: "string",
                            required: true,
                            description: "The content of the todo item."
                        }
                    ],
                    returns: {
                        description: "The newly created TodoItem object.",
                        schema: { "$ref": "#/components/schemas/TodoItem" } // Reference OpenAPI schema
                    }
                },
                {
                    name: "todo.remove",
                    description: "Removes a todo item by its ID.",
                    parameters: [
                        {
                            name: "id",
                            type: "number",
                            required: true,
                            description: "The unique identifier of the todo item to remove."
                        }
                    ],
                    returns: {
                        description: "The removed TodoItem object.",
                        schema: { "$ref": "#/components/schemas/TodoItem" } // Reference OpenAPI schema
                    }
                },
                 {
                    name: "mcp.discover",
                    description: "Returns this discovery document describing the service capabilities.",
                    parameters: [],
                    returns: {
                        description: "The MCP discovery document.",
                        schema: { type: "object" } // Self-reference (simplified)
                    }
                }
            ]
        };
    },

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