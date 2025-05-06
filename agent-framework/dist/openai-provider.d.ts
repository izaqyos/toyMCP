import { LLMProvider } from './agent';
export declare class OpenAIProvider implements LLMProvider {
    private client;
    private model;
    private enableDebugLogs;
    constructor(apiKey: string, model?: string, enableDebugLogs?: boolean);
    /**
     * Log a message if debug logging is enabled
     */
    private log;
    complete(prompt: string): Promise<string>;
}
