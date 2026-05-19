const path = require("path");
const fs = require("fs");

class LlmService {
  constructor() {
    this.modelPath = path.join(__dirname, 'models', 'model.gguf');
    this.isReady = false;
  }

  async init() {
    if (!fs.existsSync(this.modelPath)) return false;
    try {
        const { LlamaModel, LlamaContext, LlamaChatSession } = await import("node-llama-cpp");
        this.model = new LlamaModel({ modelPath: this.modelPath });
        this.context = new LlamaContext({ model: this.model });
        this.session = new LlamaChatSession({ context: this.context });
        this.isReady = true;
        return true;
    } catch(e) {
        console.error("Failed to load LLM model", e);
        return false;
    }
  }

  async generateStream(prompt, onToken, onSentenceReady) {
    if (!this.session) return;
    let currentSentence = '';
    await this.session.prompt(prompt, {
      onToken: (chunk) => {
        // chunk is usually an array of tokens
        const tokenStr = this.context.decode(chunk);
        onToken(tokenStr);
        currentSentence += tokenStr;
        
        // Simple sentence boundary detection
        const match = currentSentence.match(/([.!?\n])/);
        if (match) {
            const index = currentSentence.indexOf(match[0]);
            const sentenceToSpeak = currentSentence.slice(0, index + 1).trim();
            // Don't send empty strings or just punctuation
            if (sentenceToSpeak.length > 1) {
                onSentenceReady(sentenceToSpeak);
            }
            currentSentence = currentSentence.slice(index + 1);
        }
      }
    });
    
    if (currentSentence.trim().length > 1) {
        onSentenceReady(currentSentence.trim());
    }
  }
}

module.exports = { LlmService };
