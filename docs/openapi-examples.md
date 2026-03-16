# OpenAPI Import/Export Examples

This guide shows the maintained OpenAPI integration path in `agnostic-agents`.

The package currently focuses on:

- importing an OpenAPI spec into runtime tools
- executing those tools through the normal agent/runtime path

It does not currently ship a maintained OpenAPI exporter.

So the practical maintained story today is:

- OpenAPI import: yes
- OpenAPI export: not yet a maintained package feature

## 1. Import an OpenAPI spec into tools

Use `OpenAPILoader` when you have a local OpenAPI 3.x file and want to convert endpoints into runtime tools.

```js
const { OpenAPILoader } = require('agnostic-agents');

const { tools } = OpenAPILoader.load('./weather.json', {
  serviceName: 'weather',
  authToken: process.env.WEATHER_API_TOKEN,
});
```

The loader will:

- read the spec
- convert endpoints into `ApiTool` instances
- normalize parameter and response schemas

## 2. Run imported tools through an agent

Once imported, use the tools like any other runtime tool:

```js
const { Agent, OpenAIAdapter, OpenAPILoader } = require('agnostic-agents');

const adapter = new OpenAIAdapter(process.env.OPENAI_API_KEY, {
  model: 'gpt-4o-mini',
});

const { tools } = OpenAPILoader.load('./weather.json', {
  serviceName: 'weather',
  authToken: process.env.WEATHER_API_TOKEN,
});

const agent = new Agent(adapter, {
  tools,
  description: 'Use imported API tools when they help.',
});
```

This keeps imported API actions inside the same governance, replay, and inspection model as local tools.

## 3. Keep auth host-controlled

If the imported API requires auth:

- keep tokens in host-controlled configuration
- avoid putting tokens in prompts
- prefer runtime-side auth handling as documented in [`docs/secret-handling.md`](secret-handling.md)

## 4. Maintained reference example

See:

- [`examples/referenceOpenApiImport.js`](../examples/referenceOpenApiImport.js)

That example shows:

- building a tiny OpenAPI spec locally
- importing it into tools
- inspecting the generated tool names and schemas

## 5. Current boundary

Today, the maintained OpenAPI path is:

- OpenAPI file -> `OpenAPILoader` -> runtime tools

What is not yet maintained:

- exporting runtime tools back into a full OpenAPI spec
- generating full bidirectional API contracts from workflows

Those can be added later, but they should not be implied today.
