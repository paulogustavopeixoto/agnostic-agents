// tests/openAi.test.js
const { OpenAIAdapter } = require('../src/providers/openAi');

describe('OpenAIAdapter', () => {
  test('should instantiate with an API key', () => {
    const adapter = new OpenAIAdapter('fake-api-key');
    expect(adapter).toBeDefined();
    expect(adapter.apiKey).toBe('fake-api-key');
  });

});