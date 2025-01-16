// tests/agent.test.js
const { Agent } = require('../src/agent/Agent');

describe('Agent Class', () => {
  test('should instantiate without errors', () => {
    const agent = new Agent(null);  // no adapter
    expect(agent).toBeDefined();
    expect(agent.tools).toEqual([]);
    expect(agent.memory).toBeNull();
  });

  test('should accept defaultConfig', () => {
    const agent = new Agent(null, {
      defaultConfig: { model: 'gpt-4', temperature: 0.5 },
    });
    expect(agent.defaultConfig.model).toBe('gpt-4');
    expect(agent.defaultConfig.temperature).toBe(0.5);
  });
});