// Example usage
const { Task } = require("./Task");
const { Agent } = require("../agent/Agent");

const myAgent = new Agent(/* ... */);

const myTask = new Task({
  name: "ResearchTask",
  description: "Research the latest AI news",
  agent: myAgent,
  expectedOutput: "A bullet list summary of top 5 AI news",
});

(async () => {
  const result = await myTask.run();
  console.log("Task result =>", result);
})();