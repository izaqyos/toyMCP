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
 * # Note: Removed requestBodies and responses components as they are complex to generalize
 * #       for multiple methods within a single OpenAPI operation. Examples in the requestBody
 * #       and a combined response schema are used instead.
 */

/**
 * @openapi
 * paths:
 *   /rpc:
 *     post:
 *       summary: JSON-RPC Endpoint
 *       operationId: jsonRpcCall
 *       description: |
 *         This single endpoint handles all JSON-RPC 2.0 method calls.
 *         Specify the desired method and its parameters within the JSON request body.
 *
 *         **Available Methods:**
 *         *   `mcp.discover`: Returns service discovery information.
 *         *   `todo.list`: Lists all todo items. Takes no parameters.
 *         *   `todo.add`: Adds a new todo item. Requires `params: { text: string }`.
 *         *   `todo.remove`: Removes a todo item by ID. Requires `params: { id: number }`.
 *       tags:
 *         - JSON-RPC
 *         - Todo
 *         - MCP
 *       requestBody:
 *         description: A standard JSON-RPC 2.0 request object.
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jsonrpc:
 *                   type: string
 *                   description: JSON-RPC version.
 *                   example: "2.0"
 *                 method:
 *                   type: string
 *                   description: The name of the method to be invoked.
 *                   example: "mcp.discover"
 *                 params:
 *                   type: object
 *                   description: Parameters for the method (structure depends on the method).
 *                   nullable: true
 *                   example: { "text": "Sample task" } # Example for todo.add
 *                 id:
 *                   type: [string, number, 'null']
 *                   description: An identifier established by the Client.
 *                   example: 1
 *               required:
 *                 - jsonrpc
 *                 - method
 *                 - id # Technically required for non-notifications
 *             examples:
 *               McpDiscover:
 *                 summary: Example for mcp.discover
 *                 value:
 *                   jsonrpc: "2.0"
 *                   method: "mcp.discover"
 *                   id: 9
 *               TodoList:
 *                 summary: Example for todo.list
 *                 value:
 *                   jsonrpc: "2.0"
 *                   method: "todo.list"
 *                   id: 10
 *               TodoAdd:
 *                 summary: Example for todo.add
 *                 value:
 *                   jsonrpc: "2.0"
 *                   method: "todo.add"
 *                   params: { "text": "Buy milk" }
 *                   id: 11
 *               TodoRemove:
 *                 summary: Example for todo.remove
 *                 value:
 *                   jsonrpc: "2.0"
 *                   method: "todo.remove"
 *                   params: { "id": 1 }
 *                   id: 12
 *       responses:
 *         '200':
 *           description: |
 *             A standard JSON-RPC 2.0 response object.
 *             If the method call was successful, the `result` field contains the outcome.
 *             If the method call failed (either due to JSON-RPC errors or application errors),
 *             the `error` field contains details about the failure.
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   jsonrpc:
 *                     type: string
 *                     example: "2.0"
 *                   result:
 *                     # Result can be the discovery object, array of todos, or single todo
 *                     # Using a generic object/array type here for simplicity in OpenAPI
 *                     type: [object, array]
 *                     nullable: true
 *                     description: The result of a successful method call (structure depends on the method).
 *                     # Example below is for todo.list
 *                     example: [{ "id": 1, "text": "Example", "completed": false, "created_at": "2023-01-01T12:00:00Z" }]
 *                   error:
 *                     nullable: true
 *                     allOf:
 *                       - $ref: '#/components/schemas/JsonRpcError'
 *                   id:
 *                     type: [string, number, 'null']
 *                     description: Must match the value of the id in the Request Object.
 *                 required:
 *                   - jsonrpc
 *                   - id
 *                   # Note: Either result or error MUST be present, but not both.
 *                   # OpenAPI schema validation can't easily enforce this XOR condition perfectly.
 */

// This file is only for JSDoc definitions, no actual code needed. 