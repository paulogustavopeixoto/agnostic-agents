const { DecompositionAdvisor } = require('../index');

function main() {
  const advisor = new DecompositionAdvisor();

  const recommendation = advisor.recommend(
    {
      id: 'coordination-decomposition-demo',
      task: 'Investigate release health and prepare an executive summary',
      taskType: 'analysis',
      complexity: 0.91,
      risk: 0.42,
      requiredCapabilities: ['generateText', 'retrieval'],
      suggestedSubtasks: [
        {
          task: 'Investigate release health',
          taskType: 'analysis',
          requiredCapabilities: ['retrieval'],
        },
        {
          task: 'Prepare executive summary',
          taskType: 'writing',
          requiredCapabilities: ['generateText'],
        },
      ],
    },
    {
      availableDelegates: [
        {
          id: 'researcher',
          capabilities: ['retrieval'],
          specializations: ['analysis'],
          trustScore: 0.88,
        },
        {
          id: 'writer',
          capabilities: ['generateText'],
          specializations: ['writing'],
          trustScore: 0.91,
        },
        {
          id: 'generalist',
          capabilities: ['generateText', 'retrieval'],
          specializations: ['analysis', 'writing'],
          trustScore: 0.74,
        },
      ],
    }
  );

  console.log('Decomposition recommendation:');
  console.dir(recommendation, { depth: null });
}

if (require.main === module) {
  main();
}
