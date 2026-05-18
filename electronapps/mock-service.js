const { EventEmitter } = require('events');

const MOCK_CONVERSATIONS = {
  'quiz': {
    prompt: 'Can you generate a quick 3-question quiz about the solar system?',
    response: 'Absolutely! Here is a quick quiz about our solar system. Question one: What is the largest planet in our solar system? Question two: Which planet is known as the Red Planet? Question three: How many planets are in our solar system?'
  },
  'science': {
    prompt: 'Explain photosynthesis simply.',
    response: 'Photosynthesis is how plants make their own food. They use sunlight, water, and carbon dioxide from the air. The plant turns these into oxygen, which we breathe, and sugar, which it uses for energy!'
  },
  'history': {
    prompt: 'Who was the first person to walk on the moon?',
    response: "The first person to walk on the moon was Neil Armstrong. He was an American astronaut. He stepped onto the lunar surface on July 20, 1969. His famous words were, 'That\\'s one small step for man, one giant leap for mankind.'"
  }
};

class MockService extends EventEmitter {
  constructor() {
    super();
    this.isSpeaking = false;
    this.audioQueue = [];
  }

  getSamples() {
    return Object.keys(MOCK_CONVERSATIONS).map(key => ({
      id: key,
      prompt: MOCK_CONVERSATIONS[key].prompt
    }));
  }

  async generateStream(promptId, onToken, onSentenceReady) {
    const data = MOCK_CONVERSATIONS[promptId];
    if (!data) return;

    const text = data.response;
    const words = text.split(/([ \.\!\?])/);
    
    let currentSentence = '';
    
    for (let i = 0; i < words.length; i++) {
      const token = words[i];
      if (!token) continue;

      currentSentence += token;
      
      // Emit token
      onToken(token);
      
      // Simulate processing delay
      await new Promise(r => setTimeout(r, 40)); 
      
      // Check for sentence boundary
      if (token === '.' || token === '!' || token === '?') {
        const sentenceToSpeak = currentSentence.trim();
        if (sentenceToSpeak.length > 0) {
          onSentenceReady(sentenceToSpeak);
        }
        currentSentence = '';
      }
    }
    
    if (currentSentence.trim().length > 0) {
      onSentenceReady(currentSentence.trim());
    }
  }

  // Simulating a TTS engine that plays audio sentence by sentence
  async speak(text, onStart, onEnd) {
    this.audioQueue.push({ text, onStart, onEnd });
    this.processAudioQueue();
  }

  async processAudioQueue() {
    if (this.isSpeaking || this.audioQueue.length === 0) return;
    
    this.isSpeaking = true;
    const item = this.audioQueue.shift();
    
    item.onStart();
    
    const { exec } = require('child_process');
    const safeText = item.text.replace(/"/g, '').replace(/'/g, '').replace(/`/g, '');
    
    await new Promise((resolve) => {
        exec(`say "${safeText}"`, (error) => {
            resolve();
        });
    });
    
    item.onEnd();
    this.isSpeaking = false;
    
    // Process next item in queue
    this.processAudioQueue();
  }
}

module.exports = { MockService };
