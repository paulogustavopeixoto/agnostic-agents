![NPM Version](https://img.shields.io/npm/v/agnostic-agents) ![NPM Downloads](https://img.shields.io/npm/dy/agnostic-agents)
```
_____/\\\\\\\\\________/\\\\\\\\\\\\__/\\\\\_____/\\\_______/\\\\\__________/\\\\\\\\\\\____/\\\\\\\\\\\\\\\__/\\\\\\\\\\\________/\\\\\\\\\_______________/\\\\\\\\\________/\\\\\\\\\\\\__/\\\\\\\\\\\\\\\__/\\\\\_____/\\\__/\\\\\\\\\\\\\\\_____/\\\\\\\\\\\___        
 ___/\\\\\\\\\\\\\____/\\\//////////__\/\\\\\\___\/\\\_____/\\\///\\\______/\\\/////////\\\_\///////\\\/////__\/////\\\///______/\\\////////______________/\\\\\\\\\\\\\____/\\\//////////__\/\\\///////////__\/\\\\\\___\/\\\_\///////\\\/////____/\\\/////////\\\_       
  __/\\\/////////\\\__/\\\_____________\/\\\/\\\__\/\\\___/\\\/__\///\\\___\//\\\______\///________\/\\\___________\/\\\_______/\\\/______________________/\\\/////////\\\__/\\\_____________\/\\\_____________\/\\\/\\\__\/\\\_______\/\\\________\//\\\______\///__      
   _\/\\\_______\/\\\_\/\\\____/\\\\\\\_\/\\\//\\\_\/\\\__/\\\______\//\\\___\////\\\_______________\/\\\___________\/\\\______/\\\_______________________\/\\\_______\/\\\_\/\\\____/\\\\\\\_\/\\\\\\\\\\\_____\/\\\//\\\_\/\\\_______\/\\\_________\////\\\_________     
    _\/\\\\\\\\\\\\\\\_\/\\\___\/////\\\_\/\\\\//\\\\/\\\_\/\\\_______\/\\\______\////\\\____________\/\\\___________\/\\\_____\/\\\_______________________\/\\\\\\\\\\\\\\\_\/\\\___\/////\\\_\/\\\///////______\/\\\\//\\\\/\\\_______\/\\\____________\////\\\______    
     _\/\\\/////////\\\_\/\\\_______\/\\\_\/\\\_\//\\\/\\\_\//\\\______/\\\__________\////\\\_________\/\\\___________\/\\\_____\//\\\______________________\/\\\/////////\\\_\/\\\_______\/\\\_\/\\\_____________\/\\\_\//\\\/\\\_______\/\\\_______________\////\\\___   
      _\/\\\_______\/\\\_\/\\\_______\/\\\_\/\\\__\//\\\\\\__\///\\\__/\\\_____/\\\______\//\\\________\/\\\___________\/\\\______\///\\\____________________\/\\\_______\/\\\_\/\\\_______\/\\\_\/\\\_____________\/\\\__\//\\\\\\_______\/\\\________/\\\______\//\\\__  
       _\/\\\_______\/\\\_\//\\\\\\\\\\\\/__\/\\\___\//\\\\\____\///\\\\\/_____\///\\\\\\\\\\\/_________\/\\\________/\\\\\\\\\\\____\////\\\\\\\\\___________\/\\\_______\/\\\_\//\\\\\\\\\\\\/__\/\\\\\\\\\\\\\\\_\/\\\___\//\\\\\_______\/\\\_______\///\\\\\\\\\\\/___ 
        _\///________\///___\////////////____\///_____\/////_______\/////_________\///////////___________\///________\///////////________\/////////____________\///________\///___\////////////____\///////////////__\///_____\/////________\///__________\///////////_____
```

# agnostic-agents

## Overview

**agnostic-agents** is a modular, provider-agnostic framework for building and orchestrating AI agents. It enables you to integrate with multiple language model providers (e.g., OpenAI, Gemini, Anthropic, Hugging Face, DeepSeek) and provides powerful abstractions for managing conversation memory, function (tool) calling, task orchestration, and team collaboration. Use this package to develop chatbots, automated workflows, or any system that requires dynamic AI-driven decision making.

## Installation

Install **agnostic-agents** via npm:

```bash
npm install agnostic-agents --save
```

## Usage

Below is an example demonstrating how to create an AI agent with conversation memory and a custom tool, then send a message and receive a response.

```bash
const { Agent, Memory, Tool, OpenAIAdapter } = require("agnostic-agents");

// Initialize conversation memory
const memory = new Memory();

// Define a custom tool (e.g., a simple calculator)
const calculatorTool = new Tool({
  name: "calculate",
  description: "Perform basic arithmetic calculations.",
  parameters: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "The arithmetic expression to evaluate (e.g., '12 * 7')."
      }
    },
    required: ["expression"]
  },
  implementation: async ({ expression }) => {
    // Note: Using eval() for demonstration only. Avoid eval in production!
    const result = eval(expression);
    return { result };
  }
});

// Create an adapter instance (using OpenAI in this example)
const openaiAdapter = new OpenAIAdapter(process.env.OPENAI_API_KEY);

// Create an agent with default configuration, memory, and tools
const agent = new Agent(openaiAdapter, {
  tools: [calculatorTool],
  memory: memory,
  defaultConfig: { model: "gpt-4o-mini", temperature: 0.7 },
  description: "You are a helpful AI assistant that answers questions and can perform calculations."
});

// Send a message to the agent
(async () => {
  const response = await agent.sendMessage("What is 12 * 7?");
  console.log("Agent Response:", response);
})();
```

## API Reference

### Agent

**Constructor**

```bash
new Agent(adapter, { tools = [], memory = null, defaultConfig = {}, description = "" })
```

- **adapter**: An instance of a provider adapter (e.g., OpenAIAdapter, GeminiAdapter, etc.).
- **tools**: An array of Tool objects used for function calling.
- **memory**: An optional memory instance to store conversation context.
- **defaultConfig**: Default configuration options (e.g., { model, temperature, maxTokens }).
- **description**: Optional system instructions or an agent description.

**Methods**

- **sendMessage(userMessage, config = {})**
Sends a prompt to the agent. Merges provided configuration with defaults, includes conversation context (if available), and processes function/tool calls if detected.
Returns: Promise<string> or the result of a tool call.

- **_handleToolCall(toolCall)**
Internally resolves and calls the appropriate tool based on the agent’s tool call request.

- **analyzeImage(imageData, config = {})**
Analyzes an image using the underlying adapter (if supported).

- **generateImage(prompt, config = {})**
Generates an image from a text prompt using the adapter (e.g., via DALL·E or Stable Diffusion).

...

## Contributing

Contributions to agnostic-agents are welcome! If you find bugs, have feature requests, or wish to contribute improvements, please open an issue or submit a pull request on the GitHub repository.