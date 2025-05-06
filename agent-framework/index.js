// This is a JavaScript file that uses the TypeScript modules
// You would need to compile your TypeScript files first

const dotenv = require('dotenv');
const { MCPAgent } = require('./dist/agent');
const { OllamaProvider } = require('./dist/ollama-provider');
const { OpenAIProvider } = require('./dist/openai-provider');

// Load environment variables
dotenv.config();

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const debugMode = args.includes('--debug');
  
  // Remove debug flag from arguments if present
  const filteredArgs = args.filter(arg => arg !== '--debug');
  const command = filteredArgs[0] || '';
  const isListCommand = command.toLowerCase() === 'list';
  const task = isListCommand ? '' : command;

  if (debugMode) {
    console.log('[Debug] Debug mode enabled');
    console.log('[Debug] Command:', command);
  }

  // Choose provider based on configuration
  const useOllama = process.env.USE_OLLAMA === 'true';
  let provider;
  
  if (useOllama) {
    provider = new OllamaProvider(
      process.env.OLLAMA_MODEL || 'llama3'
    );
    console.log(`Using Ollama with model: ${process.env.OLLAMA_MODEL || 'llama3'}`);
  } else {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not found in environment');
      process.exit(1);
    }
    provider = new OpenAIProvider(
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    );
    console.log(`Using OpenAI with model: ${process.env.OPENAI_MODEL || 'gpt-3.5-turbo'}`);
  }
  
  // Create and authenticate the agent
  const agent = new MCPAgent(
    process.env.MCP_SERVER_URL || 'http://localhost:3000',
    provider,
    debugMode
  );
  
  const authenticated = await agent.authenticate(
    process.env.MCP_USERNAME || 'testuser',
    process.env.MCP_PASSWORD || 'password123'
  );
  
  if (!authenticated) {
    console.error('Failed to authenticate with MCP server');
    process.exit(1);
  }
  
  console.log('Agent authenticated successfully');
  
  // Execute based on command
  try {
    let result;
    
    if (isListCommand) {
      console.log('Listing all tasks...');
      result = await agent.listTasks();
    } else {
      // Example task execution
      const defaultTask = 'Buy groceries for dinner';
      const userTask = task || defaultTask;
      console.log(`Executing task: "${userTask}"`);
      result = await agent.executeTask(userTask);
    }
    
    console.log(result);
    
    // Discover API capabilities
    try {
      const discover = await agent.executeRPC('mcp.discover');
      console.log('Available MCP methods:', discover.result.methods.map(m => m.name).join(', '));
    } catch (error) {
      console.error('Failed to discover API capabilities:', error.message);
    }
  } catch (error) {
    console.error('Error executing command:', error);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
}); 