import OpenAI from 'openai';
import { LLMProvider } from './agent';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;
  private enableDebugLogs: boolean;
  
  constructor(apiKey: string, model: string = 'gpt-3.5-turbo', enableDebugLogs: boolean = false) {
    this.client = new OpenAI({
      apiKey: apiKey
    });
    this.model = model;
    this.enableDebugLogs = enableDebugLogs;
    this.log('OpenAI provider initialized with model:', model);
  }
  
  /**
   * Log a message if debug logging is enabled
   */
  private log(...args: any[]): void {
    if (this.enableDebugLogs) {
      console.log('[OpenAI]', ...args);
    }
  }
  
  async complete(prompt: string): Promise<string> {
    this.log(`Sending prompt to ${this.model} (length: ${prompt.length} chars)`);
    
    try {
      const messages = [
        { role: 'system' as const, content: 'You are a helpful agent that manages a todo list.' },
        { role: 'user' as const, content: prompt }
      ];
      
      this.log('Request to OpenAI API:', {
        model: this.model,
        messages: messages.map(m => ({ role: m.role, contentLength: m.content.length })),
        temperature: 0.2
      });
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0.2
      });
      
      const content = response.choices[0].message.content || '';
      this.log(`Received response (length: ${content.length} chars)`);
      
      // For debugging, show a preview of the response
      if (this.enableDebugLogs) {
        console.log("[OpenAI] Response preview:", 
          content.substring(0, 100) + (content.length > 100 ? "..." : ""));
      }
      
      return content;
    } catch (error: unknown) {
      console.error('OpenAI API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get completion: ${errorMessage}`);
    }
  }
} 