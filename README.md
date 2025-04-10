# toyMCP To-Do List Server

This is a simple example server implementing a To-Do list CRUD API using the Model Context Protocol (MCP) concepts, specifically using JSON-RPC 2.0 over HTTP.

It uses Node.js, Express, and PostgreSQL (via Docker) for persistence.

## Setup

1.  **Prerequisites:**
    *   Node.js (LTS version recommended)
    *   npm (usually comes with Node.js)
    *   Docker and Docker Compose

2.  **Clone the repository (if applicable):**
    ```bash
    # git clone ...
    # cd toyMCP
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    ```

4.  **Start PostgreSQL Database:**
    Make sure Docker Desktop (or the Docker daemon) is running.
    ```bash
    docker compose up -d db
    ```
    This will start a PostgreSQL container named `toymcp_db` in the background and create a persistent volume for its data.

5.  **Run the Server:**
    ```bash
    npm start
    ```
    The server will initialize the database schema if necessary and start listening on `http://localhost:3000` (or the port specified by the `PORT` environment variable). The MCP endpoint is `http://localhost:3000/mcp`.

## Running Tests

Ensure the PostgreSQL container is running (`docker compose up -d db`).

```bash
npm test
```

## API Usage (JSON-RPC 2.0 via HTTP POST)

Send POST requests to `http://localhost:3000/mcp` with `Content-Type: application/json` and a JSON-RPC 2.0 payload in the body.

**Example Tool:** `curl`

*   **Add Item (`todo.add`)**
    ```bash
    curl -X POST -H "Content-Type: application/json" \
         -d '{"jsonrpc": "2.0", "method": "todo.add", "params": {"text": "Buy groceries"}, "id": 1}' \
         http://localhost:3000/mcp
    ```
    *Success Response:*
    ```json
    {
        "jsonrpc": "2.0",
        "result": {
            "id": 1,
            "text": "Buy groceries",
            "created_at": "2025-04-07T16:15:00.123Z"
        },
        "id": 1
    }
    ```

*   **List Items (`todo.list`)**
    ```bash
    curl -X POST -H "Content-Type: application/json" \
         -d '{"jsonrpc": "2.0", "method": "todo.list", "id": 2}' \
         http://localhost:3000/mcp
    ```
    *Success Response (example):*
    ```json
    {
        "jsonrpc": "2.0",
        "result": [
            {
                "id": 1,
                "text": "Buy groceries",
                "created_at": "2025-04-07T16:15:00.123Z"
            }
            // ... other items
        ],
        "id": 2
    }
    ```

*   **Remove Item (`todo.remove`)**
    (Assuming an item with ID 1 exists)
    ```bash
    curl -X POST -H "Content-Type: application/json" \
         -d '{"jsonrpc": "2.0", "method": "todo.remove", "params": {"id": 1}, "id": 3}' \
         http://localhost:3000/mcp
    ```
    *Success Response:*
    ```json
    {
        "jsonrpc": "2.0",
        "result": {
            "id": 1,
            "text": "Buy groceries",
            "created_at": "2025-04-07T16:15:00.123Z"
        },
        "id": 3
    }
    ```

*   **Error Response Example (Item Not Found)**
    ```bash
    # Request to remove ID 999 which doesn't exist
    curl -X POST -H "Content-Type: application/json" \
         -d '{"jsonrpc": "2.0", "method": "todo.remove", "params": {"id": 999}, "id": 4}' \
         http://localhost:3000/mcp
    ```
    *Response:*
    ```json
    {
        "jsonrpc": "2.0",
        "error": {
            "code": 1001,
            "message": "Todo item with ID 999 not found"
        },
        "id": 4
    }
    ``` 