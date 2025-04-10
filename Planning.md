# High-Level Plan: MCP To-Do List Server (NodeJS/Express/PostgreSQL)

## 1. Technology Stack

*   **Language:** NodeJS (Latest LTS version recommended)
*   **Framework/Server:** ExpressJS
*   **MCP Handling:** `json-rpc-2.0` library for NodeJS.
*   **Persistence:** PostgreSQL database, running in a Docker container.
*   **Database Client:** `pg` (node-postgres) library.
*   **Testing:** Jest testing framework.
*   **Dependency Management:** `package.json` (npm or yarn).
*   **Containerization:** Docker and Docker Compose.

## 2. Project Structure

```
toyMCP/
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── package.json
├── Planning.md  <-- This file
├── README.md
├── TASKS.md
├── src/
│   ├── server.js       # Express app setup, MCP endpoint, server start
│   ├── mcp_router.js   # Express router handling the /mcp endpoint
│   ├── mcp_methods.js  # Logic for each MCP method (list, add, remove)
│   ├── db/
│   │   ├── index.js      # DB connection pool setup
│   │   └── schema.sql    # SQL script to create the 'todos' table
│   └── config.js       # Configuration (DB connection details, etc.)
└── tests/
    ├── setup.js        # Jest setup file (e.g., for DB setup/teardown)
    ├── db.test.js      # Tests for database interactions
    ├── mcp_methods.test.js # Unit tests for MCP method logic
    └── server.test.js    # Integration tests for the MCP endpoint
```

## 3. Core Files Maintenance

*   `README.md`: Project description, setup instructions (Docker, dependencies, run server/tests), API usage examples (MCP request/response formats).
*   `TASKS.md`: List of planned features, ongoing tasks, completed items, reflecting TDD steps.
*   `tests/`: Contains all automated tests.
*   `docker-compose.yml`: Defines the PostgreSQL service.
*   `src/db/schema.sql`: `CREATE TABLE` statement for the `todos` table.

## 4. Development Approach (TDD)

*   **Phase 1: Setup & Database:** Create structure, files, Docker config, DB schema, connection logic, and corresponding tests (`tests/db.test.js`). Implement DB logic to pass tests.
*   **Phase 2: MCP Method Logic:** Define MCP methods, write unit tests (`tests/mcp_methods.test.js`) mocking DB interactions. Implement method logic in `src/mcp_methods.js` to pass tests.
*   **Phase 3: Server & Routing:** Set up Express, configure JSON-RPC library, define MCP route (`src/mcp_router.js`). Write integration tests (`tests/server.test.js`). Implement server/routing logic (`src/server.js`, `src/mcp_router.js`) to pass tests.
*   **Phase 4: Refinement & Documentation:** Refactor, ensure test coverage, finalize `README.md` and `TASKS.md`.
*   **Phase 5: Manual Integration Testing:**
    *   **Goal:** Verify the running server interacts correctly with the database via MCP requests sent from an external client.
    *   **Method:** Start the server (`npm start` or similar) and the PostgreSQL container (`docker-compose up`). Use a tool to send JSON-RPC 2.0 requests to the `/mcp` endpoint (e.g., `http://localhost:3000/mcp`).
    *   **Tools:**
        *   `curl`: Send POST requests from the command line with the JSON-RPC payload.
            ```bash
            # Example: Add item
            curl -X POST -H "Content-Type: application/json" \
                 -d '{"jsonrpc": "2.0", "method": "todo.add", "params": {"text": "Buy milk"}, "id": 1}' \
                 http://localhost:3000/mcp

            # Example: List items
            curl -X POST -H "Content-Type: application/json" \
                 -d '{"jsonrpc": "2.0", "method": "todo.list", "id": 2}' \
                 http://localhost:3000/mcp
            ```
        *   **API Clients (Postman, Insomnia):** Create a POST request, set `Content-Type: application/json`, and put the JSON-RPC payload in the raw JSON body.
    *   **Verification:** Check JSON-RPC responses and inspect the `todos` table in the PostgreSQL database. 