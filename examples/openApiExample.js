const { OpenAPILoader } = require("agnostic-agents");

const { tools } = OpenAPILoader.load("./github.yaml", {
  serviceName: "github",
  authToken: process.env.GITHUB_TOKEN
});

toolRegistry.register({ tools });