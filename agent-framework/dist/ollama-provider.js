"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
const axios_1 = __importDefault(require("axios"));
class OllamaProvider {
    constructor(modelName = 'llama3', baseUrl = 'http://localhost:11434', enableDebugLogs = false) {
        this.modelName = modelName;
        this.baseUrl = baseUrl;
        this.enableDebugLogs = enableDebugLogs;
        this.log('Ollama provider initialized with model:', modelName);
    }
    /**
     * Log a message if debug logging is enabled
     */
    log(...args) {
        if (this.enableDebugLogs) {
            console.log('[Ollama]', ...args);
        }
    }
    /**
     * Extract valid JSON from a string that might contain thinking tags or other content
     */
    extractJSON(text) {
        this.log('Extracting JSON from response');
        // Try to find JSON between curly braces
        const jsonMatch = text.match(/(\{.*\})/s);
        if (jsonMatch && jsonMatch[0]) {
            try {
                // Validate it's actually parseable JSON
                JSON.parse(jsonMatch[0]);
                this.log('Found valid JSON in response');
                return jsonMatch[0];
            }
            catch (e) {
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
    async complete(prompt) {
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
            const response = await axios_1.default.post(`${this.baseUrl}/api/generate`, requestBody);
            const rawResponse = response.data.response;
            this.log(`Received response (length: ${rawResponse.length} chars)`);
            // For debugging, show a preview of the response
            if (this.enableDebugLogs) {
                console.log("[Ollama] Raw response preview:", rawResponse.substring(0, 100) + (rawResponse.length > 100 ? "..." : ""));
            }
            // Extract valid JSON if the response contains thinking or other content
            const cleanedResponse = this.extractJSON(rawResponse);
            return cleanedResponse;
        }
        catch (error) {
            console.error('Ollama API error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to get completion: ${errorMessage}`);
        }
    }
}
exports.OllamaProvider = OllamaProvider;
