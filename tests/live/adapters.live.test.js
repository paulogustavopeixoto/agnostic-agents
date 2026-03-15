require('dotenv').config();

const { Agent } = require('../../src/agent/Agent');
const { Tool } = require('../../src/tools/adapters/Tool');
const { OpenAIAdapter } = require('../../src/llm/OpenAi');
const { GeminiAdapter } = require('../../src/llm/Gemini');
const { AnthropicAdapter } = require('../../src/llm/Anthropic');
const { HFAdapter } = require('../../src/llm/HuggingFace');
const { DeepSeekAdapter } = require('../../src/llm/DeepSeek');

const runLive = process.env.RUN_LIVE_API_TESTS === '1';
const describeLive = runLive ? describe : describe.skip;

jest.setTimeout(180000);

function isSkippableProviderError(error) {
  const message = String(error?.message || error);
  return [
    'credit balance is too low',
    'No Inference Provider available',
    'is not found for API version',
    'quota',
    'billing',
  ].some(fragment => message.includes(fragment));
}

async function runProviderSmokeTest(fn) {
  try {
    await fn();
  } catch (error) {
    if (isSkippableProviderError(error)) {
      console.warn(`Skipping provider smoke assertion: ${error.message}`);
      return;
    }
    throw error;
  }
}

describeLive('Live adapter smoke tests', () => {
  test('OpenAI adapter can generate text and embeddings', async () => {
    if (!process.env.OPENAI_API_KEY) {
      return;
    }

    await runProviderSmokeTest(async () => {
      const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
        model: process.env.OPENAI_TEST_MODEL || 'gpt-4o-mini',
      });

      const text = await adapter.generateText([{ role: 'user', content: 'Reply with the single word: hello' }], {
        temperature: 0,
        maxTokens: 20,
      });
      const embeddings = await adapter.embedChunks(['Lisbon is in Portugal.']);

      expect(text.message.toLowerCase()).toContain('hello');
      expect(Array.isArray(embeddings[0].embedding)).toBe(true);
    });
  });

  test('OpenAI agent can execute a local tool end-to-end', async () => {
    if (!process.env.OPENAI_API_KEY) {
      return;
    }

    await runProviderSmokeTest(async () => {
      const agent = new Agent(new OpenAIAdapter(process.env.OPENAI_API_KEY, {
        model: process.env.OPENAI_TEST_MODEL || 'gpt-4o-mini',
      }), {
        tools: [
          new Tool({
            name: 'lookup_capital',
            description: 'Return the capital city for a country.',
            parameters: {
              type: 'object',
              properties: {
                country: { type: 'string' },
              },
              required: ['country'],
            },
            implementation: async ({ country }) => ({
              country,
              capital: country.toLowerCase() === 'portugal' ? 'Lisbon' : 'Unknown',
            }),
          }),
        ],
        description: 'Use tools when needed.',
        defaultConfig: { temperature: 0, maxTokens: 100 },
      });

      const response = await agent.sendMessage('What is the capital of Portugal? Use the tool.');
      expect(response.toLowerCase()).toContain('lisbon');
    });
  });

  test('Gemini adapter can generate text', async () => {
    if (!process.env.GEMINI_API_KEY) {
      return;
    }

    await runProviderSmokeTest(async () => {
      const adapter = new GeminiAdapter(process.env.GEMINI_API_KEY, {
        model: process.env.GEMINI_TEST_MODEL || 'gemini-2.0-flash',
      });
      const response = await adapter.generateText([{ role: 'user', content: 'Reply with hello' }], {
        temperature: 0,
        maxTokens: 20,
      });

      expect(response.message.toLowerCase()).toContain('hello');
    });
  });

  test('Anthropic adapter can generate text', async () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      return;
    }

    await runProviderSmokeTest(async () => {
      const adapter = new AnthropicAdapter(process.env.ANTHROPIC_API_KEY, {
        model: process.env.ANTHROPIC_TEST_MODEL || 'claude-3-5-sonnet-20240620',
      });

      const response = await adapter.generateText({ user: 'Reply with hello' }, {
        temperature: 0,
        maxTokens: 20,
      });

      expect(response.message.toLowerCase()).toContain('hello');
    });
  });

  test('Hugging Face adapter can generate text', async () => {
    if (!process.env.HUGGINGFACE_API_KEY) {
      return;
    }

    await runProviderSmokeTest(async () => {
      const adapter = new HFAdapter(process.env.HUGGINGFACE_API_KEY, {
        textModel: process.env.HUGGINGFACE_TEST_MODEL || 'tiiuae/falcon-7b-instruct',
      });
      const response = await adapter.generateText({ user: 'Reply with hello' }, {
        temperature: 0,
        maxTokens: 30,
      });

      expect(typeof response.message).toBe('string');
      expect(response.message.length).toBeGreaterThan(0);
    });
  });

  test('DeepSeek adapter can generate text', async () => {
    if (!process.env.DEEPSEEK_API_KEY) {
      return;
    }

    await runProviderSmokeTest(async () => {
      const adapter = new DeepSeekAdapter(process.env.DEEPSEEK_API_KEY, {
        model: process.env.DEEPSEEK_TEST_MODEL || 'deepseek-chat',
      });
      const response = await adapter.generateText({ user: 'Reply with hello' }, {
        temperature: 0,
        maxTokens: 20,
      });

      expect(response.message.toLowerCase()).toContain('hello');
    });
  });
});
