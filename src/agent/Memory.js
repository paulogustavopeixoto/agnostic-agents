class Memory {
    constructor() {
      this.conversation = []; // or a more advanced structure
    }
  
    store(userMessage, agentResponse) {
      this.conversation.push({ user: userMessage, agent: agentResponse });
    }
  
    getContext() {
      // Convert conversation array into a string or retrieve relevant history
      return this.conversation
        .map(
          (turn) => `User: ${turn.user}\nAgent: ${turn.agent}\n`
        )
        .join("\n");
    }
  }
  
  module.exports = { Memory };