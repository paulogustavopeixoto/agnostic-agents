const readline = require('readline');

function createConsoleAskUser() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return (field, tool) => {
    return new Promise((resolve) => {
      rl.question(`🤖 I need "${field}" to run "${tool.name}". Please provide: `, (answer) => {
        resolve(answer);
      });
    });
  };
}

module.exports = { createConsoleAskUser };