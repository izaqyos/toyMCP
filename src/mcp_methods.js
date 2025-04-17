const db = require('./db');
const { JSONRPCErrorException } = require('json-rpc-2.0');

// Define custom error code for Not Found
const TODO_NOT_FOUND_ERROR_CODE = 1001;

/**
 * @openapi
 * components:
 *   schemas:
 *     TodoItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the todo item.
 *         text:
 *           type: string
 *           description: The content of the todo item.
 *         completed:
 *           type: boolean
 *           description: Whether the todo item is completed.
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the todo was created.
 *       required:
 *         - id
 *         - text
 *         - completed
 *         - created_at
 *     JsonRpcRequestBase:
 *       type: object
 *       properties:
 *         jsonrpc:
 *           type: string
 *           example: '2.0'
 *         id:
 *           type: [string, number, 'null']
 *           description: Request identifier.
 *       required:
 *         - jsonrpc
 *         - id
 *     JsonRpcResponseBase:
 *        type: object
 *        properties:
 *          jsonrpc:
 *            type: string
 *            example: '2.0'
 *          id:
 *            type: [string, number, 'null']
 *            description: Response identifier, matching the request id.
 *        required:
 *          - jsonrpc
 *          - id
 *     JsonRpcError:
 *       type: object
 *       properties:
 *         code:
 *           type: integer
 *           description: A Number that indicates the error type that occurred.
 *         message:
 *           type: string
 *           description: A String providing a short description of the error.
 *         data:
 *           type: object
 *           description: A Primitive or Structured value that contains additional information about the error. Can be omitted.
 *       required:
 *         - code
 *         - message
 *
 *   requestBodies:
 *      TodoListRequest:
 *        description: Request body for todo.list method.
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/JsonRpcRequestBase'
 *                - type: object
 *                  properties:
 *                    method:
 *                      type: string
 *                      example: 'todo.list'
 *                    params: # Optional for todo.list
 *                      type: object
 *                      nullable: true
 *                  required:
 *                    - method
 *            example:
 *              jsonrpc: "2.0"
 *              method: "todo.list"
 *              id: 1
 *      TodoAddRequest:
 *        description: Request body for todo.add method.
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/JsonRpcRequestBase'
 *                - type: object
 *                  properties:
 *                    method:
 *                      type: string
 *                      example: 'todo.add'
 *                    params:
 *                      type: object
 *                      properties:
 *                        text:
 *                          type: string
 *                          description: The text of the todo item.
 *                      required:
 *                        - text
 *                  required:
 *                    - method
 *                    - params
 *            example:
 *              jsonrpc: "2.0"
 *              method: "todo.add"
 *              params: { text: "Learn swagger-jsdoc" }
 *              id: 2
 *      TodoRemoveRequest:
 *        description: Request body for todo.remove method.
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              allOf:
 *                - $ref: '#/components/schemas/JsonRpcRequestBase'
 *                - type: object
 *                  properties:
 *                    method:
 *                      type: string
 *                      example: 'todo.remove'
 *                    params:
 *                      type: object
 *                      properties:
 *                        id:
 *                          type: integer
 *                          description: The ID of the todo item to remove.
 *                      required:
 *                        - id
 *                  required:
 *                    - method
 *                    - params
 *            example:
 *              jsonrpc: "2.0"
 *              method: "todo.remove"
 *              params: { id: 42 }
 *              id: 3
 *
 *   responses:
 *     TodoListResponse:
 *       description: Successful response for todo.list
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/JsonRpcResponseBase'
 *               - type: object
 *                 properties:
 *                   result:
 *                     type: array
 *                     items:
 *                       $ref: '#/components/schemas/TodoItem'
 *                 required:
 *                  - result
 *     TodoAddResponse:
 *       description: Successful response for todo.add
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/JsonRpcResponseBase'
 *               - type: object
 *                 properties:
 *                   result:
 *                     $ref: '#/components/schemas/TodoItem'
 *                 required:
 *                  - result
 *     TodoRemoveResponse:
 *       description: Successful response for todo.remove
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/JsonRpcResponseBase'
 *               - type: object
 *                 properties:
 *                   result:
 *                     $ref: '#/components/schemas/TodoItem'
 *                 required:
 *                  - result
 *     JsonRpcErrorResponse:
 *       description: JSON-RPC Error Response
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/JsonRpcResponseBase'
 *               - type: object
 *                 properties:
 *                   error:
 *                     $ref: '#/components/schemas/JsonRpcError'
 *                 required:
 *                  - error
 */

const methods = {
    /**
     * Lists all todo items.
     * @returns {Promise<Array<object>>} A promise that resolves to an array of todo items.
     * @openapi
     * /rpc:
     *   post:
     *     summary: Lists all todo items (JSON-RPC method 'todo.list')
     *     description: Retrieves a list of all available todo items. Corresponds to JSON-RPC method `todo.list`.
     *     operationId: todoList
     *     tags:
     *       - Todo
     *     requestBody:
     *       $ref: '#/components/requestBodies/TodoListRequest'
     *     responses:
     *       '200':
     *         description: A list of todo items.
     *         $ref: '#/components/responses/TodoListResponse'
     *       default: # Catch-all for JSON-RPC errors
     *         $ref: '#/components/responses/JsonRpcErrorResponse'
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
     * @openapi
     * /rpc:
     *   post:
     *     summary: Adds a new todo item (JSON-RPC method 'todo.add')
     *     description: Creates a new todo item with the provided text. Corresponds to JSON-RPC method `todo.add`.
     *     operationId: todoAdd
     *     tags:
     *       - Todo
     *     requestBody:
     *       $ref: '#/components/requestBodies/TodoAddRequest'
     *     responses:
     *       '200':
     *         description: The newly created todo item.
     *         $ref: '#/components/responses/TodoAddResponse'
     *       default: # Catch-all for JSON-RPC errors
     *         $ref: '#/components/responses/JsonRpcErrorResponse'
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
     * @openapi
     * /rpc:
     *   post:
     *     summary: Removes a todo item by ID (JSON-RPC method 'todo.remove')
     *     description: Deletes the todo item with the specified ID. Corresponds to JSON-RPC method `todo.remove`.
     *     operationId: todoRemove
     *     tags:
     *       - Todo
     *     requestBody:
     *       $ref: '#/components/requestBodies/TodoRemoveRequest'
     *     responses:
     *       '200':
     *         description: The removed todo item.
     *         $ref: '#/components/responses/TodoRemoveResponse'
     *       default: # Catch-all for JSON-RPC errors
     *         $ref: '#/components/responses/JsonRpcErrorResponse'
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