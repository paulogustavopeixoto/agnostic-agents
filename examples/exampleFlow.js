// src/exampleFlow.js
const { Flow, start, listen } = require("./Flow");

class MyExampleFlow extends Flow {
  constructor() {
    super();
    this.state = { counter: 0 };
  }

  @start()
  async initialStep() {
    console.log("Starting flow...");
    this.state.counter += 1;
    return "Hello from initialStep";
  }

  @listen("initialStep")
  async secondStep(firstOutput) {
    console.log("Received from initialStep:", firstOutput);
    this.state.counter += 1;
    return `secondStep result with counter=${this.state.counter}`;
  }

  @listen("secondStep")
  async finalStep(secondOutput) {
    console.log("Received from secondStep:", secondOutput);
    this.state.counter += 1;
    return `finalStep done, counter=${this.state.counter}`;
  }
}

// Then you can do:
(async () => {
  const flow = new MyExampleFlow();
  const outputs = await flow.kickoff();
  console.log("Flow outputs:", outputs);
})();