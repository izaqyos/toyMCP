# Project Tasks

- [x] Phase 1: Setup & Database
  - [x] Create project structure (`src`, `tests`)
  - [x] Initialize `npm` (`package.json`)
  - [x] Create `.gitignore`, `README.md`, `TASKS.md`, `Planning.md`
  - [x] Create `docker-compose.yml` for PostgreSQL
  - [x] Create `.dockerignore`
  - [x] Install dependencies (`express`, `json-rpc-2.0`, `pg`, `dotenv`, `jest`, `supertest`)
  - [x] Create DB schema (`src/db/schema.sql`)
  - [x] Create config loader (`src/config.js`)
  - [x] Implement DB connection pool & initializer (`src/db/index.js`)
  - [x] Configure Jest (`package.json`)
  - [x] Write DB tests (`tests/db.test.js`)
  - [x] Ensure DB tests pass
- [x] Phase 2: MCP Method Logic
  - [x] Create `src/mcp_methods.js` skeleton
  - [x] Write unit tests (`tests/mcp_methods.test.js`) with DB mocking
  - [x] Run tests (expect failures)
  - [x] Implement `todo.list`, `todo.add`, `todo.remove` in `src/mcp_methods.js`
  - [x] Run tests (expect pass)
- [x] Phase 3: Server & Routing
  - [x] Create `src/server.js` (Express setup, middleware, error handling, start logic)
  - [x] Create `src/mcp_router.js` (JSONRPCServer setup, method registration, POST handler)
  - [x] Write integration tests (`tests/server.test.js`) using `supertest`
  - [x] Run tests (fix errors if any)
  - [x] Ensure all tests pass
- [x] Phase 4: Refinement & Documentation
  - [x] Add `start` script to `package.json`
  - [x] Update `README.md` with setup/usage
  - [x] Update `TASKS.md` (this file)
  - [x] Add Swagger documentation (local and GitHub Pages)
  - [x] Add `.env.example` file
- [x] Phase 5: Manual Integration Testing
  - [x] Start server (`npm start`) and DB (`docker compose up -d db`)
  - [x] Use `curl` (`test_server.sh`) or API client (Postman/Insomnia) to send requests (`todo.add`, `todo.list`, `todo.remove`)
  - [x] Verify responses and check DB state (via `test_server.sh`)

## Fix Failing Manual Tests (`test_server.sh`)

(All tests passed after fixing endpoint URL in `test_server.sh`)

- [x] Fix Test [1]: Add 'Learn HTTPie'
- [x] Fix Test [2]: Add 'Test the server'
- [x] Fix Test [3]: List all items
- [x] Fix Test [4]: Remove the first item
- [x] Fix Test [5]: Remove the second item
- [x] Fix Test [6]: List items again
- [x] Fix Test [E1]: Add item with missing 'text'
- [x] Fix Test [E2]: Add item with invalid 'text' type
- [x] Fix Test [E3]: Remove item with missing 'id'
- [x] Fix Test [E4]: Remove item with non-existent ID
- [x] Fix Test [E5]: Call a non-existent method
- [x] Fix Test [E6]: Send invalid JSON 

┌───────────────┐    ┌────────────────┐    ┌───────────────┐
│ LLM Provider  │◄───┤ Agent Framework├───►│  toyMCP API   │
│ (Ollama/Cloud)│    │                │    │  (Todo Server)│
└───────────────┘    └────────────────┘    └───────────────┘ 