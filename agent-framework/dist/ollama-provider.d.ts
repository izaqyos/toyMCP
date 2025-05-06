import { LLMProvider } from './agent';
export declare class OllamaProvider implements LLMProvider {
    private modelName;
    private baseUrl;
    private enableDebugLogs;
    constructor(modelName?: string, baseUrl?: string, enableDebugLogs?: boolean);
    /**
     * Log a message if debug logging is enabled
     */
    private log;
    /**
     * Extract valid JSON from a string that might contain thinking tags or other content
     */
    private extractJSON;
    complete(prompt: string): Promise<string>;
}
