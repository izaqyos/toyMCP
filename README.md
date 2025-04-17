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
    The server will initialize the database schema if necessary and start listening on `http://localhost:3000` (or the port specified by the `PORT` environment variable).
    The JSON-RPC endpoint is `http://localhost:3000/rpc`.
    The Swagger API documentation UI is available at `http://localhost:3000/api-docs`.

### Clean Server Start

If you need to ensure the server starts with a completely fresh database (e.g., before running manual end-to-end tests or to reset state), you can use the `clean_start.sh` script:

1.  **Stop the running server** (if any) by pressing `Ctrl+C` in the terminal where it's running.
2.  **Ensure the script is executable:**
    ```bash
    chmod +x clean_start.sh
    ```
3.  **Run the script:**
    ```bash
    ./clean_start.sh
    ```
    This script will stop and remove the database container (`docker compose down`), restart it (`docker compose up -d db`), and then start the Node.js server (`npm start`).

## Running Tests

Ensure the PostgreSQL container is running (`docker compose up -d db`).

Tests are separated into `tests/unit_tests` and `tests/integration_tests`. The following command runs all tests:

```bash
npm test
```

### Running Coverage Report

```bash
npm run coverage
```
This will output a summary to the terminal and generate a detailed HTML report in the `coverage/lcov-report/` directory, reflecting coverage from both unit and integration tests.

### Running End-to-End Test Script

The project includes an orchestrator script (`run_full_test.sh`) that performs a full sequence of tests using `curl` against a live server, including cleaning the database beforehand and providing a summary report. This is the recommended way to perform a manual end-to-end check.

**Prerequisites:** `curl`, `jq`

```bash
chmod +x run_full_test.sh test_server.sh # Ensure scripts are executable
./run_full_test.sh
```

## API Documentation

Interactive API documentation is available via Swagger UI when the server is running:

*   **Swagger UI:** `http://localhost:3000/api-docs`

This documentation is generated automatically from JSDoc comments in the source code (`src/mcp_methods.js`) using `swagger-jsdoc`.

## API Usage (JSON-RPC 2.0 via HTTP POST)

Send POST requests to `http://localhost:3000/rpc` with `Content-Type: application/json` and a JSON-RPC 2.0 payload in the body.

**Example Tool:** `curl`

*   **Add Item (`todo.add`)**
    ```bash
    curl -X POST -H "Content-Type: application/json" \
         -d '{"jsonrpc": "2.0", "method": "todo.add", "params": {"text": "Buy groceries"}, "id": 1}' \
         http://localhost:3000/rpc
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
         http://localhost:3000/rpc
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
         http://localhost:3000/rpc
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
         http://localhost:3000/rpc
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