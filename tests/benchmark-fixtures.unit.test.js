const fs = require('fs');
const path = require('path');

describe('Benchmark framework fixtures', () => {
  test('framework comparison fixtures are present and well formed', () => {
    const fixturePath = path.join(
      __dirname,
      'fixtures',
      'benchmark-framework-fixtures.json'
    );
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    expect(fixture.schemaVersion).toBe('1.0');
    expect(fixture.suite).toBe('runtime-control-baseline');
    expect(fixture.dimensions).toEqual(
      expect.arrayContaining([
        'prompt_regression',
        'tool_selection_accuracy',
        'rag_grounding',
        'replay_regression',
      ])
    );
    expect(fixture.frameworks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'agnostic-agents' }),
        expect.objectContaining({ id: 'langgraph' }),
        expect.objectContaining({ id: 'autogen' }),
        expect.objectContaining({ id: 'crewai' }),
      ])
    );
    for (const framework of fixture.frameworks) {
      expect(framework.fixtures).toEqual(fixture.dimensions);
    }
  });
});
