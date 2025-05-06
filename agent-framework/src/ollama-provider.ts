import axios from 'axios';
import { LLMProvider } from './agent';

export class OllamaProvider implements LLMProvider {
  private modelName: string;
  private baseUrl: string;
  private enableDebugLogs: boolean;
  
  constructor(modelName: string = 'llama3', baseUrl: string = 'http://localhost:11434', enableDebugLogs: boolean = false) {
    this.modelName = modelName;
    this.baseUrl = baseUrl;
    this.enableDebugLogs = enableDebugLogs;
    this.log('Ollama provider initialized with model:', modelName);
  }
  
  /**
   * Log a message if debug logging is enabled
   */
  private log(...args: any[]): void {
    if (this.enableDebugLogs) {
      console.log('[Ollama]', ...args);
    }
  }
  
  /**
   * Extract valid JSON from a string that might contain thinking tags or other content
   */
  private extractJSON(text: string): string {
    this.log('Extracting JSON from response');
    
    // Try to find JSON between curly braces
    const jsonMatch = text.match(/(\{.*\})/s);
    if (jsonMatch && jsonMatch[0]) {
      try {
        // Validate it's actually parseable JSON
        JSON.parse(jsonMatch[0]);
        this.log('Found valid JSON in response');
        return jsonMatch[0];
      } catch (e) {
        this.log('Found JSON-like content but it is not valid JSON');
        // Not valid JSON, continue with other extraction methods
      }
    }
    
    // Remove thinking tags and any content within them
    const withoutThinking = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    if (withoutThinking !== text) {
      this.log('Removed thinking tags from response');
    }
    
    // If the model added JSON comments, remove them
    const withoutComments = withoutThinking.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '').trim();
    if (withoutComments !== withoutThinking) {
      this.log('Removed comments from response');
    }
    
    return withoutComments;
  }
  
  async complete(prompt: string): Promise<string> {
    this.log(`Sending prompt to ${this.modelName} (length: ${prompt.length} chars)`);
    
    try {
      const requestBody = {
        model: this.modelName,
        prompt: prompt,
        stream: false
      };
      
      this.log('Request to Ollama API:', {
        url: `${this.baseUrl}/api/generate`,
        model: this.modelName,
        promptLength: prompt.length
      });
      
      const response = await axios.post(`${this.baseUrl}/api/generate`, requestBody);
      
      const rawResponse = response.data.response;
      this.log(`Received response (length: ${rawResponse.length} chars)`);
      
      // For debugging, show a preview of the response
      if (this.enableDebugLogs) {
        console.log("[Ollama] Raw response preview:", 
          rawResponse.substring(0, 100) + (rawResponse.length > 100 ? "..." : ""));
      }
      
      // Extract valid JSON if the response contains thinking or other content
      const cleanedResponse = this.extractJSON(rawResponse);
      
      return cleanedResponse;
    } catch (error: unknown) {
      console.error('Ollama API error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get completion: ${errorMessage}`);
    }
  }
} 