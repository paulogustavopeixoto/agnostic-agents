// Suppose we have two tasks that share an agent or different agents
const { Agent } = require("../agent/Agent");
const { Task } = require("./Task");
const { Team } = require("./Team");

(async () => {
  const researchAgent = new Agent(/* ... */);
  const writerAgent = new Agent(/* ... */);

  const researchTask = new Task({
    name: "ResearchAI",
    description: "Research the latest AI developments in 2025",
    agent: researchAgent,
    expectedOutput: "A bullet list of relevant AI developments",
  });

  const reportTask = new Task({
    name: "ReportAI",
    description: "Take the bullet list from the research task and expand it into a full report.",
    agent: writerAgent,
  });

  // Now define a Team with those tasks
  const myTeam = new Team({
    tasks: [researchTask, reportTask],
    agents: [researchAgent, writerAgent], // optional
    process: "sequential",
    verbose: true,
  });

  const result = await myTeam.kickoff();
  console.log("Final team output =>", result.raw);
  console.log("All tasks =>", result.tasksOutput);
})();