# MCP Agent Framework - Architecture

This document provides a detailed overview of the MCP Agent Framework architecture, focusing on how the different components interact with each other.

## System Components

The framework consists of three main components:

```
┌───────────────┐    ┌────────────────┐    ┌───────────────┐
│ LLM Provider  │◄───┤ Agent Framework├───►│  toyMCP API   │
│ (Ollama/Cloud)│    │                │    │  (Todo Server)│
└───────────────┘    └────────────────┘    └───────────────┘
```

1. **The MCP Server (toyMCP)**: A JSON-RPC server providing todo list functionality
2. **The Agent Framework**: A TypeScript application that bridges between user, model, and server
3. **The Language Model**: An AI model (via Ollama or OpenAI) that helps with decision-making

## How MCP and the Model Interact with agent.ts

The `agent.ts` file serves as the central component that coordinates between the MCP server and the language model.

### 1. MCP Server Integration

The `MCPAgent` class establishes a connection to the MCP server using:

```typescript
// Authentication with MCP server
async authenticate(username: string, password: string): Promise<boolean>

// Making JSON-RPC calls to the MCP server
async executeRPC(method: string, params?: any): Promise<any>
```

These methods enable the agent to:
- Log in to get an authentication token
- Send JSON-RPC requests to the todo list API endpoints
- Process responses from the server

The agent follows the MCP protocol by formatting requests with the standard JSON-RPC 2.0 format:

```javascript
{
  jsonrpc: "2.0",
  method: "todo.add", // or "todo.list", "todo.remove", etc.
  params: { /* method-specific parameters */ },
  id: uuid()
}
```

### 2. Language Model Integration

The agent communicates with the language model through the `LLMProvider` interface:

```typescript
// Language model interface
export interface LLMProvider {
  complete(prompt: string): Promise<string>;
}
```

This abstraction allows the agent to work with different model providers (Ollama or OpenAI) as long as they implement this interface.

The agent primarily uses the model for:
- Understanding natural language instructions
- Deciding which action to take (add/list/remove)
- Formatting appropriate parameters

### 3. The Complete Interaction Flow

When handling a user task, the following sequence occurs:

1. **User input → Agent**: The user provides a natural language instruction (e.g., "Add milk to my list")

2. **Agent → Model**: The agent consults the LLM to determine what to do:
   ```typescript
   const planning = await this.llmProvider.complete(`
     You are an agent that manages a todo list...
     Options: 1. Add... 2. List... 3. Remove...
     Respond with a JSON object...
   `);
   ```

3. **Model → Agent**: The model returns a structured decision:
   ```json
   {
     "action": "add",
     "text": "milk",
     "reasoning": "The user wants to add 'milk' to their todo list"
   }
   ```

4. **Agent → MCP Server**: The agent translates this into a proper MCP JSON-RPC call:
   ```typescript
   const addResult = await this.executeRPC('todo.add', { text: "milk" });
   ```

5. **MCP Server → Agent**: The server processes the request and returns the result:
   ```json
   {
     "jsonrpc": "2.0",
     "result": {
       "id": 42,
       "text": "milk",
       "created_at": "2025-05-06T11:15:30.123Z"
     },
     "id": "request-uuid"
   }
   ```

6. **Agent → User**: The agent formats this into a human-readable response:
   ```
   Added task: milk with ID 42
   ```

## Key Design Patterns

- **Dependency Injection**: The `MCPAgent` receives an `LLMProvider` in its constructor, allowing for different models
- **Adapter Pattern**: Each provider (Ollama/OpenAI) adapts a specific API to the common `LLMProvider` interface
- **Command Pattern**: The agent translates high-level commands into specific MCP operations
- **Error Handling**: Robust error handling at all levels of interaction

## Class Diagram

```
┌─────────────────┐         ┌───────────────┐
│   MCPAgent      │         │  LLMProvider  │
├─────────────────┤         ├───────────────┤
│ - baseUrl       │         │ + complete()  │
│ - token         │◄────────┤               │
│ - llmProvider   │         └───────────────┘
├─────────────────┤                ▲
│ + authenticate()│                │
│ + executeRPC()  │      ┌─────────┴───────┐
│ + executeTask() │      │                 │
│ + listTasks()   │      │                 │
└─────────────────┘  ┌───┴────────┐  ┌─────┴──────┐
                     │OllamaProvider│  │OpenAIProvider│
                     └──────────────┘  └──────────────┘
```

## Sequence Diagram for Task Execution

```
┌─────┐        ┌──────────┐        ┌────────────┐      ┌──────────┐
│User │        │ index.js │        │  MCPAgent  │      │LLMProvider│      ┌──────────┐
└──┬──┘        └────┬─────┘        └─────┬──────┘      └─────┬────┘      │MCP Server│
   │                │                     │                   │           └─────┬────┘
   │ execute task   │                     │                   │                 │
   │────────────────>                     │                   │                 │
   │                │                     │                   │                 │
   │                │ authenticate()      │                   │                 │
   │                │────────────────────>│                   │                 │
   │                │                     │   auth request    │                 │
   │                │                     │────────────────────────────────────>│
   │                │                     │                   │                 │
   │                │                     │   token response  │                 │
   │                │                     │<────────────────────────────────────│
   │                │ executeTask()       │                   │                 │
   │                │────────────────────>│                   │                 │
   │                │                     │                   │                 │
   │                │                     │  complete()       │                 │
   │                │                     │─────────────────>│                 │
   │                │                     │                   │                 │
   │                │                     │  decision JSON    │                 │
   │                │                     │<─────────────────│                 │
   │                │                     │                   │                 │
   │                │                     │ executeRPC()      │                 │
   │                │                     │────────────────────────────────────>│
   │                │                     │                   │                 │
   │                │                     │ JSON-RPC response │                 │
   │                │                     │<────────────────────────────────────│
   │                │                     │                   │                 │
   │                │ formatted result    │                   │                 │
   │                │<────────────────────│                   │                 │
   │                │                     │                   │                 │
   │ display result │                     │                   │                 │
   │<───────────────│                     │                   │                 │
┌──┴──┐        ┌────┴─────┐        ┌─────┴──────┐      ┌─────┴────┐      ┌─────┴────┐
│User │        │ index.js │        │  MCPAgent  │      │LLMProvider│      │MCP Server│
└─────┘        └──────────┘        └────────────┘      └──────────┘      └──────────┘
```

## Benefits of this Architecture

1. **Modularity**: Each component has a single responsibility and clear interfaces
2. **Extensibility**: New LLM providers can be added by implementing the LLMProvider interface
3. **Testability**: Components can be tested in isolation with mocks
4. **Flexibility**: Natural language processing capabilities can be enhanced without changing the MCP integration
5. **Separation of Concerns**: The agent handles coordination, providers handle LLM API specifics, and the MCP protocol is isolated

This architecture creates a clean separation of concerns while enabling natural language control of the todo list through the MCP server. 