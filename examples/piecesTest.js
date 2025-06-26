const { slack } = require('@activepieces/piece-slack');
const { PieceLoader } = require('../src/tools/PieceLoader');
const { ToolRegistry } = require('../src/tools/ToolRegistry');
require('dotenv').config();

const registry = new ToolRegistry();

// 🔥 Load and register Slack tools
const slackTools = PieceLoader.load({
  pieceName: 'slack',
  piece: slack,
  authToken: process.env.SLACK_ACCESS_TOKEN,
});
registry.register(slackTools);

// 🔥 Query
console.log('All Tools:', registry.list().map(t => t.name));

const searchResults = registry.search('message');
console.log('Search "message":', searchResults.map(t => t.name));

const slackToolsOnly = registry.findByPiece('slack');
console.log('Slack Tools:', slackToolsOnly.map(t => t.name));

// 🔥 Metadata export
console.log('Metadata:', JSON.stringify(registry.toMetadata(), null, 2));

// 🔥 Run an action
(async () => {
  const sendMessageTool = registry.findByName('slackSendChannelMessage');
  if (!sendMessageTool) {
    console.error('Tool not found.');
    return;
  }
  const result = await sendMessageTool.call({
    channel: '#general',
    text: 'Hello from AI using ToolRegistry!',
  });
  console.log('Result:', result);
})();