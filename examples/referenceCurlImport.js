const { CurlLoader } = require('../index');

async function main() {
  const curlCommand = "curl -X POST 'https://api.example.com/messages?channel=ops' -H 'Authorization: Bearer example-token' -H 'X-Trace-Id: trace-9' -d '{\"message\":\"hello\"}'";

  const parsed = CurlLoader.parse(curlCommand);
  const apiSpec = CurlLoader.toApiSpec(parsed);
  const { tools } = CurlLoader.load(curlCommand, {
    serviceName: 'imported',
  });

  console.log('Parsed curl request');
  console.dir(parsed, { depth: null });

  console.log('Generated API spec');
  console.dir(apiSpec, { depth: null });

  console.log('Imported tools');
  console.dir(
    tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
    { depth: null }
  );
}

if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}
