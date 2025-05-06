# MCP Agent Framework

A simple agentic framework for interacting with a toyMCP server. This framework allows you to create agents that use language models (either local Ollama models or OpenAI's cloud models) to interact with a Model Context Protocol (MCP) server.

## Architecture

```
┌───────────────┐    ┌────────────────┐    ┌───────────────┐
│ LLM Provider  │◄───┤ Agent Framework├───►│  toyMCP API   │
│ (Ollama/Cloud)│    │                │    │  (Todo Server)│
└───────────────┘    └────────────────┘    └───────────────┘
```

The agent framework serves as a bridge between an AI language model and the MCP server:

1. **The user** provides natural language instructions (e.g., "Add milk to my list")
2. **The language model** interprets these instructions and determines what action to take
3. **The agent** translates the model's decision into appropriate JSON-RPC calls
4. **The MCP server** processes these calls and responds with results
5. **The agent** formats the responses for the user

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed explanation of how these components interact.

## Features

- Connect to a toyMCP server
- Authenticate with the server
- Execute JSON-RPC calls to manage todo items
- Use LLM reasoning to decide how to handle natural language tasks
- Support for both local Ollama models and OpenAI cloud models

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agent-framework
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Copy the example environment file and edit it with your settings:
   ```bash
   cp .env-example .env
   # Edit .env with your preferred settings
   ```

4. **Build the TypeScript code**
   ```bash
   npm run build
   ```

## Usage

Run the agent with a task:

```bash
node index.js "Buy milk and eggs"
```

List all tasks:

```bash
node index.js list
```

Use the default task:

```bash
node index.js
```

### Debug Mode

To see detailed logs of the interactions between the agent, LLM, and MCP server, use the `--debug` flag:

```bash
node index.js --debug "Add a task to buy groceries"
```

This will show:
- All requests to and responses from the MCP server
- Prompts sent to the language model
- Responses received from the language model
- Decision-making processes

Debug mode is particularly useful for:
- Understanding how the agent interprets natural language
- Seeing the exact JSON-RPC calls being made
- Troubleshooting issues with model responses

## LLM Provider Configuration

### Using Ollama (Local)

1. Make sure you have [Ollama](https://ollama.ai/) installed and running.
2. Set `USE_OLLAMA=true` in your `.env` file.
3. Specify the model you want to use with `OLLAMA_MODEL=deepseek-coder-v2:latest` (or another model you have pulled).

### Using OpenAI (Cloud)

1. Get an API key from [OpenAI](https://platform.openai.com/).
2. Set `USE_OLLAMA=false` in your `.env` file.
3. Add your API key as `OPENAI_API_KEY=your_key_here`.
4. Optionally specify a model with `OPENAI_MODEL=gpt-3.5-turbo`.

## Development

To watch for changes during development:

```bash
npm run dev
```

## Project Structure

- `src/agent.ts` - The main MCPAgent class that coordinates between LLM and MCP server
- `src/ollama-provider.ts` - Implementation for the Ollama LLM provider
- `src/openai-provider.ts` - Implementation for the OpenAI LLM provider
- `index.js` - The main entry point that sets up and runs the agent

## Security Considerations

- Store sensitive information like API keys in environment variables, not in code
- The current implementation stores the auth token in memory only
- Consider implementing rate limiting for API calls
- Always validate LLM responses before using them in critical operations

## Performance Considerations

- Time complexity: O(1) for most operations, as they're API calls
- Space complexity: O(n) where n is the size of the response data
- Consider caching frequently used API responses for better performance 