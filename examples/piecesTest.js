const { PieceTool } = require('../src/tools/PieceTool');
const { slack } = require('@activepieces/piece-slack');
require('dotenv').config();


const slackSendMessage = new PieceTool({
  pieceName: 'slack',
  actionKey: 'send_channel_message',
  action: slack._actions['send_channel_message'],
  authToken: process.env.SLACK_ACCESS_TOKEN,
});

(async () => {
  const result = await slackSendMessage.call({
    channel: '#general',
    message: 'Hello from AI agent!',
    text: 'Hello from AI agent!',
  });

  console.log('Result:', result);
})();