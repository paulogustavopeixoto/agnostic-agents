const { MissingInfoResolver } = require('../src/agent/MissingInfoResolver');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { slack } = require('@activepieces/piece-slack');
const { createConsoleAskUser } = require('../src/utils/ConsoleAskUser');

require('dotenv').config();

const registry = new ToolRegistry();
registry.register(PieceLoader.load({
  pieceName: 'slack',
  piece: slack,
  authToken: process.env.SLACK_ACCESS_TOKEN,
}));

const tool = registry.findByName('slackSendChannelMessage');

const resolver = new MissingInfoResolver({
  memory: null,
  rag: null,
  askUser: createConsoleAskUser(),
});

(async () => {
  const args = {
    text: 'Hello from Resolver!',
    // Intentionally leave out "channel"
  };

  const completedArgs = await resolver.resolve(tool, args);

  console.log('✅ Completed Args:', completedArgs);

  const result = await tool.call(completedArgs);
  console.log('Result:', result);
})();