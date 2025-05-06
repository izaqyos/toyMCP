# toyMCP To-Do List Server

This is a simple example server implementing a To-Do list CRUD API using the Model Context Protocol (MCP) concepts, specifically using JSON-RPC 2.0 over HTTP.

It uses Node.js, Express, and PostgreSQL (via Docker) for persistence.

## Components

This project consists of two main components:

1. **MCP Server**: A JSON-RPC based API server for managing todo items
2. **Agent Framework**: A natural language interface to the MCP server using AI models

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

Interactive API documentation is available via Swagger UI both locally (when the server is running) and deployed via GitHub Pages:

*   **Local Swagger UI:** `http://localhost:3000/api-docs`
*   **GitHub Pages Swagger UI:** `https://izaqyos.github.io/toyMCP/swagger-ui/`

The documentation is generated automatically from JSDoc comments in `src/swagger_definitions.js` using `swagger-jsdoc`.

## API Usage

### Authentication

Most API endpoints require authentication using a JSON Web Token (JWT).

1.  **Login:** First, send a POST request to `/auth/login` with your username and password in the JSON body:
    ```bash
    curl -X POST -H "Content-Type: application/json" \
         -d '{"username": "testuser", "password": "password123"}' \
         http://localhost:3000/auth/login
    ```
    *Success Response:*
    ```json
    {
        "message": "Login successful",
        "user": { "id": 1, "username": "testuser" },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```
2.  **Use Token:** Copy the received `token` value. For subsequent requests to protected endpoints (like `/rpc`), include it in the `Authorization` header as a Bearer token:
    ```bash
    TOKEN="YOUR_JWT_TOKEN_HERE" # Replace with the actual token
    curl -X POST -H "Content-Type: application/json" \
         -H "Authorization: Bearer $TOKEN" \
         -d '{"jsonrpc": "2.0", "method": "mcp.discover", "id": 1}' \
         http://localhost:3000/rpc
    ```

### JSON-RPC Endpoint (`/rpc`)

Send POST requests to `http://localhost:3000/rpc` with `Content-Type: application/json`, an `Authorization: Bearer <token>` header, and a JSON-RPC 2.0 payload in the body.

**Available Methods:**

*   `todo.list`: Lists all todo items.
*   `todo.add`: Adds a new todo item (`params: { "text": "..." }`).
*   `todo.remove`: Removes a todo item (`params: { "id": ... }`).
*   `mcp.discover`: Describes the service and its available methods.

**Example Tool:** `curl` (assuming you have a valid $TOKEN obtained via `/auth/login`)

*   **Discover Service (`mcp.discover`)**
    ```bash
    curl -X POST -H "Content-Type: application/json" \
         -H "Authorization: Bearer $TOKEN" \
         -d '{"jsonrpc": "2.0", "method": "mcp.discover", "id": 1}' \
         http://localhost:3000/rpc
    ```
    *Success Response (example):*
    ```json
    {
        "jsonrpc": "2.0",
        "result": {
            "mcp_version": "1.0.0",
            "name": "ToyMCP Todo Service",
            "description": "A simple To-Do list manager implementing MCP concepts.",
            "methods": [
                {"name": "todo.list", ...},
                {"name": "todo.add", ...},
                {"name": "todo.remove", ...},
                {"name": "mcp.discover", ...}
            ]
        },
        "id": 1
    }
    ```

*   **Add Item (`todo.add`)**
    ```bash
    curl -X POST -H "Content-Type: application/json" \
         -H "Authorization: Bearer $TOKEN" \
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
         -H "Authorization: Bearer $TOKEN" \
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
         -H "Authorization: Bearer $TOKEN" \
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
    curl -X POST -H "Content-Type: application/json" \
         -H "Authorization: Bearer $TOKEN" \
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

## Agent Framework

The repository includes an AI-powered agent framework that provides a natural language interface to the MCP server. The agent uses either local Ollama models or OpenAI's cloud-based models to interpret user instructions and perform the appropriate actions on the todo list.

### Architecture

```
┌───────────────┐    ┌────────────────┐    ┌───────────────┐
│ LLM Provider  │◄───┤ Agent Framework├───►│  toyMCP API   │
│ (Ollama/Cloud)│    │                │    │  (Todo Server)│
└───────────────┘    └────────────────┘    └───────────────┘
```

### Setup and Usage

The agent framework is located in the `agent-framework/` directory. To use it:

1. **Set up the environment:**
   ```bash
   cd agent-framework
   npm install
   cp .env-example .env    # Configure settings as needed
   npm run build
   ```

2. **Use natural language to manage your todo list:**
   ```bash
   # Add a task
   node index.js "Add milk to my shopping list"

   # List all tasks
   node index.js "What's on my todo list?"

   # Remove a task
   node index.js "Remove the shopping task"
   
   # Debug mode
   node index.js --debug "Add a reminder to call mom"
   ```

For detailed documentation on the agent framework, refer to:
- `agent-framework/README.md`: Setup and usage instructions
- `agent-framework/ARCHITECTURE.md`: Technical design and interaction flow
- `agent-framework/CHANGELOG.md`: Development history and changes 