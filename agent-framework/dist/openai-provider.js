"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const openai_1 = __importDefault(require("openai"));
class OpenAIProvider {
    constructor(apiKey, model = 'gpt-3.5-turbo', enableDebugLogs = false) {
        this.client = new openai_1.default({
            apiKey: apiKey
        });
        this.model = model;
        this.enableDebugLogs = enableDebugLogs;
        this.log('OpenAI provider initialized with model:', model);
    }
    /**
     * Log a message if debug logging is enabled
     */
    log(...args) {
        if (this.enableDebugLogs) {
            console.log('[OpenAI]', ...args);
        }
    }
    async complete(prompt) {
        this.log(`Sending prompt to ${this.model} (length: ${prompt.length} chars)`);
        try {
            const messages = [
                { role: 'system', content: 'You are a helpful agent that manages a todo list.' },
                { role: 'user', content: prompt }
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
                console.log("[OpenAI] Response preview:", content.substring(0, 100) + (content.length > 100 ? "..." : ""));
            }
            return content;
        }
        catch (error) {
            console.error('OpenAI API error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get completion: ${errorMessage}`);
        }
    }
}
exports.OpenAIProvider = OpenAIProvider;
