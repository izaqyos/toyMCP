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
- [ ] Phase 5: Manual Integration Testing
  - [ ] Start server (`npm start`) and DB (`docker compose up -d db`)
  - [ ] Use `curl` or API client (Postman/Insomnia) to send requests (`todo.add`, `todo.list`, `todo.remove`)
  - [ ] Verify responses and check DB state

## Fix Failing Manual Tests (`test_server.sh`)

The following tests from `test_server.sh` are unexpectedly failing, mostly returning `-32600 Invalid Request`. Need to investigate and fix the root cause and potentially update the tests or server logic.

- [x] Fix Test [1]: Add 'Learn HTTPie' (Failing with -32600)
- [ ] Fix Test [2]: Add 'Test the server' (Failing with -32600)
- [ ] Fix Test [3]: List all items (Failing with -32600)
- [ ] Fix Test [4]: Remove the first item (Failing with -32600)
- [ ] Fix Test [5]: Remove the second item (Failing with -32600)
- [ ] Fix Test [6]: List items again (Failing with -32600)
- [ ] Fix Test [E1]: Add item with missing 'text' (Failing with -32600)
- [ ] Fix Test [E2]: Add item with invalid 'text' type (Failing with -32600)
- [ ] Fix Test [E3]: Remove item with missing 'id' (Failing with -32600)
- [ ] Fix Test [E4]: Remove item with non-existent ID (Failing with -32600)
- [ ] Fix Test [E5]: Call a non-existent method (Failing with -32600)
- [x] Fix Test [E6]: Send invalid JSON (Failing with -32600 instead of -32700) 