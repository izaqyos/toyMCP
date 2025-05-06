import axios from 'axios';
import { v4 as uuid } from 'uuid';

// Define Todo item interface
interface TodoItem {
  id: number;
  text: string;
  created_at: string;
}

// Interface for LLM providers
export interface LLMProvider {
  complete(prompt: string): Promise<string>;
}

export class MCPAgent {
  private baseUrl: string;
  private token: string | null = null;
  private llmProvider: LLMProvider;
  private enableDebugLogs: boolean;
  
  constructor(baseUrl: string, llmProvider: LLMProvider, enableDebugLogs: boolean = false) {
    this.baseUrl = baseUrl;
    this.llmProvider = llmProvider;
    this.enableDebugLogs = enableDebugLogs;
    this.log('Agent initialized with base URL:', baseUrl);
  }
  
  /**
   * Log a message if debug logging is enabled
   */
  private log(...args: any[]): void {
    if (this.enableDebugLogs) {
      console.log('[Agent]', ...args);
    }
  }
  
  async authenticate(username: string, password: string): Promise<boolean> {
    this.log('Authenticating with username:', username);
    try {
      const response = await axios.post(`${this.baseUrl}/auth/login`, {
        username,
        password
      });
      this.token = response.data.token;
      this.log('Authentication successful, token received');
      return true;
    } catch (error: unknown) {
      console.error('Authentication failed:', error);
      return false;
    }
  }
  
  async executeRPC(method: string, params?: any): Promise<any> {
    if (!this.token) {
      throw new Error('Not authenticated');
    }
    
    const requestId = uuid();
    const rpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: requestId
    };
    
    this.log(`MCP Request [${requestId}]:`, { method, params });
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/rpc`,
        rpcRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          }
        }
      );
      
      this.log(`MCP Response [${requestId}]:`, response.data);
      return response.data;
    } catch (error: unknown) {
      console.error(`RPC call to ${method} failed:`, error);
      throw error;
    }
  }
  
  /**
   * List all tasks from the server
   * @returns Formatted string with all tasks
   */
  async listTasks(): Promise<string> {
    this.log('Listing all tasks');
    try {
      const listResult = await this.executeRPC('todo.list');
      if (!listResult.result || !Array.isArray(listResult.result) || listResult.result.length === 0) {
        this.log('No tasks found');
        return 'No tasks found';
      }
      
      this.log(`Found ${listResult.result.length} tasks`);
      return `Current tasks:\n${listResult.result.map((item: TodoItem) => 
        `- [${item.id}] ${item.text} (created: ${new Date(item.created_at).toLocaleString()})`
      ).join('\n')}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `Failed to list tasks: ${errorMessage}`;
    }
  }
  
  /**
   * Remove a task by ID with confirmation
   * @param id The ID of the task to remove
   * @returns Confirmation message
   */
  async removeTask(id: number): Promise<string> {
    this.log(`Removing task with ID: ${id}`);
    try {
      const removeResult = await this.executeRPC('todo.remove', { id });
      return `Removed task: ${removeResult.result.text}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `Failed to remove task: ${errorMessage}`;
    }
  }
  
  async executeTask(task: string): Promise<string> {
    this.log('Executing task:', task);
    
    // Prepare prompt for LLM
    const prompt = `
      You are an agent that manages a todo list. You need to decide what to do with this task: "${task}"
      Options:
      1. Add it as a new todo item
      2. List current todo items to see if similar items exist
      3. Remove a todo item if the task is about deletion
      
      Respond with a JSON object with these fields:
      - action: "add", "list", or "remove"
      - text: the text to add (for "add" action)
      - id: the id to remove (for "remove" action, if known)
      - reasoning: why you chose this action
    `;
    
    this.log('Sending prompt to LLM:', prompt);
    
    // Ask the LLM what to do with this task
    const planning = await this.llmProvider.complete(prompt);
    
    try {
      this.log('Received LLM response:', planning);
      const decision = JSON.parse(planning);
      this.log('Parsed decision:', decision);
      
      switch (decision.action) {
        case 'add':
          this.log('Action: add task with text:', decision.text || task);
          const addResult = await this.executeRPC('todo.add', { text: decision.text || task });
          return `Added task: ${addResult.result.text} with ID ${addResult.result.id}`;
          
        case 'list':
          this.log('Action: list tasks');
          return await this.listTasks();
          
        case 'remove':
          // If ID is known
          if (decision.id) {
            this.log('Action: remove task with ID:', decision.id);
            return await this.removeTask(decision.id);
          } 
          // Otherwise list items and suggest which one might match
          else {
            this.log('Action: find task to remove matching:', task);
            const listResult = await this.executeRPC('todo.list');
            
            if (!listResult.result || !Array.isArray(listResult.result) || listResult.result.length === 0) {
              return "No tasks found to remove.";
            }
            
            const removalPrompt = `
              User wants to remove this task: "${task}"
              Here are the current tasks:
              ${listResult.result.map((item: TodoItem) => `- [${item.id}] ${item.text}`).join('\n')}
              
              Which task ID should be removed? Respond with just the ID number.
            `;
            
            this.log('Sending task selection prompt to LLM:', removalPrompt);
            const suggestion = await this.llmProvider.complete(removalPrompt);
            this.log('LLM suggested removing task ID:', suggestion.trim());
            
            // Try to parse the suggested ID and actually remove it
            const suggestedId = parseInt(suggestion.trim(), 10);
            if (!isNaN(suggestedId)) {
              this.log('Removing suggested task ID:', suggestedId);
              try {
                const removeResult = await this.executeRPC('todo.remove', { id: suggestedId });
                return `Removed task: ${removeResult.result.text} (ID: ${suggestedId})`;
              } catch (error: unknown) {
                this.log('Failed to remove task with suggested ID, showing options instead');
                // If removal fails, show the list of options as before
              }
            }
            
            // If we get here, either the ID wasn't parseable or the removal failed
            return `To remove a task related to "${task}", consider these options:\n${
              listResult.result.map((item: TodoItem) => `- [${item.id}] ${item.text}`).join('\n')
            }\nSuggested ID to remove: ${suggestion.trim()}`;
          }
          
        default:
          this.log('Unknown action:', decision.action);
          return `I'm not sure how to handle this task. Please specify if you want to add, list, or remove a todo item.`;
      }
    } catch (error: unknown) {
      console.error('Error executing task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `Failed to process task: ${errorMessage}`;
    }
  }
} 