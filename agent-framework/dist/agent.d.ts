export interface LLMProvider {
    complete(prompt: string): Promise<string>;
}
export declare class MCPAgent {
    private baseUrl;
    private token;
    private llmProvider;
    private enableDebugLogs;
    constructor(baseUrl: string, llmProvider: LLMProvider, enableDebugLogs?: boolean);
    /**
     * Log a message if debug logging is enabled
     */
    private log;
    authenticate(username: string, password: string): Promise<boolean>;
    executeRPC(method: string, params?: any): Promise<any>;
    /**
     * List all tasks from the server
     * @returns Formatted string with all tasks
     */
    listTasks(): Promise<string>;
    executeTask(task: string): Promise<string>;
}
