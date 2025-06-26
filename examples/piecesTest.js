const { slack } = require('@activepieces/piece-slack');
const { PieceLoader } = require('../src/tools/PieceLoader');
require('dotenv').config();

const slackTools = PieceLoader.load({
  pieceName: 'slack',
  piece: slack,
  authToken: process.env.SLACK_ACCESS_TOKEN,
});

console.log('Loaded Slack Tools:');
slackTools.forEach(tool => {
  console.log(JSON.stringify(tool.toMetadata(), null, 2));
});

// Example run:
(async () => {
  const sendMessageTool = slackTools.find(t => t.name === 'slackSendChannelMessage');
  const result = await sendMessageTool.call({
    channel: '#general',
    text: 'Hello from AI using PieceLoader!',
  });
  console.log('Result:', result);
})();