// src/utils/ConsoleAskUser.js
const readline = require('readline');

function createConsoleAskUser() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (field, tool) => {
    return new Promise((resolve) => {
      rl.question(`🤖 I need "${field}" to run "${tool.name}". Please provide: `, (answer) => {
        resolve(answer);
      });
    });
  };

  ask.close = () => {
    rl.close();
  };

  return ask;
}

module.exports = { createConsoleAskUser };